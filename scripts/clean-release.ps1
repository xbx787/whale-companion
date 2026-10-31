# 清理 release 历史版本：只保留当前运行版 + 最近 N 个版本。
# 默认预演（不删任何东西）；确认清单后加 -Execute 才真正删除。
# 用法：
#   powershell -NoProfile -File scripts/clean-release.ps1
#   powershell -NoProfile -File scripts/clean-release.ps1 -KeepLast 3 -Execute
param(
  [string]$ReleaseRoot = 'D:\DesktopPetProject\release',
  [int]$KeepLast = 3,
  [switch]$Execute
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ReleaseRoot)) { throw "release 目录不存在：$ReleaseRoot" }
$ReleaseRoot = (Get-Item -LiteralPath $ReleaseRoot).FullName
$rootWithSep = $ReleaseRoot.TrimEnd('\') + '\'

# 当前运行版本：从进程可执行文件路径里取，绝不删除。
$runningVersion = $null
$runningPath = Get-Process 'Whale Companion Preview' -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty Path
if ($runningPath) {
  $m = [regex]::Match($runningPath, 'whale-companion-v(\d+\.\d+\.\d+)')
  if ($m.Success) { $runningVersion = $m.Groups[1].Value }
}

function Get-VersionKey([string]$name) {
  $m = [regex]::Match($name, '^whale-companion-v(\d+)\.(\d+)\.(\d+)')
  if (-not $m.Success) { return $null }
  return [version]("{0}.{1}.{2}" -f $m.Groups[1].Value, $m.Groups[2].Value, $m.Groups[3].Value)
}

$versionDirs = @()
$otherDirs = @()
foreach ($d in Get-ChildItem -LiteralPath $ReleaseRoot -Directory) {
  $key = Get-VersionKey $d.Name
  if ($null -eq $key) {
    $otherDirs += $d
  } else {
    $versionDirs += [PSCustomObject]@{ Dir = $d; Key = $key; Name = $d.Name }
  }
}

$sorted = $versionDirs | Sort-Object Key -Descending
$protected = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($v in ($sorted | Select-Object -First $KeepLast)) { [void]$protected.Add($v.Name) }
if ($runningVersion) { [void]$protected.Add("whale-companion-v$runningVersion") }

# 非版本目录（dsh-test、win-unpacked 等）属于历史构建残留，一并回收。
# 但若某个进程正从里面运行，跳过。
$runningDir = $null
if ($runningPath) { $runningDir = Split-Path -Parent (Split-Path -Parent $runningPath) }

$targets = @()
foreach ($v in $sorted) {
  if ($protected.Contains($v.Name)) { continue }
  if ($runningDir -and $v.Dir.FullName -eq $runningDir) { continue }
  $targets += $v.Dir
}
foreach ($d in $otherDirs) {
  if ($runningDir -and $d.FullName -eq $runningDir) { continue }
  $targets += $d
}
foreach ($f in Get-ChildItem -LiteralPath $ReleaseRoot -File) {
  # zip 与 sha256 是旧版归档，保留脚本自身不处理的 builder-debug.yml。
  if ($f.Name -match '-win-x64\.zip$' -or $f.Name -match '\.sha256\.txt$') { $targets += $f }
}

if ($targets.Count -eq 0) {
  Write-Output '没有需要清理的项。'
  return
}

$freed = 0L
$rows = foreach ($t in $targets) {
  if ($t.PSIsContainer) {
    $bytes = (Get-ChildItem -LiteralPath $t.FullName -Recurse -File -ErrorAction SilentlyContinue |
      Measure-Object Length -Sum).Sum
  } else {
    $bytes = $t.Length
  }
  if ($null -eq $bytes) { $bytes = 0 }
  $freed += $bytes
  [PSCustomObject]@{
    Name = $t.Name
    Type = if ($t.PSIsContainer) { 'dir' } else { 'file' }
    MB = [math]::Round($bytes / 1MB, 1)
  }
}

Write-Output ("保留：{0}" -f (($protected | Sort-Object) -join ', '))
Write-Output ("待删：{0} 项，预计回收 {1} GB" -f $targets.Count, [math]::Round($freed / 1GB, 1))
$rows | Sort-Object MB -Descending | Format-Table -AutoSize

if (-not $Execute) {
  Write-Output '预演模式，未删除。确认无误后加 -Execute。'
  return
}

foreach ($t in $targets) {
  $full = $t.FullName
  if (-not $full.StartsWith($rootWithSep, [StringComparison]::OrdinalIgnoreCase)) {
    throw "拒绝删除 release 目录之外的路径：$full"
  }
}
foreach ($t in $targets) {
  Write-Output ("删除 {0}" -f $t.Name)
  Remove-Item -LiteralPath $t.FullName -Recurse -Force -ErrorAction Stop
}
Write-Output ("完成，回收约 {0} GB" -f [math]::Round($freed / 1GB, 1))
