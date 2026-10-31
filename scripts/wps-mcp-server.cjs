/** WPS MCP server（只读）。
 *
 *  通过 PowerShell + COM 访问本机 WPS：列打开文档、读文字正文、读表格前 N 行。
 *  协议：换行分隔的 JSON-RPC over stdin/stdout；日志走 stderr。
 *  每个调用 20 秒超时（首次拉起 WPS 较慢），失败返回可读中文错误。 */

const { spawn } = require('node:child_process')
const path = require('node:path')
const readline = require('node:readline')

const SCRIPT = path.join(__dirname, 'wps-com.ps1')

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

function textResult(text, isError = false) {
  return { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) }
}

function runPowerShell(args) {
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT, ...args], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve({ ok: false, error: 'WPS 调用超时（20 秒）；首次启动 WPS 可能较慢，确认 WPS 已安装且能手动打开' })
    }, 20000)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { out += chunk })
    child.stderr.on('data', (chunk) => { err += chunk })
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ ok: false, error: `无法启动 PowerShell：${error.message}` })
    })
    child.on('close', () => {
      clearTimeout(timer)
      try {
        resolve(JSON.parse(out.trim().split('\n').pop() || '{}'))
      } catch {
        resolve({ ok: false, error: err.trim() || 'WPS 返回内容无法解析' })
      }
    })
  })
}

const tools = [
  {
    name: 'wps_list_documents',
    description: '列出当前 WPS 中已经打开的文档（名称、路径、类型）。',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      properties: {
        documents: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, path: { type: 'string' }, kind: { type: 'string' } } } }
      }
    }
  },
  {
    name: 'wps_read_document',
    description: '读取 WPS 文字文档的正文文本。只读，不修改文件。',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: '文档绝对路径' } },
      required: ['path']
    },
    outputSchema: {
      type: 'object',
      properties: { path: { type: 'string' }, kind: { type: 'string' }, text: { type: 'string' } }
    }
  },
  {
    name: 'wps_read_sheet',
    description: '读取 WPS 表格某个工作表的单元格，默认前 200 行。只读。',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '表格绝对路径' },
        sheet: { type: 'number', description: '工作表序号，从 1 开始，默认 1' },
        rows: { type: 'number', description: '最多返回多少行，默认 200' }
      },
      required: ['path']
    },
    outputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        sheet: { type: 'number' },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
        truncated: { type: 'boolean' }
      }
    }
  },
  {
    name: 'wps_write_cell',
    description: '把文字写进 WPS 表格的某个单元格并立即保存。会修改文件，调用前请确认。',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '表格绝对路径' },
        sheet: { type: 'number', description: '工作表序号，从 1 开始，默认 1' },
        row: { type: 'number', description: '行号，从 1 开始' },
        column: { type: 'number', description: '列号，从 1 开始' },
        text: { type: 'string', description: '要写入的文字' }
      },
      required: ['path', 'row', 'column', 'text']
    },
    outputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        sheet: { type: 'number' },
        row: { type: 'number' },
        column: { type: 'number' },
        text: { type: 'string' }
      }
    }
  }
]

/** 打开的文档同时作为 MCP resources 暴露，客户端可以按 uri 读取。 */
function documentUri(file) {
  return `wps://document/${encodeURIComponent(file)}`
}

async function listResources() {
  const result = await runPowerShell(['-Action', 'list'])
  if (!result.ok) return []
  return (result.documents ?? []).map((doc) => ({
    uri: documentUri(doc.path),
    name: doc.name,
    mimeType: doc.kind === 'sheet'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }))
}

async function readResource(uri) {
  const prefix = 'wps://document/'
  if (!uri.startsWith(prefix)) return null
  const file = decodeURIComponent(uri.slice(prefix.length))
  const result = await runPowerShell(['-Action', 'read', '-Path', file])
  if (!result.ok) throw new Error(result.error || '读取失败')
  return { contents: [{ uri, mimeType: 'text/plain', text: result.text ?? '' }] }
}

async function callTool(name, args) {
  if (name === 'wps_list_documents') {
    const result = await runPowerShell(['-Action', 'list'])
    if (!result.ok) return textResult(result.error || '读取 WPS 文档列表失败', true)
    const documents = result.documents ?? []
    if (!documents.length) return textResult('当前没有打开的 WPS 文档。')
    return textResult(documents.map((doc) => `${doc.name} (${doc.kind})\n${doc.path}`).join('\n\n'))
  }
  if (name === 'wps_write_cell') {
    const file = typeof args?.path === 'string' ? args.path.trim() : ''
    if (!file) return textResult('path 是必填项', true)
    const row = Math.round(Number(args?.row) || 0)
    const column = Math.round(Number(args?.column) || 0)
    if (row < 1 || column < 1) return textResult('row 和 column 从 1 开始', true)
    const text = typeof args?.text === 'string' ? args.text : ''
    const result = await runPowerShell([
      '-Action', 'write', '-Path', file,
      '-Sheet', String(Math.max(1, Math.round(Number(args?.sheet) || 1))),
      '-Row', String(row), '-Column', String(column), '-Text', text
    ])
    if (!result.ok) return textResult(result.error || '写入失败', true)
    // 写成功等于文档内容变了，主动告诉客户端资源列表/内容需要刷新。
    send({ jsonrpc: '2.0', method: 'notifications/resources/list_changed' })
    return textResult(`已写入 ${file} 第 ${row} 行第 ${column} 列：${text}`)
  }
  if (name === 'wps_read_document' || name === 'wps_read_sheet') {
    const file = typeof args?.path === 'string' ? args.path.trim() : ''
    if (!file) return textResult('path 是必填项', true)
    const phase = name === 'wps_read_document' ? 'read' : 'sheet'
    const extra = phase === 'sheet'
      ? ['-Sheet', String(Math.max(1, Math.round(Number(args?.sheet) || 1))), '-Rows', String(Math.max(1, Math.round(Number(args?.rows) || 200)))]
      : []
    const result = await runPowerShell(['-Action', phase, '-Path', file, ...extra])
    if (!result.ok) return textResult(result.error || '读取失败', true)
    if (phase === 'read') return textResult(result.text || '（空文档）')
    const rows = Array.isArray(result.rows) ? result.rows : []
    const text = rows.map((row) => (Array.isArray(row) ? row.join('\t') : String(row))).join('\n')
    return textResult(`${text}${result.truncated ? '\n…（已截断）' : ''}`)
  }
  return textResult(`未知工具：${name}`, true)
}

