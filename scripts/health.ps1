# 一条命令体检：磁盘占用、release 版本数、进程内存、显存。
# 预算优先用 data/memory/baseline.json 的实测基线乘系数；版本不匹配就退回兜底值并提示重测。
# 超预算时退出码 1，方便挂到定时任务或打包前检查。
# 用法：powershell -NoProfile -File scripts/health.ps1 [-Quiet]
param(
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$projectRoot = 'D:\DesktopPetProject'
$releaseRoot = Join-Path $projectRoot 'release'
$baselinePath = Join-Path $projectRoot 'data\memory\baseline.json'

function Get-DirSizeMB([string]$path, [string[]]$exclude = @()) {
  if (-not (Test-Path -LiteralPath $path)) { return 0 }
  $sum = 0
  foreach ($child in Get-ChildItem -LiteralPath $path -Force) {
    if ($exclude -contains $child.Name) { continue }
    if ($child.PSIsContainer) {
      $sum += (Get-ChildItem -LiteralPath $child.FullName -Recurse -File -ErrorAction SilentlyContinue |
        Measure-Object Length -Sum).Sum
    } else {
      $sum += $child.Length
    }
  }
  return [math]::Round($sum / 1MB, 0)
}

function Get-RunningVersion {
  $process = Get-Process 'Whale Companion Preview' -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $process) { return '' }
  $match = [regex]::Match([string]$process.Path, 'whale-companion-v(\d+\.\d+\.\d+)')
  if ($match.Success) { return $match.Groups[1].Value }
  return ''
}

# 体积口径：项目不含 release、node_modules、.git；release 单独算。
$projectGB = [math]::Round((Get-DirSizeMB $projectRoot @('release', 'node_modules', '.git')) / 1024, 1)
$releaseMB = Get-DirSizeMB $releaseRoot
$releaseGB = [math]::Round($releaseMB / 1024, 1)

$runningVersion = Get-RunningVersion
$baseline = $null
$baselineFresh = $false
if (Test-Path -LiteralPath $baselinePath) {
  try {
    $baseline = Get-Content -LiteralPath $baselinePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($baseline.version -and $runningVersion -and $baseline.version -eq $runningVersion) {
      $baselineFresh = $true
    }
  } catch {
    $baseline = $null
  }
}

if ($baselineFresh) {
  # 基线乘系数：体积 1.15，内存 1.25，显存 1.2；下限防止基线过小导致误报。
  $budget = @{
    ProjectGB = [math]::Max(6, [math]::Round([double]$baseline.projectGb * 1.15, 1))
    ReleaseGB = [math]::Max(2.5, [math]::Round([double]$baseline.releaseGb * 1.15, 1))
    MemoryMB  = [math]::Max(800, [math]::Round([double]$baseline.memoryMb * 1.25, 0))
    GpuMB     = [math]::Max(600, [math]::Round([double]$baseline.gpuMb * 1.2, 0))
  }
  $budgetSource = "基线 $($baseline.version) 乘系数"
} else {
  # 没有当前版本的基线时用兜底值，并在输出里提示重测。
  $budget = @{
    ProjectGB = 8
    ReleaseGB = 3.2
    MemoryMB  = 2000
    GpuMB     = 1500
  }
  $budgetSource = if ($baseline) { "兜底值（基线是 $($baseline.version)，当前运行 $runningVersion）" } else { '兜底值（还没有基线）' }
}

$problems = @()

if ($projectGB -gt $budget.ProjectGB) {
  $problems += "项目占用 $projectGB GB，超过预算 $($budget.ProjectGB) GB"
}

$versions = @(Get-ChildItem -LiteralPath $releaseRoot -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '^whale-companion-v\d+\.\d+\.\d+' }).Count
if ($releaseGB -gt $budget.ReleaseGB) {
  $problems += "release 占用 $releaseGB GB，超过预算 $($budget.ReleaseGB) GB；跑 scripts/clean-release.ps1"
}
if ($versions -gt 4) {
  $problems += "release 保留了 $versions 个版本，建议只留 3 个"
}

$procs = @(Get-Process 'Whale Companion Preview' -ErrorAction SilentlyContinue)
$memoryMB = 0
if ($procs.Count -gt 0) {
  $memoryMB = [math]::Round(($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 0)
}
if ($memoryMB -gt $budget.MemoryMB) {
  $problems += "小鲸进程合计 $memoryMB MB，超过预算 $($budget.MemoryMB) MB（$($procs.Count) 个进程）"
}

$gpuMB = 0
$gpuPct = 0
$smi = 'C:\Windows\System32\nvidia-smi.exe'
if (Test-Path -LiteralPath $smi) {
  $csv = & $smi --query-gpu=memory.used,utilization.gpu --format=csv,noheader,nounits 2>$null
  if ($csv) {
    $parts = ($csv -split ',') | ForEach-Object { $_.Trim() }
    if ($parts.Count -ge 2) {
      $gpuMB = [int]$parts[0]
      $gpuPct = [int]$parts[1]
    }
  }
}
if ($gpuMB -gt $budget.GpuMB) {
  $problems += "显存占用 $gpuMB MB，超过预算 $($budget.GpuMB) MB"
}

if (-not $Quiet) {
  Write-Output '=== 小鲸体检 ==='
  Write-Output ("项目占用      {0} GB（不含 release）" -f $projectGB)
  Write-Output ("release       {0} GB，{1} 个版本" -f $releaseGB, $versions)
  Write-Output ("运行进程      {0} 个，合计 {1} MB" -f $procs.Count, $memoryMB)
  if ($gpuMB -gt 0) {
    Write-Output ("显存          {0} MB，GPU 利用率 {1}%" -f $gpuMB, $gpuPct)
  } else {
    Write-Output '显存          未读到 nvidia-smi'
  }
  Write-Output ("预算来源      {0}" -f $budgetSource)
  Write-Output ("预算          项目 {0} GB / release {1} GB / 内存 {2} MB / 显存 {3} MB" -f `
    $budget.ProjectGB, $budget.ReleaseGB, $budget.MemoryMB, $budget.GpuMB)
}

if ($problems.Count -gt 0) {
  Write-Output ''
  Write-Output '=== 超出预算 ==='
  $problems | ForEach-Object { Write-Output "- $_" }
  exit 1
}

if (-not $Quiet) {
  Write-Output ''
  Write-Output '全部在预算内。'
}
exit 0
