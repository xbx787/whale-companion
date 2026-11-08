import type { ApprovalMode, AskAnswers, AskQuestionRequest, ConversationSummary, TaskStatus, TimelineEntry, UserAttachment } from '../shared/contracts'

export const APPROVAL_MODE_HINTS: Record<ApprovalMode, string> = {
  'read-only': '每次修改文件或执行命令前都先问你',
  'workspace-write': '允许在工作区内改文件，越界操作由沙箱拦住',
  'danger-full-access': '所有工具直接执行，不再询问',
  selfEvolve: '最高权限：可改代码、打包、重启并跨重启续跑'
}

export const taskLabels: Record<TaskStatus, string> = {
  idle: '待命',
  planning: '整理任务',
  awaiting_approval: '需要回复',
  executing: '正在执行',
  verifying: '验证结果',
  done: '已完成',
  failed: '执行失败',
  cancelled: '已停止',
};

export const MAIN_ONLY_SIDE_COMMANDS = new Set(['new', 'side', 'btw', 'sessions', 'model', 'help', 'goal', 'compact']);

export function sideOnlySlashError(text: string): string | null {
  const name = /^\/([a-z][a-z0-9_-]*)(?=\s|$)/iu.exec(text.trim())?.[1]?.toLowerCase();
  if (!name || !MAIN_ONLY_SIDE_COMMANDS.has(name)) return null;
  return name === 'side' || name === 'btw'
    ? '当前已在临时会话；先收起，再从主线开启。'
    : name === 'compact' ? '请使用临时会话上下文菜单中的「压缩上下文」。'
    : `/${name} 仅适用于主线，请先收起临时会话。`;
}

const senderBadges: Record<string, string> = { 定时任务: '时', 自动恢复: '恢', 上下文压缩: '压', 重启恢复: '启' };
export function senderBadge(name: string): string {
  return senderBadges[name] ?? name.slice(0, 1);
}

/** 宿主的计划审批卡是英文的（Plan review / Approve / Keep planning），
 *  这里只翻译显示文案；回答时再映射回原 label，宿主仍按英文匹配。 */
const PLAN_ANSWER_LABELS: Record<string, string> = { Approve: '批准', 'Keep planning': '继续规划' };
export function localizeAskRequest(request: AskQuestionRequest): AskQuestionRequest {
  return {
    ...request,
    questions: request.questions.map((question) => {
      const isPlanReview = /plan review|approve this plan|keep planning/i.test(`${question.header ?? ''} ${question.question}`);
      if (!isPlanReview) return question;
      return {
        ...question,
        header: question.header ? '计划审批' : question.header,
        question: '批准这份计划并退出计划模式？',
        options: question.options.map((option) => ({
          ...option,
          label: PLAN_ANSWER_LABELS[option.label] ?? option.label,
          description: option.label === 'Approve' ? '退出计划模式，从下一步开始执行计划。'
            : option.label === 'Keep planning' ? '留在计划模式，修改意见会回到模型。' : option.description
        }))
      };
    })
  };
}

export function restoreAskAnswers(answers: AskAnswers): AskAnswers {
  const restore = (value: string): string => value === '批准' ? 'Approve' : value === '继续规划' ? 'Keep planning' : value;
  const restored: AskAnswers = {};
  for (const [key, value] of Object.entries(answers)) {
    restored[key] = Array.isArray(value) ? value.map(restore) : restore(value);
  }
  return restored;
}

export const kindLabels: Record<TimelineEntry['kind'], string> = {
  user: '你',
  assistant: '小鲸',
  system: '系统',
  tool: '工具',
  subagent: '子代理',
  thinking: '思考',
};

export interface DroppedAttachment extends UserAttachment { id: string }

/** A rejected submission goes back to the conversation it came from. Keep
 *  anything the owner typed or dropped while the IPC request was in flight. */
export function mergeComposerDraft(submitted: string, current: string): string {
  if (!submitted) return current;
  if (!current) return submitted;
  return `${submitted.trimEnd()}\n\n${current}`;
}

export function mergeComposerAttachments(submitted: DroppedAttachment[], current: DroppedAttachment[]): DroppedAttachment[] {
  const merged = [...submitted];
  for (const item of current) {
    if (!merged.some((existing) => existing.id === item.id ||
      (existing.name === item.name && existing.path === item.path && existing.content === item.content))) merged.push(item);
  }
  return merged;
}

/** 会话的任务状态；标签圆点、快捷标签和右栏都用它。 */
export const conversationStatus = (item: ConversationSummary): TaskStatus => item.taskStatus;
export const statusRunning = (item: ConversationSummary): boolean => ['planning', 'awaiting_approval', 'executing', 'verifying'].includes(conversationStatus(item));

/** 面板闲置到点：可见、没有任务在跑、距最后一次操作达到设定分钟数。
 *  时间比较放在纯函数里，方便单测和盯着“到底哪天才会收”。 */
export function panelAutoCollapseDue(input: {
  visible: boolean
  busy: boolean
  lastActivity: number
  now: number
  minutes: number
}): boolean {
  if (!input.visible || input.busy) return false
  if (!Number.isFinite(input.minutes) || input.minutes <= 0) return false
  return input.now - input.lastActivity >= input.minutes * 60_000
}
