import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import path from 'node:path'

const server = path.join(process.cwd(), 'scripts', 'wps-mcp-server.cjs')

function ask(messages: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [server], { stdio: ['pipe', 'pipe', 'pipe'] })
    const lines: string[] = []
    let buffer = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      buffer += chunk
      let index = buffer.indexOf('\n')
      while (index >= 0) {
        lines.push(buffer.slice(0, index))
        buffer = buffer.slice(index + 1)
        index = buffer.indexOf('\n')
      }
      if (lines.length >= messages.length) {
        child.kill()
        resolve(lines)
      }
    })
    child.on('error', reject)
    child.on('close', () => resolve(lines))
    for (const message of messages) child.stdin.write(`${message}\n`)
  })
}

describe('wps mcp server', () => {
  it('answers initialize and lists the three read-only tools', async () => {
    const lines = await ask([
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
    ])
    const init = JSON.parse(lines[0] ?? '{}')
    expect(init.result?.serverInfo?.name).toBe('wps')
    expect(init.result?.capabilities?.resources).toBeDefined()
    expect(init.result?.capabilities?.prompts).toBeDefined()
    const list = JSON.parse(lines[1] ?? '{}')
    const names = (list.result?.tools ?? []).map((tool: { name: string }) => tool.name)
    expect(names).toEqual(['wps_list_documents', 'wps_read_document', 'wps_read_sheet', 'wps_write_cell'])
    expect(list.result?.tools?.[0]?.outputSchema).toBeDefined()
  })


  it('serves a prompt template for document summaries', async () => {
    const lines = await ask([
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'prompts/get', params: { name: 'wps_document_summary', arguments: { path: 'D:/a.docx' } } })
    ])
    const prompt = JSON.parse(lines[1] ?? '{}')
    expect(prompt.result?.messages?.[0]?.content?.text).toContain('D:/a.docx')
    expect(prompt.result?.messages?.[0]?.content?.text).toContain('wps_read_document')
  })
  it('rejects a read without a path', async () => {
    const lines = await ask([
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'wps_read_document', arguments: {} } })
    ])
    const call = JSON.parse(lines[1] ?? '{}')
    expect(call.result?.isError).toBe(true)
    expect(call.result?.content?.[0]?.text).toContain('path')
  })
})
