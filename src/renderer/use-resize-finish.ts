import { useEffect } from 'react'

/** 指针捕获可能在窗口移动时丢失，所以在 window 上也结束一次会话：
 *  没有 pointerup 也不会留下幽灵尺寸，鼠标松开后光标也不会卡在缩放态。 */
export function useResizeFinish({ resizing, onFinish }: {
  resizing: boolean
  onFinish: () => void
}): void {
  useEffect(() => {
    if (!resizing) return
    const finish = (): void => onFinish()
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    window.addEventListener('blur', finish)
    return () => {
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      window.removeEventListener('blur', finish)
    }
  }, [resizing, onFinish])
}
