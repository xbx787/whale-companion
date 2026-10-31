import { useLayoutEffect, useState, type RefObject } from 'react'

/** 输入区实际高度：窗口底边要按它算，不能再用固定估值，否则按钮下半截
 *  会落到窗口外，看起来就是“点不到”。 */
export function useComposeDockHeight(ref: RefObject<HTMLElement | null>, deps: unknown[]): number {
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const dock = ref.current
    if (!dock) return
    const update = () => setHeight(dock.offsetHeight)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(dock)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return height
}
