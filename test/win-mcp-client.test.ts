import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WinMcpClient, defaultWindowsMcpExecutable } from '../src/main/win-mcp-client'

const installed = existsSync(defaultWindowsMcpExecutable())

describe.skipIf(!installed)('WinMcpClient', () => {
  it('lists the backend tools and forwards one call', async () => {
    const client = new WinMcpClient()
    try {
      const tools = await client.listTools()
      expect(tools.some((tool) => tool.name === 'Screenshot')).toBe(true)
      // 等待工具不对外暴露：模型侧不该再看到 Wait。
      expect(tools.some((tool) => tool.name.toLowerCase() === 'wait')).toBe(false)
      const result = await client.callTool('Screenshot', { region: [0, 0, 80, 60] })
      expect(JSON.stringify(result)).toContain('content')
    } finally {
      client.close()
    }
  }, 60_000)
})
