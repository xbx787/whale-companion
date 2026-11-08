import { useLayoutEffect, useState, type RefObject } from 'react'

/** 输入区实际高度：窗口底边要按它算，不能再用固定估值，否则按钮下半截
 *  会落到窗口外，看起来就是“点不到”。
 *  紧凑气泡里输入区上面还有一行状态行（待命/正在执行），它也占窗口高度；
 *  只量 dock 会把这一行漏掉，底排按钮照样被裁。 */
export function useComposeDockHeight(ref: RefObject<HTMLElement | null>, deps: unknown[]): number {
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const dock = ref.current
    if (!dock) return
    const update = () => {
      const bubble = dock.closest('.panel-bubble') as HTMLElement | null
      const composer = dock.querySelector<HTMLElement>('.panel-composer')
      const style = getComputedStyle(dock)
      const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
      // dock 是被 flex 压过还是按内容撑开，取两者较大的内容高度。
      const inner = Math.max(composer?.offsetHeight ?? 0, dock.scrollHeight - padding, dock.offsetHeight - padding)
      const header = bubble ? Math.max(0, dock.getBoundingClientRect().top - bubble.getBoundingClientRect().top) : 0
      setHeight(Math.ceil(header + padding + inner))
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(dock)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return height
}
