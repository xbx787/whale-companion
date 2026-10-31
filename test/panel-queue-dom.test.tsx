// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSnapshot, ConversationSettings, ConversationSummary, PendingMessage, PetAPI } from '../src/shared/contracts'
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

function queued(id: string, text: string): PendingMessage {
  return { id, text, attachments: [], createdAt: '2026-10-15T10:00:00.000Z' }
}

const snapshot: AppSnapshot = {
  mode: 'dsh', avatarState: 'idle', taskStatus: 'idle',
  timeline: [{ id: 'u1', kind: 'user', time: '2026-10-15T10:00:00.000Z', text: '你好' }],
  timelineRevision: 1, modelReady: true, dshReady: true, conversationId: 'a',
  approvalMode: 'workspace-write',
  conversationLibrary: { settings, activeConversationId: 'a', conversations: [conversation] },
  pendingMessages: [queued('m1', '第一条'), queued('m2', '第二条'), queued('m3', '第三条')]
}

function dragEvent(type: string, dataTransfer: Record<string, unknown>): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
  return event
}

describe('the queued messages', () => {
  let host: HTMLDivElement
  let root: Root
  let moveQueuedMessage: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe(): void {}
      disconnect(): void {}
    })
    moveQueuedMessage = vi.fn(async () => undefined)
    const bridge = new Proxy({ moveQueuedMessage } as Record<string, unknown>, {
      get(target, prop: string) {
        if (prop in target) return target[prop]
        if (prop.startsWith('on')) return () => () => {}
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

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  async function render(): Promise<void> {
    await act(async () => {
      root.render(<PanelBubble visible snapshot={snapshot} error={null} run={async (action) => { await action(window.pet); return true }} />)
    })
  }

  it('gives every queued message a grip and drags only that grip', async () => {
    await render()
    const grips = host.querySelectorAll<HTMLElement>('.panel-queue-grip')
    expect(grips).toHaveLength(3)
    expect(grips[0]!.getAttribute('draggable')).toBe('true')
    const transfer = { effectAllowed: '', setData: vi.fn(), setDragImage: vi.fn() }
    await act(async () => { grips[0]!.dispatchEvent(dragEvent('dragstart', transfer)) })
    expect(transfer.setDragImage).toHaveBeenCalledWith(grips[0], 9, 11)
    expect(transfer.setData).toHaveBeenCalledWith('text/plain', 'm1')
  })

  it('moves a queued message before another on drop', async () => {
    await render()
    const grips = host.querySelectorAll<HTMLElement>('.panel-queue-grip')
    const items = host.querySelectorAll<HTMLElement>('.panel-queue-item')
    await act(async () => { grips[0]!.dispatchEvent(dragEvent('dragstart', { effectAllowed: '', setData: vi.fn(), setDragImage: vi.fn() })) })
    await act(async () => { items[2]!.dispatchEvent(dragEvent('drop', { setData: vi.fn(), files: [] })) })
    expect(moveQueuedMessage).toHaveBeenCalledWith('m1', 'm3')
  })

  it('moves to the end through the tail zone', async () => {
    await render()
    const grips = host.querySelectorAll<HTMLElement>('.panel-queue-grip')
    await act(async () => { grips[0]!.dispatchEvent(dragEvent('dragstart', { effectAllowed: '', setData: vi.fn(), setDragImage: vi.fn() })) })
    const tail = host.querySelector<HTMLElement>('.panel-queue-tail')!
    await act(async () => { tail.dispatchEvent(dragEvent('drop', { setData: vi.fn(), files: [] })) })
    expect(moveQueuedMessage).toHaveBeenCalledWith('m1', null)
  })
})
