import { ipcMain } from 'electron'
import { isModelProfile } from './conversation-store'
import { publicSettings } from './secret-storage'
import { discoverProviderModels } from './model-discovery'
import type { ModelsIpcDeps } from './index'

/** 模型配置、显示开关和头像上传。依赖由 index.ts 的 buildModelsIpcDeps 注入。 */
export function registerModelsIpc(deps: ModelsIpcDeps): void {
  ipcMain.handle('pet:save-model-profile', (event, profile: unknown) => {
    if (!deps.modelTrusted(event)) throw new Error('无效的界面请求。')
    if (!isModelProfile(profile)) throw new Error('模型配置格式无效。')
    return deps.activeController().saveModelProfile(profile)
  })
  ipcMain.handle('pet:delete-model-profile', (event, id: unknown) => {
    if (!deps.modelTrusted(event)) throw new Error('无效的界面请求。')
    if (typeof id !== 'string') throw new Error('模型配置编号无效。')
    return deps.activeController().deleteModelProfile(id)
  })
  ipcMain.handle('pet:set-model-profile-enabled', (event, id: unknown, enabled: unknown) => {
    if (!deps.modelTrusted(event)) throw new Error('无效的界面请求。')
    if (typeof id !== 'string' || typeof enabled !== 'boolean') throw new Error('模型配置格式无效。')
    return deps.activeController().setModelProfileEnabled(id, enabled)
  })
  ipcMain.handle('pet:discover-models', async (event, profile: unknown) => {
    if (!deps.modelTrusted(event)) throw new Error('无效的界面请求。')
    if (!isModelProfile(profile)) throw new Error('模型配置格式无效。')
    const saved = (await deps.activeController().getLibraryState()).settings.modelProfiles.find((item) => item.id === profile.id)
    const apiKey = profile.apiKey || (saved?.baseUrl === profile.baseUrl ? saved.apiKey : '')
    if (!apiKey) throw new Error('请先输入 API Key。')
    return discoverProviderModels({ baseUrl: profile.baseUrl, apiKey })
  })
  ipcMain.handle('pet:set-model-profile', async (event, id: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (id !== null && typeof id !== 'string') throw new Error('模型配置编号无效。')
    const result = await deps.activeController().setModelProfile(id)
    // 切换后异步探测，不拖慢按钮；不可达时再弹明确提示。
    void deps.checkProviderHealth()
    return result
  })
  ipcMain.handle('pet:test-model-profile', async (event, profile: unknown) => {
    if (!deps.modelTrusted(event)) throw new Error('无效的界面请求。')
    if (!isModelProfile(profile)) throw new Error('模型配置格式无效。')
    const saved = (await deps.activeController().getLibraryState()).settings.modelProfiles.find((item) => item.id === profile.id)
    const apiKey = profile.apiKey || (saved?.baseUrl === profile.baseUrl ? saved.apiKey : '')
    if (!apiKey) throw new Error('请先输入 API Key。')
    return deps.probeAnthropicEndpoint({ ...profile, apiKey })
  })
  ipcMain.handle('pet:set-auto-title', (event, on: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof on !== 'boolean') throw new Error('设置无效。')
    return deps.activeController().updateSettings({ enableAutoTitleGeneration: on }).then(publicSettings)
  })
  ipcMain.handle('pet:set-timestamps', (event, on: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof on !== 'boolean') throw new Error('设置无效。')
    return deps.activeController().updateSettings({ showMessageTimestamps: on }).then(publicSettings)
  })
  ipcMain.handle('pet:set-user-names', (event, userName: unknown, assistantName: unknown) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    if (typeof userName !== 'string' || typeof assistantName !== 'string') throw new Error('称呼无效。')
    return deps.activeController().updateSettings({ userName, assistantName }).then(publicSettings)
  })
  ipcMain.handle('pet:set-avatar', async (event, kind: unknown, bytes: unknown) => {
    if (!deps.modelTrusted(event)) throw new Error('无效的界面请求。')
    if (kind !== 'user' && kind !== 'assistant') throw new Error('头像类型无效。')
    if (!Array.isArray(bytes) || !bytes.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
      throw new Error('头像数据无效。')
    }
    await deps.storeAvatar(kind, bytes as number[])
  })
}
