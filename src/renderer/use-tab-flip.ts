import { useLayoutEffect, type RefObject } from 'react'

/** 标签拖拽后的落位动画：每次顺序可能变化时，把移动过的标签从旧位置滑过来。
 *  DOM 重排本身没有过渡，所以记录旧 x、用一次性 transform 回放（FLIP），
 *  减少动态效果时跳过。 */
export function useTabFlip({ tabsRef, positionsRef, deps }: {
  tabsRef: RefObject<HTMLElement | null>
  positionsRef: { current: Map<string, number> }
  deps: unknown[]
}): void {
  useLayoutEffect(() => {
    const tabs = tabsRef.current
    if (!tabs) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const next = new Map<string, number>()
    for (const button of tabs.querySelectorAll<HTMLElement>('.panel-quick-tab[data-tab-id]')) {
      const id = button.dataset.tabId!
      const x = button.getBoundingClientRect().left
      next.set(id, x)
      const before = positionsRef.current.get(id)
      if (reduceMotion || before === undefined || Math.abs(before - x) < 1) continue
      for (const animation of button.getAnimations()) {
        if (animation.id === 'tab-flip') animation.cancel()
      }
      const flip = button.animate(
        [{ transform: `translateX(${before - x}px)` }, { transform: 'none' }],
        { duration: 160, easing: 'ease-out' }
      )
      flip.id = 'tab-flip'
    }
    positionsRef.current = next
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
