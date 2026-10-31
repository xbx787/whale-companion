import { useLayoutEffect, type RefObject } from 'react'

/** 时间线滚动定位：加载更早历史时保持阅读位置，跳转到指定条目时滚到它。 */
export function useFeedAnchors({ feedRef, earlierAnchorRef, pendingJumpRef, followFeedRef, earlierGroups, olderEntriesLength, historyEntries, visibleGroups }: {
  feedRef: RefObject<HTMLDivElement | null>
  earlierAnchorRef: { current: { height: number } | null }
  pendingJumpRef: { current: string | null }
  followFeedRef: { current: boolean }
  earlierGroups: unknown
  olderEntriesLength: number
  historyEntries: unknown
  visibleGroups: unknown
}) {
  useLayoutEffect(() => {
    const feed = feedRef.current
    const anchor = earlierAnchorRef.current
    if (!feed || !anchor) return
    earlierAnchorRef.current = null
    // Keep the reader's place: the taller history must not push the viewport.
    feed.scrollTop += feed.scrollHeight - anchor.height
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earlierGroups, olderEntriesLength])

  useLayoutEffect(() => {
    const feed = feedRef.current
    const id = pendingJumpRef.current
    if (!feed || !id) return
    const target = feed.querySelector(`[data-entry-id="${id}"]`)
    if (!target) return
    pendingJumpRef.current = null
    followFeedRef.current = false
    target.scrollIntoView({ block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earlierGroups, historyEntries, visibleGroups, olderEntriesLength])
}
