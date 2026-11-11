// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SubagentTray } from '../src/renderer/subagent-tray'
import type { SubagentTask } from '../src/shared/contracts'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | undefined
let root: Root | undefined

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  container?.remove()
  root = undefined
  container = undefined
  window.sessionStorage.clear()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

function makeTask(taskId: string, description: string, overrides: Partial<SubagentTask> = {}): SubagentTask {
  return { taskId, toolUseId: `tool-${taskId}`, description, subagentType: 'Explore',
    status: 'running', startedAt: new Date().toISOString(), ...overrides }
}

async function render(tasks: SubagentTask[], callbacks: {
  onBackgroundTask?: (task: SubagentTask) => void
  onStopTask?: (task: SubagentTask) => void
} = {}) {
  if (!container) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  }
  await act(async () => root!.render(<SubagentTray subagents={tasks} {...callbacks} />))
}

const summary = () => container!.querySelector<HTMLButtonElement>('.panel-subagent-summary')
const sheet = () => document.querySelector<HTMLElement>('.panel-subagent-sheet')
const cards = () => [...document.querySelectorAll<HTMLButtonElement>('.panel-subagent-card-head')]
const detail = () => document.querySelector<HTMLElement>('.panel-subagent-detail')

async function openSheet() {
  await act(async () => summary()!.click())
}

describe('SubagentTray', () => {
  it('shows only a count in the status row, and nothing when there are no subagents', async () => {
    await render([])
    expect(summary()).toBeNull()
    await render([makeTask('t1', '研究协议'), makeTask('t2', '查历史'), makeTask('t3', '写摘要')])
    expect(summary()!.textContent).toContain('3 个子智能体')
    expect(sheet()).toBeNull()
  })

  it('opens a floating list above the messages with name, prompt and figures', async () => {
    const task = makeTask('t1', '研究协议', {
      toolUses: 3, totalTokens: 196_000, summary: '你是歌曲发布产物制作专',
      timeline: [
        { id: 'text-1', time: new Date().toISOString(), kind: 'assistant', text: '看到两份文档' }
      ]
    })
    await render([task])
    await openSheet()
    expect(sheet()).not.toBeNull()
    const head = cards()[0]!
    expect(head.textContent).toContain('研究协议')
    expect(head.textContent).toContain('你是歌曲发布产物制作专')
    expect(head.textContent).toContain('196.0K tok')
    expect(head.getAttribute('aria-expanded')).toBe('false')
  })

  it('expands a caret into the details and keeps the thought stream without a title', async () => {
    const task = makeTask('t1', '研究协议', {
      toolUses: 3, totalTokens: 1_200,
      timeline: [{ id: 'a', time: new Date().toISOString(), kind: 'assistant', text: '协议步骤一' }]
    })
    await render([task])
    await openSheet()
    await act(async () => cards()[0]!.click())
    const pane = detail()!
    expect(pane.textContent).toContain('研究协议')
    expect(pane.textContent).toContain('3 次工具')
    expect(pane.textContent).toContain('协议步骤一')
    expect(pane.textContent).not.toContain('思维链')
    expect(cards()[0]!.getAttribute('aria-expanded')).toBe('true')
    await act(async () => cards()[0]!.click())
    expect(detail()).toBeNull()
  })

  it('keeps only one card open at a time', async () => {
    const first = makeTask('t1', '研究协议', {
      timeline: [{ id: 'a', time: new Date().toISOString(), kind: 'assistant', text: '协议步骤一' }]
    })
    const second = makeTask('t2', '查历史', {
      timeline: [{ id: 'b', time: new Date().toISOString(), kind: 'assistant', text: '历史结论' }]
    })
    await render([first, second])
    await openSheet()
    await act(async () => cards()[0]!.click())
    expect(detail()?.textContent).toContain('协议步骤一')
    await act(async () => cards()[1]!.click())
    expect(detail()?.textContent).toContain('历史结论')
    expect(detail()?.textContent).not.toContain('协议步骤一')
    expect(cards()).toHaveLength(2)
  })

  it('offers background and stop for a running subagent only', async () => {
    const onBackgroundTask = vi.fn()
    const onStopTask = vi.fn()
    const task = makeTask('t1', '跑很久')
    await render([task], { onBackgroundTask, onStopTask })
    await openSheet()
    await act(async () => cards()[0]!.click())
    const pane = detail()!
    expect([...pane.querySelectorAll<HTMLButtonElement>('.panel-subagent-actions button')]
      .map((button) => button.textContent)).toEqual(['后台运行', '停止'])
    const buttons = pane.querySelectorAll<HTMLButtonElement>('.panel-subagent-actions button')
    await act(async () => buttons[0]!.click())
    expect(onBackgroundTask).toHaveBeenCalledWith(task)
    await act(async () => buttons[1]!.click())
    expect(onStopTask).toHaveBeenCalledWith(task)
  })

  it('closes the list on Escape and keeps a finished subagent in its own color', async () => {
    await render([makeTask('t1', '快结束了')])
    await openSheet()
    expect(sheet()).not.toBeNull()
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(sheet()).toBeNull()
    await render([makeTask('t1', '快结束了', { status: 'completed', endedAt: new Date().toISOString() })])
    await openSheet()
    expect(document.querySelector('.panel-subagent-card')?.className).toContain('is-completed')
  })
})
