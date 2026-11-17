param(
  [string]$Installer = 'D:\DesktopPetProject\release\whale-companion-v0.0.171\小鲸 Setup 0.0.171.exe',
  [string]$TestDir = 'D:\DesktopPetProject\.worktrees\dsh-p0\.tmp\install-test',
  [string]$AppExe = 'D:\DesktopPetProject\release\whale-companion-v0.0.171\win-unpacked\Whale Companion Preview.exe',
  [string]$BackupDir = 'D:\DesktopPetProject\.worktrees\dsh-p0\.tmp\installer-test-backup',
  [string]$ResultPath = 'D:\DesktopPetProject\.worktrees\dsh-p0\.tmp\installer-test-result.json'
)

# 安装器冒烟测试：退出应用 → 静默装到测试目录 → 检查 → 卸载 → 恢复注册表和快捷方式 → 重启。
# 结果写到 .tmp\installer-test-result.json，应用重启后读取。
$ErrorActionPreference = 'Stop'
$result = [ordered]@{ ok = $false; steps = @(); error = ''; startedAt = (Get-Date).ToUniversalTime().ToString('o') }

function Add-Step([string]$Name, [bool]$Ok, [string]$Detail) {
  $script:result.steps += [ordered]@{ name = $Name; ok = $Ok; detail = $Detail }
}

$uninstallKey = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\a58d5438-3dfa-57df-ab2c-074c895c755b'
$appIdKey = 'HKCU\Software\local.desktop.resident.agent'
$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\小鲸.lnk'
$shell = New-Object -ComObject WScript.Shell

try {
  New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

  # 1. 备份注册表和开始菜单快捷方式
  & reg export $uninstallKey (Join-Path $BackupDir 'uninstall.reg') /y 2>$null | Out-Null
  Add-Step 'backup-uninstall-key' ($LASTEXITCODE -eq 0) $uninstallKey
  & reg export $appIdKey (Join-Path $BackupDir 'appid.reg') /y 2>$null | Out-Null
  Add-Step 'backup-appid-key' ($LASTEXITCODE -eq 0) $appIdKey
  if (Test-Path $startMenu) {
    Copy-Item $startMenu (Join-Path $BackupDir 'startmenu.lnk') -Force
    Add-Step 'backup-shortcut' $true $startMenu
  }

  # 2. 关闭当前应用
  $proc = Get-Process -Name 'Whale Companion Preview' -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $AppExe } | Select-Object -First 1
  if ($proc) {
    & $AppExe --quit
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline -and (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue)) {
      Start-Sleep -Milliseconds 300
    }
    Add-Step 'quit-app' (-not [bool](Get-Process -Id $proc.Id -ErrorAction SilentlyContinue)) "pid=$($proc.Id)"
  } else {
    Add-Step 'quit-app' $true 'not running'
  }

  # 3. 静默安装到测试目录
  if (Test-Path $TestDir) { Remove-Item -LiteralPath $TestDir -Recurse -Force }
  $install = Start-Process -FilePath $Installer -ArgumentList '/S', "/D=$TestDir" -PassThru -Wait
  Add-Step 'install' ($install.ExitCode -eq 0) "exit=$($install.ExitCode)"

  # 安装器 runAfterFinish 会启动测试实例，先关掉
  $testProc = Get-Process -Name 'Whale Companion Preview' -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like "$TestDir*" } | Select-Object -First 1
  if ($testProc) {
    & (Join-Path $TestDir 'Whale Companion Preview.exe') --quit
    Start-Sleep -Seconds 5
  }

  # 4. 检查安装结果
  $installedExe = Join-Path $TestDir 'Whale Companion Preview.exe'
  $version = ''
  if (Test-Path $installedExe) { $version = (Get-Item $installedExe).VersionInfo.FileVersion }
  Add-Step 'installed-exe' (Test-Path $installedExe) "version=$version"

  $uninstaller = Get-ChildItem -LiteralPath $TestDir -Filter 'Uninstall*.exe' -ErrorAction SilentlyContinue |
    Select-Object -First 1
  Add-Step 'uninstaller' ($null -ne $uninstaller) $(if ($uninstaller) { $uninstaller.Name } else { 'missing' })

  $reg = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\a58d5438-3dfa-57df-ab2c-074c895c755b" -ErrorAction SilentlyContinue
  $regVersion = if ($reg) { $reg.DisplayVersion } else { '' }
  $regLocation = if ($reg) { $reg.InstallLocation } else { '' }
  Add-Step 'uninstall-registry' ($regVersion -eq '0.0.171' -and $regLocation -eq $TestDir) "version=$regVersion location=$regLocation"

  $appReg = Get-ItemProperty 'HKCU:\Software\local.desktop.resident.agent' -ErrorAction SilentlyContinue
  $appLocation = if ($appReg) { $appReg.InstallLocation } else { '' }
  Add-Step 'install-location-key' ($appLocation -eq $TestDir) "location=$appLocation"

  if (Test-Path $startMenu) {
    $link = $shell.CreateShortcut($startMenu)
    Add-Step 'start-menu-shortcut' ($link.TargetPath -like "$TestDir*") $link.TargetPath
  } else {
    Add-Step 'start-menu-shortcut' $false 'missing'
  }

  # 5. 卸载
  if ($uninstaller) {
    $un = Start-Process -FilePath $uninstaller.FullName -ArgumentList '/S' -PassThru -Wait
    Add-Step 'uninstall' ($un.ExitCode -eq 0) "exit=$($un.ExitCode)"
    Start-Sleep -Seconds 3
    Add-Step 'test-dir-removed' (-not (Test-Path $TestDir)) $TestDir
  }

  # 6. 恢复注册表与快捷方式
  & reg import (Join-Path $BackupDir 'uninstall.reg') 2>$null | Out-Null
  Add-Step 'restore-uninstall-key' ($LASTEXITCODE -eq 0) ''
  if (Test-Path (Join-Path $BackupDir 'startmenu.lnk')) {
    Copy-Item (Join-Path $BackupDir 'startmenu.lnk') $startMenu -Force
    Add-Step 'restore-shortcut' $true $startMenu
  }

  $failed = @($result.steps | Where-Object { -not $_.ok })
  $result.ok = $failed.Count -eq 0
} catch {
  $result.error = $_.Exception.Message
} finally {
  $result.finishedAt = (Get-Date).ToUniversalTime().ToString('o')
  $result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ResultPath -Encoding UTF8
  # 恢复原应用
  if (Test-Path $AppExe) {
    Start-Process -FilePath $AppExe -WorkingDirectory (Split-Path -Parent $AppExe)
  }
}
