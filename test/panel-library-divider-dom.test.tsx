// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSnapshot, ConversationSettings, ConversationSummary, PetAPI } from '../src/shared/contracts'
import { PanelBubble } from '../src/renderer/panel'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const settings: ConversationSettings = {
  visibleConversationTabs: 2, autoArchiveAfterDays: 0, goalMaxIterations: 5, goalMaxMinutes: 30,
  memoryEnabled: true, effort: 'high', modelProfiles: [], activeModelProfileId: null,
  enableAutoTitleGeneration: true, showMessageTimestamps: true, userName: '主人', assistantName: '小鲸',
  userAvatar: null, assistantAvatar: null, tabOrder: ['c', 'a'], uiSize: 'small', avatarSize: 'small'
}

function conversation(id: string, minutesAgo: number): ConversationSummary {
  const time = new Date(Date.now() - minutesAgo * 60_000).toISOString()
  return {
    id, title: `会话 ${id}`, createdAt: time, updatedAt: time, lastActivityAt: time,
    archivedAt: null, pinnedAt: null, mode: 'dsh', taskStatus: 'idle', messageCount: 1, preview: ''
  }
}

const conversations = [
  conversation('a', 10), conversation('b', 1), conversation('c', 20),
  conversation('d', 2), conversation('e', 30), conversation('f', 3)
]

const snapshot: AppSnapshot = {
  mode: 'dsh', avatarState: 'idle', taskStatus: 'idle',
  timeline: [{ id: 'u1', kind: 'user', time: new Date().toISOString(), text: '你好' }],
  timelineRevision: 1, modelReady: true, dshReady: true, conversationId: 'a',
  approvalMode: 'workspace-write',
  conversationLibrary: { settings, activeConversationId: 'a', conversations }
}

describe('conversation library split', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    const nativeRect = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('panel-workspace')) {
        return new DOMRect(0, 0, Math.min(534, window.innerWidth - 20) - 2, 400)
      }
      return nativeRect.call(this)
    })
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
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('puts tabbed conversations first in tab order and the rest below a divider by time', async () => {
    await act(async () => {
      root.render(<PanelBubble visible snapshot={snapshot} error={null} run={async (action) => { await action(window.pet); return true }} />)
    })
    await act(async () => host.querySelector<HTMLElement>('.panel-expand-toggle')!.click())
    await act(async () => host.querySelector<HTMLElement>('.panel-library-toggle')!.click())

    const groups = [...host.querySelectorAll('.panel-library-group')]
    expect(groups).toHaveLength(2)
    expect(groups[1].querySelector('.panel-library-divider')).not.toBeNull()

    const titles = (group: Element): string[] =>
      [...group.querySelectorAll('.panel-session strong')].map((node) => node.textContent ?? '')
    // 上方：标签页顺序 c、a；下方：按最近活动时间，b 最新。
    expect(titles(groups[0])).toEqual(['会话 c', '会话 a'])
    expect(titles(groups[1])).toEqual(['会话 b', '会话 d', '会话 f', '会话 e'])
  })
})
