import { describe, expect, it } from 'vitest'
import { panelAutoCollapseDue } from '../src/renderer/panel-utils'

describe('panelAutoCollapseDue', () => {
  const base = { visible: true, busy: false, lastActivity: 0, now: 10 * 60_000, minutes: 10 }

  it('fires exactly at the configured threshold', () => {
    expect(panelAutoCollapseDue(base)).toBe(true)
    expect(panelAutoCollapseDue({ ...base, now: 10 * 60_000 - 1 })).toBe(false)
  })

  it('never fires while a task is running or the panel is hidden', () => {
    expect(panelAutoCollapseDue({ ...base, busy: true })).toBe(false)
    expect(panelAutoCollapseDue({ ...base, visible: false })).toBe(false)
  })

  it('treats zero and invalid minutes as disabled', () => {
    expect(panelAutoCollapseDue({ ...base, minutes: 0 })).toBe(false)
    expect(panelAutoCollapseDue({ ...base, minutes: Number.NaN })).toBe(false)
  })
})
