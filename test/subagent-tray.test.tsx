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

const rows = () => container!.querySelectorAll<HTMLButtonElement>('.panel-subagent-row-head')
const detail = () => container!.querySelector<HTMLElement>('.panel-subagent-detail')

describe('SubagentTray', () => {
  it('renders one row per subagent and nothing at all when there are none', async () => {
    await render([])
    expect(container!.querySelectorAll('.panel-subagent-row-head')).toHaveLength(0)
    expect(container!.querySelector('.panel-subagent-list')).toBeNull()
    await render([makeTask('t1', '研究协议'), makeTask('t2', '查历史'), makeTask('t3', '写摘要')])
    expect(rows()).toHaveLength(3)
    expect(rows()[0]?.getAttribute('aria-label')).toContain('研究协议')
  })

  it('expands the details under the row instead of a floating pane', async () => {
    const task = makeTask('t1', '研究协议', {
      toolUses: 3, totalTokens: 1_200, lastToolName: 'Read',
      timeline: [
        { id: 'text-1', time: new Date().toISOString(), kind: 'assistant', text: '看到两份文档' },
        { id: 'tool-1', time: new Date().toISOString(), kind: 'tool', text: '读取（已完成）',
          tool: { toolUseId: 'inner-1', name: 'Read', status: 'done' } }
      ]
    })
    await render([task])
    await act(async () => rows()[0]!.click())
    const pane = detail()
    expect(pane).not.toBeNull()
    expect(pane!.textContent).toContain('研究协议')
    expect(pane!.textContent).toContain('3 次工具')
    expect(pane!.textContent).toContain('1,200 tokens')
    expect(pane!.textContent).toContain('看到两份文档')
    expect(pane!.textContent).toContain('读取')
    // 详情里不再有“思维链”三个字，直接就是子智能体的输出。
    expect(pane!.textContent).not.toContain('思维链')
    expect(rows()[0]!.getAttribute('aria-expanded')).toBe('true')
    await act(async () => rows()[0]!.click())
    expect(detail()).toBeNull()
  })

  it('keeps only one row open at a time and switches without closing the list', async () => {
    const first = makeTask('t1', '研究协议', {
      timeline: [{ id: 'a', time: new Date().toISOString(), kind: 'assistant', text: '协议步骤一' }]
    })
    const second = makeTask('t2', '查历史', {
      timeline: [{ id: 'b', time: new Date().toISOString(), kind: 'assistant', text: '历史结论' }]
    })
    await render([first, second])
    await act(async () => rows()[0]!.click())
    expect(detail()?.textContent).toContain('协议步骤一')
    await act(async () => rows()[1]!.click())
    expect(detail()?.textContent).toContain('历史结论')
    expect(detail()?.textContent).not.toContain('协议步骤一')
    expect(rows()).toHaveLength(2)
  })

  it('offers background and stop for a running subagent only', async () => {
    const onBackgroundTask = vi.fn()
    const onStopTask = vi.fn()
    const task = makeTask('t1', '跑很久')
    await render([task], { onBackgroundTask, onStopTask })
    await act(async () => rows()[0]!.click())
    const pane = detail()!
    expect([...pane.querySelectorAll<HTMLButtonElement>('.panel-subagent-actions button')]
      .map((button) => button.textContent)).toEqual(['后台运行', '停止'])
    const buttons = pane.querySelectorAll<HTMLButtonElement>('.panel-subagent-actions button')
    await act(async () => buttons[0]!.click())
    expect(onBackgroundTask).toHaveBeenCalledWith(task)
    await act(async () => buttons[1]!.click())
    expect(onStopTask).toHaveBeenCalledWith(task)
    await render([{ ...task, isBackgrounded: true }], { onBackgroundTask, onStopTask })
    expect([...detail()!.querySelectorAll<HTMLButtonElement>('.panel-subagent-actions button')]
      .map((button) => button.textContent)).toEqual(['停止'])
  })

  it('keeps a finished subagent on the row in green', async () => {
    vi.useFakeTimers()
    await render([makeTask('t1', '快结束了')])
    expect(rows()).toHaveLength(1)
    await render([makeTask('t1', '快结束了', { status: 'completed', endedAt: new Date().toISOString() })])
    expect(container!.querySelector('.panel-subagent-row')?.className).toContain('is-completed')
  })
})
