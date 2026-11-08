/** 吐槽模式：每条内容都由模型即时生成，不在本地留固定句子。
 *  语气绑定人格（一直看着主人、认得习惯、被晾着不高兴），但输出只是一句
 *  吐槽；生成失败就保持上一条，不拿预制文本顶上。 */

export type RoastScene = 'general' | 'idle' | 'failed' | 'late' | 'long'

export interface RoastSettings {
  enabled: boolean
  intervalMinutes: number
  idlePauseMinutes: number
  burstLimit: number
}

/** 按当前时间和状态猜场景；外部事件（失败）可以直接指定。 */
export function sceneFor(input: { hour: number; idleMinutes: number; longRunningMinutes?: number; failed?: boolean }): RoastScene {
  if (input.failed) return 'failed'
  if (input.hour >= 0 && input.hour < 5) return 'late'
  if (input.idleMinutes >= 30) return 'idle'
  if ((input.longRunningMinutes ?? 0) >= 20) return 'long'
  return 'general'
}

export interface RoastServiceDeps {
  settings(): RoastSettings
  /** 卡片当前是否可见；关了就停表。 */
  visible(): boolean
  /** 最后一次用户交互的时间戳（毫秒）。 */
  lastInputAt(): number
  /** 把一条吐槽送到卡片。 */
  emit(text: string, at: number): void
  /** 让模型写一条；返回 null 表示这次没生成出来。 */
  generate(scene: RoastScene, recent: readonly string[]): Promise<string | null>
}

const RECENT_LIMIT = 5

export class RoastService {
  private recent: string[] = []
  private text: string | null = null
  private emittedAt = 0
  private autoCount = 0
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(private readonly deps: RoastServiceDeps, private readonly now: () => number = Date.now) {}

  current(): { text: string; at: number } | null {
    return this.text ? { text: this.text, at: this.emittedAt } : null
  }

  /** 用户操作：只复位退避，不立刻换内容。 */
  touch(): void {
    this.autoCount = 0
  }

  /** 手动刷新：立刻让模型写一条并重置计时与退避。 */
  async refresh(scene: RoastScene = 'general'): Promise<string | null> {
    return this.emit(scene)
  }

  /** 外部内容（偷窥模式）直接上卡：不参与去重，也不走生成。 */
  publish(text: string): void {
    if (!text.trim()) return
    this.text = text.trim()
    this.emittedAt = this.now()
    this.deps.emit(this.text, this.emittedAt)
  }

  private async emit(scene: RoastScene): Promise<string | null> {
    if (!this.deps.settings().enabled) return null
    const generated = await this.deps.generate(scene, this.recent).catch(() => null)
    const text = generated && generated.trim().length >= 2 ? generated.trim() : null
    if (!text) {
      // 这次没生成出来：保留上一条，把时间推到下个周期再试，别每 30 秒打一次模型。
      this.emittedAt = this.now()
      return null
    }
    this.recent = [...this.recent, text].slice(-RECENT_LIMIT)
    this.text = text
    this.emittedAt = this.now()
    this.autoCount += 1
    this.deps.emit(text, this.emittedAt)
    return text
  }

  /** 每 30 秒调用一次：满足可见、有交互、到点、没退避时才自动换。 */
  async tick(): Promise<void> {
    const settings = this.deps.settings()
    if (!settings.enabled || !this.deps.visible()) return
    const now = this.now()
    const idleMs = now - this.deps.lastInputAt()
    if (idleMs >= settings.idlePauseMinutes * 60_000) return
    const base = Math.max(1, settings.intervalMinutes) * 60_000
    const interval = this.autoCount >= Math.max(1, settings.burstLimit) ? base * 2 : base
    if (this.emittedAt && now - this.emittedAt < interval) return
    await this.emit(sceneFor({ hour: new Date(now).getHours(), idleMinutes: idleMs / 60_000 }))
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => { void this.tick() }, 30_000)
    this.timer.unref?.()
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = undefined
  }
}
