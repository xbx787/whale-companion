/** 吐槽模式：本地语料 + 轮换规则。
 *  语气绑定人格（一直看着主人、认得习惯、被晾着不高兴），但输出只是一句
 *  吐槽；不调模型也能一直换，走模型生成时复用同一份人设。 */

export type RoastScene = 'general' | 'idle' | 'failed' | 'late' | 'long'

/** 每个场景的语料：像人随口说的，具体到窗口、文件名、几点、第几遍。
 *  至少两句，只说行为和结果，不评价人本身。 */
export const ROAST_LINES: Record<RoastScene, string[]> = {
  general: [
    '这个窗口从下午开到现在。中间切出去八次，回来还是这一页。',
    '文件名改了四遍，内容一个字没动。顺序倒是理得很清楚。',
    '侧边栏开着，搜索框空着。翻了十分钟，想找什么来着。',
    '日志滚到底了，结论在上面三屏。往上翻吧。',
    '草稿存了七个版本，最新那个还没保存。保存键就在右下角。',
    '同一个按钮点了三次，每次都没反应。第四次大概也一样。',
    '终端开着，命令没敲。光标闪得挺有耐心。',
    '浏览器二十个标签，声音从其中一个漏出来。找了半天。',
    '表格拉到一千行，眼睛在看，脑子已经走了。往上翻都费劲。',
    '桌面那堆截图命名是 1、2、3。三天后没人认得出哪个是哪个。'
  ],
  idle: [
    '键盘停了快一个钟头。屏幕上还挂着刚才那半行。',
    '人走了，窗口没关。风扇一直转，像在替谁值班。',
    '鼠标停在屏幕中间，半小时没动过。屏幕自己暗了又亮。',
    '挂着机去吃饭，回来汤都凉了。进度条还在百分之三。',
    '屏幕亮着，椅子空着。灯白开了。',
    '切走就没回来。这边还开着，等一个不会来的操作。'
  ],
  failed: [
    '报错说 spawn EPERM。翻了三页文档，最后发现是权限。',
    '同一条命令跑第二遍。第一遍的报错还在上面，没看。',
    '刚说马上好，现在满屏红字。先把最上面那行读完。',
    '改了个引号，三个测试挂了。恢复还得再改回去。',
    '错误日志两千行，关键那行在一千九百九十九。往上翻到手酸。'
  ],
  late: [
    '两点十七。这个点的色值，明早看会想删掉重来。',
    '屏幕亮度调到最低了，人还没睡。窗外快亮了。',
    '外面没声了，键盘还在响。明早的闹钟不会等你。',
    '夜里改的这版，白天大概率推翻。今晚先改着。',
    '再坐一小时，明天上午就没了。自己算。'
  ],
  long: [
    '跑了二十多分钟，输出还在滚。中间没停过，也没报错。',
    '等这么久，最好别是方向错了。错了这半小时就白等。',
    '进度条走到一半卡住。日志没动，风扇倒是很响。'
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
