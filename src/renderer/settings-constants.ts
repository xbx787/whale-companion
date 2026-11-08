import type { ConversationSettings } from '../shared/contracts'
import type { LibraryItem } from '../shared/libraries'
import { publicErrorText } from '../shared/error-copy'

export function errorMessage(cause: unknown): string {
  return publicErrorText(cause instanceof Error ? cause.message : String(cause))
}

/** The model form's local draft; a catalog pick fills the fields, a custom
 *  pick leaves them to the user. */
export interface ModelFormState {
  id: string | null
  providerId: string
  modelId: string
  name: string
  baseUrl: string
  apiKey: string
  smallModel: string
  extraEnv: string
  removeExtraEnv: boolean
  advanced: boolean
  /** 端点返回的模型 id；搜索框过滤它，点一下就填进模型 ID。 */
  discovered: string[]
  modelSearch: string
}

const BASE_SETTINGS_TABS = [
  { id: 'conversation', label: '常规' },
  { id: 'roast', label: '吐槽' },
  { id: 'models', label: '模型' },
  { id: 'persona', label: '形象' },
  { id: 'voice', label: '语音' },
  { id: 'appearance', label: '界面' },
  { id: 'libraries', label: '插件库' },
  { id: 'phone', label: 'DSH Go 连接' },
  { id: 'about', label: '关于' }
] as const

export type SettingsTab = typeof BASE_SETTINGS_TABS[number]['id']

export const SETTINGS_TABS: ReadonlyArray<{ id: SettingsTab; label: string }> = [...BASE_SETTINGS_TABS]

/** 设置页的两级导航：左栏是带图标的大标题，顶部是当前大标题下的小标题。
 *  两组图标分开定义，同一个图标不会同时出现在左右两处。 */
export type SettingsGroupId = 'chat' | 'model' | 'persona' | 'appearance' | 'system'

export interface SettingsGroup {
  id: SettingsGroupId
  label: string
  icon: string
  items: ReadonlyArray<{ id: SettingsTab; label: string; icon: string }>
}

export const SETTINGS_GROUPS: ReadonlyArray<SettingsGroup> = [
  {
    id: 'chat', label: '对话', icon: 'bubble',
    items: [
      { id: 'conversation', label: '常规', icon: 'sliders' },
      { id: 'roast', label: '吐槽', icon: 'quote' }
    ]
  },
  {
    id: 'model', label: '模型', icon: 'chip',
    items: [{ id: 'models', label: '模型', icon: 'cube' }]
  },
  {
    id: 'persona', label: '人物', icon: 'person',
    items: [
      { id: 'persona', label: '形象', icon: 'frame' },
      { id: 'voice', label: '语音', icon: 'mic' }
    ]
  },
  {
    id: 'appearance', label: '外观', icon: 'palette',
    items: [{ id: 'appearance', label: '界面', icon: 'layout' }]
  },
  {
    id: 'system', label: '系统', icon: 'gear',
    items: [
      { id: 'libraries', label: '插件库', icon: 'puzzle' },
      { id: 'phone', label: 'DSH Go 连接', icon: 'phone' },
      { id: 'about', label: '关于', icon: 'info' }
    ]
  }
]

export function groupOfTab(tab: SettingsTab): SettingsGroup {
  return SETTINGS_GROUPS.find((group) => group.items.some((item) => item.id === tab)) ?? SETTINGS_GROUPS[0]
}

/** 左栏「浏览市场」用 ?tab=libraries 打开本页；只接受已知页签。SSR 下没有 window。 */
export function initialSettingsTab(): SettingsTab {
  if (typeof window === 'undefined') return 'conversation'
  const requested = new URLSearchParams(window.location.search).get('tab')
  return SETTINGS_TABS.some((entry) => entry.id === requested) ? requested as SettingsTab : 'conversation'
}

/** 界面尺寸档：小是原来的样子，中、大各上调一档。 */
export const UI_SIZE_OPTIONS: ReadonlyArray<{ id: ConversationSettings['uiSize']; label: string }> = [
  { id: 'small', label: '小' },
  { id: 'medium', label: '中' },
  { id: 'large', label: '大' }
]

/** 人物大小档：小 = 现在，中 = 之前的尺寸，大 = 再上一档。 */
export const AVATAR_SIZE_OPTIONS: ReadonlyArray<{ id: ConversationSettings['avatarSize']; label: string }> = [
  { id: 'small', label: '小' },
  { id: 'medium', label: '中' },
  { id: 'large', label: '大' }
]

export function dateLabel(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

/** 市场条目的外链：优先 GitHub 仓库，其次作者主页。 */
export function marketLink(item: LibraryItem): { url: string; label: string } | null {
  if (item.repo) return { url: `https://github.com/${item.repo}`, label: 'GitHub' }
  if (item.homepage && /^https?:\/\//u.test(item.homepage)) return { url: item.homepage, label: '主页' }
  return null
}
