import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { VoiceConfig, VoiceJobProgress, VoiceSettingsPatch, VoiceSettingsPublic } from '../shared/contracts'
import { MAX_TTS_INPUT_CHARS, TTS_MODEL, clampSpeechSpeed, isSpeechSpeed, isVoicePresetId, siliconFlowVoiceName } from '../shared/voice'
import { transcribeAudio as defaultTranscribe } from './asr-server'
import { deepseekAsr, deepseekTts } from './deepseek-tools'
import { readDocumentForSpeech, convertDocumentToAudio } from './document-audio'
import type { SecretCodec } from './secret-storage'
import { VoiceCache } from './voice-cache'
import { VoiceConfigStore } from './voice-config-store'
import { synthesizeSpeech as defaultSynthesize } from './voice-tts-server'

export interface VoiceServiceOptions {
  dataRoot: string
  codec: SecretCodec
  env?: NodeJS.ProcessEnv
  onJobProgress?: (progress: VoiceJobProgress) => void
  synthesizeImpl?: typeof defaultSynthesize
  transcribeImpl?: typeof defaultTranscribe
  now?: () => Date
  /** 官方 DeepSeek key：有值时语音优先走官方 /v1/tools/tts、/v1/tools/asr。 */
  deepseekKey?: () => string | undefined
}

interface DocumentJob {
  id: string
  controller: AbortController
  outputDir?: string
  total: number
  progress: VoiceJobProgress
}

class Limiter {
  private active = 0
  private readonly waiting: Array<() => void> = []

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.waiting.push(resolve))
    }
    this.active += 1
    try {
      return await task()
    } finally {
      this.active -= 1
      this.waiting.shift()?.()
    }
  }
}

export class VoiceService {
  private readonly store: VoiceConfigStore
  private readonly cache: VoiceCache
  private readonly limiter = new Limiter(2)
  private readonly jobs = new Map<string, DocumentJob>()
  private lastJob: VoiceJobProgress | undefined
  private readonly onJobProgress: (progress: VoiceJobProgress) => void
  private readonly synthesizeImpl: typeof defaultSynthesize
  private readonly transcribeImpl: typeof defaultTranscribe
  private readonly deepseekKey: (() => string | undefined) | undefined
  private readonly now: () => Date
  readonly audioRoot: string

  constructor(options: VoiceServiceOptions) {
    this.store = new VoiceConfigStore(options.dataRoot, options.codec, options.env)
    this.cache = new VoiceCache(path.join(options.dataRoot, 'voice-cache'))
    this.audioRoot = path.join(options.dataRoot, 'audio')
    this.onJobProgress = options.onJobProgress ?? (() => undefined)
    this.synthesizeImpl = options.synthesizeImpl ?? defaultSynthesize
    this.transcribeImpl = options.transcribeImpl ?? defaultTranscribe
    this.deepseekKey = options.deepseekKey
    this.now = options.now ?? (() => new Date())
  }

  async getPublicSettings(): Promise<VoiceSettingsPublic> {
    const view = await this.store.publicView()
    return this.lastJob ? { ...view, lastDocumentJob: this.lastJob } : view
  }

  async saveSettings(patch: VoiceSettingsPatch): Promise<VoiceSettingsPublic> {
    await this.store.save(patch)
    return this.getPublicSettings()
  }

  async getVoiceConfig(): Promise<VoiceConfig> {
    const [key, runtime, view] = await Promise.all([
      this.store.apiKey(), this.store.runtime(), this.store.publicView()
    ])
    return {
      siliconFlowAvailable: Boolean(key.key),
      siliconFlowModel: runtime.sttModel,
      siliconFlowBaseUrl: runtime.baseUrl,
      ttsAvailable: Boolean(key.key),
      ttsModel: runtime.ttsModel,
      voice: runtime.voice,
      speed: runtime.speed,
      autoSpeak: runtime.autoSpeak,
      needsKeyReentry: view.needsKeyReentry
    }
  }

  async transcribe(input: { bytes: number[]; mimeType: string }): Promise<{ text: string }> {
    // 只用官方 ASR：它只收 16 位 PCM WAV 或 Ogg Opus。
    const officialKey = this.deepseekKey?.()
    if (!officialKey) throw new Error('未配置 DeepSeek Key，无法转写。')
    if (!/wav|ogg|opus/i.test(input.mimeType)) throw new Error('录音格式需要 WAV 或 Ogg Opus。')
    const result = await this.limiter.run(() => deepseekAsr(Buffer.from(input.bytes), 'recording.wav', officialKey))
    return { text: result.text }
  }

