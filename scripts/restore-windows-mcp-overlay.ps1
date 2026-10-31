# 把仓库里的控制横幅改动恢复到已安装的 windows-mcp。
# 用 uv 重装/升级 windows-mcp 之后跑一次：
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\restore-windows-mcp-overlay.ps1
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'windows-mcp-overlay'
$target = Join-Path $env:APPDATA 'uv\tools\windows-mcp\Lib\site-packages\windows_mcp'
if (-not (Test-Path $target)) { throw "windows-mcp 未安装：$target" }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$files = @('desktop\control.py', 'desktop\control_hooks.py', 'desktop\control_overlay_art.py', 'desktop\control_overlay.py', 'desktop\flash_overlay.py', 'tools\input.py')
foreach ($file in $files) {
  $from = Join-Path $source $file
  $to = Join-Path $target $file
  if (-not (Test-Path $from)) { throw "缺少副本：$from" }
  Copy-Item -LiteralPath $to -Destination "$to.bak-$stamp" -Force
  Copy-Item -LiteralPath $from -Destination $to -Force
  Write-Output "restored $file"
}
$python = Join-Path $env:APPDATA 'uv\tools\windows-mcp\Scripts\python.exe'
if (Test-Path $python) {
  & $python -m py_compile (Join-Path $target 'desktop\control_hooks.py') (Join-Path $target 'desktop\control_overlay_art.py') (Join-Path $target 'tools\input.py')
  if ($LASTEXITCODE -ne 0) { throw '恢复后的 Python 文件语法检查失败。' }
  Write-Output 'py_compile ok'
}
