import { dialog, ipcMain } from 'electron'
import { promises as fsp } from 'node:fs'
import { MAX_BATCH_CONVERSATIONS } from './conversation-store'
import type { ConversationController } from './conversation-controller'
import type { SideChatController } from './side-chat'

/** 会话的新建、切换、重命名、置顶、标签顺序、归档、删除、导入导出、
 *  删除单轮、历史分页、上下文用量和手动压缩。 */
export interface ConversationsIpcDeps {
  trusted(event: Electron.IpcMainInvokeEvent): boolean
  activeController(): ConversationController
  sideChat: SideChatController
  readonly panelWindow: Electron.BrowserWindow | undefined
}

export function registerConversationsIpc(deps: ConversationsIpcDeps): void {
  ipcMain.handle('pet:create-conversation', async (event, title: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (title !== undefined && typeof title !== 'string') throw new Error('标题无效。')
    await deps.activeController().createConversation(title as string | undefined)
  })
  ipcMain.handle('pet:select-conversation', async (event, id: unknown) => {
    if (!deps.trusted(event) || typeof id !== 'string') throw new Error('会话编号无效。')
    await deps.activeController().selectConversation(id)
  })
  ipcMain.handle('pet:rename-conversation', async (event, id: unknown, title: unknown) => {
    if (!deps.trusted(event) || typeof id !== 'string' || typeof title !== 'string') throw new Error('会话标题无效。')
    await deps.activeController().renameConversation(id, title)
  })
  ipcMain.handle('pet:set-conversation-pinned', async (event, id: unknown, pinned: unknown) => {
    if (!deps.trusted(event) || typeof id !== 'string' || typeof pinned !== 'boolean') throw new Error('置顶请求无效。')
    await deps.activeController().setConversationPinned(id, pinned)
  })
  ipcMain.handle('pet:set-tab-order', async (event, ids: unknown) => {
    if (!deps.trusted(event) || !Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) throw new Error('标签顺序无效。')
    await deps.activeController().setTabOrder(ids as string[])
  })
  ipcMain.handle('pet:set-hidden-tabs', async (event, ids: unknown) => {
    if (!deps.trusted(event) || !Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) throw new Error('隐藏标签无效。')
    await deps.activeController().updateSettings({ hiddenTabIds: ids as string[] })
  })
  ipcMain.handle('pet:archive-conversation', async (event, id: unknown) => {
    if (!deps.trusted(event) || typeof id !== 'string') throw new Error('会话编号无效。')
    await deps.activeController().archiveConversation(id)
    await deps.sideChat.discardParent(id)
  })
  ipcMain.handle('pet:restore-conversation', async (event, id: unknown) => {
    if (!deps.trusted(event) || typeof id !== 'string') throw new Error('会话编号无效。')
    await deps.activeController().restoreConversation(id)
  })
  ipcMain.handle('pet:delete-conversation', async (event, id: unknown) => {
    if (!deps.trusted(event) || typeof id !== 'string') throw new Error('会话编号无效。')
    await deps.activeController().deleteConversation(id)
    await deps.sideChat.discardParent(id)
  })
  ipcMain.handle('pet:export-conversation', async (event, id: unknown) => {
    if (!deps.trusted(event) || typeof id !== 'string') throw new Error('会话编号无效。')
    const payload = await deps.activeController().exportConversation(id)
    const safe = payload.conversation.title.replace(/[\\/:*?"<>|]/gu, '-').trim().slice(0, 60) || 'conversation'
    const options: Electron.SaveDialogOptions = {
      title: '导出会话',
      defaultPath: `${safe}.dsh.json`,
      filters: [{ name: 'DSH 会话', extensions: ['json'] }]
    }
    const parent = deps.panelWindow && !deps.panelWindow.isDestroyed() ? deps.panelWindow : undefined
    const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    await fsp.writeFile(result.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    return result.filePath
  })
  ipcMain.handle('pet:import-conversation', async (event) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    const options: Electron.OpenDialogOptions = {
      title: '导入会话',
      properties: ['openFile'],
      filters: [{ name: 'DSH 会话', extensions: ['json'] }]
    }
    const parent = deps.panelWindow && !deps.panelWindow.isDestroyed() ? deps.panelWindow : undefined
    const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options)
    const file = result.canceled ? undefined : result.filePaths[0]
    if (!file) return null
    const stat = await fsp.stat(file)
    if (stat.size > 64 * 1024 * 1024) throw new Error('会话文件超过 64 MB，无法导入。')
    const parsed: unknown = JSON.parse(await fsp.readFile(file, 'utf8'))
    return deps.activeController().importConversation(parsed)
  })
  ipcMain.handle('pet:batch-manage-conversations', async (event, action: unknown, ids: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if ((action !== 'archive' && action !== 'restore' && action !== 'delete' &&
         action !== 'pin' && action !== 'unpin') ||
        !Array.isArray(ids) || ids.length > MAX_BATCH_CONVERSATIONS ||
        ids.some((id) => typeof id !== 'string' || !id.trim() || id.length > 128)) {
      throw new Error('批量会话请求无效。')
    }
    const result = await deps.activeController().batchManageConversations(action, ids as string[])
    if (action === 'archive' || action === 'delete') {
      await Promise.all(result.outcomes.filter((item) => item.status === 'updated')
        .map((item) => deps.sideChat.discardParent(item.id)))
    }
    return result
  })
  ipcMain.handle('pet:delete-turn', async (event, conversationId: unknown, userEntryId: unknown) => {
    if (!deps.trusted(event) || typeof conversationId !== 'string' || typeof userEntryId !== 'string') throw new Error('删除请求无效。')
    await deps.activeController().deleteTurn(conversationId, userEntryId)
  })
  ipcMain.handle('pet:conversation-timeline-page', async (event, conversationId: unknown, before: unknown, limit: unknown) => {
    if (!deps.trusted(event) || typeof conversationId !== 'string' || typeof before !== 'number' || typeof limit !== 'number') {
      throw new Error('历史分页请求无效。')
    }
    return await deps.activeController().timelinePage(conversationId, before, limit)
  })
  ipcMain.handle('pet:get-context-usage', (event, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().getContextUsage(conversationId as string | undefined)
  })
  ipcMain.handle('pet:compact-conversation', (event, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().compactConversation(conversationId as string | undefined)
  })
  ipcMain.handle('pet:carry-conversation', (event, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    return deps.activeController().carryConversation(conversationId as string | undefined)
  })
}
