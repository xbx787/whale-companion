import { ipcMain } from 'electron'
import { APP_SLASH_COMMANDS } from './app-commands'
import { searchWorkspaceFiles } from './local-context'
import { isAskAnswers } from './ask-questions'
import type { ConversationController } from './conversation-controller'
import type { SideChatController } from './side-chat'

/** 会话控制面：命令目录、工作区搜索、队列、审批、草稿、停止、子代理和排队恢复。
 *  agentWorkspace 用 getter 读实时值，其余依赖直接传引用。 */
export interface ConversationControlIpcDeps {
  trusted(event: Electron.IpcMainInvokeEvent): boolean
  activeController(): ConversationController
  sideChat: SideChatController
  readonly agentWorkspace: string
}

export function registerConversationControlIpc(deps: ConversationControlIpcDeps): void {
  ipcMain.handle('pet:list-app-commands', async (event) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    await deps.activeController().initialize()
    return APP_SLASH_COMMANDS.map(({ name, description, kind, source }) => ({ name, description, kind, source }))
  })
  ipcMain.handle('pet:search-workspace-files', (event, query: unknown) => {
    if (!deps.trusted(event) || typeof query !== 'string' || query.length > 120) throw new Error('文件搜索条件无效。')
    return searchWorkspaceFiles(deps.agentWorkspace, query)
  })
  ipcMain.handle('pet:search-conversations', async (event, query: unknown, archived: unknown) => {
    if (!deps.trusted(event) || typeof query !== 'string' || query.length > 200 ||
        (archived !== undefined && typeof archived !== 'boolean')) throw new Error('搜索条件无效。')
    const matches = await deps.activeController().listConversations({ query, archived: archived as boolean | undefined })
    return deps.sideChat.withSideStatuses(matches)
  })
  ipcMain.handle('pet:remove-queued-message', async (event, id: unknown) => {
    if (!deps.trusted(event) || typeof id !== 'string') throw new Error('队列编号无效。')
    await deps.activeController().removeQueued(id)
  })
  ipcMain.handle('pet:move-queued-message', async (event, id: unknown, beforeId: unknown) => {
    if (!deps.trusted(event) || typeof id !== 'string') throw new Error('队列编号无效。')
    if (beforeId !== null && typeof beforeId !== 'string') throw new Error('队列编号无效。')
    await deps.activeController().moveQueued(id, beforeId as string | null)
  })
  ipcMain.handle('pet:steer-queued-message', async (event, id: unknown) => {
    if (!deps.trusted(event) || typeof id !== 'string') throw new Error('队列编号无效。')
    await deps.activeController().steerQueued(id)
  })
  ipcMain.handle('pet:approve-action', (event, id: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof id !== 'string') throw new Error('操作编号无效。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().approveAction(id, conversationId as string | undefined)
  })
  ipcMain.handle('pet:reject-action', (event, id: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof id !== 'string') throw new Error('操作编号无效。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().rejectAction(id, conversationId as string | undefined)
  })
  ipcMain.handle('pet:answer-question', (event, id: unknown, answers: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof id !== 'string') throw new Error('问答编号无效。')
    if (!isAskAnswers(answers)) throw new Error('答案格式无效。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().answerQuestion(id, answers, conversationId as string | undefined)
  })
  ipcMain.handle('pet:answer-plan', (event, id: unknown, approved: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof id !== 'string') throw new Error('计划编号无效。')
    if (typeof approved !== 'boolean') throw new Error('批准结果无效。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().answerPlan(id, approved, conversationId as string | undefined)
  })
  ipcMain.handle('pet:save-draft', (event, conversationId: unknown, text: unknown) => {
    if (!deps.trusted(event) || typeof conversationId !== 'string' || typeof text !== 'string') throw new Error('草稿保存请求无效。')
    return deps.activeController().saveDraft(conversationId, text)
  })
  ipcMain.handle('pet:get-draft', (event, conversationId: unknown) => {
    if (!deps.trusted(event) || typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().getDraft(conversationId)
  })
  ipcMain.handle('pet:clear-goal', (event, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().clearGoal(conversationId as string | undefined)
  })
  ipcMain.handle('pet:goal-pause', (event, paused: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof paused !== 'boolean') throw new Error('暂停状态无效。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().setGoalPaused(paused, conversationId as string | undefined)
  })
  ipcMain.handle('pet:stop', (event, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().stop(conversationId as string | undefined)
  })
  ipcMain.handle('pet:interrupt-turn', async (event, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    // 打断只管当前回合；队列是否继续由 controller 统一判断。
    await deps.activeController().interruptTurn(conversationId as string | undefined)
  })
  ipcMain.handle('pet:stop-command', (event, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().stopRunningCommand(conversationId as string | undefined)
  })
  ipcMain.handle('pet:background-task', (event, toolUseId: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof toolUseId !== 'string' || !toolUseId) throw new Error('子代理编号无效。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().backgroundTask(toolUseId, conversationId as string | undefined)
  })
  ipcMain.handle('pet:stop-task', (event, taskId: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof taskId !== 'string' || !taskId) throw new Error('子代理编号无效。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().stopTask(taskId, conversationId as string | undefined)
  })
  ipcMain.handle('pet:message-subagent', (event, toolUseId: unknown, text: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof toolUseId !== 'string' || !toolUseId) throw new Error('子代理编号无效。')
    if (typeof text !== 'string' || !text.trim()) throw new Error('消息不能为空。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().messageSubagent(toolUseId, text, conversationId as string | undefined)
  })
  ipcMain.handle('pet:resume-queue', (event, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().resumeQueue(conversationId as string | undefined)
  })
}
