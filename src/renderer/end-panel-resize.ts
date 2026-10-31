import type { PointerEvent as ReactPointerEvent } from 'react'
import { petBridge } from './pet-state'

/** 窗口尺寸拖拽收尾：释放指针捕获、清掉拖拽态、把目标尺寸提交给主进程，
 *  等窗口落定后再无动画地把手柄归位。若先清位移，手柄会先弹回旧角、
 *  再被窗口带着跳到新角，看起来就是闪一下。 */
export function endPanelResize({ event, sessionRef, movedRef, setResizing }: {
  event?: ReactPointerEvent<HTMLDivElement>
  sessionRef: { current: { pointerId: number; grip: HTMLDivElement; startW: number; startH: number; lastWidth: number; lastHeight: number } | null }
  movedRef: { current: boolean }
  setResizing: (value: boolean) => void
}): void {
  const session = sessionRef.current
  if (!session) return
  sessionRef.current = null
  movedRef.current = false
  setResizing(false)
  document.body.classList.remove('is-resizing-panel')
  try { (event?.currentTarget ?? session.grip).releasePointerCapture(session.pointerId) } catch { /* 已释放 */ }
  const grip = session.grip
  petBridge().resizeGhost(null)
  const changed = session.lastWidth !== Math.round(session.startW) || session.lastHeight !== Math.round(session.startH)
  const settle = (): void => {
    grip.style.transition = 'none'
    grip.style.transform = ''
    requestAnimationFrame(() => { grip.style.transition = '' })
  }
  if (changed) {
    void petBridge().setPanelSize(session.lastWidth, session.lastHeight)
      .catch(() => undefined)
      .finally(() => { window.setTimeout(settle, 30) })
  } else {
    settle()
  }
}
