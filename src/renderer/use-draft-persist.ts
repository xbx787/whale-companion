import { useCallback, useEffect, type MutableRefObject } from 'react'
import { petBridge } from './pet-state'
import type { DroppedAttachment } from './panel-utils'

/** 草稿落盘：输入停一下即保存，关窗或关机不会丢半句话。
 *  附件不存，它们的临时文件不跨重启。 */
export function useDraftPersist({ destinationRef, conversationId, activeConversationIdRef, composerStateRef, draft }: {
  destinationRef: MutableRefObject<'main' | 'side'>
  conversationId: string | null | undefined
  activeConversationIdRef: MutableRefObject<string | null>
  composerStateRef: MutableRefObject<{ draft: string; attachments: DroppedAttachment[] }>
  draft: string
}): { flushDraft: (id: string | null, text: string) => void } {
  const flushDraft = useCallback((id: string | null, text: string): void => {
    if (!id) return
    try { void petBridge().saveDraft(id, text).catch(() => undefined) } catch { /* 静态预览无桥。 */ }
  }, [])

  useEffect(() => {
    if (destinationRef.current !== 'main') return
    const id = conversationId
    if (!id || activeConversationIdRef.current !== id || composerStateRef.current.draft !== draft) return
    const timer = window.setTimeout(() => {
      if (destinationRef.current === 'main' && activeConversationIdRef.current === id && composerStateRef.current.draft === draft) {
        flushDraft(id, draft)
      }
    }, 800)
    return () => window.clearTimeout(timer)
  }, [draft, conversationId, destinationRef, activeConversationIdRef, composerStateRef, flushDraft])

  return { flushDraft }
}
