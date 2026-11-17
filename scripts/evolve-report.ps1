param(
  [string]$Base = '',
  [string]$OutFile = ''
)

# 进化报告：把当前分支相对基线的改动、测试和自检结果整理成可直接粘贴的 PR / issue 正文。
# 用法：powershell -File scripts/evolve-report.ps1 [-Base origin/main] [-OutFile .tmp/evolve-report.md]
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $projectRoot

function Invoke-Git([string[]]$Arguments) {
  # git 会把换行符警告写到 stderr；ErrorActionPreference=Stop 下会被当成致命错误。
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $lines = & git @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { return '' }
    $clean = $lines | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }
    return (($clean | ForEach-Object { "$_" }) -join "`n").Trim()
  } finally {
    $ErrorActionPreference = $previous
  }
}

if (-not $Base) {
  foreach ($candidate in @('origin/main', 'main', 'origin/master', 'master')) {
    if (Invoke-Git @('rev-parse', '--verify', '--quiet', $candidate)) { $Base = $candidate; break }
  }
}
if (-not $Base) { throw '找不到基线分支，请用 -Base 指定，例如 -Base origin/main。' }

$version = (& node -p "require('./package.json').version").Trim()
if ($LASTEXITCODE -ne 0 -or -not $version) { $version = 'unknown' }
$branch = Invoke-Git @('branch', '--show-current')
$commits = Invoke-Git @('log', '--oneline', "$Base..HEAD")
$stat = Invoke-Git @('diff', '--stat', "$Base...HEAD")
$working = Invoke-Git @('diff', '--stat')

$checkLine = '- 未找到 release-result.json，打包前请先跑 npm run check'
$releasePath = Join-Path $projectRoot '.tmp/release-result.json'
if (Test-Path -LiteralPath $releasePath) {
  try {
    $result = Get-Content -LiteralPath $releasePath -Raw | ConvertFrom-Json
    $checkLine = "- 打包结果：version=$($result.version) ok=$($result.ok)"
    if ("$($result.version)" -ne $version) {
      $checkLine += "（与当前 $version 不一致，需重跑打包）"
    }
  } catch {
    $checkLine = '- release-result.json 读取失败，请重跑打包'
  }
}

$selfTestLine = '- 未找到启动自检结果'
$selfTestPath = Join-Path $projectRoot 'data/self-test/latest.json'
if (Test-Path -LiteralPath $selfTestPath) {
  try {
    $selfTest = Get-Content -LiteralPath $selfTestPath -Raw | ConvertFrom-Json
    $selfTestLine = "- 启动自检：version=$($selfTest.version) ok=$($selfTest.ok)"
  } catch {
    $selfTestLine = '- 启动自检结果读取失败'
  }
}

$report = @'
# 进化报告

- 版本：{0}
- 分支：{1}
- 基线：{2}

## 提交

```
{3}
```

## 改动

```
{4}
```

## 工作区未提交

```
{5}
```

## 验证

{6}
{7}

## 怎么复现

1. 切到分支 `{1}`
2. `npm install`
3. `npm run check`
4. 需要看界面时跑 `powershell -File scripts/preview.ps1 -Build`

---

把上面的内容粘进 PR 描述，或作为 issue 正文。模板在 `.github/`。
'@ -f $version, $branch, $Base, $commits, $stat, $working, $checkLine, $selfTestLine

if (-not $OutFile) { $OutFile = Join-Path $projectRoot '.tmp/evolve-report.md' }
$dir = Split-Path -Parent $OutFile
if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
Set-Content -LiteralPath $OutFile -Value $report -Encoding utf8
Write-Output "EVOLVE_REPORT $OutFile"