  async synthesize(input: { text: string; voice?: string; speed?: number }): Promise<{
    audioBase64: string
    mimeType: 'audio/mpeg' | 'audio/wav'
    cached: boolean
  }> {
    const text = input.text.trim()
    if (!text) throw new Error('没有可朗读的文字。')
    if (text.length > MAX_TTS_INPUT_CHARS) throw new Error('单段语音最多 300 字。')
    // 只用官方 TTS：整段合成，直接返回 wav。
    const officialKey = this.deepseekKey?.()
    if (!officialKey) throw new Error('未配置 DeepSeek Key，无法朗读。请先在设置里填写。')
    const officialCache = this.cache.keyFor({ model: 'deepseek-tts', voice: 'stella', speed: 1, format: 'wav', text })
    const officialHit = await this.cache.read(officialCache)
    if (officialHit) return { audioBase64: officialHit.toString('base64'), mimeType: 'audio/wav', cached: true }
    const synthesized = await this.limiter.run(() => deepseekTts(text, officialKey, { voiceId: 'stella', format: 'wav' }))
    await this.cache.write(officialCache, synthesized.bytes)
    return { audioBase64: synthesized.bytes.toString('base64'), mimeType: 'audio/wav', cached: false }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const key = this.deepseekKey?.()
      if (!key) return { ok: false, message: '还没有配置 DeepSeek Key。' }
      await this.limiter.run(() => deepseekTts('你好，我是小鲸。', key, { voiceId: 'stella', format: 'wav' }))
      return { ok: true, message: '连接成功，语音合成可用。' }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '连接失败。' }
    }
  }

  async startDocumentJob(filePath: string): Promise<{ jobId: string; total: number }> {
    const document = await readDocumentForSpeech(filePath)
    if (!this.deepseekKey?.()) throw new Error('未配置 DeepSeek Key，无法转换文档。')
    const jobId = randomUUID()
    const controller = new AbortController()
    const progress: VoiceJobProgress = {
      jobId, phase: 'preparing', completed: 0, total: document.segments.length
    }
    const job: DocumentJob = { id: jobId, controller, total: document.segments.length, progress }
    this.jobs.set(jobId, job)
    this.publish(progress)

    void (async () => {
      try {
        const result = await convertDocumentToAudio({
          jobId,
          name: document.name,
          segments: document.segments,
          audioRoot: this.audioRoot,
          voice: 'stella',
          speed: 1,
          signal: controller.signal,
          now: this.now(),
          synthesize: async (text) => {
            const synthesized = await this.synthesize({ text })
            return Buffer.from(synthesized.audioBase64, 'base64')
          },
          onProgress: (next) => {
            job.outputDir = next.outputDir ?? job.outputDir
            job.progress = next
            this.publish(next)
          }
        })
        job.progress = {
          jobId, phase: result.status === 'completed' ? 'done' : 'cancelled',
          completed: result.completed, total: result.total, outputDir: result.outputDir
        }
        this.publish(job.progress)
      } catch (error) {
        job.progress = {
          jobId, phase: 'failed', completed: job.progress.completed, total: job.total,
          outputDir: job.outputDir,
          message: error instanceof Error ? error.message : '文档转音频失败。'
        }
        this.publish(job.progress)
      } finally {
        this.jobs.delete(jobId)
      }
    })()

    return { jobId, total: document.segments.length }
  }

  async cancelDocumentJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) return
    job.controller.abort()
  }

  /** Resolves an output path only when it belongs to a known job under audio/. */
  async documentOutputPath(jobId: string): Promise<string> {
    const job = this.jobs.get(jobId)
    const outputDir = job?.outputDir ?? (this.lastJob?.jobId === jobId ? this.lastJob.outputDir : undefined)
    if (!outputDir) throw new Error('找不到这个音频任务。')
    const relative = path.relative(this.audioRoot, outputDir)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('音频目录无效。')
    return outputDir
  }

  dispose(): void {
    for (const job of this.jobs.values()) job.controller.abort()
    this.jobs.clear()
  }

  private publish(progress: VoiceJobProgress): void {
    this.lastJob = progress
    try {
      this.onJobProgress(progress)
    } catch {
      // A closed settings window must not break a running job.
    }
  }
}
