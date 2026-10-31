# 重打 0.0.130：当前实例正占用 release 目录，必须先让它自己退出。
# 由计划任务运行，完全脱离应用进程树，应用退出不会杀掉本脚本。
$ErrorActionPreference = 'Stop'
$root = 'D:\DesktopPetProject\.worktrees\dsh-p0'
$release = 'D:\DesktopPetProject\release'
$exe = Join-Path $release 'whale-companion-v0.0.130\win-unpacked\Whale Companion Preview.exe'
$log = 'D:\DesktopPetProject\.tmp\repack-130.log'

function Log([string]$message) {
  Add-Content -LiteralPath $log -Value "$(Get-Date -Format o) $message"
}

Log '--- start ---'
# 留出时间让当前回合把回复发出去。
Start-Sleep -Seconds 10

$running = @(Get-Process -Name 'Whale Companion Preview' -ErrorAction SilentlyContinue)
if ($running.Count -gt 0) {
  Log "asking running instance to quit: $($running.Count) processes"
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  & $exe -- --quit 2>&1 | Out-Null
  $deadline = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $deadline) {
    $left = @(Get-Process -Name 'Whale Companion Preview' -ErrorAction SilentlyContinue)
    if ($left.Count -eq 0) { break }
    Start-Sleep -Milliseconds 300
  }
}
$left = @(Get-Process -Name 'Whale Companion Preview' -ErrorAction SilentlyContinue)
Log "processes left: $($left.Count)"
if ($left.Count -gt 0) {
  Log 'still running, abort to avoid deleting a locked release directory'
  exit 1
}

Log 'release start'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'scripts\release.ps1') -Version 0.0.130 *>> $log
$code = $LASTEXITCODE
Log "release exit=$code"

if ($code -eq 0) {
  $newExe = Join-Path $release 'whale-companion-v0.0.130\win-unpacked\Whale Companion Preview.exe'
  if (Test-Path -LiteralPath $newExe) {
    Start-Process -FilePath $newExe -WorkingDirectory (Split-Path -Parent $newExe) | Out-Null
    Log 'new 0.0.130 started'
  } else {
    Log 'new exe missing'
  }
}
Log '--- done ---'
