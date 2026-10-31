import { ipcMain } from 'electron'
import type { WindowStateIpcDeps } from './index'

/** 气泡布局、气泡展开、人物可见框和面板尺寸。这四组都直接读写窗口状态，
 *  可变字段用 getter/setter 注入。 */
export function registerWindowStateIpc(deps: WindowStateIpcDeps): void {
  ipcMain.handle('pet:set-bubble-layout', (event, layout: unknown, height: unknown) => {
    if (!deps.trusted(event)) return
    if (layout !== 'empty' && layout !== 'composer' && layout !== 'composer_attachments' && layout !== 'composer_models' && layout !== 'full') throw new Error('气泡布局无效。')
    if (height !== undefined && (typeof height !== 'number' || !Number.isFinite(height) || height < 100 || height > 260)) throw new Error('气泡高度无效。')
    const nextHeight = (layout === 'composer' || layout === 'composer_attachments') && typeof height === 'number' ? Math.round(height) : undefined
    if (deps.bubbleLayout === layout && deps.compactBubbleHeight === nextHeight) return
    const size = deps.stageBounds ?? { x: 0, y: 0, ...deps.stageSize }
    const previous = deps.bubbleRegion(deps.bubbleLayout, size, deps.compactBubbleHeight, deps.panelDirection)
    deps.bubbleLayout = layout
    deps.compactBubbleHeight = nextHeight
    // 面板窗口的 bounds 就是当前布局的矩形，布局一变就得跟着改。
    deps.syncPanelBounds()
    if (deps.shapeShrinkTimer) clearTimeout(deps.shapeShrinkTimer)
    deps.shapeShrinkTimer = undefined
    const next = deps.bubbleRegion(layout, size, nextHeight, deps.panelDirection)
    if (deps.panelOpen && next.width * next.height < previous.width * previous.height) {
      deps.shapeShrinkTimer = setTimeout(() => {
        deps.shapeShrinkTimer = undefined
        deps.applyPointerShape()
      }, 240)
    } else {
      deps.applyPointerShape()
    }
  })
  ipcMain.handle('pet:set-bubble-expanded', (event, expanded: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof expanded !== 'boolean') throw new Error('气泡尺寸无效。')
    deps.setBubbleExpanded(expanded)
  })
  ipcMain.handle('pet:set-avatar-box', (event, box: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (!box || typeof box !== 'object') return
    const { x, y, width, height } = box as Record<string, unknown>
    if (![x, y, width, height].every((value) => typeof value === 'number' && Number.isFinite(value))) return
    const bounds = deps.avatarWindow?.getBounds()
    if (!bounds) return
    const left = Math.round(Math.max(0, Math.min(bounds.width, x as number)))
    const top = Math.round(Math.max(0, Math.min(bounds.height, y as number)))
    const boxWidth = Math.max(1, Math.min(bounds.width - left, Math.round(width as number)))
    const boxHeight = Math.max(1, Math.min(bounds.height - top, Math.round(height as number)))
    deps.avatarBox = {
      right: bounds.width - left - boxWidth,
      bottom: bounds.height - top - boxHeight,
      width: boxWidth,
      height: boxHeight
    }
    // 姿势/大小变化会移动人物可见区的中心，展开方向和命中形状都跟着重算；
    // 余额卡也在 syncStageBounds 里重新对齐。
    deps.syncStageBounds()
  })
  ipcMain.handle('pet:set-panel-size', (event, width: unknown, height: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof width !== 'number' || typeof height !== 'number' || !Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error('面板尺寸无效。')
    }
    deps.bubblePanelSize = {
      width: Math.round(Math.min(4000, Math.max(deps.panelMinWidth, width))),
      height: Math.round(Math.min(4000, Math.max(deps.panelMinHeight, height)))
    }
    deps.syncStageBounds()
    deps.schedulePanelSizeSave()
  })
}
