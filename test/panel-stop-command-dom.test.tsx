// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSnapshot, ConversationSettings, ConversationSummary, PetAPI, TimelineEntry } from '../src/shared/contracts'
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
  taskStatus: 'executing', messageCount: 2, preview: ''
}

const started = new Date(Date.now() - 70_000).toISOString()
const timeline: TimelineEntry[] = [
  { id: 'u1', kind: 'user', time: started, text: '跑一下' },
  { id: 't1', kind: 'tool', time: started, text: '执行命令', tool: { toolUseId: 'toolu_1', name: 'Bash', status: 'running', input: JSON.stringify({ command: 'Start-Sleep 60' }) } }
]

const snapshot: AppSnapshot = {
  mode: 'dsh', avatarState: 'idle', taskStatus: 'executing',
  timeline, timelineRevision: 1, modelReady: true, dshReady: true, conversationId: 'a',
  approvalMode: 'workspace-write',
  conversationLibrary: { settings, activeConversationId: 'a', conversations: [conversation] }
}

describe('the tool row kill switch', () => {
  let host: HTMLDivElement
  let root: Root
  let stopCommand: ReturnType<typeof vi.fn>
  let stop: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe(): void {}
      disconnect(): void {}
    })
    stopCommand = vi.fn(async () => true)
    stop = vi.fn(async () => undefined)
    const bridge = new Proxy({ stopCommand, stop } as Record<string, unknown>, {
      get(target, prop: string) {
        if (prop in target) return target[prop]
        if (String(prop).startsWith('on')) return () => () => {}
        if (prop === 'getDraft') return () => Promise.resolve('')
        if (prop === 'getContextUsage') return () => Promise.resolve({ status: 'unavailable' })
        if (prop === 'readAvatar') return () => Promise.resolve(null)
        if (prop === 'listAppCommands' || prop === 'searchWorkspaceFiles' || prop === 'listLibraries') return () => Promise.resolve([])
        return () => Promise.resolve(undefined)
      }
    }) as unknown as PetAPI
    ;(window as unknown as { pet: PetAPI }).pet = bridge
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => { root.unmount() })
    host.remove()
    vi.unstubAllGlobals()
  })

  const click = async (): Promise<void> => {
    const button = host.querySelector<HTMLButtonElement>('.panel-tool-kill')
    expect(button).not.toBeNull()
    await act(async () => {
      button!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
  }

  it('stops only the command when the main process finds it', async () => {
    await act(async () => {
      root.render(<PanelBubble visible snapshot={snapshot} error={null} run={async (action) => { await action(window.pet); return true }} />)
    })
    await click()
    expect(stopCommand).toHaveBeenCalledTimes(1)
    expect(stop).not.toHaveBeenCalled()
  })

  it('falls back to stopping the turn when no command process matched', async () => {
    stopCommand.mockResolvedValue(false)
    await act(async () => {
      root.render(<PanelBubble visible snapshot={snapshot} error={null} run={async (action) => { await action(window.pet); return true }} />)
    })
    await click()
    expect(stopCommand).toHaveBeenCalledTimes(1)
    expect(stop).toHaveBeenCalledTimes(1)
  })
})
