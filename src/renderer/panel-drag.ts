import type { PointerEvent as ReactPointerEvent } from 'react'
import { petBridge } from './pet-state'

/** 面板尺寸拖拽的起手：记下屏幕坐标和起始尺寸，挂上拖拽态。 */
export function beginPanelResize({ event, expanded, sessionRef, movedRef, setResizing, onEnd }: {
  event: ReactPointerEvent<HTMLDivElement>
  expanded: boolean
  sessionRef: { current: { pointerId: number; grip: HTMLDivElement; startScreenX: number; startScreenY: number; startW: number; startH: number; lastSent: number; lastWidth: number; lastHeight: number } | null }
  movedRef: { current: boolean }
  setResizing: (value: boolean) => void
  onEnd: () => void
}): void {
  if (!expanded || event.button !== 0) return
  const rect = event.currentTarget.closest('.panel-bubble')?.getBoundingClientRect()
  if (!rect) return
  event.preventDefault()
  if (sessionRef.current) onEnd()
  const grip = event.currentTarget
  grip.style.transition = 'none'
  grip.setPointerCapture(event.pointerId)
  sessionRef.current = {
    pointerId: event.pointerId, grip,
    startScreenX: event.screenX, startScreenY: event.screenY,
    startW: rect.width, startH: rect.height, lastSent: 0,
    lastWidth: Math.round(rect.width), lastHeight: Math.round(rect.height)
  }
  movedRef.current = false
  document.body.classList.add('is-resizing-panel')
  setResizing(true)
  petBridge().resizeGhost({ x: event.screenX, y: event.screenY })
}

/** 顶栏空白拖整组窗口；按钮、标签、输入框都留给它们自己。 */
export function beginWindowDrag(event: ReactPointerEvent<HTMLElement>, fromHeader = false): void {
  if (event.button !== 0 || (!fromHeader && event.target !== event.currentTarget)) return
  const bridge = petBridge()
  void bridge.beginDrag({ x: event.screenX, y: event.screenY })
  const move = (e: PointerEvent): void => { void bridge.dragMove({ x: e.screenX, y: e.screenY }) }
  const up = (): void => {
    void bridge.endDrag()
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

/** 拖动中的尺寸预览：只记目标尺寸，窗口在松开鼠标时才变形；
 *  手柄和那圈 L 线先跟着鼠标走，让人看清楚窗口会变到哪。 */
export function movePanelResize({ event, sessionRef, direction, minWidth, minHeight, onEnd }: {
  event: ReactPointerEvent<HTMLDivElement>
  sessionRef: { current: { pointerId: number; grip: HTMLDivElement; startScreenX: number; startScreenY: number; startW: number; startH: number; lastWidth: number; lastHeight: number } | null }
  direction: 'up' | 'down'
  minWidth: number
  minHeight: number
  onEnd: (event?: ReactPointerEvent<HTMLDivElement>) => void
}): void {
  const session = sessionRef.current
  if (!session || event.pointerId !== session.pointerId) return
  // pointerup 偶尔会在窗口移动时丢掉；没有按键还留着会话的话，鼠标
  // 再移回手柄就会继续改尺寸（表现为“自己往左上缩”）。
  if ((event.buttons & 1) === 0) {
    onEnd(event)
    return
  }
  const maxWidth = Math.max(minWidth, window.screen.availWidth - 20)
  const maxHeight = Math.max(minHeight, window.screen.availHeight)
  const width = Math.round(Math.min(maxWidth, Math.max(minWidth, session.startW + (session.startScreenX - event.screenX))))
  const heightDelta = direction === 'down'
    ? event.screenY - session.startScreenY
    : session.startScreenY - event.screenY
  const height = Math.round(Math.min(maxHeight, Math.max(minHeight, session.startH + heightDelta)))
  session.lastWidth = width
  session.lastHeight = height
  const dx = Math.round(session.startW - width)
  const dy = Math.round(direction === 'down' ? height - session.startH : session.startH - height)
  session.grip.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
  petBridge().resizeGhost({ x: event.screenX, y: event.screenY })
}
