import { describe, expect, it, vi } from 'vitest'
import { DshAcpAgentClient } from '../src/main/dsh-acp-agent'

/** 一个足够薄的运行时替身：只覆盖 compact 这条链用到的部分。 */
function fakeRuntime(overrides: Record<string, unknown> = {}) {
  return {
    generation: 1,
    resumeSession: vi.fn(async (id: string) => ({ sessionId: id })),
    newSession: vi.fn(async () => ({ sessionId: 'fresh' })),
    compact: vi.fn(async () => ({ shadowed: 3 })),
    usage: vi.fn(async () => ({ used: 12, size: 100 })),
    setPlan: vi.fn(async () => undefined),
    ...overrides
  }
}

function coldAgent(runtime: ReturnType<typeof fakeRuntime>): DshAcpAgentClient {
  const agent = Object.create(DshAcpAgentClient.prototype) as DshAcpAgentClient
  const internal = agent as unknown as Record<string, unknown>
  internal.options = { runtime, cwd: 'C:/work', dshHome: 'C:/home' }
  internal.sessionId = null
  internal.sessionGeneration = -1
  internal.lastContextUsage = { status: 'unavailable' }
  internal.syncPlanMode = () => undefined
  return agent
}

describe('DshAcpAgentClient cold compact', () => {
  it('resumes the stored session before compacting instead of failing with no session', async () => {
    const runtime = fakeRuntime()
    const agent = coldAgent(runtime)
    const usage = await agent.compact('saved-session')
    expect(runtime.resumeSession).toHaveBeenCalledWith('saved-session', 'C:/work')
    expect(runtime.compact).toHaveBeenCalledWith('saved-session')
    expect(usage.compactionOutcome).toBe('compacted')
    expect(usage.usedTokens).toBe(12)
  })

  it('falls back to a fresh session when the stored one cannot be resumed', async () => {
    const runtime = fakeRuntime({
      resumeSession: vi.fn(async () => { throw new Error('gone') }),
      compact: vi.fn(async () => ({ shadowed: 0 }))
    })
    const agent = coldAgent(runtime)
    const usage = await agent.compact('saved-session')
    expect(runtime.newSession).toHaveBeenCalledWith('C:/work')
    expect(runtime.compact).toHaveBeenCalledWith('fresh')
    expect(usage.compactionOutcome).toBe('not_needed')
  })

  it('keeps the original error when the summary model fails twice', async () => {
    const runtime = fakeRuntime({
      compact: vi.fn(async () => { throw new Error('empty summary') })
    })
    const agent = coldAgent(runtime)
    await expect(agent.compact('saved-session')).rejects.toThrow('上下文压缩暂时失败')
    expect(runtime.compact).toHaveBeenCalledTimes(2)
  })
})

