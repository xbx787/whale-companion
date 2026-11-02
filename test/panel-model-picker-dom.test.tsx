// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { ModelPicker } from '../src/renderer/panel-model-picker'
import type { ModelProfile } from '../src/shared/contracts'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const profiles: ModelProfile[] = [
  { id: 'a', name: 'DeepSeek V4', baseUrl: 'https://api.deepseek.com', apiKey: 'k', model: 'v4', enabled: true },
  { id: 'b', name: 'Claude Opus 4', baseUrl: 'https://api.anthropic.com', apiKey: 'k', model: 'opus', enabled: true }
]

let container: HTMLDivElement | undefined
let root: Root | undefined

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

async function mount(activeId: string, onPickProfile: (id: string) => void = () => undefined): Promise<HTMLDivElement> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root!.render(<ModelPicker
    wrapperRef={createRef<HTMLDivElement>()}
    open
    dsh
    sideExpanded={false}
    goalOn={false}
    planOn={false}
    webOn
    goalTitle=""
    profiles={profiles}
    activeId={activeId}
    effort="max"
    onToggle={() => undefined}
    onClose={() => undefined}
    onToggleGoal={() => undefined}
    onChoosePlan={() => undefined}
    onToggleWeb={() => undefined}
    onPickProfile={onPickProfile}
    onManage={() => undefined}
    onOpenOnboarding={() => undefined}
    onEffort={() => undefined}
  />))
  return container
}

describe('ModelPicker', () => {
  it('shows every profile name next to its check mark', async () => {
    const view = await mount('b')
    const rows = [...view.querySelectorAll('.panel-model-pick')]
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('DeepSeek V4')
    expect(rows[1].textContent).toContain('Claude Opus 4')
    expect(rows[0].querySelector('.panel-model-check')).toBeNull()
    expect(rows[1].querySelector('.panel-model-check')).not.toBeNull()
  })

  it('picks a profile by clicking its name', async () => {
    const picked: string[] = []
    const view = await mount('a', (id) => { picked.push(id) })
    await act(async () => {
      view.querySelectorAll('.panel-model-pick')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(picked).toEqual(['b'])
  })
})
