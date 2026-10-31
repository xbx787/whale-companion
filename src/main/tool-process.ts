import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/**
 * 结束 DSH 指定根进程下、命令行包含给定命令的子进程。
 *
 * 这里刻意只走进程树，不碰 ACP 的回合取消：命令进程被终结后，DSH 会把它
 * 当成一次失败的工具调用继续跑，思考链不会被一起打断。
 *
 * 返回 true 表示确实杀到了进程；false 表示没匹配到（调用方应退回整轮取消）。
 * 命令文本只取第一行、去掉首尾空白后做子串匹配，宁可不杀也不误杀。
 */
export async function killToolProcess(rootPid: number, command: string): Promise<boolean> {
  if (!Number.isInteger(rootPid) || rootPid <= 0) return false
  const needle = command.trim().split(/\r?\n/u)[0]?.trim() ?? ''
  if (!needle) return false
  // 命令里可能有引号、中文和 $，走 base64 传进 PowerShell，避免任何转义问题。
  const encoded = Buffer.from(needle, 'utf8').toString('base64')
  const script = `
$root = ${rootPid}
$needle = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}'))
$all = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Select-Object ProcessId,ParentProcessId,Name,CommandLine
$children = @{}
foreach ($p in $all) {
  $parent = [int]$p.ParentProcessId
  if (-not $children.ContainsKey($parent)) { $children[$parent] = New-Object System.Collections.ArrayList }
  [void]$children[$parent].Add($p)
}
$queue = New-Object System.Collections.Queue
$queue.Enqueue($root)
$hits = New-Object System.Collections.ArrayList
while ($queue.Count -gt 0) {
  $id = [int]$queue.Dequeue()
  if (-not $children.ContainsKey($id)) { continue }
  foreach ($c in $children[$id]) {
    $queue.Enqueue([int]$c.ProcessId)
    if ($c.CommandLine -and $c.CommandLine.Contains($needle)) { [void]$hits.Add([int]$c.ProcessId) }
  }
}
if ($hits.Count -eq 0) { '[]' } else { ConvertTo-Json -InputObject @($hits) -Compress }
`
  try {
    const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024
    })
    const parsed: unknown = JSON.parse(stdout.trim() || '[]')
    const pids = (Array.isArray(parsed) ? parsed : [parsed])
      .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0)
    let killed = false
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGTERM')
        killed = true
      } catch {
        // 进程已经退出，视为没杀到。
      }
    }
    return killed
  } catch {
    return false
  }
}
