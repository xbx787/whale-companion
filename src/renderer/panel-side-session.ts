import type { MutableRefObject } from 'react'
import type { SideChatSnapshot } from '../shared/contracts'
import { stashComposerState, type StashedComposer } from './composer-drafts'
import type { DroppedAttachment } from './panel-utils'


/** 忘掉一个侧会话的草稿与展开状态。 */
export function forgetSideSession(sessionId: string | null | undefined, sideComposerStash: MutableRefObject<Map<string, StashedComposer<DroppedAttachment>>>, sideComposerOpenRef: MutableRefObject<Map<string, boolean>>): void {
  if (!sessionId) return
  sideComposerStash.current.delete(sessionId)
  sideComposerOpenRef.current.delete(sessionId)
}

/** 父会话被归档或删除后，丢掉它挂着的侧会话；当前正显示它时退回主线。 */
export function forgetParentSide(parentId: string, deps: {
  sideSnapshots: { current: Map<string, SideChatSnapshot> }
  activeConversationIdRef: MutableRefObject<string | null>
  applySideSnapshotRef: { current: (next: SideChatSnapshot) => void }
  sideComposerStash: MutableRefObject<Map<string, StashedComposer<DroppedAttachment>>>
  sideComposerOpenRef: MutableRefObject<Map<string, boolean>>
}): void {
  const saved = deps.sideSnapshots.current.get(parentId)
  if (!saved) return
  if (deps.activeConversationIdRef.current === parentId) {
    deps.applySideSnapshotRef.current({ sessionId: null, parentConversationId: parentId, expanded: false,
      queuePaused: false, snapshot: null, pendingMessages: [] })
  }
  deps.sideSnapshots.current.delete(parentId)
  forgetSideSession(saved.sessionId, deps.sideComposerStash, deps.sideComposerOpenRef)
}

/** 侧会话是否还存在（可能已被父会话归档或丢弃）。 */
export function sideSessionExists(sessionId: string, sideSnapshots: { current: Map<string, SideChatSnapshot> }): boolean {
  return [...sideSnapshots.current.values()].some((item) => item.sessionId === sessionId)
}

/** 当前正显示侧会话时，把它的草稿和展开状态记下来，切走以后再回来能恢复。 */
export function rememberVisibleSide(deps: {
  destinationRef: { current: 'main' | 'side' }
  sideChatRef: { current: SideChatSnapshot | null }
  sideSnapshots: { current: Map<string, SideChatSnapshot> }
  composerStateRef: { current: { draft: string; attachments: DroppedAttachment[] } }
  sideComposerStash: MutableRefObject<Map<string, StashedComposer<DroppedAttachment>>>
  sideComposerOpenRef: MutableRefObject<Map<string, boolean>>
  composerOpen: boolean
}): void {
  if (deps.destinationRef.current !== 'side') return
  const sessionId = deps.sideChatRef.current?.sessionId
  if (!sessionId || !sideSessionExists(sessionId, deps.sideSnapshots)) return
  const current = deps.composerStateRef.current
  stashComposerState(deps.sideComposerStash.current, sessionId, current.draft, current.attachments)
  deps.sideComposerOpenRef.current.set(sessionId, deps.composerOpen)
}
