# 清理项目内的临时产物与开发残留。
# 只动明确列出的目录，不碰 data/、release/、src/、reference/。
# 默认预演；确认后加 -Execute。
# 用法：
#   powershell -NoProfile -File scripts/clean-workspace.ps1
#   powershell -NoProfile -File scripts/clean-workspace.ps1 -Execute
param(
  [switch]$Execute,
  # 正在被预览实例等占用的路径前缀，跳过不碰。
  [string[]]$SkipPaths = @()
)
$ErrorActionPreference = 'Stop'

$projectRoot = 'D:\DesktopPetProject'
$worktreeRoot = 'D:\DesktopPetProject\.worktrees\dsh-p0'
if (-not (Test-Path -LiteralPath $projectRoot)) { throw "项目目录不存在：$projectRoot" }

# 每一项：Path 是要清空内容的目录，或要整个删除的目录；Whole 表示连目录一起删。
$items = @(
  @{ Path = "$projectRoot\.tmp"; Whole = $false; Label = '主工作区 .tmp' },
  @{ Path = "$worktreeRoot\.tmp"; Whole = $false; Label = 'dsh-p0 .tmp' },
  @{ Path = "$projectRoot\.cache"; Whole = $false; Label = '主工作区 .cache' },
  @{ Path = "$projectRoot\.tmp-docwork"; Whole = $true; Label = '.tmp-docwork' },
  @{ Path = "$projectRoot\data-dev"; Whole = $true; Label = 'data-dev 开发副本' }
)

# 明确不碰的目录，防止将来误加。
$forbidden = @("$projectRoot\data", "$projectRoot\release", "$projectRoot\src",
  "$projectRoot\reference", "$projectRoot\node_modules", "$projectRoot\.git")

$targets = @()
foreach ($it in $items) {
  if (-not (Test-Path -LiteralPath $it.Path)) { continue }
  $full = (Get-Item -LiteralPath $it.Path).FullName
  foreach ($f in $forbidden) {
    if ($full -eq $f -or $full.StartsWith($f + '\', [StringComparison]::OrdinalIgnoreCase)) {
      throw "拒绝处理受保护路径：$full"
    }
  }
  if ($it.Whole) {
    $targets += [PSCustomObject]@{ Full = $full; Label = $it.Label; Whole = $true }
  } else {
    foreach ($child in Get-ChildItem -LiteralPath $full -Force) {
      $targets += [PSCustomObject]@{ Full = $child.FullName; Label = $it.Label; Whole = $true }
    }
  }
}

if ($SkipPaths.Count -gt 0) {
  $targets = $targets | Where-Object {
    $full = $_.Full
    -not ($SkipPaths | Where-Object { $full.StartsWith($_, [StringComparison]::OrdinalIgnoreCase) })
  }
}

if ($targets.Count -eq 0) {
  Write-Output '没有需要清理的项。'
  return
}

$freed = 0L
$rows = foreach ($t in $targets) {
  $bytes = if (Test-Path -LiteralPath $t.Full -PathType Container) {
    (Get-ChildItem -LiteralPath $t.Full -Recurse -File -ErrorAction SilentlyContinue |
      Measure-Object Length -Sum).Sum
  } else {
    (Get-Item -LiteralPath $t.Full -ErrorAction SilentlyContinue).Length
  }
  if ($null -eq $bytes) { $bytes = 0 }
  $freed += $bytes
  [PSCustomObject]@{ Label = $t.Label; Name = Split-Path -Leaf $t.Full; MB = [math]::Round($bytes / 1MB, 1) }
}

Write-Output ("待清：{0} 项，预计回收 {1} GB" -f $targets.Count, [math]::Round($freed / 1GB, 1))
$rows | Sort-Object MB -Descending | Format-Table -AutoSize

if (-not $Execute) {
  Write-Output '预演模式，未删除。确认后加 -Execute。'
  return
}

foreach ($t in $targets) {
  if (-not $t.Full.StartsWith("$projectRoot\", [StringComparison]::OrdinalIgnoreCase)) {
    throw "拒绝删除项目目录之外的路径：$($t.Full)"
  }
}
$failed = @()
foreach ($t in $targets) {
  try {
    Remove-Item -LiteralPath $t.Full -Recurse -Force -ErrorAction Stop
  } catch {
    $failed += $t.Full
  }
}
if ($failed.Count -gt 0) {
  Write-Output ("有 {0} 项被占用，未删除（通常是预览实例或日志句柄）：" -f $failed.Count)
  $failed | ForEach-Object { Write-Output "  $_" }
}
Write-Output ("完成，回收约 {0} GB" -f [math]::Round($freed / 1GB, 1))
