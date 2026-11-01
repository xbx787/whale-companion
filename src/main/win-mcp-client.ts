/** 宿主侧的 windows-mcp 后端客户端。
 *
 *  轻量内置：windows-mcp 仍以 Python 进程存在，但不再作为 MCP 服务器直接
 *  暴露给模型；宿主通过 stdio JSON-RPC 调它的工具，再以自己的工具名转发，
 *  模型侧看到的就是内置工具而不是 mcp__windows-mcp__*。
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

export interface WinToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

/** windows-mcp 里不转给模型的工具（名称小写后比对）。 */
const HIDDEN_TOOLS = new Set(['wait'])

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

const DEFAULT_EXE = path.join(os.homedir(), 'AppData', 'Roaming', 'uv', 'tools', 'windows-mcp', 'Scripts', 'windows-mcp.exe')

export function defaultWindowsMcpExecutable(): string {
  return process.env.WINDOWS_MCP_EXE?.trim() || DEFAULT_EXE
}

export class WinMcpClient {
  private child: ChildProcessWithoutNullStreams | undefined
  private nextId = 1
  private readonly pending = new Map<number, Pending>()
  private buffer = ''
  private ready: Promise<void> | undefined

  constructor(private readonly executable = defaultWindowsMcpExecutable()) {}

  /** 启动后端并完成 initialize；失败时抛出明确错误。 */
  start(): Promise<void> {
    if (this.ready) return this.ready
    this.ready = new Promise<void>((resolve, reject) => {
      let settled = false
      const child = spawn(this.executable, ['serve'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
      this.child = child
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (chunk: string) => this.onData(chunk))
      child.stderr.on('data', () => undefined)
      child.on('error', (error) => {
        if (!settled) { settled = true; reject(error) }
      })
      child.on('exit', (code) => {
        this.child = undefined
        this.ready = undefined
        for (const pending of this.pending.values()) pending.reject(new Error(`windows-mcp 已退出（${code ?? 'unknown'}）。`))
        this.pending.clear()
      })
      void this.request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'whale-companion', version: '1.0.0' }
      }).then(() => {
        this.notify('notifications/initialized', {})
        if (!settled) { settled = true; resolve() }
      }).catch((error: unknown) => {
        if (!settled) { settled = true; reject(error instanceof Error ? error : new Error(String(error))) }
      })
    })
    return this.ready
  }

  async listTools(): Promise<WinToolDefinition[]> {
    await this.start()
    const result = await this.request('tools/list', {}) as { tools?: unknown }
    const tools = Array.isArray(result?.tools) ? result.tools : []
    return tools.flatMap((item) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {}
      const name = typeof record.name === 'string' ? record.name : ''
      if (!name) return []
      // 不对外暴露等待工具：等多久由调用方自己决定，不在桌面工具里多一个空转入口。
      if (HIDDEN_TOOLS.has(name.toLowerCase())) return []
      return [{
        name,
        description: typeof record.description === 'string' ? record.description : '',
        inputSchema: record.inputSchema && typeof record.inputSchema === 'object'
          ? record.inputSchema as Record<string, unknown>
          : { type: 'object', properties: {} }
      }]
    })
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    await this.start()
    return await this.request('tools/call', { name, arguments: args })
  }

  close(): void {
    this.child?.kill()
    this.child = undefined
    this.ready = undefined
  }

  private notify(method: string, params: Record<string, unknown>): void {
    this.child?.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`)
  }

  private request(method: string, params: Record<string, unknown>, timeoutMs = 120_000): Promise<unknown> {
    const child = this.child
    if (!child) return Promise.reject(new Error('windows-mcp 后端未启动。'))
    const id = this.nextId++
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`windows-mcp 请求超时：${method}`))
      }, timeoutMs)
      timer.unref?.()
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value) },
        reject: (error) => { clearTimeout(timer); reject(error) }
      })
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    })
  }

  private onData(chunk: string): void {
    this.buffer += chunk
    for (;;) {
      const index = this.buffer.indexOf('\n')
      if (index < 0) return
      const line = this.buffer.slice(0, index).trim()
      this.buffer = this.buffer.slice(index + 1)
      if (!line) continue
      let message: Record<string, unknown>
      try {
        message = JSON.parse(line) as Record<string, unknown>
      } catch {
        continue
      }
      const id = typeof message.id === 'number' ? message.id : undefined
      if (id === undefined) continue
      const pending = this.pending.get(id)
      if (!pending) continue
      this.pending.delete(id)
      if (message.error) {
        const error = message.error as Record<string, unknown>
        pending.reject(new Error(typeof error.message === 'string' ? error.message : 'windows-mcp 调用失败。'))
      } else {
        pending.resolve(message.result)
      }
    }
  }
}
