/** 手机端 DSH 访问本机鲸鱼对话库的最小 HTTP 接口。
 *
 *  和 phone-dsh 脚本的方向相反：那个是电脑读手机，这个是手机读电脑。
 *  只暴露三件事：列会话、读某个会话的最近消息、往某个会话发一句话；
 *  另外给一个 /help 端点，让手机上的模型能自己发现接口。
 *
 *  鉴权用一次性随机 token，写在 data/phone-api.json；监听地址默认局域网，
 *  手机和电脑需要在同一网段。所有写操作都落到同一个 ConversationController，
 *  不另起 dsh 进程，也不碰会话库文件。 */
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ConversationController } from './conversation-controller'
import type { TimelineEntry } from '../shared/contracts'

export interface PhoneApiOptions {
  port?: number
  host?: string
  dataRoot: string
  controller: () => ConversationController
}

export interface PhoneApiHandle {
  port: number
  token: string
  url: string
  close: () => Promise<void>
}

const DEFAULT_PORT = 11_246
const MAX_BODY_BYTES = 256_000
const DEFAULT_LIMIT = 40
const MAX_LIMIT = 200

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function tokenOf(request: IncomingMessage, url: URL): string {
  const header = request.headers['x-phone-token']
  if (typeof header === 'string' && header) return header
  return url.searchParams.get('token') ?? ''
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text)
  })
  response.end(text)
}

function sendText(response: ServerResponse, status: number, text: string): void {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
  response.end(text)
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > MAX_BODY_BYTES) throw new Error('请求体过大。')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** 只把手机需要的字段递出去，别把整个库和用量对象暴露出去。 */
function toMobileEntry(entry: TimelineEntry): Record<string, unknown> {
  return {
    id: entry.id,
    kind: entry.kind,
    text: entry.kind === 'tool' ? `${entry.tool?.name ?? '工具'}${entry.tool?.status === 'error' ? '（失败）' : ''}` : entry.text,
    time: entry.time
  }
}

export async function startPhoneApi(options: PhoneApiOptions): Promise<PhoneApiHandle> {
  const port = options.port ?? DEFAULT_PORT
  const host = options.host ?? '0.0.0.0'
  const token = randomBytes(24).toString('base64url')

  const server = createServer((request, response) => {
    void handle(request, response).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      sendText(response, 500, message)
    })
  })

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)

    // help 不要求 token：它只描述接口形状，不含任何数据。
    if (request.method === 'GET' && url.pathname === '/help') {
      sendText(response, 200, [
        '手机端访问鲸鱼对话库的接口。所有 /api/* 都要带 token（?token= 或 x-phone-token 头）。',
        '',
        'GET  /api/list?token=            列出全部会话：id、标题、状态',
        'GET  /api/read?token=&id=&limit= 读某个会话最近消息，limit 默认 40 最大 200',
        'POST /api/send?token=            body {"id":"...","text":"..."} 往该会话发一句话',
        'POST /api/interrupt?token=       body {"id":"..."} 停止该会话当前回合'
      ].join('\n'))
      return
    }

    if (!safeEqual(tokenOf(request, url), token)) {
      sendJson(response, 403, { error: 'token 无效' })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/list') {
      const controller = options.controller()
      const items = await controller.listConversations()
      sendJson(response, 200, {
        conversations: items.map((item) => ({
          id: item.id,
          title: item.title,
          taskStatus: item.taskStatus ?? 'idle',
          updatedAt: item.updatedAt
        }))
      })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/read') {
      const id = url.searchParams.get('id') ?? ''
      if (!id) {
        sendJson(response, 400, { error: '缺少 id' })
        return
      }
      const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT))
      const controller = options.controller()
      // before 是绝对索引；给一个大数让 timelinePage 自己夹到当前长度。
      const entries = await controller.timelinePage(id, Number.MAX_SAFE_INTEGER, limit)
      sendJson(response, 200, { id, entries: entries.map(toMobileEntry) })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/send') {
      const raw = await readBody(request)
      let id = ''
      let text = ''
      try {
        const parsed = JSON.parse(raw) as { id?: unknown; text?: unknown }
        id = typeof parsed.id === 'string' ? parsed.id : ''
        text = typeof parsed.text === 'string' ? parsed.text : ''
      } catch {
        sendJson(response, 400, { error: '请求体不是合法 JSON。' })
        return
      }
      const clean = text.trim()
      if (!id || !clean) {
        sendJson(response, 400, { error: '需要 id 和 text。' })
        return
      }
      if (clean.length > 8_000) {
        sendJson(response, 400, { error: '单条消息最多 8000 字。' })
        return
      }
      const controller = options.controller()
      await controller.sendMessage(clean, [], 'queue', id)
      sendJson(response, 200, { ok: true })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/interrupt') {
      const raw = await readBody(request)
      let id = ''
      try {
        id = String((JSON.parse(raw) as { id?: unknown }).id ?? '')
      } catch {
        sendJson(response, 400, { error: '请求体不是合法 JSON。' })
        return
      }
      if (!id) {
        sendJson(response, 400, { error: '需要 id。' })
        return
      }
      await options.controller().interruptTurn(id)
      sendJson(response, 200, { ok: true })
      return
    }

    sendText(response, 404, 'not found')
  }

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => resolve())
  })

  const url = `http://127.0.0.1:${port}/help?token=${encodeURIComponent(token)}`
  await mkdir(options.dataRoot, { recursive: true }).catch(() => undefined)
  await writeFile(path.join(options.dataRoot, 'phone-api.json'), `${JSON.stringify({
    port,
    host,
    token,
    help: url,
    startedAt: new Date().toISOString()
  }, null, 2)}\n`, 'utf8').catch(() => undefined)

  return {
    port,
    token,
    url,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}
