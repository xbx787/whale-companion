import type { ApprovalMode, PetAPI } from '../shared/contracts'
import { normalizeApprovalMode } from '../shared/contracts'

/** 审批模式切换的依赖：确认框、菜单和提示文本都由调用方持有。 */
export interface ApprovalModeActionsDeps {
  approvalMode: ApprovalMode | undefined
  destination: 'main' | 'side'
  run: (action: (bridge: PetAPI) => Promise<void>) => Promise<boolean>
  closeMenu: () => void
  setBypassOpen: (open: boolean) => void
  setEvolveOpen: (open: boolean) => void
  resetEvolveText: () => void
}

/** 真正提交审批模式；侧会话沿用主线权限，不单独提交。 */
export async function applyApprovalMode(mode: ApprovalMode, deps: ApprovalModeActionsDeps): Promise<void> {
  if (normalizeApprovalMode(deps.approvalMode) === mode) {
    deps.closeMenu()
    deps.setBypassOpen(false)
    return
  }
  // Side chats inherit the main conversation's permission mode.
  if (deps.destination === 'side') { deps.closeMenu(); return }
  const accepted = await deps.run((bridge) => bridge.setApprovalMode(mode))
  if (accepted) {
    deps.closeMenu()
    deps.setBypassOpen(false)
    deps.setEvolveOpen(false)
    deps.resetEvolveText()
  }
}

/** 选择审批模式：完全访问和自我进化先弹确认，工作区写入升完全访问不二次确认。 */
export async function chooseApprovalMode(mode: ApprovalMode, deps: ApprovalModeActionsDeps): Promise<void> {
  const current = normalizeApprovalMode(deps.approvalMode)
  if (mode === 'danger-full-access' && current !== 'danger-full-access') {
    if (current === 'workspace-write') { await applyApprovalMode(mode, deps); return }
    deps.closeMenu()
    deps.setBypassOpen(true)
    return
  }
  if (mode === 'selfEvolve' && current !== 'selfEvolve') {
    deps.closeMenu()
    deps.resetEvolveText()
    deps.setEvolveOpen(true)
    return
  }
  await applyApprovalMode(mode, deps)
}
