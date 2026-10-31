# 一键发布：改版本、清理、构建、打包、冒烟、输出结构化结果。
# 用法：powershell -NoProfile -File scripts/release.ps1 [-Version 127] [-SkipTests]
# 退出码 0 = 全部通过；非 0 = 任一步失败，结果写在 .tmp/release-result.json。
param(
  [string]$Version = '',
  [switch]$SkipTests
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $projectRoot
$resultPath = Join-Path $projectRoot '.tmp\release-result.json'
$result = [ordered]@{
  ok = $false
  version = ''
  releaseDir = ''
  installer = ''
  installerBytes = 0
  exeVersion = ''
  dshVersion = ''
  seconds = 0
  step = 'start'
  error = ''
}
$sw = [Diagnostics.Stopwatch]::StartNew()
function Save-Result {
  $result.seconds = [math]::Round($sw.Elapsed.TotalSeconds)
  $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $resultPath -Encoding UTF8
}

try {
  # esbuild 在系统 Temp 删文件会被拒，构建随机失败；固定指到项目内。
  $buildTemp = Join-Path $projectRoot '.tmp\esbuild-temp'
  New-Item -ItemType Directory -Force -Path $buildTemp | Out-Null
  $env:TEMP = $buildTemp
  $env:TMP = $buildTemp

  $result.step = 'version'
  if ($Version) {
    if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "版本号不合法：$Version" }
  } else {
    $current = (& node -p "require('./package.json').version").Trim()
    $parts = $current.Split('.')
    $Version = "$($parts[0]).$($parts[1]).$([int]$parts[2] + 1)"
  }
  $result.version = $Version
  $pkg = Get-Content -LiteralPath 'package.json' -Raw
  $pkg = [regex]::Replace($pkg, '"version":\s*"[^"]+"', "`"version`": `"$Version`"", 1)
  # 必须写无 BOM 的 UTF-8：PowerShell 5.1 的 -Encoding UTF8 会加 BOM，
  # Vite/PostCSS 解析 package.json 直接报 Unexpected token。
  [IO.File]::WriteAllText((Join-Path (Get-Location) 'package.json'), $pkg, (New-Object System.Text.UTF8Encoding $false))

  $releaseRoot = 'D:\DesktopPetProject\release'
  $releaseDir = Join-Path $releaseRoot "whale-companion-v$Version"
  $result.releaseDir = $releaseDir
  $result.step = 'clean'
  if (Test-Path -LiteralPath $releaseDir) { Remove-Item -LiteralPath $releaseDir -Recurse -Force }

  $result.step = 'tests'
  if (-not $SkipTests) {
    $env:WHALE_SKIP_LIVE2D_MOTION = '1'
    $testOut = Join-Path $projectRoot '.tmp\release-test.out.log'
    $testErr = Join-Path $projectRoot '.tmp\release-test.err.log'
    $runTests = {
      Start-Process -FilePath 'npx.cmd' -ArgumentList 'vitest','run' -WorkingDirectory $projectRoot `
        -RedirectStandardOutput $testOut -RedirectStandardError $testErr -PassThru -Wait -WindowStyle Hidden
    }
    $test = & $runTests
    if ($test.ExitCode -ne 0) {
      # 并行测试偶发超时；重跑一次再判断，避免偶发失败挡住打包。
      $test = & $runTests
    }
    if ($test.ExitCode -ne 0) { throw "测试失败，见 .tmp\release-test.out.log" }
  }

  $result.step = 'pack'
  # 走 Start-Process 而不是管道：PowerShell 会把 node 的 stderr 当 XML 解析并中断。
  $pack = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','pack:release','--','-ReleaseRoot',$releaseRoot -WorkingDirectory $projectRoot `
    -RedirectStandardOutput (Join-Path $projectRoot '.tmp\release-pack.out.log') `
    -RedirectStandardError (Join-Path $projectRoot '.tmp\release-pack.err.log') -PassThru -Wait -WindowStyle Hidden
  if ($pack.ExitCode -ne 0) { throw "打包失败（$($pack.ExitCode)），见 .tmp\release-pack.err.log" }

  $result.step = 'verify'
  $exe = Join-Path $releaseDir 'win-unpacked\Whale Companion Preview.exe'
  if (-not (Test-Path -LiteralPath $exe)) { throw '缺少 win-unpacked 可执行文件。' }
  $result.exeVersion = (Get-Item -LiteralPath $exe).VersionInfo.FileVersion
  if ($result.exeVersion -ne $Version) { throw "exe 版本不符：$($result.exeVersion) != $Version" }

  $installer = Get-ChildItem -LiteralPath $releaseDir -Filter '*.exe' -File | Where-Object { $_.Name -match 'Setup' } | Select-Object -First 1
  if (-not $installer) { throw '缺少安装包。' }
  $result.installer = $installer.FullName
  $result.installerBytes = $installer.Length

  $bin = Get-ChildItem -Path (Join-Path $releaseDir 'win-unpacked\resources\dsh') -Filter 'bin.js' -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '@deepseek-ai\+dsh@' -and $_.FullName -match '\\lib\\bin\.js$' } | Select-Object -First 1
  if (-not $bin) { throw '找不到 DSH 的 lib/bin.js。' }
  $result.dshVersion = (node $bin.FullName --version 2>&1 | Select-Object -First 1)
  if (-not $result.dshVersion) { throw 'DSH 冒烟测试没有输出。' }

  $result.step = 'done'
  $result.ok = $true
  Save-Result
  Write-Output "ok version=$Version installer=$([math]::Round($result.installerBytes/1MB))MB seconds=$([math]::Round($sw.Elapsed.TotalSeconds))"
  exit 0
} catch {
  $result.step = 'failed'
  $result.error = $_.Exception.Message
  Save-Result
  Write-Output "failed step=$($result.step) error=$($result.error)"
  exit 1
}
