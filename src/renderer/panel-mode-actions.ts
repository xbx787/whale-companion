import type { EffortLevel, PetAPI } from '../shared/contracts'

/** 选择思考强度：侧会话不可改，值没变就不提交。 */
export async function chooseEffort({ level, current, destination, run }: {
  level: EffortLevel
  current: EffortLevel | undefined
  destination: 'main' | 'side'
  run: (action: (bridge: PetAPI) => Promise<void>) => Promise<boolean>
}): Promise<void> {
  if (destination === 'side') return
  if (current === level) return
  await run((bridge) => bridge.setEffort(level))
}

/** 切换计划模式：侧会话走侧接口，主线走主接口。 */
export async function choosePlanMode({ on, current, destination, sideSessionId, run }: {
  on: boolean
  current: boolean | undefined
  destination: 'main' | 'side'
  sideSessionId: string | null | undefined
  run: (action: (bridge: PetAPI) => Promise<void>) => Promise<boolean>
}): Promise<void> {
  if (Boolean(current) === on) return
  const sideId = destination === 'side' ? sideSessionId : null
  await run((bridge) => sideId ? bridge.setSideChatPlanMode(sideId, on) : bridge.setPlanMode(on))
}

/** 展开或收起侧会话；没有侧会话时什么都不做。 */
export async function setSideExpanded({ expanded, sideSessionId, run }: {
  expanded: boolean
  sideSessionId: string | null | undefined
  run: (action: (bridge: PetAPI) => Promise<void>) => Promise<boolean>
}): Promise<void> {
  if (!sideSessionId) return
  await run(async (bridge) => { await bridge.setSideChatExpanded(sideSessionId, expanded) })
}

/** 丢弃侧会话；没有侧会话时什么都不做。 */
export async function discardSide({ sideSessionId, run }: {
  sideSessionId: string | null | undefined
  run: (action: (bridge: PetAPI) => Promise<void>) => Promise<boolean>
}): Promise<void> {
  if (!sideSessionId) return
  await run((bridge) => bridge.discardSideChat(sideSessionId))
}
