import type { TimelineEntry } from '../shared/contracts'
import { petBridge } from './pet-state'

/** 往更早的历史翻一页：按已加载条数算出 before，拉回来插到最前面。
 *  失败时保留现有内容，下次滚到顶再试。 */
export async function loadOlderPage({ conversationId, total, loaded, loadingRef, onPage, pageSize }: {
  conversationId: string | undefined
  total: number | undefined
  loaded: number
  loadingRef: { current: boolean }
  onPage: (page: TimelineEntry[]) => void
  pageSize: number
}): Promise<void> {
  if (!conversationId || !total || loadingRef.current) return
  if (loaded >= total) return
  loadingRef.current = true
  try {
    const before = total - loaded
    const page = await petBridge().timelinePage(conversationId, before, pageSize)
    if (page.length) onPage(page)
  } catch {
    // 拉取失败时保留现有内容，下次滚到顶再试。
  } finally {
    loadingRef.current = false
  }
}
