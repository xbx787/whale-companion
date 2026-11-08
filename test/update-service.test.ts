import { describe, expect, it } from 'vitest'
import { isNewer } from '../src/main/update-service'

describe('isNewer', () => {
  it('compares numeric segments', () => {
    expect(isNewer('0.0.152', '0.0.151')).toBe(true)
    expect(isNewer('0.0.151', '0.0.151')).toBe(false)
    expect(isNewer('0.1.0', '0.0.99')).toBe(true)
  })

  it('ignores a leading v and compares 9 before 10', () => {
    expect(isNewer('v0.0.152', '0.0.151')).toBe(true)
    expect(isNewer('v0.0.9', 'v0.0.10')).toBe(false)
  })
})
