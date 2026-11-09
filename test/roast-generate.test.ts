import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateRoast } from '../src/main/roast-generate'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function respond(body: unknown, ok = true): void {
  globalThis.fetch = vi.fn(async () => ({ ok, json: async () => body }) as Response) as unknown as typeof fetch
}

describe('generateRoast', () => {
  it('returns the model text when it is short and clean', async () => {
    respond({ choices: [{ message: { content: '水凉了吧。' } }] })
    expect(await generateRoast('sk-test', { scene: 'general', hour: 23, recent: [] })).toBe('水凉了吧。')
  })

  it('returns null when the endpoint fails', async () => {
    respond({}, false)
    expect(await generateRoast('sk-test', { scene: 'general', hour: 23, recent: [] })).toBeNull()
  })

  it('rejects list-like and overlong replies so the card can fall back', async () => {
    respond({ choices: [{ message: { content: '- 第一句\n- 第二句' } }] })
    expect(await generateRoast('sk-test', { scene: 'general', hour: 23, recent: [] })).toBeNull()
    respond({ choices: [{ message: { content: '啊'.repeat(500) } }] })
    expect(await generateRoast('sk-test', { scene: 'general', hour: 23, recent: [] })).toBeNull()
  })
})
