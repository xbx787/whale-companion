<#
.SYNOPSIS
  在隔离数据目录里起一个真实的小鲸预览实例，用来确认 UI 改动。

.DESCRIPTION
  只启动 node_modules 里的开发版 Electron，不碰 release 和正式版进程。
  - 默认只启动；-Build 先构建，-NoBuild 显式跳过。
  - 构建走 Start-Process -Wait -NoNewWindow，Electron 启动不重定向 stdout：
    带重定向启动时父 PowerShell 会等子进程持有管道，命令会一直挂着。
  - 固定清掉 ELECTRON_RUN_AS_NODE，否则 Electron 会以 Node 模式退出。
  - 只停止路径匹配本工作树 electron.exe 的进程；正式版进程名不同，不会被误杀。
  - 截图不在这里做，用 Windows MCP 的截屏，快且不占脚本时间。

.EXAMPLE
  pwsh scripts/preview.ps1
  pwsh scripts/preview.ps1 -Build
  pwsh scripts/preview.ps1 -Close
#>
param(
  [switch]$Build,
  [switch]$Close,
  [string]$DataDir = '',
  [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
# 预览数据默认放在项目根的 .tmp 下；worktree 自己也会被检查一次。
$projectRoot = Split-Path -Parent (Split-Path -Parent $root)
$dataDir = if ($DataDir) { $DataDir }
  elseif (Test-Path (Join-Path $root '.tmp\preview-data')) { Join-Path $root '.tmp\preview-data' }
  else { Join-Path $projectRoot '.tmp\preview-data' }
$tmpDir = Split-Path -Parent $dataDir
$electron = Join-Path $root 'node_modules\electron\dist\electron.exe'
$pidFile = Join-Path $tmpDir 'preview.pid'
$buildLog = Join-Path $tmpDir 'preview-build.log'
$workspaceDir = Join-Path $tmpDir 'preview-workspace'

function Get-PreviewProcesses {
  Get-Process -Name electron -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $electron }
}

function Stop-Preview {
  $targets = Get-PreviewProcesses
  if (-not $targets) {
    Write-Output '没有正在运行的预览实例。'
    return
  }
  foreach ($target in $targets) {
    Stop-Process -Id $target.Id -Force -ErrorAction SilentlyContinue
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Write-Output "已关闭预览实例：$($targets.Id -join ', ')"
}

if (-not (Test-Path $electron)) {
  throw "找不到 Electron：$electron。先在 $root 跑 npm install。"
}
if (-not (Test-Path $dataDir)) {
  throw "预览数据目录不存在：$dataDir。不要指向真实 data，先准备一份隔离数据。"
}

if ($Close) {
  Stop-Preview
  return
}

Stop-Preview | Out-Null

if ($Build -and -not $NoBuild) {
  $buildTemp = Join-Path $root '.tmp\esbuild-temp'
  New-Item -ItemType Directory -Force -Path $buildTemp | Out-Null
  Remove-Item "$buildTemp\*" -Force -Recurse -ErrorAction SilentlyContinue
  $env:TEMP = $buildTemp
  $env:TMP = $buildTemp
  $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
  # 构建输出写文件，不继承调用方的 stdout：esbuild 会留常驻子进程，
  # 一旦它拿到外层管道/重定向句柄，命令就要等它退出，看起来像卡死。
  Push-Location $root
  try { & $npm run build *> $buildLog; $buildExit = $LASTEXITCODE } finally { Pop-Location }
  if ($buildExit -ne 0) {
    throw "构建失败（exit $buildExit）。"
  }
  Write-Output '构建完成。'
}

New-Item -ItemType Directory -Force -Path $workspaceDir | Out-Null
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
# Windows 的兼容性探测器偶尔注入 DetectorsAppHealth，会把 Electron 压到低完整性，
# 于是连 %TEMP% 都写不了（EPERM），预览窗口起不来还会响错误提示音。
Remove-Item Env:__COMPAT_LAYER -ErrorAction SilentlyContinue
$env:DESKTOP_PET_MULTI_INSTANCE = '1'
$env:DESKTOP_PET_DATA = $dataDir
$env:DESKTOP_PET_WORKSPACE = $workspaceDir
$env:DESKTOP_PET_PREVIEW_LEFT = '1'
$env:DESKTOP_PET_PREVIEW_PANEL = '1'

# 从网络缓存解压出来的 electron.exe 带 Zone.Identifier 时，Windows 会弹
# “发布者未知”的安全警告并挡住启动。这是本地开发依赖，先解除标记再起。
Unblock-File -Path $electron -ErrorAction SilentlyContinue

# Electron 的 stdout/stderr 必须落到文件：不重定向时它会继承调用方的管道，
# 只要实例还在跑，外层 `| Select-Object` 就等不到 EOF，看起来像构建卡死。
$outLog = Join-Path $tmpDir 'preview-out.log'
$errLog = Join-Path $tmpDir 'preview-err.log'
$process = Start-Process -FilePath $electron -ArgumentList '.', '--no-sandbox' `
  -WorkingDirectory $root -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput $outLog -RedirectStandardError $errLog
$process.Id | Set-Content $pidFile

# 轮询到主进程和至少一个子进程出现；秒退就报错，不靠固定 sleep。
$deadline = (Get-Date).AddSeconds(5)
while ((Get-Date) -lt $deadline) {
  if ($process.HasExited) {
    throw "预览实例启动后退出了（exit $($process.ExitCode)）。"
  }
  if ((Get-PreviewProcesses).Count -ge 2) { break }
  Start-Sleep -Milliseconds 100
}

$running = Get-PreviewProcesses
Write-Output "预览实例已启动：PID $($process.Id)，共 $($running.Count) 个 electron 进程。"
Write-Output "数据目录：$dataDir"
