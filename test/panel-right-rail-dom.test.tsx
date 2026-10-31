// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSnapshot, ConversationSettings, ConversationSummary, PetAPI } from '../src/shared/contracts'
import { PanelBubble } from '../src/renderer/panel'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const settings: ConversationSettings = {
  visibleConversationTabs: 5, autoArchiveAfterDays: 0, goalMaxIterations: 5, goalMaxMinutes: 30,
  memoryEnabled: true, effort: 'high', modelProfiles: [], activeModelProfileId: null,
  enableAutoTitleGeneration: true, showMessageTimestamps: true, userName: '主人', assistantName: '小鲸',
  userAvatar: null, assistantAvatar: null, tabOrder: [], uiSize: 'small', avatarSize: 'small'
}

const conversation: ConversationSummary = {
  id: 'a', title: '会话 a', createdAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-15T00:00:00.000Z',
  lastActivityAt: '2026-10-15T00:00:00.000Z', archivedAt: null, pinnedAt: null, mode: 'dsh',
  taskStatus: 'idle', messageCount: 1, preview: ''
}

const snapshot: AppSnapshot = {
  mode: 'dsh', avatarState: 'idle', taskStatus: 'idle',
  timeline: [{ id: 'u1', kind: 'user', time: '2026-10-15T10:00:00.000Z', text: '你好' }],
  timelineRevision: 1, modelReady: true, dshReady: true, conversationId: 'a',
  approvalMode: 'workspace-write',
  conversationLibrary: { settings, activeConversationId: 'a', conversations: [conversation] }
}

describe('the right rail', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe(): void {}
      disconnect(): void {}
    })
    const bridge = new Proxy({} as Record<string, unknown>, {
      get(_target, prop: string) {
        if (String(prop).startsWith('on')) return () => () => {}
        if (prop === 'getDraft') return () => Promise.resolve('')
        if (prop === 'getContextUsage') return () => Promise.resolve({ status: 'unavailable' })
        if (prop === 'readAvatar') return () => Promise.resolve(null)
        if (prop === 'listAppCommands') return () => Promise.resolve([])
        if (prop === 'searchWorkspaceFiles') return () => Promise.resolve([])
        if (prop === 'listLibraries' || prop === 'listPlugins' || prop === 'listAlwaysAllowed') return () => Promise.resolve([])
        if (prop === 'previewFile') return () => Promise.resolve({ path: '', text: '', truncated: false })
        return () => Promise.resolve(true)
      }
    }) as unknown as PetAPI
    ;(window as unknown as { pet: PetAPI }).pet = bridge
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('offers one rail toggle in the header', async () => {
    await act(async () => {
      root.render(<PanelBubble visible snapshot={snapshot} error={null} run={async (action) => { await action(window.pet); return true }} />)
    })
    expect(host.querySelectorAll('.panel-rail-toggle').length).toBe(1)
  })

  it('cycles the rail through plan, preview and closed', async () => {
    await act(async () => {
      root.render(<PanelBubble visible snapshot={snapshot} error={null} run={async (action) => { await action(window.pet); return true }} />)
    })
    const toggle = (): HTMLElement => host.querySelector<HTMLElement>('.panel-rail-toggle')!
    await act(async () => { toggle().click() })
    expect(host.querySelector('.panel-right-rail')).toBeTruthy()
    expect(host.textContent).toContain('当前没有计划')

    await act(async () => { toggle().click() })
    expect(host.textContent).toContain('这里显示最近生成或修改的代码、文档')

    await act(async () => { toggle().click() })
    expect(host.querySelector('.panel-right-rail')).toBeFalsy()
  })

  it('shows the plan document when one is pending', async () => {
    const withPlan: AppSnapshot = { ...snapshot, plan: { id: 'p1', plan: '## 计划\n先拆 IPC，再拆面板。' } }
    await act(async () => {
      root.render(<PanelBubble visible snapshot={withPlan} error={null} run={async (action) => { await action(window.pet); return true }} />)
    })
    await act(async () => { host.querySelector<HTMLElement>('.panel-rail-toggle')!.click() })
    expect(host.querySelector('.panel-right-plan-text')?.textContent).toContain('先拆 IPC')
  })
})
