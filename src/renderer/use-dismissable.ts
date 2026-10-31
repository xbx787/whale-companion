import { useEffect, useRef, type RefObject } from 'react'

/** 弹层的通用关闭行为：点外面、按 Esc，可选失焦关闭。
 *  打开时执行 onOpen（例如刷新数据），关闭时统一清理监听。
 *  onClose/onOpen 走 ref：调用方普遍传内联箭头，直接进依赖数组会让每次
 *  父组件渲染都重装监听并重跑 onOpen，打开菜单期间会反复刷新数据。 */
export function useDismissable({ open, onClose, ignoreRef, capture = false, closeOnBlur = false, onOpen, extraDeps = [], stopPropagation = false }: {
  open: boolean
  onClose: () => void
  ignoreRef?: RefObject<HTMLElement | null>
  capture?: boolean
  closeOnBlur?: boolean
  onOpen?: () => void
  extraDeps?: unknown[]
  stopPropagation?: boolean
}): void {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const openRef = useRef(onOpen)
  openRef.current = onOpen

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (ignoreRef?.current?.contains(event.target as Node)) return
      closeRef.current()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (stopPropagation) event.stopPropagation()
      closeRef.current()
    }
    const closeOnWindowBlur = (): void => { closeRef.current() }
    document.addEventListener('pointerdown', closeOnOutsideClick, capture)
    document.addEventListener('keydown', closeOnEscape)
    if (closeOnBlur) window.addEventListener('blur', closeOnWindowBlur)
    openRef.current?.()
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick, capture)
      document.removeEventListener('keydown', closeOnEscape)
      if (closeOnBlur) window.removeEventListener('blur', closeOnWindowBlur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ignoreRef, capture, closeOnBlur, stopPropagation, ...extraDeps])
}
