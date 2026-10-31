import { ipcMain } from 'electron'
import type { PanelIpcDeps } from './index'

/** 面板显隐与位置查询。依赖由 index.ts 的 buildPanelIpcDeps 注入。 */
export function registerPanelIpc(deps: PanelIpcDeps): void {
  ipcMain.handle('pet:show-panel', (event) => { if (deps.trusted(event)) deps.showPanel() })
  ipcMain.handle('pet:hide-panel', (event) => { if (deps.trusted(event)) deps.hidePanel() })
  ipcMain.handle('pet:get-panel-open', (event) => { if (!deps.trusted(event)) throw new Error('无效的界面请求。'); return deps.panelOpen })
  ipcMain.handle('pet:get-panel-placement', (event) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    deps.syncStageBounds()
    return deps.panelPlacement
  })
  ipcMain.handle('pet:get-panel-direction', (event) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    deps.syncStageBounds()
    return deps.panelDirection
  })
}
