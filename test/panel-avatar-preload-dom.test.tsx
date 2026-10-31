// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSnapshot, ConversationSettings, ConversationSummary, PetAPI, TimelineEntry } from '../src/shared/contracts'
import { PanelBubble } from '../src/renderer/panel'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const avatarUrl = 'data:image/png;base64,AAAA'
// 每个用例换一个 key，避免模块级 avatarCache 在用例之间命中。
let avatarKey = 'me-preload-test.png'

const settings: ConversationSettings = {
  visibleConversationTabs: 5, autoArchiveAfterDays: 0, goalMaxIterations: 5, goalMaxMinutes: 30,
  memoryEnabled: true, effort: 'high', modelProfiles: [], activeModelProfileId: null,
  enableAutoTitleGeneration: true, showMessageTimestamps: true, userName: '主人', assistantName: '小鲸',
  userAvatar: avatarKey, assistantAvatar: null, tabOrder: [], uiSize: 'small', avatarSize: 'small'
}

const conversation: ConversationSummary = {
  id: 'a', title: '会话 a', createdAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-15T00:00:00.000Z',
  lastActivityAt: '2026-10-15T00:00:00.000Z', archivedAt: null, pinnedAt: null, mode: 'dsh',
  taskStatus: 'idle', messageCount: 1, preview: ''
}

const userEntry: TimelineEntry = {
  id: 'u1', kind: 'user', time: '2026-10-15T10:00:00.000Z', text: '发送这一刻'
}

function snapshot(timeline: TimelineEntry[]): AppSnapshot {
  return {
    mode: 'dsh', avatarState: 'idle', taskStatus: 'idle',
    timeline, timelineRevision: 1, modelReady: true, dshReady: true, conversationId: 'a',
    approvalMode: 'workspace-write',
    conversationLibrary: { settings, activeConversationId: 'a', conversations: [conversation] }
  }
}

describe('user avatar preload', () => {
  let host: HTMLDivElement
  let root: Root
  let readAvatar: ReturnType<typeof vi.fn>

  beforeEach(() => {
    avatarKey = `me-preload-${Math.random().toString(36).slice(2)}.png`
    settings.userAvatar = avatarKey
    vi.stubGlobal('ResizeObserver', class {
      observe(): void {}
      disconnect(): void {}
    })
    readAvatar = vi.fn(async () => avatarUrl)
    const bridge = new Proxy({ readAvatar } as Record<string, unknown>, {
      get(target, prop: string) {
        if (prop in target) return target[prop]
        if (prop.startsWith('on')) return () => () => {}
        if (prop === 'getDraft') return () => Promise.resolve('')
        if (prop === 'getContextUsage') return () => Promise.resolve({ status: 'unavailable' })
        if (prop === 'listAppCommands' || prop === 'searchWorkspaceFiles' || prop === 'listLibraries') return () => Promise.resolve([])
        return () => Promise.resolve(true)
      }
    }) as unknown as PetAPI
    ;(window as unknown as { pet: PetAPI }).pet = bridge
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('shows the assistant avatar as soon as the user message is rendered', async () => {
    await act(async () => {
      root.render(<PanelBubble visible snapshot={snapshot([userEntry])} error={null} run={async (action) => { await action(window.pet); return true }} />)
    })
    expect(host.querySelector('.panel-event-assistant .panel-avatar-shell')).not.toBeNull()
  })

  it('has the image ready the moment a new user message is rendered', async () => {
    await act(async () => {
      root.render(<PanelBubble visible snapshot={snapshot([])} error={null} run={async (action) => { await action(window.pet); return true }} />)
    })
    // 挂载后先预读一次头像。
    await act(async () => { await Promise.resolve() })
    expect(readAvatar).toHaveBeenCalledWith('user')

    await act(async () => {
      root.render(<PanelBubble visible snapshot={snapshot([userEntry])} error={null} run={async (action) => { await action(window.pet); return true }} />)
    })
    const img = host.querySelector<HTMLImageElement>('.panel-event-user .panel-avatar-img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe(avatarUrl)
  })
})