/** 处理一条 JSON-RPC 消息，返回响应；通知返回 null。
 *  stdio 和 HTTP 两种传输共用这一份逻辑。 */
async function handleMessage(message) {
  const { id, method, params } = message
  if (id === undefined || id === null) return null
  try {
    if (method === 'initialize') {
      return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: { name: 'wps', version: '1.1.0' } } }
    }
    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema, outputSchema: tool.outputSchema })) } }
    }
    if (method === 'prompts/list') {
      return { jsonrpc: '2.0', id, result: { prompts: [
        { name: 'wps_document_summary', description: '把一份 WPS 文档读出来并总结要点', arguments: [{ name: 'path', description: '文档绝对路径', required: true }] },
        { name: 'wps_sheet_digest', description: '读取表格前若干行并给出数据概览', arguments: [{ name: 'path', description: '文档绝对路径', required: true }, { name: 'rows', description: '行数，默认 50', required: false }] }
      ] } }
    }
    if (method === 'prompts/get') {
      const name = String(params?.name ?? '')
      const args = params?.arguments && typeof params.arguments === 'object' ? params.arguments : {}
      const file = typeof args.path === 'string' ? args.path.trim() : ''
      if (!file) {
        return { jsonrpc: '2.0', id, error: { code: -32602, message: 'path 是必填项' } }
      }
      const text = name === 'wps_document_summary'
        ? `请用 wps_read_document 读取 ${file}，然后用中文总结要点，不超过五条。`
        : name === 'wps_sheet_digest'
          ? `请用 wps_read_sheet 读取 ${file} 的前 ${Math.max(1, Math.round(Number(args.rows) || 50))} 行，用中文给出数据概览。`
          : ''
      if (!text) {
        return { jsonrpc: '2.0', id, error: { code: -32602, message: `未知的提示：${name}` } }
      }
      return { jsonrpc: '2.0', id, result: { description: name, messages: [{ role: 'user', content: { type: 'text', text } }] } }
    }
    if (method === 'resources/list') {
      return { jsonrpc: '2.0', id, result: { resources: await listResources() } }
    }
    if (method === 'resources/read') {
      const uri = String(params?.uri ?? '')
      const resource = await readResource(uri)
      if (!resource) {
        return { jsonrpc: '2.0', id, error: { code: -32602, message: `不支持的资源：${uri}` } }
      }
      return { jsonrpc: '2.0', id, result: resource }
    }
    if (method === 'tools/call') {
      const name = String(params?.name ?? '')
      const args = params?.arguments && typeof params.arguments === 'object' ? params.arguments : {}
      return { jsonrpc: '2.0', id, result: await callTool(name, args) }
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: `未实现的方法：${method}` } }
  } catch (error) {
    return { jsonrpc: '2.0', id, error: { code: -32603, message: error instanceof Error ? error.message : String(error) } }
  }
}

const argv = process.argv.slice(2)
const httpMode = argv.includes('--http')
const tokenIndex = argv.indexOf('--token')
const httpToken = tokenIndex >= 0 ? argv[tokenIndex + 1] : ''
const portIndex = argv.indexOf('--port')
const httpPort = portIndex >= 0 ? Number(argv[portIndex + 1]) : 0

if (httpMode) {
  /** 共享 HTTP 实例：主进程只起一份，所有会话连同一个地址。 */
  const http = require('node:http')
  const server = http.createServer((request, response) => {
    const reply = (status, body) => {
      const payload = JSON.stringify(body)
      response.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(payload)
      })
      response.end(payload)
    }
    const match = /^\/mcp\/([^/]+)$/.exec(request.url || '')
    if (!match || match[1] !== httpToken) {
      reply(401, { error: 'unauthorized' })
      return
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'POST' })
      response.end()
      return
    }
    let raw = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => { raw += chunk })
    request.on('end', () => {
      let message
      try {
        message = JSON.parse(raw)
      } catch {
        reply(400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } })
        return
      }
      if (message.id === undefined || message.id === null) {
        reply(202, {})
        return
      }
      handleMessage(message).then(
        (result) => reply(200, result || { jsonrpc: '2.0', id: message.id, result: {} }),
        (error) => reply(200, { jsonrpc: '2.0', id: message.id, error: { code: -32603, message: String(error) } })
      )
    })
  })
  server.listen(httpPort, '127.0.0.1', () => {
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    // 主进程靠这一行拿端口；只写一次，不走 stderr 日志。
    process.stdout.write(`WPS_MCP_PORT=${port}\n`)
  })
} else {
  const rl = readline.createInterface({ input: process.stdin })
  rl.on('line', async (line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    let message
    try {
      message = JSON.parse(trimmed)
    } catch {
      return
    }
    const response = await handleMessage(message)
    if (response) send(response)
  })
}