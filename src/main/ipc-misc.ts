import { app, ipcMain } from 'electron'
import path from 'node:path'
import { attachmentPreviewPath, prepareDroppedFile, readImagePreview, stagePastedAttachment } from './local-context'
import { voiceLog } from './voice-log'
import type { MiscIpcDeps } from './index'

/** 附件预处理、快照、角色状态、语音日志和退出。依赖由 index.ts 的 buildMiscIpcDeps 注入。 */
export function registerMiscIpc(deps: MiscIpcDeps): void {
  ipcMain.handle('pet:prepare-dropped-file', async (event, filePath: unknown) => {
    if (!deps.trusted(event) || typeof filePath !== 'string') throw new Error('拖入文件无效。')
    return prepareDroppedFile(filePath)
  })
  ipcMain.handle('pet:prepare-pasted-file', async (event, request: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (!request || typeof request !== 'object') throw new Error('粘贴内容无效。')
    const { name, data } = request as { name?: unknown; data?: unknown }
    if (typeof name !== 'string' || !name.trim() || name.length > 260 || typeof data !== 'string') throw new Error('粘贴内容无效。')
    return stagePastedAttachment(path.join(deps.dataRoot, 'attachments'), name.trim(), data)
  })
  ipcMain.handle('pet:read-image-preview', async (event, filePath: unknown) => {
    if (!deps.trusted(event) || typeof filePath !== 'string' || filePath.length > 32_000) throw new Error('预览请求无效。')
    const target = attachmentPreviewPath(path.join(deps.dataRoot, 'attachments'), filePath)
    return target ? readImagePreview(target) : null
  })
  ipcMain.handle('pet:get-snapshot', (event) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    return deps.snapshotWithSideStatuses()
  })
  ipcMain.handle('pet:update-status', (event) => {
    if (!deps.trusted(event)) return null
    return deps.updateService.lastStatus()
  })
  ipcMain.handle('pet:set-avatar-state', (event, state: unknown) => {
    if (!deps.trusted(event)) return
    if (state !== 'idle' && state !== 'thinking' && state !== 'listening' && state !== 'speaking' && state !== 'acting' && state !== 'success' && state !== 'error') {
      throw new Error('角色状态无效。')
    }
    const taskStatus = deps.activeController().displayedRuntime()?.getSnapshot().taskStatus ?? 'idle'
    if (state === 'idle' && ['planning', 'awaiting_approval', 'executing', 'verifying'].includes(taskStatus)) {
      throw new Error('任务进行中时不能将角色状态设为待机。')
    }
    deps.rendererAvatarState = state === 'idle' ? undefined : state
    deps.publishSnapshot()
  })
  ipcMain.handle('pet:voice-log', (event, level: unknown, message: unknown, data: unknown) => {
    if (!deps.trusted(event)) return
    const allowed = new Set(['[asr] mediaRecorder stop', '[asr] mediaRecorder error', '[asr] transcribe start', '[asr] transcribe result', '[asr] transcribe error'])
    if (typeof message !== 'string' || !allowed.has(message)) return
    const fields = data && typeof data === 'object' ? data as Record<string, unknown> : {}
    const safe = Object.fromEntries(['chunks', 'totalSize', 'bytes', 'textLength'].flatMap((key) =>
      typeof fields[key] === 'number' && Number.isFinite(fields[key]) && Number(fields[key]) >= 0 ? [[key, fields[key]]] : []))
    voiceLog(message, { level: level === 'error' ? 'error' : 'info', ...safe })
  })
  ipcMain.handle('pet:quit', (event) => { if (deps.trusted(event)) app.quit() })
}
