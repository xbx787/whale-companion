// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from '../src/renderer/settings'
import type { SettingsAPI } from '../src/preload/settings'
import type { ConversationSettings } from '../src/shared/contracts'
import { voiceApiDefaults } from './voice-api-defaults'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const settings: ConversationSettings = {
  visibleConversationTabs: 5, autoArchiveAfterDays: 0, goalMaxIterations: 30,
  goalMaxMinutes: 180, memoryEnabled: true, effort: 'max', modelProfiles: [],
  activeModelProfileId: null, enableAutoTitleGeneration: true,
  showMessageTimestamps: true, userName: '主人', assistantName: '小鲸',
  userAvatar: null, assistantAvatar: null, tabOrder: [], uiSize: 'small', avatarSize: 'small'
}

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  container?.remove()
  Reflect.deleteProperty(window, 'whaleSettings')
  root = undefined
  container = undefined
})

function click(label: string): void {
  const button = [...(container?.querySelectorAll('button') ?? [])].find((node) => node.textContent?.trim() === label)
  if (!button) throw new Error(`找不到按钮：${label}`)
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function bridge(overrides: Partial<SettingsAPI> = {}): SettingsAPI {
  return {
    get: async () => settings, update: async (patch) => ({ ...settings, ...patch }),
    version: async () => '0.0.78', close: async () => {}, quit: async () => {}, restart: async () => false, setAvatar: async () => {},
    workspace: async () => ({ path: 'D:\\project', saved: false }),
    pickWorkspace: async () => null, migrateWorkspace: async (next) => ({ path: next }),
    readAvatar: async () => null, saveModelProfile: async () => {},
    deleteModelProfile: async () => {}, testModelProfile: async () => ({ ok: true, message: '' }),
    ...voiceApiDefaults,
    libraries: async () => ({ items: [], busy: false }),
    searchLibraryMarket: async () => [], installLibrary: async () => ({ items: [], busy: false }),
    removeLibrary: async () => ({ items: [], busy: false }),
    memoryList: async () => [], memorySetEnabled: async (enabled) => enabled,
    memoryUpdate: async (id, text) => ({ id, text, sourceConversationId: 'conversation-1', sourceAt: '2026-10-18T00:00:00.000Z', createdAt: '', updatedAt: '' }),
    memoryDelete: async () => {},
    ...overrides
  }
}

async function mount(api: SettingsAPI): Promise<void> {
  Object.defineProperty(window, 'whaleSettings', { configurable: true, value: api })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root!.render(<SettingsPage />))
  await act(async () => click('人物'))
  await act(async () => click('语音'))
  await act(async () => { await Promise.resolve() })
}

describe('settings voice page', () => {
  it('shows the official voice controls and the document-to-audio section', async () => {
    await mount(bridge())
    expect(container!.textContent).toContain('语音服务')
    expect(container!.textContent).toContain('朗读音色')
    expect(container!.textContent).toContain('海星')
    expect(container!.textContent).toContain('文档转音频')
  })

  it('picks a document and starts conversion', async () => {
    const convert = vi.fn(async () => ({ jobId: 'job-1', total: 3 }))
    await mount(bridge({
      voicePickDocument: async () => ({ path: 'D:\\docs\\lesson.md', name: 'lesson.md', size: 1024 }),
      voiceConvert: convert
    }))
    await act(async () => click('选择文档'))
    expect(container!.textContent).toContain('lesson.md')
    await act(async () => click('生成音频'))
    expect(convert).toHaveBeenCalledWith('D:\\docs\\lesson.md')
  })
})
