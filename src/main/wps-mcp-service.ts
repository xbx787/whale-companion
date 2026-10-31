import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'

/** 所有注入 DSH 的 WPS MCP 条目共享同一个进程。
 *
 *  以前每个 ACP 会话各拉一个 `wps-mcp-server.cjs`，Electron 当 Node 运行时
 *  光启动就要约 107MB。WPS 工具本身很少用，改成主进程懒启动一个 HTTP 实例，
 *  会话直接连它；起不来就退回 stdio，功能不丢。 */
export class WpsMcpService {
  private child: ChildProcess | undefined
  private startPromise: Promise<{ url: string } | null> | undefined
  private cached: { url: string } | null = null
  readonly token = randomBytes(16).toString('hex')

  constructor(private readonly scriptPath: () => string | null) {}

  /** 已就绪时同步返回 URL，用于不阻塞会话创建。 */
  get readyUrl(): string | null {
    return this.cached?.url ?? null
  }

  start(): Promise<{ url: string } | null> {
    if (this.cached) return Promise.resolve(this.cached)
    if (this.startPromise) return this.startPromise
    this.startPromise = new Promise((resolve) => {
      const script = this.scriptPath()
      if (!script) {
        resolve(null)
        return
      }
      let settled = false
      let buffer = ''
      const done = (value: { url: string } | null): void => {
        if (settled) return
        settled = true
        resolve(value)
      }
      let child: ChildProcess
      try {
        child = spawn(process.execPath, [script, '--http', '--token', this.token], {
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true
        })
      } catch {
        done(null)
        return
      }
      this.child = child
      // 不消费 stderr 会让管道写满后子进程阻塞。
      child.stderr?.resume()
      child.stdout?.setEncoding('utf8')
      child.stdout?.on('data', (chunk: string) => {
        buffer += chunk
        const match = /WPS_MCP_PORT=(\d+)/.exec(buffer)
        if (!match) return
        this.cached = { url: `http://127.0.0.1:${match[1]}/mcp/${this.token}` }
        done(this.cached)
      })
      child.on('error', () => done(null))
      child.on('exit', () => {
        this.child = undefined
        this.cached = null
        this.startPromise = undefined
        done(null)
      })
      // 起不来就不要把整个会话创建卡住；退回 stdio 由调用方决定。
      setTimeout(() => done(null), 8_000)
    })
    return this.startPromise
  }

  close(): void {
    this.cached = null
    this.startPromise = undefined
    const child = this.child
    this.child = undefined
    child?.kill()
  }
}
