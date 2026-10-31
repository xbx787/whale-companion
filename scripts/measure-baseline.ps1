# 采样小鲸的空闲基线，写入 data/memory/baseline.json。
# health.ps1 用这份基线和系数算预算，版本一变就提示重测，不再用拍死的数字。
# 用法：powershell -NoProfile -File scripts/measure-baseline.ps1
# 注意：先只留一个空闲会话再跑，多会话会让内存基线偏高。
param(
  [int]$Samples = 3,
  [int]$IntervalSeconds = 2
)
$ErrorActionPreference = 'Stop'
$projectRoot = 'D:\DesktopPetProject'
$outPath = Join-Path $projectRoot 'data\memory\baseline.json'

function Get-WhaleProcesses {
  Get-CimInstance Win32_Process -Filter "Name='Whale Companion Preview.exe'"
}

function Get-Median([int[]]$values) {
  if (-not $values -or $values.Count -eq 0) { return 0 }
  $sorted = @($values | Sort-Object)
  $mid = [int][math]::Floor($sorted.Count / 2)
  if ($sorted.Count % 2 -eq 1) { return $sorted[$mid] }
  return [math]::Round(($sorted[$mid - 1] + $sorted[$mid]) / 2, 0)
}

$procs = @(Get-WhaleProcesses)
if ($procs.Count -eq 0) { throw '小鲸没有在运行，先启动再采样。' }

$exe = $procs[0].ExecutablePath
$version = ''
$match = [regex]::Match([string]$exe, 'whale-companion-v(\d+\.\d+\.\d+)')
if ($match.Success) { $version = $match.Groups[1].Value }

$sessions = @($procs | Where-Object { $_.CommandLine -match 'dsh\\lib\\bin\.js' }).Count
if ($sessions -gt 1) {
  Write-Warning "当前有 $sessions 个会话，基线会偏高；建议只留一个空闲会话再测。"
}

$memorySamples = @()
$gpuSamples = @()
for ($i = 0; $i -lt $Samples; $i++) {
  $all = @(Get-WhaleProcesses)
  $memorySamples += [math]::Round((($all | Measure-Object WorkingSetSize -Sum).Sum) / 1MB, 0)
  $smi = 'C:\Windows\System32\nvidia-smi.exe'
  if (Test-Path -LiteralPath $smi) {
    $csv = & $smi --query-gpu=memory.used --format=csv,noheader,nounits 2>$null
    if ($csv) { $gpuSamples += [int](($csv -split ',')[0].Trim()) }
  }
  if ($i -lt $Samples - 1) { Start-Sleep -Seconds $IntervalSeconds }
}

# 体积口径：release 单独算；项目体积不含 release、node_modules、.git。
$releaseMb = (Get-ChildItem (Join-Path $projectRoot 'release') -Recurse -File -ErrorAction SilentlyContinue |
  Measure-Object Length -Sum).Sum / 1MB
$projectMb = 0
Get-ChildItem $projectRoot -Directory -Force | Where-Object { $_.Name -notin @('release', 'node_modules', '.git') } |
  ForEach-Object {
    $projectMb += ((Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
      Measure-Object Length -Sum).Sum / 1MB)
  }
$projectMb += ((Get-ChildItem $projectRoot -File | Measure-Object Length -Sum).Sum / 1MB)

$baseline = [ordered]@{
  version = $version
  measuredAt = (Get-Date).ToString('o')
  sessions = $sessions
  processes = @(Get-WhaleProcesses).Count
  memoryMb = Get-Median $memorySamples
  gpuMb = Get-Median $gpuSamples
  releaseGb = [math]::Round($releaseMb / 1024, 2)
  projectGb = [math]::Round($projectMb / 1024, 2)
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outPath) | Out-Null
$baseline | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $outPath -Encoding UTF8
$baseline | Format-List
Write-Output "已写入 $outPath"
