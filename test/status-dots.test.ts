import { describe, expect, it } from 'vitest'
import { orderStatusDots } from '../src/renderer/status-dots'

describe('status dot order', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

  it('puts open tabs in front and empty dots at the end', () => {
    expect(orderStatusDots(items, new Set(['c'])).map((item) => item.id)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('keeps the empty dots at the end when a tab is pulled out or closed', () => {
    expect(orderStatusDots(items, new Set(['b', 'c'])).map((item) => item.id)).toEqual(['b', 'c', 'a', 'd'])
    expect(orderStatusDots(items, new Set(['c'])).map((item) => item.id)).toEqual(['c', 'a', 'b', 'd'])
    expect(orderStatusDots(items, new Set()).map((item) => item.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
