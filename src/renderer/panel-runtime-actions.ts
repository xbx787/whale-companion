import type { PetAPI } from '../shared/contracts'

/** 审批通过或拒绝：侧会话走侧接口，主线走主接口。 */
export async function decideAction({ approved, proposalId, busy, sending, setBusy, destination, sideSessionId, run }: {
  approved: boolean
  proposalId: string | undefined
  busy: string | null
  sending: boolean
  setBusy: (value: 'approve' | 'reject' | null) => void
  destination: 'main' | 'side'
  sideSessionId: string | null | undefined
  run: (action: (bridge: PetAPI) => Promise<void>) => Promise<boolean>
}): Promise<void> {
  if (!proposalId || busy || sending) return
  setBusy(approved ? 'approve' : 'reject')
  const sideId = destination === 'side' ? sideSessionId : null
  await run((bridge) => sideId
    ? approved ? bridge.approveSideChatAction(sideId, proposalId) : bridge.rejectSideChatAction(sideId, proposalId)
    : approved ? bridge.approveAction(proposalId) : bridge.rejectAction(proposalId))
  setBusy(null)
}

/** 停止当前任务：先停语音，再按目的地停侧会话或主线。 */
export async function stopAction({ busy, setBusy, destination, sideSessionId, stopSpeaking, run }: {
  busy: string | null
  setBusy: (value: 'stop' | null) => void
  destination: 'main' | 'side'
  sideSessionId: string | null | undefined
  stopSpeaking: () => void
  run: (action: (bridge: PetAPI) => Promise<void>) => Promise<boolean>
}): Promise<void> {
  if (busy) return
  setBusy('stop')
  stopSpeaking()
  const sideId = destination === 'side' ? sideSessionId : null
  await run((bridge) => sideId ? bridge.stopSideChat(sideId) : bridge.stop())
  setBusy(null)
}
