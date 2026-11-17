import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { deepseekTts, deepseekAsr } = vi.hoisted(() => ({
  deepseekTts: vi.fn(async () => ({ bytes: Buffer.alloc(256, 1), mimeType: 'audio/wav' as const })),
  deepseekAsr: vi.fn(async () => ({ text: '你好', durationMs: 1000 }))
}))

vi.mock('../src/main/deepseek-tools', () => ({ deepseekTts, deepseekAsr }))

const { VoiceService } = await import('../src/main/voice-service')
type SecretCodec = import('../src/main/secret-storage').SecretCodec

const testRoot = path.join(process.cwd(), '.cache', 'tests', `voice-service-${randomUUID()}`)

const codec: SecretCodec = {
  encrypt: (value) => `safe-storage:v1:${Buffer.from(value, 'utf8').toString('base64')}`,
  decrypt: (value) => {
    if (!value.startsWith('safe-storage:v1:')) throw new Error('bad ciphertext')
    return Buffer.from(value.slice('safe-storage:v1:'.length), 'base64').toString('utf8')
  }
}

afterEach(async () => {
  deepseekTts.mockClear()
  deepseekAsr.mockClear()
  await fs.rm(testRoot, { recursive: true, force: true })
})

function service(overrides: Partial<ConstructorParameters<typeof VoiceService>[0]> = {}) {
  return new VoiceService({
    dataRoot: testRoot,
    codec,
    deepseekKey: () => 'sk-test',
    ...overrides
  })
}

describe('VoiceService', () => {
  it('reports no key until a DeepSeek key is available', async () => {
    const voice = service({ deepseekKey: () => undefined })
    await expect(voice.transcribe({ bytes: [1], mimeType: 'audio/wav' })).rejects.toThrow('未配置 DeepSeek Key')
  })

  it('synthesizes through the official API once and then serves the cached audio', async () => {
    const voice = service()
    const first = await voice.synthesize({ text: '你好' })
    const second = await voice.synthesize({ text: '你好' })
    expect(first.cached).toBe(false)
    expect(second.cached).toBe(true)
    expect(first.audioBase64).toBe(second.audioBase64)
    expect(deepseekTts).toHaveBeenCalledTimes(1)
  })

  it('rejects a recording that is not WAV or Ogg Opus', async () => {
    const voice = service()
    await expect(voice.transcribe({ bytes: [1], mimeType: 'audio/webm' })).rejects.toThrow('WAV 或 Ogg Opus')
  })

  it('transcribes WAV audio through the official API', async () => {
    const voice = service()
    const result = await voice.transcribe({ bytes: [1, 2, 3], mimeType: 'audio/wav' })
    expect(result.text).toBe('你好')
    expect(deepseekAsr).toHaveBeenCalledTimes(1)
  })

  it('runs a document job and publishes progress', async () => {
    const progress: string[] = []
    const voice = service({ onJobProgress: (event) => progress.push(event.phase) })
    const file = path.join(testRoot, 'doc.md')
    await fs.mkdir(testRoot, { recursive: true })
    await fs.writeFile(file, '第一段。第二段。')

    const job = await voice.startDocumentJob(file)
    expect(job.total).toBeGreaterThan(0)
    await vi.waitFor(() => expect(progress).toContain('done'), { timeout: 5_000 })
    const output = await voice.documentOutputPath(job.jobId)
    const files = await fs.readdir(output)
    expect(files).toContain('playlist.m3u')
    expect(files.some((name) => /^\d{3}\.mp3$/u.test(name))).toBe(true)
  })

  it('uses the official API for a connection test', async () => {
    const voice = service()
    const result = await voice.testConnection()
    expect(result.ok).toBe(true)
    expect(deepseekTts).toHaveBeenCalledTimes(1)
  })
})
