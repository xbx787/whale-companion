import { ipcMain } from 'electron'
import path from 'node:path'
import { isLibraryItem, isLibraryKind } from '../shared/libraries'
import { searchMarket } from './marketplace'
import { scanPlugins, toLibraryItems } from './plugin-market'
import { probeLibrary } from './library-health'
import type { LibrariesIpcDeps } from './index'

/** 库、插件、记忆三个相邻的 IPC 域。依赖由 index.ts 的 buildLibrariesIpcDeps 注入。 */
export function registerLibrariesIpc(deps: LibrariesIpcDeps): void {
  ipcMain.handle('pet:libraries:list', async (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return deps.libraryStore.snapshot()
  })
  ipcMain.handle('pet:libraries:installed', async (event) => {
    if (!deps.trusted(event)) throw new Error('无效的界面请求。')
    return deps.libraryStore.list()
  })
  ipcMain.handle('pet:libraries:search', async (event, kind: unknown, query: unknown) => {
    if (!deps.settingsTrusted(event) || !isLibraryKind(kind)) throw new Error('市场请求无效。')
    if (typeof query !== 'string') throw new Error('搜索词无效。')
    const settings = (await deps.activeController().getLibraryState()).settings
    return searchMarket(kind, query, settings.skillMarketSources)
  })
  ipcMain.handle('pet:plugins:list', async (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    const packs = await scanPlugins(path.join(deps.dataRoot, 'plugins'))
    return packs.map((pack) => ({ id: pack.id, name: pack.name, version: pack.version, description: pack.description, skills: pack.skills.length, connectors: pack.connectors.length, agents: pack.agents.length, hooks: pack.hooks.length }))
  })
  ipcMain.handle('pet:plugins:install', async (event, id: unknown) => {
    if (!deps.settingsTrusted(event) || typeof id !== 'string') throw new Error('插件无效。')
    const packs = await scanPlugins(path.join(deps.dataRoot, 'plugins'))
    const pack = packs.find((item) => item.id === id)
    if (!pack) throw new Error('找不到这个插件。')
    for (const entry of toLibraryItems(pack)) {
      await deps.libraryStore.install(entry as never)
    }
    return deps.libraryStore.snapshot()
  })
  ipcMain.handle('pet:libraries:install', async (event, raw: unknown) => {
    if (!deps.settingsTrusted(event) || !isLibraryItem(raw)) throw new Error('库条目无效。')
    await deps.libraryStore.install(raw)
    return deps.libraryStore.snapshot()
  })
  ipcMain.handle('pet:libraries:adopt', async (event, id: unknown) => {
    if (!deps.settingsTrusted(event) || typeof id !== 'string') throw new Error('库条目无效。')
    const found = (await deps.libraryStore.list()).find((item) => item.id === id && item.external === true)
    if (!found) throw new Error('只有环境中的条目可以导入。')
    await deps.libraryStore.adopt(found)
    return deps.libraryStore.snapshot()
  })
  ipcMain.handle('pet:libraries:remove', async (event, id: unknown) => {
    if (!deps.settingsTrusted(event) || typeof id !== 'string') throw new Error('库条目无效。')
    await deps.libraryStore.remove(id)
    return deps.libraryStore.snapshot()
  })
  ipcMain.handle('pet:libraries:set-enabled', async (event, id: unknown, enabled: unknown) => {
    if (!deps.settingsTrusted(event) || typeof id !== 'string' || typeof enabled !== 'boolean') throw new Error('库条目无效。')
    await deps.libraryStore.setEnabled(id, enabled)
    return deps.libraryStore.snapshot()
  })
  ipcMain.handle('pet:libraries:health', async (event, id: unknown) => {
    if (!deps.settingsTrusted(event) || typeof id !== 'string') throw new Error('库条目无效。')
    const item = (await deps.libraryStore.list()).find((entry) => entry.id === id)
    if (!item) throw new Error('找不到这个库条目。')
    return probeLibrary(item)
  })
  ipcMain.handle('pet:memory:list', (event) => {
    if (!deps.settingsTrusted(event)) throw new Error('无效的界面请求。')
    return deps.memory.list()
  })
  ipcMain.handle('pet:memory:set-enabled', async (event, enabled: unknown) => {
    if (!deps.settingsTrusted(event) || typeof enabled !== 'boolean') throw new Error('记忆开关无效。')
    const settings = await deps.activeController().updateSettings({ memoryEnabled: enabled })
    deps.memory.setEnabled(settings.memoryEnabled)
    return settings.memoryEnabled
  })
  ipcMain.handle('pet:memory:update', (event, id: unknown, value: unknown) => {
    if (!deps.settingsTrusted(event) || typeof id !== 'string' || typeof value !== 'string') throw new Error('记忆修改请求无效。')
    return deps.memory.update(id, value)
  })
  ipcMain.handle('pet:memory:delete', (event, id: unknown) => {
    if (!deps.settingsTrusted(event) || typeof id !== 'string') throw new Error('记忆删除请求无效。')
    return deps.memory.delete(id)
  })
}
