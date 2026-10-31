import { useEffect } from 'react'

/** Esc 打断当前任务：图片预览打开或别的 Esc 归属者存在时让路。 */
export function useEscapeToStop({ visible, active, escOwnersRef, onStop }: {
  visible: boolean
  active: boolean
  escOwnersRef: { current: boolean }
  onStop: () => void
}): void {
  useEffect(() => {
    if (!visible || !active) return
    const interruptOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229) return
      if (escOwnersRef.current) return
      if (document.querySelector('.panel-image-viewer')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      onStop()
    }
    document.addEventListener('keydown', interruptOnEscape, true)
    return () => document.removeEventListener('keydown', interruptOnEscape, true)
  }, [visible, active, escOwnersRef, onStop])
}
