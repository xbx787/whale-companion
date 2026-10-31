<#
  切换并重启小鲸到 release 下最高版本（或 -NewExe 指定）。

  设计原则：不用固定 sleep 推进。每一步都是 100ms 轮询，条件一满足就往下走；
  启动后只做 500ms 存活观察，被单实例锁挡掉时几十毫秒内就会退出并立即重试。
  全过程写入 <项目根>\.tmp\restart-whale.log，出问题可查。

  用法：
    pwsh scripts/restart-whale.ps1
    pwsh scripts/restart-whale.ps1 -NewExe "D:\...\v0.0.128\win-unpacked\Whale Companion Preview.exe"
#>
param(
  [string]$OldExe,
  [string]$NewExe
)

$ErrorActionPreference = 'SilentlyContinue'
$processName = 'Whale Companion Preview'
$root = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent (Split-Path -Parent $root)
$logPath = Join-Path $projectRoot '.tmp\restart-whale.log'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $logPath) | Out-Null

function Write-Log([string]$message) {
  $line = '{0:HH:mm:ss.fff} {1}' -f (Get-Date), $message
  Add-Content -LiteralPath $logPath -Value $line
  Write-Output $line
}

# 每 100ms 检查一次，满足就返回，不预先睡固定时长。
function Wait-Until([scriptblock]$condition, [int]$timeoutMs, [int]$intervalMs = 100) {
  $watch = [Diagnostics.Stopwatch]::StartNew()
  while ($watch.ElapsedMilliseconds -lt $timeoutMs) {
    if (& $condition) { return $true }
    Start-Sleep -Milliseconds $intervalMs
  }
  return $false
}

Write-Log "start old=$OldExe new=$NewExe"

$running = @(Get-Process -Name $processName)
if (-not $OldExe -and $running.Count -gt 0) { $OldExe = $running[0].Path }

if (-not $NewExe) {
  $releaseRoot = Join-Path $projectRoot 'release'
  $candidates = Get-ChildItem -LiteralPath $releaseRoot -Directory -Filter 'whale-companion-v*' |
    Sort-Object { try { [version]($_.Name -replace '^whale-companion-v', '') } catch { [version]'0.0.0' } } -Descending
  foreach ($dir in $candidates) {
    $candidate = Join-Path $dir.FullName 'win-unpacked\Whale Companion Preview.exe'
    if (Test-Path -LiteralPath $candidate) { $NewExe = $candidate; break }
  }
}

if (-not $NewExe) { Write-Log 'failed: no packaged build'; throw 'No packaged build found under release/.' }
if (-not (Test-Path -LiteralPath $NewExe)) { Write-Log "failed: missing $NewExe"; throw "New executable not found: $NewExe" }

if ($running.Count -gt 0) {
  # 只等旧实例自己的 PID 消失。--quit 会临时再起一个同名进程，
  # 按进程名等会把那个转发进程也算进去，导致新实例抢在锁释放前启动。
  $oldPids = @($running | ForEach-Object { $_.Id })
  Write-Log "old pids: $($oldPids -join ',')"
  if ($OldExe -and (Test-Path -LiteralPath $OldExe)) {
    & $OldExe --quit
  } else {
    $running | Stop-Process -Force
  }
  $gone = Wait-Until { (@($oldPids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }).Count -eq 0) } 30000 100
  Write-Log $(if ($gone) { 'old pids gone' } else { 'old pids still alive after 30s' })
}

$attempt = 0
while ($attempt -lt 3) {
  $attempt++
  $launched = Start-Process -FilePath $NewExe -PassThru
  # 观察 500ms：被单实例锁挡掉会立刻退出，检测到就马上重试；存活就结束。
  $watch = [Diagnostics.Stopwatch]::StartNew()
  while ($watch.ElapsedMilliseconds -lt 500 -and -not $launched.HasExited) {
    Start-Sleep -Milliseconds 100
  }
  if (-not $launched.HasExited) {
    Write-Log "ok pid=$($launched.Id) attempt=$attempt"
    exit 0
  }
  Write-Log "new instance exited early attempt=$attempt exit=$($launched.ExitCode)"
  Start-Sleep -Milliseconds 200
}

Write-Log 'failed: new instance exited after retries'
throw '新实例启动后退出，旧实例可能还没退干净。'
