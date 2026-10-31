import type { ApprovalMode, TimelineEntry } from '../shared/contracts'

// 审批菜单按 DSH 的沙箱预设排列，严格到宽松：只读、工作区写入、完全访问，
// 最后一档是应用自己的自我进化（完全访问 + 修改自身和重启）。
/** 未归档会话上限：第 9 个不允许创建或恢复。 */
export const UNARCHIVED_LIMIT = 8
export const APPROVAL_MODES: ApprovalMode[] = ['read-only', 'workspace-write', 'danger-full-access', 'selfEvolve']
export const APPROVAL_MODE_LABELS: Record<ApprovalMode, string> = {
  'read-only': '手动审批',
  'workspace-write': '工作区写入',
  'danger-full-access': '完全访问',
  selfEvolve: '自我进化'
}

/** Stable identity for an absent timeline so the grouping memos below survive
 *  re-renders that don't touch the timeline at all. */
export const EMPTY_TIMELINE: TimelineEntry[] = [];
/** The feed renders only its tail by default; scrolling to the top extends
 *  the window by whole turns, so a five-thousand-entry history stops costing
 *  a five-thousand-node DOM on every open. */
export const EARLIER_MIN_ENTRIES = 120;
export const EARLIER_STEP_GROUPS = 6;
/** 1.6 万条时间线不能在首帧一次性分组；先只取尾部一段，滚动到顶再扩。 */
export const INITIAL_HISTORY_ENTRIES = 150;
export const HISTORY_STEP_ENTRIES = 300;

/** Stable empty arrangement for the `?? []` fallback: a fresh array on every
 *  render would defeat the memo comparisons downstream. */
export const EMPTY_TAB_ORDER: string[] = [];
