import { app, ipcMain } from 'electron'
import { publicSettings } from './secret-storage'
import type { SettingsIpcDeps } from './index'

/** 设置窗口相关的 IPC。依赖由 index.ts 的 buildSettingsIpcDeps 注入，
 *  可变状态用 getter 读实时值。拆出来以后 settings 这块的改动不用再翻主文件。 */
export function registerSettingsIpc(deps: SettingsIpcDeps): void {
  ipcMain.handle('pet:settings:get', async (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return publicSettings((await deps.activeController().getLibraryState()).settings)
  })
  ipcMain.handle('pet:settings:update', (event, patch: unknown) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return deps.activeController().updateSettings(deps.conversationSettingsPatch(patch)).then((settings) => {
      deps.memory.setEnabled(settings.memoryEnabled)
      deps.discardSidesWithoutLiveParents()
      // 界面尺寸等显示设置也要立刻传给头像窗口里的小面板，不必等下一个事件。
      deps.broadcastUiSize(settings.uiSize)
      deps.currentWindowOpacity = deps.opacityFor(settings.windowOpacity)
      deps.panelWindow?.setOpacity(deps.currentWindowOpacity)
      deps.avatarWindow?.setOpacity(deps.currentWindowOpacity)
      deps.currentAvatarSize = settings.avatarSize
      // 面板贴哪一侧改了：立刻按新位置重排，不必等下一次打开。
      const nextPlacement = settings.panelPlacement ?? 'top'
      if (nextPlacement !== deps.panelPlacement) {
        deps.panelPlacement = nextPlacement
        deps.syncStageBounds()
      }
      // 人物大小变了，余额卡的高度和位置要跟着重新对齐。
      deps.syncBalancePosition()
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
