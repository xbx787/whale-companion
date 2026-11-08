/** 本地语音识别的模型管理：包内只带引擎，模型首次使用时下载到数据目录。
 *  SenseVoiceSmall 的 INT8 权重约 228MB，连同词表一起从 hf-mirror 拉取；
 *  Hugging Face 直连在这台机器上不通，所以镜像优先、官方作为回退。 */
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'

export interface VoiceModelFile {
  name: string
  bytes: number
  urls: string[]
  /** 镜像给出的 LFS 校验值；有的文件只有 SHA-1。 */
  sha256?: string
  sha1?: string
}

export interface VoiceModelStatus {
  state: 'missing' | 'downloading' | 'ready' | 'error'
  receivedBytes: number
  totalBytes: number
  file: string
  error?: string
}

const BASE = 'csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main'
const FILES: VoiceModelFile[] = [
  {
    name: 'model.int8.onnx',
    bytes: 239_233_841,
    urls: [`https://hf-mirror.com/${BASE}/model.int8.onnx`, `https://huggingface.co/${BASE}/model.int8.onnx`],
    sha256: 'c71f0ce00bec95b07744e116345e33d8cbbe08cef896382cf907bf4b51a2cd51'
  },
  {
    name: 'tokens.txt',
    bytes: 315_894,
    urls: [`https://hf-mirror.com/${BASE}/tokens.txt`, `https://huggingface.co/${BASE}/tokens.txt`],
    sha1: '2cfc92fc2ff26aaa690b7c01fd96b41109413881'
  }
]

export class VoiceModelStore {
  private status: VoiceModelStatus = { state: 'missing', receivedBytes: 0, totalBytes: 0, file: '' }
  private controller: AbortController | null = null
  private readonly listeners = new Set<(status: VoiceModelStatus) => void>()

  constructor(private readonly dataRoot: string) {}

  private dir(): string {
    return path.join(this.dataRoot, 'voice-model', 'sensevoice')
  }

  private target(file: VoiceModelFile): string {
    return path.join(this.dir(), file.name)
  }

  /** 完整且大小对得上才算就绪；缺一个文件就整组重下。 */
  async refresh(): Promise<VoiceModelStatus> {
    if (this.status.state === 'downloading') return this.snapshot()
    const missing = FILES.filter((file) => {
      const target = this.target(file)
      return !existsSync(target) || statSync(target).size !== file.bytes
    })
    this.status = missing.length
      ? { state: 'missing', receivedBytes: 0, totalBytes: 0, file: missing[0]?.name ?? '' }
      : { state: 'ready', receivedBytes: 0, totalBytes: 0, file: '' }
    return this.snapshot()
  }

  snapshot(): VoiceModelStatus {
    return { ...this.status }
  }

  subscribe(listener: (status: VoiceModelStatus) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private publish(next: VoiceModelStatus): void {
    this.status = next
    for (const listener of this.listeners) listener({ ...next })
  }

  cancel(): void {
    this.controller?.abort()
    this.controller = null
  }

  /** 下载缺失文件；已完成的文件直接复用。单个文件从镜像失败会换官方源。 */
  async download(): Promise<VoiceModelStatus> {
    if (this.status.state === 'downloading') return this.snapshot()
    mkdirSync(this.dir(), { recursive: true })
    const controller = new AbortController()
    this.controller = controller
    const totalBytes = FILES.reduce((sum, file) => sum + file.bytes, 0)
    try {
      for (const [index, file] of FILES.entries()) {
        const target = this.target(file)
        if (existsSync(target) && statSync(target).size === file.bytes) continue
        const before = FILES.slice(0, index).reduce((sum, previous) => sum + previous.bytes, 0)
        let lastError = ''
        let done = false
        for (const url of file.urls) {
          try {
            await this.fetchFile(url, target, file, controller.signal, (received) => {
              this.publish({ state: 'downloading', receivedBytes: before + received, totalBytes, file: file.name })
            })
            done = true
            break
          } catch (error) {
            if (controller.signal.aborted) throw error
            lastError = error instanceof Error ? error.message : String(error)
          }
        }
        if (!done) throw new Error(`${file.name} 下载失败：${lastError || '所有下载源都不可用'}`)
      }
      this.publish({ state: 'ready', receivedBytes: totalBytes, totalBytes, file: '' })
      return this.snapshot()
    } catch (error) {
      this.publish({
        state: 'error',
        receivedBytes: this.status.receivedBytes,
        totalBytes,
        file: this.status.file,
        error: controller.signal.aborted ? '下载已取消。' : (error instanceof Error ? error.message : String(error))
      })
      return this.snapshot()
    } finally {
      if (this.controller === controller) this.controller = null
    }
  }

  private async fetchFile(url: string, target: string, file: VoiceModelFile, signal: AbortSignal,
    onProgress: (received: number) => void): Promise<void> {
    const response = await fetch(url, { signal, redirect: 'follow' })
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
    const partial = `${target}.part`
    rmSync(partial, { force: true })
    const handle = createWriteStream(partial)
    const reader = response.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (signal.aborted) throw new Error('下载已取消。')
        if (!handle.write(Buffer.from(value))) {
          await new Promise<void>((resolve) => handle.once('drain', () => resolve()))
        }
        onProgress(statSize(partial))
      }
    } finally {
      await new Promise<void>((resolve) => handle.end(resolve))
    }
    const size = statSize(partial)
    if (size !== file.bytes) {
      rmSync(partial, { force: true })
      throw new Error(`${file.name} 大小不符（${size} / ${file.bytes}）`)
    }
    const digest = await hashFile(partial, file.sha256 ? 'sha256' : 'sha1')
    const expected = file.sha256 ?? file.sha1 ?? ''
    if (expected && digest !== expected) {
      rmSync(partial, { force: true })
      throw new Error(`${file.name} 校验失败`)
    }
    renameSync(partial, target)
  }

  /** 交给 sherpa 的模型目录。 */
  modelDir(): string {
    return this.dir()
  }
}

function statSize(file: string): number {
  try {
    return statSync(file).size
  } catch {
    return 0
  }
}

function hashFile(file: string, algorithm: 'sha256' | 'sha1'): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm)
    createReadStream(file)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}

/** 定位包内的 sherpa 引擎：开发态在 reference 运行时，打包后在 resources/dsh。 */
export function resolveSherpaModule(resourcesPath: string, devRoot?: string): string | null {
  const roots = [
    devRoot ? path.join(devRoot, 'reference', 'dsh-runtime', 'node_modules', '.pnpm') : '',
    path.join(resourcesPath, 'dsh', 'node_modules', '.pnpm')
  ].filter(Boolean)
  for (const root of roots) {
    if (!existsSync(root)) continue
    const match = readdirSync(root).find((name) => name.startsWith('sherpa-onnx-node@'))
    if (!match) continue
    const candidate = path.join(root, match, 'node_modules', 'sherpa-onnx-node')
    if (existsSync(candidate)) return candidate
  }
  return null
}
