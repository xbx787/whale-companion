import { ipcMain, screen } from 'electron'
import { AVATAR_BOTTOM_SLACK, AVATAR_RIGHT_SLACK } from './window-metrics'
import type { WindowDragIpcDeps } from './index'

/** 拖动人物窗口：起手、移动、收手。依赖由 index.ts 的 buildWindowDragIpcDeps 注入。 */
export function registerWindowDragIpc(deps: WindowDragIpcDeps): void {
  ipcMain.handle('pet:begin-drag', (event, cursor: unknown) => {
    if ((event.sender.id !== deps.avatarWindow?.webContents.id && event.sender.id !== deps.panelWindow?.webContents.id) || !deps.avatarWindow || !deps.isScreenPoint(cursor)) return
    deps.dragOrigin = { cursor, bounds: deps.avatarWindow.getBounds() }
    deps.avatarDragging = true
  })
  ipcMain.handle('pet:drag-move', (event, current: unknown) => {
    if ((event.sender.id !== deps.avatarWindow?.webContents.id && event.sender.id !== deps.panelWindow?.webContents.id) || !deps.avatarWindow || !deps.dragOrigin || !deps.isScreenPoint(current)) return
    const width = deps.dragOrigin.bounds.width
    const height = deps.dragOrigin.bounds.height
    const x = Math.round(deps.dragOrigin.bounds.x + current.x - deps.dragOrigin.cursor.x)
    const y = Math.round(deps.dragOrigin.bounds.y + current.y - deps.dragOrigin.cursor.y)
    // 头像窗口必须留在当前显示器的工作区内：一旦允许它掉到工作区下面，
    // 展开面板时舞台会被拉回工作区，人物就会“向上跳”，底部小三角也会
    // 被屏幕边缘削掉。坐标都是 DIP，系统缩放不同的显示器同样适用。
    const work = screen.getDisplayNearestPoint({ x: x + Math.round(width / 2), y: y + Math.round(height / 2) }).workArea
    // 右侧允许伸出窗口右缘的透明余量：人物能贴到屏幕右缘，本体不出屏。
    const RIGHT_SLACK = AVATAR_RIGHT_SLACK[deps.currentAvatarSize] ?? 37
    const nextX = Math.min(Math.max(x, work.x), Math.max(work.x, work.x + work.width - width + RIGHT_SLACK))
    // 窗口底部允许伸出工作区，幅度正好等于人物脚底到窗口底的透明余量。
    const BOTTOM_SLACK = AVATAR_BOTTOM_SLACK[deps.currentAvatarSize] ?? 60
    const nextY = Math.min(Math.max(y, work.y), Math.max(work.y, work.y + work.height - height + BOTTOM_SLACK))
    deps.avatarWindow.setBounds({ x: nextX, y: nextY, width, height })
    deps.syncBalancePosition()
  })
  ipcMain.handle('pet:end-drag', (event) => {
    if (deps.trusted(event)) {
      deps.dragOrigin = undefined
      deps.avatarDragging = false
      deps.syncStageBounds()
    }
  })
}
