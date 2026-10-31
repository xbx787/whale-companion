import { BrowserWindow, ipcMain, Menu } from 'electron'
import type { ShellIpcDeps } from './index'

/** 头像读取、设置与引导窗口打开、右键菜单。依赖由 index.ts 的 buildShellIpcDeps 注入。 */
export function registerShellIpc(deps: ShellIpcDeps): void {
  ipcMain.handle('pet:read-avatar', (event, kind: unknown) => {
    if (!deps.modelTrusted(event)) throw new Error('无效的界面请求。')
    if (kind !== 'user' && kind !== 'assistant') throw new Error('头像类型无效。')
    return deps.readAvatarDataUrl(kind)
  })
  ipcMain.handle('pet:open-settings', (event, tab: unknown) => {
    if (!deps.trusted(event)) return
    deps.openSettings(typeof tab === 'string' ? tab : undefined)
  })
  ipcMain.handle('pet:open-onboarding', (event) => { if (deps.trusted(event)) deps.openOnboarding() })
  ipcMain.handle('pet:show-context-menu', (event) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (deps.avatarWindow && deps.contextMenu) deps.contextMenu.popup({ window: deps.avatarWindow })
  })
  ipcMain.handle('pet:show-text-menu', (event, payload: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    const text = payload && typeof payload === 'object' && typeof (payload as { text?: unknown }).text === 'string'
      ? (payload as { text: string }).text
      : ''
    if (!text) return null
    const owner = BrowserWindow.fromWebContents(event.sender)
    return new Promise<'quote' | 'copy' | null>((resolve) => {
      let settled = false
      const finish = (value: 'quote' | 'copy' | null): void => {
        if (settled) return
        settled = true
        resolve(value)
      }
      const menu = Menu.buildFromTemplate([
        { label: '引用', click: () => finish('quote') },
        { label: '复制', click: () => finish('copy') }
      ])
      if (owner) menu.popup({ window: owner, callback: () => finish(null) })
      else menu.popup({ callback: () => finish(null) })
    })
  })
}
