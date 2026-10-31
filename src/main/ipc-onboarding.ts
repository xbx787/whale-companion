import { ipcMain, shell } from 'electron'
import { normalizeApiKey } from '../shared/onboarding'
import {
  deepSeekBaseUrl, deepSeekModel, deepSeekProfile, ONBOARDING_PAGES, writeOnboardingMarker, type OnboardingPage
} from './onboarding'
import type { OnboardingIpcDeps } from './index'

/** 引导向导的窄通道：一个 DeepSeek Key、一次保存、固定引导页和结果标记。
 *  Key 只单向传进主进程。依赖由 index.ts 的 buildOnboardingIpcDeps 注入。 */
export function registerOnboardingIpc(deps: OnboardingIpcDeps): void {
  ipcMain.handle('pet:onboarding:test', async (event, apiKey: unknown, model: unknown) => {
    if (!deps.onboardingTrusted(event)) throw new Error('无效的界面请求。')
    const key = typeof apiKey === 'string' ? normalizeApiKey(apiKey) : ''
    const chosen = deepSeekModel(model)
    if (!key || key.length > 512 || !chosen) throw new Error('API Key 无效。')
    return deps.probeAnthropicEndpoint(deepSeekProfile(key, chosen))
  })
  ipcMain.handle('pet:onboarding:workspace', (event) => {
    if (!deps.onboardingTrusted(event)) throw new Error('无效的界面请求。')
    return deps.agentWorkspace
  })
  ipcMain.handle('pet:onboarding:pick-workspace', async (event) => {
    if (!deps.onboardingTrusted(event)) throw new Error('无效的界面请求。')
    return deps.pickWorkspaceDirectory(deps.onboardingWindow, deps.agentWorkspace)
  })
  ipcMain.handle('pet:onboarding:set-workspace', async (event, next: unknown) => {
    if (!deps.onboardingTrusted(event)) throw new Error('无效的界面请求。')
    if (typeof next !== 'string') throw new Error('工作目录无效。')
    return { path: await deps.migrateAgentWorkspace(next) }
  })
  ipcMain.handle('pet:onboarding:save', async (event, apiKey: unknown, model: unknown) => {
    if (!deps.onboardingTrusted(event)) throw new Error('无效的界面请求。')
    const key = typeof apiKey === 'string' ? normalizeApiKey(apiKey) : ''
    const chosen = deepSeekModel(model)
    if (!key || key.length > 512 || !chosen) throw new Error('API Key 无效。')
    const controller = deps.activeController()
    const settings = (await controller.getLibraryState()).settings
    // 重跑向导时更新已有的 DeepSeek 配置，按 base URL 匹配，避免堆出重复项。
    const existing = settings.modelProfiles.find((profile) => profile.baseUrl === deepSeekBaseUrl())
    const profile = deepSeekProfile(key, chosen, existing?.id)
    await controller.saveModelProfile(profile)
    if (settings.activeModelProfileId !== profile.id) await controller.setModelProfile(profile.id)
    writeOnboardingMarker(deps.dataRoot, 'completed')
  })
  ipcMain.handle('pet:onboarding:open', (event, page: unknown) => {
    if (!deps.onboardingTrusted(event)) throw new Error('无效的界面请求。')
    if (typeof page !== 'string' || !(page in ONBOARDING_PAGES)) throw new Error('页面无效。')
    void shell.openExternal(ONBOARDING_PAGES[page as OnboardingPage])
  })
  ipcMain.handle('pet:onboarding:finish', (event, outcome: unknown) => {
    if (!deps.onboardingTrusted(event)) throw new Error('无效的界面请求。')
    if (outcome !== 'completed' && outcome !== 'skipped') throw new Error('状态无效。')
    writeOnboardingMarker(deps.dataRoot, outcome)
  })
}
