import { describe, expect, it } from 'vitest'
import { RoastService, sceneFor } from '../src/main/roast-service'

let seq = 0

function serviceAt(
  overrides: { enabled?: boolean; visible?: boolean; lastInputOffsetMs?: number; startedAt?: number },
  generate?: (scene: string, recent: readonly string[]) => Promise<string | null>
) {
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
    emit: (text) => { emitted.push(text) },
    generate: generate ?? (async (scene) => `模型写的第 ${++seq} 条，${scene}。`)
  }, () => now)
  return { service, emitted, advance: (ms: number) => { now += ms } }
}

describe('roast service', () => {
  it('emits on the interval when the card is visible and the user is active', async () => {
    const { service, emitted, advance } = serviceAt({})
    advance(8 * 60_000)
    await service.tick()
    expect(emitted).toHaveLength(1)
  })

  it('stops when idle longer than the pause and when hidden', async () => {
    const idle = serviceAt({ lastInputOffsetMs: 11 * 60_000 })
    idle.advance(20 * 60_000)
    await idle.service.tick()
    expect(idle.emitted).toHaveLength(0)

    const hidden = serviceAt({ visible: false })
    hidden.advance(20 * 60_000)
    await hidden.service.tick()
    expect(hidden.emitted).toHaveLength(0)
  })

  it('doubles the interval after the burst limit until the user acts', async () => {
    const { service, emitted, advance } = serviceAt({})
    for (let index = 0; index < 5; index += 1) {
      advance(8 * 60_000)
      await service.tick()
    }
    expect(emitted).toHaveLength(5)
    advance(8 * 60_000)
    await service.tick()
    expect(emitted).toHaveLength(5)
    advance(8 * 60_000)
    await service.tick()
    expect(emitted).toHaveLength(6)
    service.touch()
    advance(8 * 60_000)
    await service.tick()
    expect(emitted).toHaveLength(7)
  })

  it('keeps the previous line when the model returns nothing', async () => {
    let fail = false
    const { service, emitted, advance } = serviceAt({}, async () => (fail ? null : '第一条。'))
    advance(8 * 60_000)
    await service.tick()
    expect(emitted).toEqual(['第一条。'])

    fail = true
    advance(8 * 60_000)
    await service.tick()
    expect(emitted).toEqual(['第一条。'])
    expect(service.current()?.text).toBe('第一条。')
  })

  it('picks late, idle, failed and long scenes by context', () => {
    expect(sceneFor({ hour: 2, idleMinutes: 0 })).toBe('late')
    expect(sceneFor({ hour: 14, idleMinutes: 40 })).toBe('idle')
    expect(sceneFor({ hour: 14, idleMinutes: 0, failed: true })).toBe('failed')
    expect(sceneFor({ hour: 14, idleMinutes: 0, longRunningMinutes: 30 })).toBe('long')
  })
})
