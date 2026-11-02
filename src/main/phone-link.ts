/** 电脑端连接手机 DSH Go 的客户端。
 *
 *  手机侧装 `@xiazhi88/dshgo` 后，把 127.0.0.1:3080 暴露到局域网 3081；
 *  电脑与手机在同一 WiFi 即可，不需要 adb。协议细节与 scripts/phone-dsh.mjs
 *  一致：先过 `/__dshgo__/unlock` 的访问密码，再拿 dsh web 的登录 cookie，
 *  之后所有会话操作走 `/api/<method>`；读历史要 `/api/remote.mux` 的 WebSocket。
 *
 *  这里只做客户端：不动手机的对话库，也不把两边的库合并。 */
import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import WebSocket from 'ws'

const execFileAsync = promisify(execFile)

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const PHONE_PORT = 3081
const SCAN_TIMEOUT_MS = 250
const SCAN_CONCURRENCY = 32
const READ_TIMEOUT_MS = 20_000
const MAX_LIMIT = 200

export interface PhoneSession {
  sessionId: string
  title: string
  running: boolean
  updatedAt?: string
}

export interface PhoneCandidate {
  /** `ip:port`，直接传给 connect。 */
  host: string
  address: string
  source: 'adb' | 'scan'
}

export interface PhoneLinkStatus {
  state: 'idle' | 'scanning' | 'connecting' | 'connected' | 'error'
  host?: string
  error?: string
  autoConnect: boolean
}

export interface PhoneRecord {
  role: 'user' | 'assistant'
  text: string
}

interface StoredConfig {
  host?: string
  password?: string
  autoConnect?: boolean
  lastConnectedAt?: string
}

export interface PhoneLinkOptions {
  dataRoot: string
  /** 打包后 adb 不一定存在；没有就只走网段扫描。 */
  adbPath?: string
  port?: number
}

function setCookiesOf(response: Response): string[] {
  const header = (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie
  const values = typeof header === 'function' ? header.call(response.headers) : []
  return values.map((value) => value.split(';')[0]).filter(Boolean)
}

async function pool<T>(items: readonly T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next]
      next += 1
      await work(item)
    }
  })
  await Promise.all(workers)
}

/** 只取私网 IPv4 的 /24 前缀，避免扫到公网或虚拟网卡。 */
function lanPrefixes(): string[] {
  const prefixes = new Set<string>()
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue
      if (!/^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/u.test(entry.address)) continue
      prefixes.add(entry.address.split('.').slice(0, 3).join('.'))
    }
  }
  return [...prefixes]
}

