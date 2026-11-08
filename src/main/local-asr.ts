/** 本地 SenseVoice 识别：引擎随包，模型由 VoiceModelStore 按需下载。
 *  sherpa 是原生模块，只能在主进程加载；渲染层把 16k 单声道 PCM 送进来。 */
import { existsSync } from 'node:fs'
import path from 'node:path'

interface Recognizer {
  createStream(): {
    acceptWaveform(input: { samples: Float32Array; sampleRate: number }): void
  }
  decode(stream: unknown): void
  getResult(stream: unknown): { text?: string }
}

interface SherpaModule {
  OfflineRecognizer: new (config: unknown) => Recognizer
}

export class LocalAsr {
  private recognizer: Recognizer | null = null
  private loading: Promise<Recognizer | null> | null = null

  constructor(private readonly modelDir: string, private readonly modulePath: string | null) {}

  private modelFiles(): { model: string; tokens: string } | null {
    const model = path.join(this.modelDir, 'model.int8.onnx')
    const tokens = path.join(this.modelDir, 'tokens.txt')
    return existsSync(model) && existsSync(tokens) ? { model, tokens } : null
  }

  available(): boolean {
    return Boolean(this.modulePath) && this.modelFiles() !== null
  }

  /** 首次识别才加载模型，加载失败返回 null 交给上层回退云端。 */
  private async load(): Promise<Recognizer | null> {
    if (this.recognizer) return this.recognizer
    if (this.loading) return this.loading
    const files = this.modelFiles()
    if (!files || !this.modulePath) return null
    this.loading = (async () => {
      try {
        // 原生模块只能运行时 require，避免打包器把它当成静态依赖。
        const sherpa = require(this.modulePath!) as SherpaModule
        const recognizer = new sherpa.OfflineRecognizer({
          featConfig: { sampleRate: 16000, featureDim: 80 },
          modelConfig: {
            senseVoice: {
              model: files.model,
              tokens: files.tokens,
              useInverseTextNormalization: 1
            },
            numThreads: 2,
            debug: 0,
            provider: 'cpu'
          }
        })
        this.recognizer = recognizer
        return recognizer
      } catch (error) {
        console.error('Local ASR load failed:', error)
        return null
      } finally {
        this.loading = null
      }
    })()
    return this.loading
  }

  async transcribe(samples: Float32Array, sampleRate = 16_000): Promise<string | null> {
    if (!samples.length) return null
    const recognizer = await this.load()
    if (!recognizer) return null
    const stream = recognizer.createStream()
    stream.acceptWaveform({ samples, sampleRate })
    recognizer.decode(stream)
    const text = recognizer.getResult(stream).text?.trim() ?? ''
    return text || null
  }
}
