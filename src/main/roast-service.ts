/** 吐槽模式：本地语料 + 轮换规则。
 *  语气绑定人格（一直看着主人、认得习惯、被晾着不高兴），但输出只是一句
 *  吐槽；不调模型也能一直换，走模型生成时复用同一份人设。 */

export type RoastScene = 'general' | 'idle' | 'failed' | 'late' | 'long'

/** 每个场景的语料：像人随口说的，具体、生活化，可以是一句、两句或三句，
 *  也可以反问；只说看到的行为和结果，不评价人本身。 */
export const ROAST_LINES: Record<RoastScene, string[]> = {
  general: [
    '这页看了多久了？',
    '水凉了吧。',
    '外卖到了。筷子还没拆。先吃，凉的不好吃。',
    '同一个地方刷了三遍，真有新东西吗？',
    '歌单又循环回来了，你是不是没注意？',
    '椅子滑来滑去，坐稳一点。',
    '手机响了三回，都是推送。等的那条还没来。',
    '这一行停十分钟了，要不先歇一下？',
    '窗外天都黑了，你还开着这盏灯。',
    '标签开了又关，最后还不是回到最开始那个。'
  ],
  idle: [
    '人走了，屏幕还亮着。',
    '鼠标停在半空二十分钟了，动一下？',
    '椅子空着，风扇还在转。',
    '饭点到了，先吃饭吧。',
    '屏幕暗了又亮，没等到你。',
    '窗外的光换了个角度，你还没回来。'
  ],
  failed: [
    '没成。先看看提示？',
    '卡在同一个地方两次了。换个顺序？',
    '这一步走岔了。退回去还来得及。',
    '提示在下面，别只盯着上面。',
    '又来了。要不先停一下，想想再点？'
  ],
  late: [
    '两点了，还不睡？',
    '屏幕调这么暗，眼睛不累吗。',
    '外面没声了，键盘还在响。',
    '夜里做的决定，早上多半会想改。',
    '再坐一小时，明天上午就没了。'
  ],
  long: [
    '等了二十分钟了，还没动静。',
    '进度条卡在一半。要不要先干点别的？',
    '这么久没结果，方向对吗？'
  ]
}

/** 场景顺序：越具体的越先命中。 */
const SCENES: RoastScene[] = ['late', 'idle', 'failed', 'long', 'general']

export interface RoastSettings {
  enabled: boolean
  intervalMinutes: number
  idlePauseMinutes: number
  burstLimit: number
}

/** 一句话数：按句号、问号、感叹号切。 */
export function sentenceCount(text: string): number {
  return text.split(/[。！？!?]/u).filter((part) => part.trim().length > 0).length
}

/** 从场景语料里挑一条，跳过最近用过的。全部用过时退回全量。 */
export function pickRoast(scene: RoastScene, recent: readonly string[] = [], random: () => number = Math.random): string {
  const pool = ROAST_LINES[scene].filter((line) => !recent.includes(line))
  const list = pool.length ? pool : ROAST_LINES[scene]
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))]
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

  /** 手动刷新：立刻换一条并重置计时与退避。 */
  refresh(scene: RoastScene = 'general'): string | null {
    return this.emit(scene)
  }

  /** 外部内容（眼睛模式）直接上卡：不看吐槽开关，也不参与本地语料去重。 */
  publish(text: string): void {
    if (!text.trim()) return
    this.text = text.trim()
    this.emittedAt = this.now()
    this.deps.emit(this.text, this.emittedAt)
  }

  private emit(scene: RoastScene): string | null {
    if (!this.deps.settings().enabled) return null
    const text = pickRoast(scene, this.recent)
    this.recent = [...this.recent, text].slice(-RECENT_LIMIT)
    this.text = text
    this.emittedAt = this.now()
    this.autoCount += 1
    this.deps.emit(text, this.emittedAt)
    return text
  }

  /** 每 30 秒调用一次：满足可见、有交互、到点、没退避时才自动换。 */
  tick(): void {
    const settings = this.deps.settings()
    if (!settings.enabled || !this.deps.visible()) return
    const now = this.now()
    const idleMs = now - this.deps.lastInputAt()
    if (idleMs >= settings.idlePauseMinutes * 60_000) return
    const base = Math.max(1, settings.intervalMinutes) * 60_000
    const interval = this.autoCount >= Math.max(1, settings.burstLimit) ? base * 2 : base
    if (this.emittedAt && now - this.emittedAt < interval) return
    this.emit(sceneFor({ hour: new Date(now).getHours(), idleMinutes: idleMs / 60_000 }))
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), 30_000)
    this.timer.unref?.()
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = undefined
  }
}