/** 手机连着 USB 时直接问 adb 要地址，扫描就省了。 */
async function adbAddress(adbPath: string | undefined): Promise<string | null> {
  if (!adbPath) return null
  try {
    const { stdout } = await execFileAsync(adbPath, ['shell', 'ip', '-4', 'addr', 'show', 'wlan0'], { timeout: 2_500 })
    const match = /inet (\d+\.\d+\.\d+\.\d+)/u.exec(stdout)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export class PhoneLink {
  private readonly port: number
  private readonly adbPath: string | undefined
  private readonly configPath: string
  private config: StoredConfig
  private cookie = ''
  private host: string | undefined
  private state: PhoneLinkStatus['state'] = 'idle'
  private error: string | undefined

  constructor(options: PhoneLinkOptions) {
    this.port = options.port ?? PHONE_PORT
    this.adbPath = options.adbPath
    this.configPath = path.join(options.dataRoot, 'phone-link.json')
    this.config = this.readConfig()
  }

  status(): PhoneLinkStatus {
    return {
      state: this.state,
      ...(this.host ? { host: this.host } : {}),
      ...(this.error ? { error: this.error } : {}),
      autoConnect: this.config.autoConnect === true
    }
  }

  /** 启动时如果上次连接过，异步重连；失败只记状态，不打扰窗口。 */
  async autoConnect(): Promise<void> {
    if (this.config.autoConnect !== true || !this.config.host) return
    try {
      await this.connect(this.config.host, this.config.password, { remember: false })
    } catch {
      // status 已经记下错误，等主人打开面板时自己重试。
    }
  }

  setAutoConnect(on: boolean): void {
    this.config.autoConnect = on
    this.saveConfig()
  }

  /** 先问 adb；拿不到就并发扫本机每个私网 /24 的 3081。 */
  async scan(): Promise<PhoneCandidate[]> {
    this.state = 'scanning'
    this.error = undefined
    try {
      const direct = await adbAddress(this.adbPath)
      if (direct) {
        const host = `${direct}:${this.port}`
        this.state = 'idle'
        return [{ host, address: direct, source: 'adb' }]
      }
      const prefixes = lanPrefixes()
      if (!prefixes.length) throw new Error('没有找到局域网地址，请先连上 WiFi。')
      const targets: string[] = []
      for (const prefix of prefixes) {
        for (let last = 1; last <= 254; last += 1) targets.push(`${prefix}.${last}`)
      }
      const found: PhoneCandidate[] = []
      await pool(targets, SCAN_CONCURRENCY, async (address) => {
        const host = `${address}:${this.port}`
        if (await this.probe(host)) found.push({ host, address, source: 'scan' })
      })
      found.sort((left, right) => left.address.localeCompare(right.address, undefined, { numeric: true }))
      this.state = 'idle'
      return found
    } catch (error) {
      this.state = 'error'
      this.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  async connect(rawHost: string, password?: string, options: { remember?: boolean } = {}): Promise<PhoneSession[]> {
    const host = this.normalizeHost(rawHost)
    this.state = 'connecting'
    this.error = undefined
    try {
      this.cookie = await this.login(host, password)
      this.host = host
      const sessions = await this.list()
      this.state = 'connected'
      if (options.remember !== false) {
        this.config = {
          ...this.config,
          host,
          ...(password ? { password } : {}),
          lastConnectedAt: new Date().toISOString()
        }
        this.saveConfig()
      }
      return sessions
    } catch (error) {
      this.cookie = ''
      this.host = undefined
      this.state = 'error'
      this.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  disconnect(): void {
    this.cookie = ''
    this.host = undefined
    this.state = 'idle'
    this.error = undefined
  }

  async list(): Promise<PhoneSession[]> {
    const value = await this.rpc('session/list', { _request: {} }) as { items?: unknown }
    const items = Array.isArray(value?.items) ? value.items : []
    return items.flatMap((item) => {
      const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {}
      const sessionId = typeof entry.sessionId === 'string' ? entry.sessionId : ''
      if (!sessionId) return []
      const projections = entry.projections && typeof entry.projections === 'object'
        ? entry.projections as { values?: { title?: unknown } } : undefined
      const title = typeof projections?.values?.title === 'string' && projections.values.title.trim()
        ? projections.values.title.trim() : '(无标题)'
      return [{
        sessionId,
        title,
        running: entry.running === true,
        ...(typeof entry.updatedAt === 'string' ? { updatedAt: entry.updatedAt } : {})
      }]
    })
  }

  /** 读最近记录，给 @手机会话 当引用上下文用。 */
  async read(sessionId: string, limit = MAX_LIMIT): Promise<PhoneRecord[]> {
    if (!this.cookie || !this.host) throw new Error('手机端还没有连接。')
    const snapshot = await this.follow(sessionId)
    const records = Array.isArray(snapshot.records) ? snapshot.records : []
    const mapped: PhoneRecord[] = []
    for (const record of records.slice(-Math.max(1, Math.min(MAX_LIMIT, limit)))) {
      const event = record && typeof record === 'object' ? record as Record<string, unknown> : {}
      const type = typeof event.type === 'string' ? event.type : ''
      if (type !== 'user/message' && type !== 'assistant/message') continue
      const data = event.data && typeof event.data === 'object' ? event.data as Record<string, unknown> : {}
      const message = data.message && typeof data.message === 'object' ? data.message as Record<string, unknown> : {}
      const parts = Array.isArray(message.content) ? message.content : []
      const text = parts.flatMap((part) => {
        const block = part && typeof part === 'object' ? part as Record<string, unknown> : {}
        return block.type === 'text' && typeof block.text === 'string' ? [block.text] : []
      }).join('')
      if (text.trim()) mapped.push({ role: type === 'user/message' ? 'user' : 'assistant', text })
    }
    return mapped
  }

  async send(sessionId: string, text: string, mode: 'queue' | 'steer' = 'queue'): Promise<void> {
    const clean = text.trim()
    if (!clean) throw new Error('消息不能为空。')
    if (clean.length > 8_000) throw new Error('单条消息最多 8000 字。')
    await this.rpc('session/prompt', {
      request: {
        requestId: `pc-${Date.now()}`,
        sessionId,
        mode,
        content: [{ type: 'text', text: clean }]
      }
    })
  }

  private normalizeHost(raw: string): string {
    const trimmed = raw.trim().replace(/^https?:\/\//u, '').replace(/\/+$/u, '')
    if (!trimmed) throw new Error('请先填手机地址。')
    return /:\d+$/u.test(trimmed) ? trimmed : `${trimmed}:${this.port}`
  }

  private async probe(host: string): Promise<boolean> {
    try {
      const response = await fetch(`http://${host}/`, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' }
      })
      if (response.status === 0) return false
      const cookies = setCookiesOf(response).join(';')
      const location = response.headers.get('location') ?? ''
      // 只认 dsh go 的闸门（未解锁会 303 到 __dshgo__，登录后会发 dsh cookie），
      // 避免把同一网段里别的 3081 服务列进来。
      return /__dshgo__/iu.test(location) || /dsh/iu.test(cookies)
    } catch {
      return false
    }
  }

  private async login(host: string, password?: string): Promise<string> {
    const base = `http://${host}`
    const cookies: string[] = []
    if (password) {
      const unlock = await fetch(`${base}/__dshgo__/unlock`, {
        method: 'POST',
        headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ password }).toString(),
        redirect: 'manual',
        signal: AbortSignal.timeout(8_000)
      })
      const unlockCookies = setCookiesOf(unlock)
      if (unlock.status !== 303 || !unlockCookies.length) throw new Error('访问密码不对。')
      cookies.push(...unlockCookies)
    }
    const home = await fetch(`${base}/`, {
      method: 'GET',
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml',
        ...(cookies.length ? { cookie: cookies.join('; ') } : {})
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000)
    })
    const auth = setCookiesOf(home)
    if (!auth.length) {
      throw new Error(home.status === 401 || home.status === 403
        ? '手机拒绝了登录，请检查访问密码。'
        : '手机登录失败，请确认 DSH Go 的局域网访问已经打开。')
    }
    return [...cookies, ...auth].join('; ')
  }

  private async rpc(method: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.cookie || !this.host) throw new Error('手机端还没有连接。')
    const base = `http://${this.host}`
    const response = await fetch(`${base}/api/${method}`, {
      method: 'POST',
      headers: {
        'user-agent': UA,
        cookie: this.cookie,
        'content-type': 'application/json',
        origin: base,
        referer: `${base}/`
      },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: `pc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method,
        payload: { args }
      }),
      signal: AbortSignal.timeout(20_000)
    })
    const data = await response.json() as { result?: { ok?: boolean; error?: unknown; value?: unknown } }
    if (!data.result?.ok) throw new Error(`${method} 失败：${JSON.stringify(data.result?.error ?? data)}`)
    return data.result.value
  }

  private follow(sessionId: string): Promise<{ records?: unknown[] }> {
    return new Promise((resolve, reject) => {
      const base = `http://${this.host}`
      const socket = new WebSocket(`${base.replace('http', 'ws')}/api/remote.mux`, {
        headers: { cookie: this.cookie, origin: base, 'user-agent': UA }
      })
      const timer = setTimeout(() => {
        socket.close()
        reject(new Error('读取手机会话超时。'))
      }, READ_TIMEOUT_MS)
      const finish = (error: Error | null, value?: { records?: unknown[] }): void => {
        clearTimeout(timer)
        socket.close()
        if (error) reject(error)
        else resolve(value ?? {})
      }
      socket.on('open', () => {
        socket.send(JSON.stringify({
          type: 'open',
          streamId: 'follow-1',
          endpoint: 'session/follow',
          payload: { args: { request: { address: { kind: 'session', sessionId }, assistantStream: true } } }
        }))
      })
      socket.on('message', (data) => {
        try {
          const frame = JSON.parse(data.toString()) as { type?: string; streamId?: string; error?: unknown; value?: { type?: string; records?: unknown[] } }
          if (frame.type === 'error') { finish(new Error(JSON.stringify(frame.error))); return }
          if (frame.type === 'item' && frame.streamId === 'follow-1' && frame.value?.type === 'snapshot') {
            finish(null, frame.value)
          }
        } catch {
          // 无关帧，继续等 snapshot。
        }
      })
      socket.on('error', (error) => finish(error instanceof Error ? error : new Error(String(error))))
    })
  }

  private readConfig(): StoredConfig {
    try {
      const parsed = JSON.parse(readFileSync(this.configPath, 'utf8')) as StoredConfig
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  private saveConfig(): void {
    try {
      mkdirSync(path.dirname(this.configPath), { recursive: true })
      writeFileSync(this.configPath, `${JSON.stringify(this.config, null, 2)}\n`, 'utf8')
    } catch {
      // 配置写不进去不影响本次连接。
    }
  }
}
