import { useCallback, type MutableRefObject, type UIEvent } from 'react'

/** 时间线的滚动处理：切换对话后的程序滚动保持跟随，用户自己滚到顶时加载更早的历史。
 *  抽成 hook 只是为了把这段判断从 JSX 里挪出来，行为与原来一致。 */
export function useFeedScroll({ switchJumpRef, followFeedRef, setFeedAtBottom, loadEarlier, onPosition }: {
  switchJumpRef: MutableRefObject<boolean>
  followFeedRef: MutableRefObject<boolean>
  setFeedAtBottom: (value: boolean) => void
  loadEarlier: () => void
  /** 滚动后报告一次位置：面板用它把“读到哪一条”画到左侧导航上。 */
  onPosition?: (feed: HTMLDivElement) => void
}) {
  return useCallback((event: UIEvent<HTMLDivElement>) => {
    const feed = event.currentTarget
    // 切换对话后的程序滚动保持跟随，不算用户离开底部。
    if (switchJumpRef.current) {
      followFeedRef.current = true
      setFeedAtBottom(true)
      return
    }
    const atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 48
    followFeedRef.current = atBottom
    setFeedAtBottom(atBottom)
    onPosition?.(feed)
    // Reaching the top pulls in the next stretch of older history.
    if (feed.scrollTop < 240) loadEarlier()
  }, [switchJumpRef, followFeedRef, setFeedAtBottom, loadEarlier, onPosition])
}
