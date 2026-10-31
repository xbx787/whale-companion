import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const cleanups: Array<() => void | Promise<void>> = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

interface Running {
  child: ChildProcess
  url: string
  port: number
}

function startServer(token: string): Promise<Running> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve('scripts/wps-mcp-server.cjs'), '--http', '--token', token], {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let buffer = ''
    const timer = setTimeout(() => reject(new Error('WPS MCP 没有在 8 秒内报告端口')), 8_000)
    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => {
      buffer += chunk
      const match = /WPS_MCP_PORT=(\d+)/.exec(buffer)
      if (!match) return
      clearTimeout(timer)
      const port = Number(match[1])
      cleanups.push(() => { child.kill() })
      resolve({ child, port, url: `http://127.0.0.1:${port}/mcp/${token}` })
    })
    child.on('error', (error) => { clearTimeout(timer); reject(error) })
  })
}

async function rpc(url: string, message: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(message)
  })
  return { status: response.status, body: await response.json() as Record<string, unknown> }
}

describe('WPS MCP shared HTTP instance', () => {
  it('answers initialize and lists its tools', async () => {
    const server = await startServer('test-token')
    const initialized = await rpc(server.url, {
      jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' }
    })
    expect(initialized.status).toBe(200)
    const result = initialized.body.result as { serverInfo: { name: string } }
    expect(result.serverInfo.name).toBe('wps')

    const listed = await rpc(server.url, { jsonrpc: '2.0', id: 2, method: 'tools/list' })
    const tools = (listed.body.result as { tools: Array<{ name: string }> }).tools
    expect(tools.map((tool) => tool.name)).toContain('wps_list_documents')
  })

  it('rejects a wrong token and methods it does not implement', async () => {
    const server = await startServer('right-token')
    const denied = await rpc(`http://127.0.0.1:${server.port}/mcp/wrong`, {
      jsonrpc: '2.0', id: 3, method: 'tools/list'
    })
    expect(denied.status).toBe(401)

    const unknown = await rpc(server.url, { jsonrpc: '2.0', id: 4, method: 'nope/nope' })
    expect((unknown.body.error as { code: number }).code).toBe(-32601)
  })
})
