#!/usr/bin/env node
/**
 * 电脑端访问手机 DSH Go 的对话库。
 *
 * 依赖手机侧安装 @xiazhi88/dshgo 插件（把 127.0.0.1:3080 暴露到局域网 3081），
 * 电脑与手机在同一网段。两边对话库各自独立，这里只通过 Web API 读和发。
 *
 * 用法：
 *   node scripts/phone-dsh.mjs list
 *   node scripts/phone-dsh.mjs read --session <id>
 *   node scripts/phone-dsh.mjs send --session <id> --text "内容"
 *
 * 可选：--host 192.168.31.12:3081（默认从环境变量 PHONE_DSH_HOST 或 adb 里取）
 */
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const require = createRequire('D:/DesktopPetProject/reference/dsh-poc/package.json')
const WebSocket = require('ws')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const ADB = 'D:\\DesktopPetProject\\tools\\platform-tools\\adb.exe'

function parseArgs(argv) {
  const args = { _: [] }
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index]
    if (token.startsWith('--')) {
      const key = token.slice(2)
      const value = argv[index + 1]
      if (value !== undefined && !value.startsWith('--')) {
        args[key] = value
        index++
      } else {
        args[key] = true
      }
    } else {
      args._.push(token)
    }
  }
  return args
}

function phoneHost(explicit) {
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.PHONE_DSH_HOST) return process.env.PHONE_DSH_HOST.replace(/\/$/, '')
  try {
    const output = execFileSync(ADB, ['shell', 'ip', '-4', 'addr', 'show', 'wlan0'], { encoding: 'utf8' })
    const match = output.match(/inet (\d+\.\d+\.\d+\.\d+)/)
    if (match) return `${match[1]}:3081`
  } catch {
    // adb 不在或手机没连时退回占位地址，由调用方覆盖。
  }
  throw new Error('拿不到手机地址，请用 --host 指定，或设置 PHONE_DSH_HOST')
}

async function login(base, password) {
  const cookies = []
  // 插件设了访问密码时，先过闸门拿 dshgo-unlock，再走 dsh web 的登录。
  if (password) {
    const unlock = await fetch(`${base}/__dshgo__/unlock`, {
      method: 'POST',
      headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password }).toString(),
      redirect: 'manual'
    })
    const unlockCookies = (unlock.headers.getSetCookie?.() ?? []).map((value) => value.split(';')[0])
    if (unlock.status !== 303 || unlockCookies.length === 0) throw new Error(`访问密码不对，HTTP ${unlock.status}`)
    cookies.push(...unlockCookies)
  }
  const response = await fetch(`${base}/`, {
    headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', cookie: cookies.join('; ') },
    redirect: 'manual'
  })
  const authCookies = (response.headers.getSetCookie?.() ?? []).map((value) => value.split(';')[0])
  if (!authCookies.length) throw new Error(`登录失败，HTTP ${response.status}`)
  cookies.push(...authCookies)
  return cookies.join('; ')
}

async function rpc(base, cookie, method, args) {
  const response = await fetch(`${base}/api/${method}`, {
    method: 'POST',
    headers: { 'user-agent': UA, cookie, 'content-type': 'application/json', origin: base, referer: `${base}/` },
    body: JSON.stringify({
      type: 'client-request',
      rpcId: `pc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      method,
      payload: { args }
    })
  })
  const data = await response.json()
  if (!data.result?.ok) {
    throw new Error(`${method}: ${JSON.stringify(data.result?.error ?? data)}`)
  }
  return data.result.value
}

function followSnapshot(base, cookie, sessionId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${base.replace('http', 'ws')}/api/remote.mux`, {
      headers: { cookie, origin: base, 'user-agent': UA }
    })
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('读取会话超时'))
    }, 20_000)
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'open',
        streamId: 'follow-1',
        endpoint: 'session/follow',
        payload: { args: { request: { address: { kind: 'session', sessionId }, assistantStream: true } } }
      }))
    })
    ws.on('message', (data) => {
      const frame = JSON.parse(data.toString())
      if (frame.type === 'error') {
        clearTimeout(timer)
        ws.close()
        reject(new Error(JSON.stringify(frame.error)))
        return
      }
      if (frame.type === 'item' && frame.streamId === 'follow-1' && frame.value?.type === 'snapshot') {
        clearTimeout(timer)
        ws.close()
        resolve(frame.value)
      }
    })
    ws.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

/** 把日志记录压成一行可读文本。 */
function summarizeRecord(record) {
  const event = record?.event ?? record
  const type = event?.type ?? 'unknown'
  const data = event?.data ?? {}
  if (type === 'assistant/message' || type === 'user/message') {
    const parts = data.message?.content ?? []
    const text = parts.filter((part) => part.type === 'text').map((part) => part.text).join('')
    return `[${type}] ${text.slice(0, 2000)}`
  }
  if (type === 'turn/start' || type === 'turn/end' || type === 'step/start' || type === 'step/end') {
    return `[${type}] turn=${data.turn} step=${data.step ?? ''}`
  }
  return `[${type}] ${JSON.stringify(data).slice(0, 160)}`
}

const args = parseArgs(process.argv.slice(2))
const command = args._[0]
const host = phoneHost(args.host)
const base = host.startsWith('http') ? host : `http://${host}`

try {
  const cookie = await login(base, args.password ?? process.env.PHONE_DSH_PASSWORD)

  if (command === 'list') {
    const value = await rpc(base, cookie, 'session/list', { _request: {} })
    for (const item of value.items) {
      const title = item.projections?.values?.title ?? '(无标题)'
      console.log(`${item.sessionId}  running=${item.running}  ${title}`)
    }
  } else if (command === 'read') {
    if (!args.session) throw new Error('缺少 --session')
    const snapshot = await followSnapshot(base, cookie, args.session)
    const records = snapshot.records ?? []
    console.log(`cursor=${snapshot.cursor} records=${records.length}`)
    for (const record of records.slice(-30)) console.log(summarizeRecord(record))
  } else if (command === 'send') {
    if (!args.session) throw new Error('缺少 --session')
    if (!args.text) throw new Error('缺少 --text')
    const value = await rpc(base, cookie, 'session/prompt', {
      request: {
        requestId: `pc-${Date.now()}`,
        sessionId: args.session,
        mode: 'queue',
        content: [{ type: 'text', text: args.text }]
      }
    })
    console.log('已接受:', JSON.stringify(value))
  } else {
    console.log('用法: node scripts/phone-dsh.mjs <list|read|send> [--session id] [--text 内容] [--host ip:port]')
    process.exit(1)
  }
} catch (error) {
  console.error('失败:', error instanceof Error ? error.message : String(error))
  process.exit(1)
}
