import { afterEach, describe, expect, it } from 'vitest'
import { PET_MCP_TOOLS, PetMcpBridge } from '../src/main/pet-mcp-server'

const cleanups: Array<() => void | Promise<void>> = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

interface RpcReply {
  status: number
  body: {
    jsonrpc?: string
    id?: unknown
    result?: unknown
    error?: { code: number; message: string }
  }
}

async function rpc(bridge: PetMcpBridge, message: unknown, token?: string): Promise<RpcReply> {
  const endpoint = bridge.endpoint
  if (!endpoint) throw new Error('bridge not started')
  const response = await fetch(`${endpoint.url}/mcp/${token ?? endpoint.token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(message)
  })
  return { status: response.status, body: await response.json() as RpcReply['body'] }
}

describe('MCP over HTTP endpoint', () => {
  it('answers initialize with the pet server descriptor', async () => {
    const bridge = new PetMcpBridge()
    await bridge.start()
    cleanups.push(() => bridge.close())

    const reply = await rpc(bridge, {
      jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' }
    })
    expect(reply.status).toBe(200)
    expect(reply.body.jsonrpc).toBe('2.0')
    expect(reply.body.id).toBe(1)
    const result = reply.body.result as {
      protocolVersion: string
      capabilities: { tools: unknown }
      serverInfo: { name: string }
    }
    expect(result.protocolVersion).toBe('2025-06-18')
    expect(result.capabilities.tools).toBeDefined()
    expect(result.serverInfo.name).toBe('pet')
  })

  it('lists the same tools as the stdio bridge', async () => {
    const bridge = new PetMcpBridge()
    await bridge.start()
    cleanups.push(() => bridge.close())

    const reply = await rpc(bridge, { jsonrpc: '2.0', id: 2, method: 'tools/list' })
    const tools = (reply.body.result as { tools: Array<{ name: string }> }).tools
    expect([...tools.map((tool) => tool.name)].sort()).toEqual([...PET_MCP_TOOLS.map((tool) => tool.name)].sort())
  })

  it('calls a tool and returns its content blocks', async () => {
    const bridge = new PetMcpBridge()
    bridge.setConversationBridge({
      list: () => [{ id: 'a', title: '开发1', running: false, archived: false }],
      send: async () => ({ id: 'a', title: 'ok' })
    })
    await bridge.start()
    cleanups.push(() => bridge.close())

    const reply = await rpc(bridge, {
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'conversations_list', arguments: {} }
    })
    const result = reply.body.result as { content: Array<{ text: string }>; isError?: boolean }
    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0].text)).toEqual({
      conversations: [{ id: 'a', title: '开发1', running: false }]
    })
  })

  it('rejects a wrong token and accepts notifications without a body', async () => {
    const bridge = new PetMcpBridge()
    await bridge.start()
    cleanups.push(() => bridge.close())

    const denied = await rpc(bridge, { jsonrpc: '2.0', id: 4, method: 'tools/list' }, 'wrong')
    expect(denied.status).toBe(401)

    const endpoint = bridge.endpoint
    if (!endpoint) throw new Error('bridge not started')
    const notification = await fetch(`${endpoint.url}/mcp/${endpoint.token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
    })
    expect(notification.status).toBe(202)
  })

  it('reports an unknown method as a JSON-RPC error', async () => {
    const bridge = new PetMcpBridge()
    await bridge.start()
    cleanups.push(() => bridge.close())

    const reply = await rpc(bridge, { jsonrpc: '2.0', id: 5, method: 'nope/nope' })
    expect(reply.body.error?.code).toBe(-32601)
  })

  it('hides web tools when search is disabled', async () => {
    const bridge = new PetMcpBridge()
    bridge.webSearchEnabled = false
    await bridge.start()
    cleanups.push(() => bridge.close())

    const reply = await rpc(bridge, { jsonrpc: '2.0', id: 6, method: 'tools/list' })
    const tools = (reply.body.result as { tools: Array<{ name: string }> }).tools
    expect(tools.some((tool) => tool.name.startsWith('deepseek_'))).toBe(false)
  })
})
