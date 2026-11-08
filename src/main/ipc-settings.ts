import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { publicSettings } from './secret-storage'
import type { SettingsIpcDeps } from './index'

/** 设置窗口相关的 IPC。依赖由 index.ts 的 buildSettingsIpcDeps 注入，
 *  可变状态用 getter 读实时值。拆出来以后 settings 这块的改动不用再翻主文件。 */
export function registerSettingsIpc(deps: SettingsIpcDeps): void {
  ipcMain.handle('pet:persona:get', (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    const id = deps.activeController().currentSettings().personaId ?? 'xiaojing'
    const file = path.join(deps.personaDirectory, `${id}.md`)
    return { personaId: id, text: existsSync(file) ? readFileSync(file, 'utf8') : '' }
  })
  ipcMain.handle('pet:persona:set', (event, text: unknown) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    if (typeof text !== 'string' || text.length > 20_000) throw new Error('人设文本无效。')
    const id = deps.activeController().currentSettings().personaId ?? 'xiaojing'
    const file = path.join(deps.personaDirectory, `${id}.md`)
    // 空文本 = 删掉自定义文件，回到内置预设。
    if (!text.trim()) {
      if (existsSync(file)) rmSync(file, { force: true })
      return { personaId: id, text: '' }
    }
    mkdirSync(deps.personaDirectory, { recursive: true })
    writeFileSync(file, text, 'utf8')
    return { personaId: id, text }
  })
  ipcMain.handle('pet:settings:preview-opacity', (event, request: unknown) => {
    if (!deps.settingsTrusted(event)) return
    const { target, value } = (request ?? {}) as { target?: unknown; value?: unknown }
    if (typeof value !== 'number' || !Number.isFinite(value)) return
    const opacity = deps.opacityFor(value)
    const win = target === 'avatar' ? deps.avatarWindow : deps.panelWindow
    if (win && !win.isDestroyed()) {
      win.webContents.send(target === 'avatar' ? 'pet:avatar-opacity' : 'pet:window-opacity', opacity)
    }
  })
  ipcMain.handle('pet:settings:check-updates', async (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return deps.updateService.check()
  })
  ipcMain.handle('pet:settings:auto-update', (event, enabled: unknown) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    deps.updateService.setAuto(enabled === true)
    return enabled === true
  })
  ipcMain.handle('pet:settings:auto-update-state', (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return deps.updateService.autoEnabled()
  })
  ipcMain.handle('pet:settings:get', async (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return publicSettings((await deps.activeController().getLibraryState()).settings)
  })
  ipcMain.handle('pet:settings:update', (event, patch: unknown) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    const nextPatch = deps.conversationSettingsPatch(patch)
    return deps.activeController().updateSettings(nextPatch).then((settings) => {
      deps.memory.setEnabled(settings.memoryEnabled)
      deps.discardSidesWithoutLiveParents()
      // 界面尺寸等显示设置也要立刻传给头像窗口里的小面板，不必等下一个事件。
      deps.broadcastUiSize(settings.uiSize)
      deps.currentWindowOpacity = deps.opacityFor(settings.windowOpacity)
      deps.currentAvatarOpacity = deps.opacityFor(settings.avatarOpacity)
      deps.panelWindow?.setOpacity(deps.currentWindowOpacity)
      deps.avatarWindow?.setOpacity(1)
      // 透明窗口的 setOpacity 在 Windows 上无效，渲染层用 CSS 变量接这两个值。
      deps.panelWindow?.webContents.send('pet:window-opacity', deps.currentWindowOpacity)
      deps.avatarWindow?.webContents.send('pet:avatar-opacity', deps.currentAvatarOpacity)
      deps.currentAvatarSize = settings.avatarSize
      // 面板贴哪一侧改了：立刻按新位置重排，不必等下一次打开。
      const nextPlacement = settings.panelPlacement ?? 'top'
      if (nextPlacement !== deps.panelPlacement) {
        deps.panelPlacement = nextPlacement
        deps.syncStageBounds()
      }
      // 人物大小变了，余额卡的高度和位置要跟着重新对齐。
      deps.syncBalancePosition()
      if (nextPatch.roastEnabled !== undefined) deps.onRoastToggle(settings.roastEnabled !== false)
      deps.publishSnapshot()
      return publicSettings(settings)
    })
  })
  ipcMain.handle('pet:settings:workspace', (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return { path: deps.agentWorkspace, saved: deps.readSavedWorkspace(deps.dataRoot) !== null }
  })
  ipcMain.handle('pet:settings:pick-workspace', async (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return deps.pickWorkspaceDirectory(deps.settingsWindow, deps.agentWorkspace)
  })
  ipcMain.handle('pet:settings:migrate-workspace', async (event, next: unknown) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    if (typeof next !== 'string') throw new Error('工作目录无效。')
    return { path: await deps.migrateAgentWorkspace(next) }
  })
  ipcMain.handle('pet:settings:version', (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return app.getVersion()
  })
  ipcMain.handle('pet:settings:capabilities', (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return deps.activeController().getCapabilities()
  })
  ipcMain.handle('pet:settings:close', (event) => {
    if (!deps.settingsTrusted(event)) return
    deps.settingsWindow?.close()
  })
  ipcMain.handle('pet:settings:quit', (event) => {
    if (!deps.settingsTrusted(event)) return
    app.quit()
  })
  ipcMain.handle('pet:settings:restart', async (event) => {
    if (!deps.settingsTrusted(event)) return false
    return (await deps.requestRestart()) === 'waiting'
  })
}
