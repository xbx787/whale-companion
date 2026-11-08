import { ipcMain, shell } from 'electron'
import { existsSync, promises as fsp } from 'node:fs'
import path from 'node:path'
import { getDeepSeekBalanceKey } from './model-config'
import { fetchDeepSeekBalance } from './deepseek-balance'
import type { BalanceIpcDeps } from './index'

/** 余额卡、外部链接和文件预览。依赖由 index.ts 的 buildBalanceIpcDeps 注入。 */
export function registerBalanceIpc(deps: BalanceIpcDeps): void {
  ipcMain.handle('pet:set-balance-open', (event, open: unknown) => {
    if (!deps.trusted(event) && !deps.balanceTrusted(event)) throw new Error('无效的界面请求。')
    if (typeof open !== 'boolean') throw new Error('余额卡片状态无效。')
    deps.setBalanceOpen(open)
  })
  ipcMain.handle('pet:toggle-balance', (event) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    // 中键点人物：第一下余额，第二下吐槽，再点回到余额。
    deps.toggleBalance()
  })
  ipcMain.handle('pet:get-balance', async (event) => {
    if (!deps.trusted(event) && !deps.balanceTrusted(event)) throw new Error('无效的界面请求。')
    const settings = (await deps.activeController().getLibraryState()).settings
    const key = getDeepSeekBalanceKey(settings, deps.deepseekKey)
    if (!key) throw new Error('请在设置中添加 DeepSeek API Key。')
    return fetchDeepSeekBalance(key)
  })
  ipcMain.handle('pet:open-external', async (event, value: unknown) => {
    // 余额卡在独立的 balance 窗口里渲染，同样要能打开充值/用量页。
    if (!deps.trusted(event) && !deps.balanceTrusted(event) && !deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    if (typeof value !== 'string' || value.length > 2_000) throw new Error('无效的链接。')
    const url = new URL(value)
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) throw new Error('不支持的链接。')
    await shell.openExternal(url.href)
  })
  ipcMain.handle('pet:roast-refresh', (event) => {
    // 吐槽卡复用余额窗口，所以余额窗口和主窗口都要能换。
    if (!deps.trusted(event) && !deps.balanceTrusted(event)) return null
    return deps.roastRefresh()
  })
  ipcMain.handle('pet:preview-file', async (event, value: unknown) => {
    if (!deps.trusted(event) || typeof value !== 'string' || !value.trim()) throw new Error('文件路径无效。')
    if (!path.isAbsolute(value)) throw new Error('需要绝对路径。')
    const stat = await fsp.stat(value).catch(() => null)
    if (!stat || !stat.isFile()) throw new Error('文件不存在。')
    const limit = 200 * 1024
    const handle = await fsp.open(value, 'r')
    try {
      const length = Math.min(stat.size, limit)
      const buffer = Buffer.alloc(length)
      await handle.read(buffer, 0, length, 0)
      return { path: value, text: buffer.toString('utf8'), truncated: stat.size > limit }
    } finally {
      await handle.close()
    }
  })
  ipcMain.handle('pet:open-path', async (event, value: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof value !== 'string' || value.length > 2_000 || !path.isAbsolute(value)) throw new Error('文件路径无效。')
    const target = path.resolve(value)
    // 图片结果可能指向工具读过的原文件，限制为图片扩展名。
    if (!/\.(png|jpe?g|gif|webp)$/i.test(target)) throw new Error('只能打开图片文件。')
    if (!existsSync(target)) throw new Error('文件已经不存在。')
    const failure = await shell.openPath(target)
    if (failure) throw new Error(`无法打开原图：${failure}`)
  })
}
