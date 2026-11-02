// @vitest-environment jsdom
import { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { PlanApprovalPanel, planTitle } from '../src/renderer/plan-approval'
import type { PlanApprovalRequest } from '../src/shared/contracts'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const request: PlanApprovalRequest = {
  id: 'p1',
  plan: '# 把面板修好\n\n## 步骤\n\n1. 读日志\n2. 改配置\n\n`npm test` 验证'
}

let container: HTMLDivElement | undefined
let root: Root | undefined

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

function click(element: Element): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

async function mount(onDecide: (approved: boolean) => Promise<boolean>, ask: PlanApprovalRequest = request): Promise<HTMLDivElement> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root!.render(<PlanApprovalPanel request={ask} onDecide={onDecide} />))
  return container
}

describe('PlanApprovalPanel', () => {
  it('renders the full plan as markdown in a scrollable document box with both verdicts', () => {
    const html = renderToStaticMarkup(<PlanApprovalPanel request={request} onDecide={async () => true} />)
    expect(html).toContain('panel-plan-document')
    expect(html).toContain('<h1>把面板修好</h1>')
    expect(html).toContain('<h2>步骤</h2>')
    expect(html).toContain('读日志')
    expect(html).toContain('讨论')
    expect(html).toContain('批准')
    expect(html).not.toContain('发送中…')
  })

  it('uses the first heading as the card title', () => {
    expect(planTitle(request.plan)).toBe('把面板修好')
    expect(planTitle('没有标题的计划')).toBe('计划')
  })

  it('shows a readable fallback instead of an empty approval box', () => {
    const html = renderToStaticMarkup(<PlanApprovalPanel request={{ id: 'p2', plan: '' }} onDecide={async () => true} />)
    expect(html).toContain('计划正文没有读到')
  })

  it('collapses and reopens the document without answering the request', async () => {
    const verdicts: boolean[] = []
    const view = await mount(async (approved) => { verdicts.push(approved); return true })
    const toggle = view.querySelector('.panel-plan-toggle')!
    expect(view.querySelector('.panel-plan-document')).not.toBeNull()
    await act(async () => click(toggle))
    expect(view.querySelector('.panel-plan-document')).toBeNull()
    await act(async () => click(toggle))
    expect(view.querySelector('.panel-plan-document')).not.toBeNull()
    expect(verdicts).toEqual([])
  })

  it('routes 讨论 to a rejection', async () => {
    const verdicts: boolean[] = []
    const view = await mount(async (approved) => { verdicts.push(approved); return true })
    await act(async () => click(view.querySelector('.panel-plan-revise')!))
    expect(verdicts).toEqual([false])
  })

  it('submits an approval and re-enables both buttons when the host fails to deliver it', async () => {
    const verdicts: boolean[] = []
    let resolveDecide: ((value: boolean) => void) | undefined
    const view = await mount((approved) => {
      verdicts.push(approved)
      return new Promise<boolean>((resolve) => { resolveDecide = resolve })
    })
    await act(async () => click(view.querySelector('.panel-plan-approve')!))
    expect(verdicts).toEqual([true])
    expect((view.querySelector('.panel-plan-approve') as HTMLButtonElement).disabled).toBe(true)
    expect((view.querySelector('.panel-plan-revise') as HTMLButtonElement).disabled).toBe(true)
    expect(view.querySelector('.panel-plan-approve')!.textContent).toBe('发送中…')
    await act(async () => { resolveDecide!(false) })
    expect((view.querySelector('.panel-plan-approve') as HTMLButtonElement).disabled).toBe(false)
    expect((view.querySelector('.panel-plan-revise') as HTMLButtonElement).disabled).toBe(false)
    expect(view.textContent).toContain('批准没有送达')
  })
})
