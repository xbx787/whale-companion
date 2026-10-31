param(
  [string]$ExpectedVersion,
  [int]$WaitSeconds = 60
)

# 验证自检结果：等新版本写出 latest.json，逐项检查后给结论。
# 退出码 0 = 通过，1 = 失败或超时，方便打包流程直接调用。
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $projectRoot

$candidates = @(
  (Join-Path $projectRoot 'data/self-test/latest.json')
)
# 在 worktree 里构建时，自检结果可能落在主项目的 data 下（dataRoot 由源码根决定）。
$parent = Split-Path $projectRoot -Parent
if ((Split-Path $parent -Leaf) -eq '.worktrees') {
  $candidates += Join-Path (Split-Path $parent -Parent) 'data/self-test/latest.json'
}

if (-not $ExpectedVersion) {
  $ExpectedVersion = (& node -p "require('./package.json').version").Trim()
}

$deadline = (Get-Date).AddSeconds($WaitSeconds)
$resultPath = $null
$result = $null
while ((Get-Date) -lt $deadline) {
  foreach ($candidate in $candidates) {
    if (-not (Test-Path -LiteralPath $candidate)) { continue }
    try {
      $parsed = Get-Content -LiteralPath $candidate -Raw | ConvertFrom-Json
      if ($parsed.version -eq $ExpectedVersion) {
        $resultPath = $candidate
        $result = $parsed
        break
      }
    } catch {
      # 可能正在写入，下一轮再读。
    }
  }
  if ($result) { break }
  Start-Sleep -Seconds 1
}

if (-not $result) {
  Write-Output "SELFTEST_TIMEOUT expected=$ExpectedVersion waited=${WaitSeconds}s"
  Write-Output "检查过: $($candidates -join '; ')"
  exit 1
}

Write-Output "SELFTEST_FILE $resultPath"
Write-Output "version=$($result.version) ok=$($result.ok) at=$($result.at)"
if ($result.env) {
  Write-Output "env packaged=$($result.env.packaged) electron=$($result.env.electron) elapsedMs=$($result.env.elapsedMs)"
}

$failed = @()
foreach ($check in $result.checks) {
  $line = " - $($check.id): $($check.ok)"
  if ($check.detail) { $line += " — $($check.detail)" }
  Write-Output $line
  if (-not $check.ok) { $failed += $check.id }
}

if ($result.version -ne $ExpectedVersion) {
  Write-Output "SELFTEST_FAIL 版本不符：期望 $ExpectedVersion，实际 $($result.version)"
  exit 1
}
if (-not $result.ok -or $failed.Count -gt 0) {
  Write-Output "SELFTEST_FAIL 失败项: $($failed -join ', ')"
  exit 1
}

Write-Output "SELFTEST_OK version=$($result.version)"
exit 0
