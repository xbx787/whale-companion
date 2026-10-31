import { ipcMain } from 'electron'
import type { PermissionsIpcDeps } from './index'

/** 工具权限的查询、清除和回答。依赖由 index.ts 的 buildPermissionsIpcDeps 注入。 */
export function registerPermissionsIpc(deps: PermissionsIpcDeps): void {
  ipcMain.handle('pet:permissions:allowed', async (event, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    return deps.activeController().listAlwaysAllowed(conversationId as string | undefined)
  })
  ipcMain.handle('pet:permissions:clear', async (event, kind: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    await deps.activeController().clearAlwaysAllowed(typeof kind === 'string' ? kind : undefined, conversationId as string | undefined)
  })
  ipcMain.handle('pet:answer-permission', async (event, id: unknown, decision: unknown, conversationId: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof id !== 'string') throw new Error('操作编号无效。')
    if (decision !== 'once' && decision !== 'always' && decision !== 'deny') throw new Error('批准结果无效。')
    if (conversationId !== undefined && typeof conversationId !== 'string') throw new Error('会话编号无效。')
    await deps.activeController().answerPermission(id, decision, conversationId as string | undefined)
  })
}
