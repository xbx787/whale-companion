import { spawn } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { killToolProcess } from '../src/main/tool-process'

/** 进程树匹配只在 Windows 上有意义；这里用真实的 powershell 子进程验证，
 *  避免 mock 掉真正危险的那一段。 */
describe('killToolProcess', () => {
  it('kills a descendant whose command line matches, and leaves no match alone', async () => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Start-Sleep 60'], {
      windowsHide: true
    })
    await new Promise((resolve) => setTimeout(resolve, 1_200))
    expect(child.exitCode).toBeNull()

    expect(await killToolProcess(process.pid, '完全不会存在的命令文本')).toBe(false)
    expect(await killToolProcess(process.pid, 'Start-Sleep 60')).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(child.exitCode).not.toBeNull()
  }, 25_000)
})
