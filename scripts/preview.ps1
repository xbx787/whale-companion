<#
.SYNOPSIS
  起一个小鲸预览实例，代码和本体同一套，数据和外观从本体复制。

.DESCRIPTION
  - 用复制到 tools\electron-dist 的 electron 启动。node_modules 里那个
    electron.exe 所在的 dist 目录被打了 Low 完整性标签，它启动的进程写不了
    任何文件，会在 mkdir 时 EPERM 退出。
  - 默认先构建；-NoBuild 跳过。
  - 数据目录固定为 data\preview-run，从本体 data 复制设置、头像、人格和
    会话库；不复制大附件，也不和本体共用运行中的库。
  - 不设置 DESKTOP_PET_PREVIEW_LEFT / PANEL：面板的位置和展开方式完全按
    本体逻辑，不在预览里另造一套。
  - 只停止路径匹配复制版 electron 的进程，不碰正式版和本体。

.EXAMPLE
  pwsh scripts/preview.ps1
  pwsh scripts/preview.ps1 -NoBuild
  pwsh scripts/preview.ps1 -Close
#>
param(
  [switch]$Build,
  [switch]$Close,
  [switch]$NoBuild,
  [string]$DataDir = '',
  [string]$ConversationId = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
# worktree 的父父目录就是主项目，本体数据在 <project>\data。
$projectRoot = Split-Path -Parent (Split-Path -Parent $root)
$realData = Join-Path $projectRoot 'data'
$dataDir = if ($DataDir) { $DataDir } else { Join-Path $realData 'preview-run' }
$tmpDir = Join-Path $projectRoot '.tmp'
$toolsDir = Join-Path $projectRoot 'tools\electron-dist'
$electron = Join-Path $toolsDir 'electron.exe'
$workspaceDir = Join-Path $dataDir 'workspace'
$pidFile = Join-Path $tmpDir 'preview.pid'
$buildLog = Join-Path $tmpDir 'preview-build.log'
$outLog = Join-Path $tmpDir 'preview-out.log'
$errLog = Join-Path $tmpDir 'preview-err.log'

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

if ($Close) {
  Stop-Preview
  return
}

New-Item -ItemType Directory -Force -Path $tmpDir, $dataDir | Out-Null
Stop-Preview | Out-Null

# 1. 数据：从本体复制设置和外观，预览不另起一套。
$conversationsDir = Join-Path $dataDir 'conversations'
New-Item -ItemType Directory -Force -Path $conversationsDir | Out-Null
foreach ($file in 'library.json') {
  Copy-Item (Join-Path $realData "conversations\$file") (Join-Path $conversationsDir $file) -Force -ErrorAction SilentlyContinue
}
foreach ($dir in 'avatars', 'persona') {
  if (Test-Path (Join-Path $realData $dir)) {
    Copy-Item (Join-Path $realData $dir) (Join-Path $dataDir $dir) -Recurse -Force
  }
}
foreach ($file in 'features.json', 'onboarding.json') {
  Copy-Item (Join-Path $realData $file) (Join-Path $dataDir $file) -Force -ErrorAction SilentlyContinue
}

# 指定会话时，把它也带进预览并设为当前会话，方便看特定对话的渲染。
if ($ConversationId) {
  $srcRecord = Join-Path $realData "conversations\records\$ConversationId.json"
  if (-not (Test-Path $srcRecord)) { throw "找不到会话记录：$srcRecord" }
  $recordsDir = Join-Path $conversationsDir 'records'
  New-Item -ItemType Directory -Force -Path $recordsDir | Out-Null
  $dstRecord = Join-Path $recordsDir "$ConversationId.json"
  Copy-Item $srcRecord $dstRecord -Force
  $libPath = Join-Path $conversationsDir 'library.json'
  $lib = Get-Content $libPath -Raw | ConvertFrom-Json
  $rec = Get-Content $dstRecord -Raw | ConvertFrom-Json
  if (-not (@($lib.conversations) | Where-Object { $_.id -eq $ConversationId })) {
    $lib.conversations = @($lib.conversations) + [pscustomobject]@{
      id            = $rec.id
      title         = $rec.title
      createdAt     = $rec.createdAt
      updatedAt     = $rec.updatedAt
      lastActivityAt = $rec.lastActivityAt
      archivedAt    = $null
      pinnedAt      = $null
      mode          = $rec.mode
      taskStatus    = $rec.taskStatus
      messageCount  = @($rec.timeline).Count
      preview       = ''
    }
  }
  $lib.activeConversationId = $ConversationId
  # Windows PowerShell 5.1 不支持 -Encoding utf8NoBOM，直接写无 BOM UTF-8。
  $json = $lib | ConvertTo-Json -Depth 30
  [System.IO.File]::WriteAllText($libPath, $json, (New-Object System.Text.UTF8Encoding($false)))
  Write-Output "已导入会话：$($rec.title)（$ConversationId）"
}

# 2. 构建
if (-not $NoBuild) {
  $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
  Push-Location $root
  try { & $npm run build *> $buildLog; $buildExit = $LASTEXITCODE } finally { Pop-Location }
  if ($buildExit -ne 0) { throw "构建失败（exit $buildExit）。" }
  Write-Output '构建完成。'
}

# 3. electron：优先用复制版，没有就从 node_modules 复制一份。
if (-not (Test-Path $electron)) {
  New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
  Copy-Item (Join-Path $root 'node_modules\electron\dist\*') $toolsDir -Recurse -Force
  Write-Output "已复制 electron 到 $toolsDir"
}

# 4. 启动：不传预览专用变量，面板行为与本体一致。
New-Item -ItemType Directory -Force -Path $workspaceDir | Out-Null
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Remove-Item Env:DESKTOP_PET_PREVIEW_LEFT -ErrorAction SilentlyContinue
Remove-Item Env:DESKTOP_PET_PREVIEW_PANEL -ErrorAction SilentlyContinue
$env:DESKTOP_PET_MULTI_INSTANCE = '1'
$env:DESKTOP_PET_DATA = $dataDir
$env:DESKTOP_PET_WORKSPACE = $workspaceDir

Unblock-File -Path $electron -ErrorAction SilentlyContinue
Remove-Item $outLog, $errLog -Force -ErrorAction SilentlyContinue
# 不带 stdout/stderr 重定向：带重定向启动时外层 powershell 会等子进程句柄，
# 脚本看起来像卡死。预览不依赖它的控制台输出。
$process = Start-Process -FilePath $electron -ArgumentList '.', '--no-sandbox' `
  -WorkingDirectory $root -PassThru -WindowStyle Hidden
$process.Id | Set-Content $pidFile

$deadline = (Get-Date).AddSeconds(8)
while ((Get-Date) -lt $deadline) {
  if ($process.HasExited) {
    throw "预览实例启动后退出了（exit $($process.ExitCode)），看 $errLog。"
  }
  if ((Get-PreviewProcesses).Count -ge 2) { break }
  Start-Sleep -Milliseconds 100
}

$running = Get-PreviewProcesses
Write-Output "预览实例已启动：PID $($process.Id)，共 $($running.Count) 个 electron 进程。"
Write-Output "数据目录：$dataDir"
