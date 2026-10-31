import { ipcMain } from 'electron'
import { isApprovalMode, isAutoCompactPercent, normalizeModelMode } from '../shared/contracts'
import { isEffortLevel } from '../shared/effort'
import type { ConversationSettingsIpcDeps } from './index'

/** 计划模式、审批模式、思考强度、联网搜索、自动压缩阈值和模型选项。
 *  依赖由 index.ts 的 buildConversationSettingsIpcDeps 注入。 */
export function registerConversationSettingsIpc(deps: ConversationSettingsIpcDeps): void {
  ipcMain.handle('pet:set-plan-mode', async (event, on: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof on !== 'boolean') throw new Error('计划模式设置无效。')
    await deps.activeController().setPlanMode(on)
  })
  ipcMain.handle('pet:set-approval-mode', async (event, mode: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (!isApprovalMode(mode)) throw new Error('审批模式无效。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    await deps.activeController().setApprovalMode(mode, conversationId as string | undefined)
  })
  ipcMain.handle('pet:set-effort', async (event, level: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (!isEffortLevel(level)) throw new Error('思考强度无效。')
    await deps.activeController().updateSettings({ effort: level })
  })
  ipcMain.handle('pet:set-web-search', async (event, on: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof on !== 'boolean') throw new Error('联网搜索设置无效。')
    await deps.activeController().updateSettings({ webSearchEnabled: on })
  })
  ipcMain.handle('pet:set-auto-compact-percent', async (event, percent: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (!isAutoCompactPercent(percent)) throw new Error('自动压缩阈值应为 50–90 之间的整数。')
    await deps.activeController().updateSettings({ autoCompactPercent: percent })
  })
  ipcMain.handle('pet:set-model-mode', (event, mode: unknown) => {
    if (!deps.trusted(event)) return
    const normalized = normalizeModelMode(mode)
    if (!normalized) throw new Error('模型选项无效。')
    return deps.activeController().setModelMode(normalized)
  })
}
