import { ipcMain } from 'electron'
import { isAskAnswers } from './ask-questions'
import { parseAppSlashCommand } from './app-commands'
import { normalizeModelMode } from '../shared/contracts'
import type { SideChatController } from './side-chat'
import type { ConversationController } from './conversation-controller'
import type { UserAttachment } from '../shared/contracts'

/** 临时会话和主发送共用的依赖：都依赖 registerIpc 内的附件解析函数，
 *  所以这里定义接口、调用处传对象，不走 index.ts 的工厂函数。 */
export interface SideIpcDeps {
  trusted(event: Electron.IpcMainInvokeEvent): boolean
  sideChat: SideChatController
  activeController(): ConversationController
  validAttachmentList(value: unknown): boolean
  resolveAttachments(items: UserAttachment[]): Promise<UserAttachment[]>
  readonly avatarWindow: Electron.BrowserWindow | undefined
}

export function registerSideIpc(deps: SideIpcDeps): void {
  ipcMain.handle('pet:side:get', (event) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    return deps.sideChat.getSnapshot()
  })
  ipcMain.handle('pet:side:open', (event) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    return deps.sideChat.open()
  })
  ipcMain.handle('pet:side:set-expanded', (event, sessionId: unknown, expanded: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string' || typeof expanded !== 'boolean') throw new Error('临时会话状态无效。')
    return deps.sideChat.setExpanded(sessionId, expanded)
  })
  ipcMain.handle('pet:side:discard', (event, sessionId: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string') throw new Error('临时会话编号无效。')
    return deps.sideChat.discard(sessionId)
  })
  ipcMain.handle('pet:side:send', async (event, sessionId: unknown, text: unknown, attachments: unknown, strategy: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string' || typeof text !== 'string' ||
        !deps.validAttachmentList(attachments ?? []) ||
        (strategy !== undefined && strategy !== 'queue' && strategy !== 'steer')) throw new Error('临时会话消息无效。')
    const resolved = await deps.resolveAttachments((attachments ?? []) as UserAttachment[])
    await deps.sideChat.send(sessionId, text, resolved, strategy as 'queue' | 'steer' | undefined)
  })
  ipcMain.handle('pet:side:stop', (event, sessionId: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string') throw new Error('临时会话编号无效。')
    deps.sideChat.stop(sessionId)
  })
  ipcMain.handle('pet:side:interrupt', (event, sessionId: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string') throw new Error('临时会话编号无效。')
    return deps.sideChat.interrupt(sessionId)
  })
  ipcMain.handle('pet:side:remove-queued', (event, sessionId: unknown, messageId: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string' || typeof messageId !== 'string') throw new Error('队列编号无效。')
    deps.sideChat.removeQueued(sessionId, messageId)
  })
  ipcMain.handle('pet:side:move-queued', (event, sessionId: unknown, messageId: unknown, beforeId: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string' || typeof messageId !== 'string') throw new Error('队列编号无效。')
    if (beforeId !== null && typeof beforeId !== 'string') throw new Error('队列编号无效。')
    deps.sideChat.moveQueued(sessionId, messageId, beforeId as string | null)
  })
  ipcMain.handle('pet:side:steer-queued', (event, sessionId: unknown, messageId: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string' || typeof messageId !== 'string') throw new Error('队列编号无效。')
    return deps.sideChat.steerQueued(sessionId, messageId)
  })
  ipcMain.handle('pet:side:approve-action', (event, sessionId: unknown, id: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string' || typeof id !== 'string') throw new Error('操作编号无效。')
    return deps.sideChat.approveAction(sessionId, id)
  })
  ipcMain.handle('pet:side:reject-action', (event, sessionId: unknown, id: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string' || typeof id !== 'string') throw new Error('操作编号无效。')
    deps.sideChat.rejectAction(sessionId, id)
  })
  ipcMain.handle('pet:side:answer-question', (event, sessionId: unknown, id: unknown, answers: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string' || typeof id !== 'string' || !isAskAnswers(answers)) throw new Error('答案格式无效。')
    return deps.sideChat.answerQuestion(sessionId, id, answers)
  })
  ipcMain.handle('pet:side:answer-plan', (event, sessionId: unknown, id: unknown, approved: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string' || typeof id !== 'string' || typeof approved !== 'boolean') throw new Error('批准结果无效。')
    return deps.sideChat.answerPlan(sessionId, id, approved)
  })
  ipcMain.handle('pet:side:get-context-usage', (event, sessionId: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string') throw new Error('临时会话编号无效。')
    return deps.sideChat.getContextUsage(sessionId)
  })
  ipcMain.handle('pet:side:compact', (event, sessionId: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string') throw new Error('临时会话编号无效。')
    return deps.sideChat.compact(sessionId)
  })
  ipcMain.handle('pet:side:set-model-mode', (event, sessionId: unknown, mode: unknown) => {
    const normalized = normalizeModelMode(mode)
    if (!deps.trusted(event) || typeof sessionId !== 'string' || !normalized) throw new Error('模型选项无效。')
    deps.sideChat.setModelMode(sessionId, normalized)
  })
  ipcMain.handle('pet:side:set-plan-mode', (event, sessionId: unknown, on: unknown) => {
    if (!deps.trusted(event) || typeof sessionId !== 'string' || typeof on !== 'boolean') throw new Error('计划模式设置无效。')
    return deps.sideChat.setPlanMode(sessionId, on)
  })
  ipcMain.handle('pet:send-message', async (event, text: unknown, attachments: unknown, strategy: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    if (typeof text !== 'string') throw new Error('消息必须是文本。')
    if (!deps.validAttachmentList(attachments ?? [])) throw new Error('附件数据无效。')
    if (strategy !== undefined && strategy !== 'queue' && strategy !== 'steer') throw new Error('发送方式无效。')
    const slash = parseAppSlashCommand(text)
    if (slash) {
      if (slash.name === 'side' || slash.name === 'btw') {
        const originId = deps.activeController().displayedConversationId()
        const originEpoch = deps.activeController().displayedConversationEpoch()
        if (conversationId !== undefined && conversationId !== originId) throw new Error('主会话已切换，请重新发送。')
        const resolved = await deps.resolveAttachments((attachments ?? []) as UserAttachment[])
        if (deps.activeController().displayedConversationId() !== originId ||
            deps.activeController().displayedConversationEpoch() !== originEpoch) throw new Error('主会话已切换，请重新发送。')
        // 只有附件也算一个有效首问；控制器在打开前校验，失败会整体回滚。
        await deps.sideChat.openWithMessage(slash.args, resolved)
        return
      }
      if ((attachments as Array<unknown> | undefined)?.length) throw new Error('应用命令不能附带文件。')
      if (slash.name !== 'new' && slash.args) throw new Error(`/${slash.name} 不接受额外参数。`)
      if (slash.name === 'new') {
        if (slash.args.length > 60 || /[\r\n]/u.test(slash.args)) throw new Error('新对话标题最多 60 字，且不能换行。')
        await deps.activeController().createConversation(slash.args || undefined)
      } else if (slash.name === 'compact') {
        await deps.activeController().compactConversation()
      } else {
        deps.avatarWindow?.webContents.send('pet:slash-ui', slash.name)
      }
      return
    }
    const resolved = await deps.resolveAttachments((attachments ?? []) as UserAttachment[])
    await deps.activeController().sendMessage(text, resolved, strategy as 'queue' | 'steer' | undefined, conversationId as string | undefined)
  })
}
