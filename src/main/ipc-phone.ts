import { ipcMain } from 'electron'
import type { PhoneLink } from './phone-link'

/** 电脑连手机 DSH Go 的 IPC：状态、扫描、连接、断开、会话列表、读最近记录、发消息。 */
export interface PhoneIpcDeps {
  trusted(event: Electron.IpcMainInvokeEvent): boolean
  settingsTrusted(event: Electron.IpcMainInvokeEvent): boolean
  phoneLink: PhoneLink
}

export function registerPhoneIpc(deps: PhoneIpcDeps): void {
  const allowed = (event: Electron.IpcMainInvokeEvent): boolean =>
    deps.trusted(event) || deps.settingsTrusted(event)

  ipcMain.handle('pet:phone:status', (event) => {
    if (!allowed(event)) throw new Error('无效的界面请求。')
    return deps.phoneLink.status()
  })

  ipcMain.handle('pet:phone:scan', async (event) => {
    if (!allowed(event)) throw new Error('无效的界面请求。')
    return await deps.phoneLink.scan()
  })

  ipcMain.handle('pet:phone:connect', async (event, host: unknown, password: unknown) => {
    if (!allowed(event) || typeof host !== 'string') throw new Error('手机地址无效。')
    if (password !== undefined && typeof password !== 'string') throw new Error('访问密码无效。')
    return await deps.phoneLink.connect(host, password as string | undefined)
  })

  ipcMain.handle('pet:phone:disconnect', (event) => {
    if (!allowed(event)) throw new Error('无效的界面请求。')
    deps.phoneLink.disconnect()
  })

  ipcMain.handle('pet:phone:sessions', async (event) => {
    if (!allowed(event)) throw new Error('无效的界面请求。')
    return await deps.phoneLink.list()
  })

  ipcMain.handle('pet:phone:read', async (event, sessionId: unknown, limit: unknown) => {
    if (!allowed(event) || typeof sessionId !== 'string') throw new Error('会话编号无效。')
    const size = typeof limit === 'number' && Number.isFinite(limit) ? limit : undefined
    return await deps.phoneLink.read(sessionId, size)
  })

  ipcMain.handle('pet:phone:send', async (event, sessionId: unknown, text: unknown, mode: unknown) => {
    if (!allowed(event) || typeof sessionId !== 'string' || typeof text !== 'string') throw new Error('消息无效。')
    const strategy = mode === 'steer' ? 'steer' : 'queue'
    await deps.phoneLink.send(sessionId, text, strategy)
  })

  ipcMain.handle('pet:phone:auto-connect', (event, on: unknown) => {
    if (!allowed(event) || typeof on !== 'boolean') throw new Error('设置无效。')
    deps.phoneLink.setAutoConnect(on)
  })
}
