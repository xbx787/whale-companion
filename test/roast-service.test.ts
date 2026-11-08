import { describe, expect, it } from 'vitest'
import { RoastService, ROAST_LINES, pickRoast, sceneFor, sentenceCount } from '../src/main/roast-service'

function serviceAt(overrides: {
  enabled?: boolean
  visible?: boolean
  lastInputOffsetMs?: number
  startedAt?: number
}) {
  let now = overrides.startedAt ?? 0
  const emitted: string[] = []
  const service = new RoastService({
    settings: () => ({
      enabled: overrides.enabled ?? true,
      intervalMinutes: 8,
      idlePauseMinutes: 10,
      burstLimit: 5
    }),
    visible: () => overrides.visible ?? true,
    lastInputAt: () => now - (overrides.lastInputOffsetMs ?? 60_000),
    emit: (text) => { emitted.push(text) }
  }, () => now)
  return { service, emitted, advance: (ms: number) => { now += ms } }
}

describe('roast service', () => {
  it('emits on the interval when the card is visible and the user is active', () => {
    const { service, emitted, advance } = serviceAt({})
    advance(8 * 60_000)
    service.tick()
    expect(emitted).toHaveLength(1)
  })

  it('stops when idle longer than the pause and when hidden', () => {
    const idle = serviceAt({ lastInputOffsetMs: 11 * 60_000 })
    idle.advance(20 * 60_000)
    idle.service.tick()
    expect(idle.emitted).toHaveLength(0)

    const hidden = serviceAt({ visible: false })
    hidden.advance(20 * 60_000)
    hidden.service.tick()
    expect(hidden.emitted).toHaveLength(0)
  })

  it('doubles the interval after the burst limit until the user acts', () => {
    const { service, emitted, advance } = serviceAt({})
    for (let index = 0; index < 5; index += 1) {
      advance(8 * 60_000)
      service.tick()
    }
    expect(emitted).toHaveLength(5)
    advance(8 * 60_000)
    service.tick()
    expect(emitted).toHaveLength(5)
    advance(8 * 60_000)
    service.tick()
    expect(emitted).toHaveLength(6)
    service.touch()
    advance(8 * 60_000)
    service.tick()
    expect(emitted).toHaveLength(7)
  })

  it('skips lines that were just shown', () => {
    const first = pickRoast('general', [], () => 0)
    expect(pickRoast('general', [first], () => 0)).not.toBe(first)
  })

  it('writes every line as a complete thought, one to three sentences', () => {
    for (const lines of Object.values(ROAST_LINES)) {
      for (const line of lines) {
        expect(line.trim().length, line).toBeGreaterThan(3)
        expect(sentenceCount(line), line).toBeGreaterThanOrEqual(1)
        expect(sentenceCount(line), line).toBeLessThanOrEqual(3)
      }
    }
  })

  it('picks late, idle, failed and long scenes by context', () => {
    expect(sceneFor({ hour: 2, idleMinutes: 0 })).toBe('late')
    expect(sceneFor({ hour: 14, idleMinutes: 40 })).toBe('idle')
    expect(sceneFor({ hour: 14, idleMinutes: 0, failed: true })).toBe('failed')
    expect(sceneFor({ hour: 14, idleMinutes: 0, longRunningMinutes: 30 })).toBe('long')
  })
})
