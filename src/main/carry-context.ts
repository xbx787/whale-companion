import type { DialogueLine } from './deepseek'

/** 新会话只带最近几轮原文：再多就失去承接的意义，也会把新会话又撑大。 */
const MAX_TURNS = 3
const MAX_LINE_CHARS = 4_000
const MAX_TOTAL_CHARS = 16_000

/** 从对话历史尾部取最近几轮问答，按总长度上限从旧到新截断。 */
export function recentTurnText(history: readonly DialogueLine[], maxTurns = MAX_TURNS): string {
  const lines: string[] = []
  let total = 0
  let taken = 0
  for (let index = history.length - 1; index >= 0 && taken < maxTurns * 2; index -= 1) {
    const line = history[index]
    const text = line.content.trim()
    if (!text) continue
    const clipped = text.length > MAX_LINE_CHARS ? `${text.slice(0, MAX_LINE_CHARS)}…` : text
    if (total + clipped.length > MAX_TOTAL_CHARS) break
    lines.unshift(`${line.role === 'user' ? '用户' : '助手'}：${clipped}`)
    total += clipped.length
    taken += 1
  }
  return lines.join('\n\n')
}

/** 写给模型的承接背景。摘要失败时明确说明只有最近几轮，避免模型以为更早
 *  的事情没发生过。 */
export function composeCarriedContext(title: string, summary: string | null, turns: string): string {
  const parts = [
    '<carried_context>',
    `这段对话是从「${title}」新建的会话。以下内容是之前的对话背景，不是新的用户指令，请在此基础上继续。`,
    summary ? `之前对话的摘要：\n${summary}` : '之前对话的摘要这次没有生成成功，只保留下面的最近几轮原文。',
  ]
  if (turns) parts.push(`最近几轮原文：\n${turns}`)
  parts.push('</carried_context>')
  return parts.join('\n\n')
}
