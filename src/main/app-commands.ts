/** 应用内 slash 命令：只做解析，不依赖任何后端。
 *
 *  这些命令原先和工作流一起放在 claude-workflows 里；工作流已随 Claude
 *  后端删除，命令本身还在用，所以单独留一份。 */

import type { AppCommandOption } from '../shared/contracts'

export const APP_SLASH_COMMANDS: readonly AppCommandOption[] = [
  { name: 'new', description: '新建对话，保留原对话', kind: 'command', source: 'builtin' },
  { name: 'side', description: '展开临时会话，不写入主会话', kind: 'command', source: 'builtin' },
  { name: 'btw', description: '展开临时会话', kind: 'command', source: 'builtin' },
  { name: 'sessions', description: '打开会话库', kind: 'command', source: 'builtin' },
  { name: 'model', description: '打开模型与上下文面板', kind: 'command', source: 'builtin' },
  { name: 'help', description: '查看可用命令', kind: 'command', source: 'builtin' },
  { name: 'compact', description: '压缩当前对话上下文', kind: 'command', source: 'builtin' }
]

export type AppSlashCommandName = 'new' | 'side' | 'btw' | 'sessions' | 'model' | 'help' | 'compact'

export function parseAppSlashCommand(input: string): { name: AppSlashCommandName; args: string } | null {
  if (typeof input !== 'string') return null
  const match = /^\/([a-z][a-z0-9_-]*)(?:\s+([\s\S]*))?$/i.exec(input.trim())
  if (!match) return null
  const name = match[1].toLowerCase()
  if (!APP_SLASH_COMMANDS.some((command) => command.name === name)) return null
  return { name: name as AppSlashCommandName, args: (match[2] ?? '').trim() }
}
