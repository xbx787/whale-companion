// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TimelineNav } from '../src/renderer/timeline-nav'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const marks = Array.from({ length: 40 }, (_, index) => ({ id: `m${index}`, role: 'user' as const, text: `第 ${index} 轮` }))

describe('the rail’s ordinal ticks', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => { root.unmount() })
    host.remove()
  })

  it('prints 10, 20, 30, 40 beside every tenth mark once the rail opens', async () => {
    await act(async () => {
      root.render(<TimelineNav marks={marks} onJump={() => {}} />)
    })
    // At rest there are no numbers — only the short handle.
    expect(host.querySelectorAll('.panel-nav-count')).toHaveLength(0)
    const nav = host.querySelector<HTMLElement>('.panel-nav')!
    await act(async () => { nav.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    const labels = [...host.querySelectorAll('.panel-nav-count')].map((node) => node.textContent)
    expect(labels).toEqual(['10', '20', '30', '40'])
  })

  it('keeps one latest mark and grows only the hovered mark into a single peak', async () => {
    await act(async () => {
      root.render(<TimelineNav marks={marks} onJump={() => {}} />)
    })
    const nav = host.querySelector<HTMLElement>('.panel-nav')!
    await act(async () => { nav.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    // 最新一条始终亮着，且只有它。
    expect(host.querySelectorAll('.panel-nav-mark.is-latest')).toHaveLength(1)
    const rows = host.querySelectorAll<HTMLElement>('.panel-nav-row')
    await act(async () => {
      rows[5].querySelector('.panel-nav-mark')!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    // 鼠标指向的一条高亮；峰本身加一条肩，形成单个波浪。
    expect(host.querySelectorAll('.panel-nav-mark.is-active')).toHaveLength(1)
    expect(host.querySelectorAll('.panel-nav-mark[style]')).toHaveLength(5)
  })

  it('jumps from the clicked tick even when no tick was hovered first', async () => {
    const jumps: string[] = []
    await act(async () => {
      root.render(<TimelineNav marks={marks} onJump={(id) => jumps.push(id)} />)
    })
    const nav = host.querySelector<HTMLElement>('.panel-nav')!
    await act(async () => { nav.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    const row = host.querySelectorAll<HTMLElement>('.panel-nav-row')[3]
    // 只点击、不先 hover：横杠本身要能直接响应。
    await act(async () => { row.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(jumps.length).toBe(1)
  })

  it('draws the reading progress line only while the rail is open', async () => {
    await act(async () => {
      root.render(<TimelineNav marks={marks} onJump={() => {}} progressId="m30" />)
    })
    expect(host.querySelector('.panel-nav-progress')).toBeNull()
    const nav = host.querySelector<HTMLElement>('.panel-nav')!
    await act(async () => { nav.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    expect(host.querySelector('.panel-nav-progress')).not.toBeNull()
  })
})
