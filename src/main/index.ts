import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, shell, Tray } from 'electron'
import { appendFileSync, existsSync, mkdirSync, promises as fsp, readdirSync, writeFileSync } from 'node:fs'
import { execFile, spawn } from 'node:child_process'
import { homedir } from 'node:os'
import path from 'node:path'
import { AgentRuntime } from './agent-runtime'
import { SideChatController, activeSideChatParentId } from './side-chat'
import { isAskAnswers } from './ask-questions'
import { ConversationController, type LibraryLaunchResolver } from './conversation-controller'
import { MemoryService, type MemoryProvider } from './memory-service'
import { ConversationStore, isModelProfile, MAX_BATCH_CONVERSATIONS } from './conversation-store'
import { electronSecretCodec, publicSettings, publicSnapshot, SecretProtectionUnavailableError } from './secret-storage'
import { DEEPSEEK_ANTHROPIC_BASE_URL, DEEPSEEK_DEFAULT_MODEL } from './deepseek-endpoint'
import { APP_SLASH_COMMANDS, parseAppSlashCommand } from './app-commands'
import { loadWindowsMcpConfig } from './mcp-config'
import { setPersonaDirectory } from './persona'
import { seedMemoryDocument } from './memory-document'
import { BUBBLE_BOTTOM, computeStageBounds, STAGE_HEIGHT, STAGE_WIDTH, TRIANGLE_ROOM } from './stage-bounds'
import { runSelfTest } from './self-test'
import { startInputActivity, stopInputActivity } from './input-activity'
import { EvolveStore } from './evolve-store'
import type { EvolveBridge } from './evolve-tools'
import { DshRuntime } from './dsh-runtime'
import { DshAgentClient } from './dsh-agent'
import { normalizeDshModel } from './dsh-model'
import { DshAcpRuntime, toAcpMcpServer, type DshAcpMcpServer } from './dsh-acp-runtime'
import { DshAcpAgentClient } from './dsh-acp-agent'
import { PetMcpBridge } from './pet-mcp-server'
import { WinMcpClient } from './win-mcp-client'
import { registerSettingsIpc } from './ipc-settings'
import { registerLibrariesIpc } from './ipc-libraries'
import { registerOnboardingIpc } from './ipc-onboarding'
import { registerPermissionsIpc } from './ipc-permissions'
import { registerModelsIpc } from './ipc-models'
import { registerBalanceIpc } from './ipc-balance'
import { registerConversationSettingsIpc } from './ipc-conversation-settings'
import { registerWindowDragIpc } from './ipc-window-drag'
import { registerPanelIpc } from './ipc-panel'
import { registerSideIpc } from './ipc-side'
import { registerConversationControlIpc } from './ipc-conversation-control'
import { registerConversationsIpc } from './ipc-conversations'
import { registerShellIpc } from './ipc-shell'
import { registerMiscIpc } from './ipc-misc'
import { registerWindowStateIpc } from './ipc-window-state'
import {
  AVATAR_BOTTOM_SLACK, AVATAR_RIGHT_SLACK, AVATAR_VISIBLE_BOX, AVATAR_WINDOW_WIDTH, AVATAR_WINDOW_HEIGHT,
  BALANCE_CARD_WIDTH, BALANCE_POINTER, BALANCE_INSET_Y, BALANCE_WINDOW_HEIGHT, BALANCE_LIFT, BALANCE_GAP
} from './window-metrics'
import { WpsMcpService } from './wps-mcp-service'
import { deepSeekBaseUrl, deepSeekModel, deepSeekProfile, ONBOARDING_PAGES, readOnboardingMarker, shouldOfferOnboarding, writeOnboardingMarker, type OnboardingPage } from './onboarding'
import { normalizeApiKey } from '../shared/onboarding'
import { DeepSeekClient } from './deepseek'
import { fetchDeepSeekBalance } from './deepseek-balance'
import { transcribeAudio } from './asr-server'
import { voiceLog, voiceLogError } from './voice-log'
import { NoteStore } from './note-store'
import { createSnapshotScheduler } from './snapshot-scheduler'
import { getDeepSeekBalanceKey, getEnabledDeepSeekKey } from './model-config'
import { LibraryStore } from './library-store'
import { searchMarket } from './marketplace'
import { VoiceService } from './voice-service'
import { registerVoiceIpc } from './voice-ipc'
import { InboxWatcher } from './inbox-watcher'
import { isLibraryItem, isLibraryKind } from '../shared/libraries'
import { scanPlugins, toLibraryItems } from './plugin-market'
import { generateConversationTitle } from './title-generation'
import { attachmentPreviewPath, prepareDroppedFile, readImagePreview, searchWorkspaceFiles, stagePastedAttachment, validAttachmentList, verifyDroppedFilePath } from './local-context'
import { findSourceProjectRoot, isUsableWorkspace, isWritableWorkspace, readSavedWorkspace, resolveAgentWorkspace, writeSavedWorkspace } from './workspace-root'
import { isEffortLevel } from '../shared/effort'
import type { AgentKernelKind, AvatarSize, BubbleLayout, AppCommandOption, ConversationSettings, PanelDirection, PanelPlacement, UiSize, UserAttachment } from '../shared/contracts'
import { normalizeAgentKernelKind, normalizeModelMode, isApprovalMode, isAutoCompactPercent, isAvatarRenderer, PANEL_MIN_HEIGHT, PANEL_MIN_WIDTH } from '../shared/contracts'
import { isPersonaId } from '../shared/personas'
import { approvalAnchor, approvalCardHeight, approvalCardHtml, approvalCardWidth, approvalPointerLeft, placeApprovalCard, type ApprovalRect } from './approval-card'
import { probeProviderHealth } from './provider-health'
import { discoverProviderModels } from './model-discovery'
import { probeLibrary } from './library-health'

const projectRoot = app.isPackaged ? path.dirname(process.execPath) : path.resolve(__dirname, '../..')
const dataProjectRoot = findSourceProjectRoot(projectRoot) ?? projectRoot
// 隔离冒烟测试/便携数据目录：显式指定时不再使用项目下的 data/。
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')
const dataRootOverride = process.env.DESKTOP_PET_DATA?.trim()
const dataRoot = dataRootOverride && path.isAbsolute(dataRootOverride)
  ? dataRootOverride
  : path.join(dataProjectRoot, 'data')
const userHome = homedir()
const evolveStore = new EvolveStore(dataRoot)
// The wizard's saved choice survives a cleared environment variable; an
// explicit DESKTOP_PET_WORKSPACE still wins so advanced setups keep control.
let agentWorkspace = resolveAgentWorkspace(projectRoot, app.isPackaged, process.env, userHome, readSavedWorkspace(dataRoot))
const userDataDirectory = path.join(dataRoot, 'electron')
mkdirSync(userDataDirectory, { recursive: true })
mkdirSync(path.join(dataRoot, 'claude'), { recursive: true })
// A fresh install ships with an editable personal-settings file for the
// engine; existing files are the user's and never touched (see claude-memory).
// 长期记忆文档：写在这里的约定每轮都跟着消息进模型，新开的对话也一样。
seedMemoryDocument(dataRoot)
setPersonaDirectory(path.join(dataRoot, 'persona'))
app.setPath('userData', userDataDirectory)
if (process.platform === 'win32') app.setAppUserModelId('local.desktop.resident.agent')

let avatarWindow: BrowserWindow | undefined
/** 对话面板独立成窗：透明面积只剩面板本身，头像窗可以缩到角色大小。 */
let panelWindow: BrowserWindow | undefined
let balanceWindow: BrowserWindow | undefined
let settingsWindow: BrowserWindow | undefined
let onboardingWindow: BrowserWindow | undefined
let balanceWindowReady = false
let tray: Tray | undefined
let contextMenu: Menu | undefined
let panelOpen = false
let balanceOpen = false
let bubbleLayout: BubbleLayout = 'empty'
let compactBubbleHeight: number | undefined
let bubbleExpanded = false
/** 用户拖出来的展开面板尺寸；空表示用出厂的全高面板。 */
let bubblePanelSize: { width: number; height: number } | undefined
/** 界面字号档；窗口加载时灌一次，之后设置窗口一改就广播。 */
let currentUiSize: UiSize = 'small'
/** 人物大小档：决定人物脚底到窗口底的透明余量，拖动时用来算底部允许量。 */
let currentAvatarSize: AvatarSize = 'small'
/** 渲染器上报的可见人物矩形，按右/下偏移保存——窗口缩放时命中形状跟着
 *  右下角走，不会在拖动过程中错位。 */
let avatarBox: { right: number; bottom: number; width: number; height: number } | undefined
let dragOrigin: { cursor: Electron.Point; bounds: Electron.Rectangle } | undefined
let avatarDragging = false
let shapeShrinkTimer: NodeJS.Timeout | undefined
let rendererAvatarState: import('../shared/contracts').AvatarState | undefined

// Keep the avatar's window origin and width stable while its cards open/close.
// The unused area stays transparent and outside the shaped hit regions.
const stageSize = { width: STAGE_WIDTH, height: STAGE_HEIGHT }
/** 逻辑舞台：面板按它计算位置，头像窗口贴着它的右下角。 */
let stageBounds: Electron.Rectangle | undefined
/** 面板相对人物的位置：用户选的，默认上方。不再按屏幕上下半自动翻。 */
let panelPlacement: PanelPlacement = 'top'
/** 上次发给面板窗口的位置；窗口重建时清空，保证会重发。 */
let sentPanelPlacement: PanelPlacement | undefined
/** 尾巴当前指向的人物中心（相对面板窗口左缘），用来避免重复发送。 */
let sentTailX = -1
/** 由 panelPlacement 派生：top/left/right 走“向上”布局，bottom 走“向下”。 */
let panelDirection: PanelDirection = 'up'

function avatarRegion(size: { width: number; height: number }): Electron.Rectangle {
  // 图片裁掉透明边后，命中区跟着渲染器量出的可见矩形走；启动最初的几帧
  // 还没有上报，先用旧的右下角位置兜底。偏移量按右/下存储，窗口一变大
  // 形状就跟着右下角走，拖动缩放时不会来回跳。
  if (avatarBox) return {
    x: size.width - avatarBox.right - avatarBox.width,
    y: size.height - avatarBox.bottom - avatarBox.height,
    width: avatarBox.width,
    height: avatarBox.height
  }
  return { x: size.width - 168, y: size.height - 186, width: 160, height: 180 }
}

/** 状态点拱在人物可见矩形右上角之外；形状要把右上角一起圈进来，
 *  否则拖动后重算形状会把弧线裁成一条竖线。 */
function avatarShape(size: { width: number; height: number }): Electron.Rectangle[] {
  return [
    avatarRegion(size),
    { x: Math.max(0, size.width - 104), y: 0, width: Math.min(104, size.width), height: 104 }
  ]
}

/** 人物可见区的中心点（屏幕坐标）；渲染器还没上报时退回头像窗口中心。 */
function avatarFocusPoint(bounds: Electron.Rectangle): Electron.Point {
  const centerY = avatarBox
    ? bounds.y + (bounds.height - avatarBox.bottom - avatarBox.height) + avatarBox.height / 2
    : bounds.y + bounds.height / 2
  return { x: bounds.x + bounds.width - 88, y: Math.round(centerY) }
}

function bubbleRegion(layout: BubbleLayout, size: { width: number; height: number }, compactHeight = compactBubbleHeight, direction = panelDirection): Electron.Rectangle {
  // 向上时面板底边停在人物上方，小三角在窗口底部；向下时窗口顶边贴着人物
  // 底边，小三角在顶部。TRIANGLE_ROOM 始终含在面板窗口里。
  if (bubbleExpanded) {
    return direction === 'down'
      ? { x: 10, y: 0, width: size.width - 20, height: size.height }
      : { x: 10, y: 0, width: size.width - 20, height: size.height - BUBBLE_BOTTOM + TRIANGLE_ROOM }
  }
  if (direction === 'down') {
    switch (layout) {
      case 'empty': return { x: size.width - 120, y: 0, width: 64, height: 56 + TRIANGLE_ROOM }
      case 'composer':
      case 'composer_attachments': {
        const height = compactHeight ?? (layout === 'composer' ? 206 : 232)
        return { x: size.width - 342, y: 0, width: 332, height: height + TRIANGLE_ROOM }
      }
      case 'composer_models': return { x: size.width - 342, y: 0, width: 332, height: 238 + TRIANGLE_ROOM }
      case 'full': return { x: size.width - 366, y: 0, width: 356, height: 358 + TRIANGLE_ROOM }
    }
  }
  switch (layout) {
    case 'empty': return { x: size.width - 120, y: size.height - BUBBLE_BOTTOM - 56, width: 64, height: 56 + TRIANGLE_ROOM }
    case 'composer':
    case 'composer_attachments': {
      const height = compactHeight ?? (layout === 'composer' ? 206 : 232)
      return { x: size.width - 342, y: size.height - BUBBLE_BOTTOM - height, width: 332, height: height + TRIANGLE_ROOM }
    }
    case 'composer_models': return { x: size.width - 342, y: size.height - BUBBLE_BOTTOM - 238, width: 332, height: 238 + TRIANGLE_ROOM }
    case 'full': return { x: size.width - 366, y: size.height - BUBBLE_BOTTOM - 358, width: 356, height: 358 + TRIANGLE_ROOM }
  }
}

/** 从命中矩形里减掉一块，返回剩下的矩形（最多四块）。 */
function subtractRect(rect: Electron.Rectangle, cut: Electron.Rectangle): Electron.Rectangle[] {
  const left = Math.max(rect.x, cut.x)
  const top = Math.max(rect.y, cut.y)
  const right = Math.min(rect.x + rect.width, cut.x + cut.width)
  const bottom = Math.min(rect.y + rect.height, cut.y + cut.height)
  if (right <= left || bottom <= top) return [rect]
  const parts: Electron.Rectangle[] = []
  if (top > rect.y) parts.push({ x: rect.x, y: rect.y, width: rect.width, height: top - rect.y })
  if (bottom < rect.y + rect.height) parts.push({ x: rect.x, y: bottom, width: rect.width, height: rect.y + rect.height - bottom })
  if (left > rect.x) parts.push({ x: rect.x, y: top, width: left - rect.x, height: bottom - top })
  if (right < rect.x + rect.width) parts.push({ x: right, y: top, width: rect.x + rect.width - right, height: bottom - top })
  return parts
}

function applyPointerShape(): void {
  const win = avatarWindow
  if (!win || win.isDestroyed() || process.platform !== 'win32') return
  // 头像窗口只有 200×220，命中形状取窗口局部坐标；面板窗口本身就是一个
  // 贴合面板的矩形，不需要再裁剪。
  const bounds = win.getBounds()
  let shapes = avatarShape(bounds)
  // 面板打开时，从命中形状里裁掉与面板重叠的部分。头像窗口永远置顶，形状
  // 里那片透明区会把面板底部按钮的点击先吃掉；裁剪后角色不再压住面板，
  // 层级不变，按钮的整个盒都能点。
  const panel = panelWindow && !panelWindow.isDestroyed() && panelWindow.isVisible()
    ? panelWindow.getBounds()
    : null
  if (panel) {
    const cut = { x: panel.x - bounds.x, y: panel.y - bounds.y, width: panel.width, height: panel.height }
    shapes = shapes.flatMap((rect) => subtractRect(rect, cut))
  }
  win.setShape(shapes.length ? shapes : [{ x: 0, y: 0, width: 1, height: 1 }])
}

/** 左上角缩放手柄的独立置顶小窗：面板不置顶，画在面板里会被别的窗口盖住。
 *  这里只负责显示角标，鼠标事件穿透给面板里的 10×10 热区。 */

/** 面板窗口只包住面板矩形（逻辑舞台里的 bubbleRegion）。左/右贴边时直接
 *  相对头像窗口定位，不再走“舞台”的上下布局。 */
/** 窗口不透明度：0 视为关闭透明（完全不透明），省掉透明合成的持续开销。 */
let currentWindowOpacity = 1

function opacityFor(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1
  const percent = Math.min(100, Math.max(0, Math.round(value)))
  return percent <= 0 ? 1 : percent / 100
}
function syncPanelBounds(): void {
  const stage = stageBounds
  const panel = panelWindow
  if (!stage || !panel || panel.isDestroyed()) return
  const region = bubbleRegion(bubbleLayout, stage, compactBubbleHeight, panelDirection)
  let target = { x: stage.x + region.x, y: stage.y + region.y, width: region.width, height: region.height }
  if ((panelPlacement === 'left' || panelPlacement === 'right') && avatarWindow && !avatarWindow.isDestroyed()) {
    const avatar = avatarWindow.getBounds()
    const gap = 10
    const x = panelPlacement === 'left' ? avatar.x - region.width - gap : avatar.x + avatar.width + gap
    const y = avatar.y + avatar.height - region.height
    const work = screen.getDisplayNearestPoint({ x: avatar.x, y: avatar.y }).workArea
    target = {
      x: Math.min(work.x + work.width - region.width - 4, Math.max(work.x + 4, x)),
      y: Math.min(work.y + work.height - region.height - 4, Math.max(work.y + 4, y)),
      width: region.width,
      height: region.height
    }
  }
  broadcastPanelPlacement()
  const avatar = avatarWindow
  if (avatar && !avatar.isDestroyed()) {
    broadcastTailX(Math.round(avatarFocusPoint(avatar.getBounds()).x - target.x))
  }
  const current = panel.getBounds()
  if (current.x === target.x && current.y === target.y && current.width === target.width && current.height === target.height) {
    return
  }
  panel.setBounds(target, false)
}

/** 告诉面板窗口它贴在人物的哪一侧，小三角据此换方向。 */
function broadcastPanelPlacement(): void {
  const panel = panelWindow
  if (!panel || panel.isDestroyed()) return
  if (sentPanelPlacement === panelPlacement) return
  sentPanelPlacement = panelPlacement
  panel.webContents.send('pet:panel-placement', panelPlacement)
}

/** 面板窗口底部的尾巴要指向人物中心：人物可以拖到任意位置，尾巴不能钉死在右边。 */
function broadcastTailX(x: number): void {
  const panel = panelWindow
  if (!panel || panel.isDestroyed()) return
  if (Math.abs(x - sentTailX) < 1) return
  sentTailX = x
  panel.webContents.send('pet:panel-tail-x', x)
}

/** 余额卡与人物可见区域对齐：顶部与人物顶部齐平，右侧三角尖离角色左缘
 *  4px，高度统一为中等卡片再向下延伸 10px。优先用渲染器上报的真实命中框
 *  （高 12px 是按压/呼吸缓冲，减掉才是可见高度）。 */
function balanceBoundsFor(bounds: Electron.Rectangle): Electron.Rectangle {
  const width = BALANCE_CARD_WIDTH + BALANCE_POINTER
  let roleLeft: number
  let roleTop: number
  if (avatarBox) {
    roleLeft = bounds.x + (bounds.width - avatarBox.right - avatarBox.width)
    roleTop = bounds.y + (bounds.height - avatarBox.bottom - avatarBox.height) + 6
  } else {
    const visible = AVATAR_VISIBLE_BOX[currentAvatarSize] ?? AVATAR_VISIBLE_BOX.small
    roleLeft = bounds.x + bounds.width - 88 - visible.width / 2
    roleTop = bounds.y + visible.top
  }
  return {
    x: Math.round(roleLeft - BALANCE_GAP - width),
    y: Math.round(roleTop + BALANCE_INSET_Y / 2 - BALANCE_LIFT),
    width,
    height: BALANCE_WINDOW_HEIGHT
  }
}

function syncBalancePosition(): void {
  const avatar = avatarWindow
  const balance = balanceWindow
  if (!avatar || avatar.isDestroyed() || !balance || balance.isDestroyed()) return
  const target = balanceBoundsFor(avatar.getBounds())
  const current = balance.getBounds()
  if (current.x === target.x && current.y === target.y && current.width === target.width && current.height === target.height) return
  balance.setBounds(target, false)
}

function syncStageBounds(): void {
  const win = avatarWindow
  if (!win || win.isDestroyed()) return
  const avatar = win.getBounds()
  const bottom = avatar.y + avatar.height
  const focus = avatarFocusPoint(avatar)
  const work = screen.getDisplayNearestPoint(focus).workArea
  const direction: PanelDirection = panelPlacement === 'bottom' ? 'down' : 'up'
  if (direction !== panelDirection) {
    panelDirection = direction
    panelWindow?.webContents.send('pet:panel-direction', direction)
  }
  const next = computeStageBounds(
    direction === 'down'
      // 向下展开时面板顶边要贴角色可见底边，而不是窗口底边；角色图下方的
      // 透明边会让面板看起来离人物很远。
      ? { ...avatar, height: Math.max(0, avatar.height - (avatarBox?.bottom ?? 0)) }
      : avatar,
    work, bubbleExpanded, bubbleExpanded ? bubblePanelSize : undefined, direction)
  // 头像窗口绝对不动：向上时舞台底边、向下时舞台顶边贴着头像底边，尺寸取
  // 布局计算值。展开/收起只改变面板窗口，人物在屏幕上的位置保持不变。
  stageBounds = {
    x: avatar.x + avatar.width - next.width,
    y: direction === 'down' ? next.y : bottom - next.height,
    width: next.width,
    height: next.height
  }
  if (shapeShrinkTimer) clearTimeout(shapeShrinkTimer)
  shapeShrinkTimer = undefined
  syncPanelBounds()
  syncBalancePosition()
  applyPointerShape()
}

function setBubbleExpanded(expanded: boolean): void {
  if (bubbleExpanded === expanded) return
  bubbleExpanded = expanded
  syncStageBounds()
}

/** 拖拽会把尺寸改得很密，停手 600ms 后统一落盘一次。 */
let panelSizeSaveTimer: NodeJS.Timeout | undefined
function schedulePanelSizeSave(): void {
  if (panelSizeSaveTimer) clearTimeout(panelSizeSaveTimer)
  panelSizeSaveTimer = setTimeout(() => {
    panelSizeSaveTimer = undefined
    if (!bubblePanelSize) return
    void activeController().updateSettings({ panelSize: { ...bubblePanelSize } })
      .catch((error: unknown) => console.warn('Save panel size failed:', error instanceof Error ? error.message : String(error)))
  }, 600)
}

const apiKey = getEnabledDeepSeekKey(process.env)
const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim()
/** 探测模型端点：直接请求 Anthropic 兼容的 /messages。原先的实现随 Claude 模块删除。 */
async function probeAnthropicEndpoint(profile: { baseUrl: string; apiKey: string; model: string }): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(`${profile.baseUrl.replace(/\/+$/, '')}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': profile.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: profile.model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      signal: AbortSignal.timeout(10_000)
    })
    return { ok: response.ok, message: response.ok ? '连接正常' : `接口返回 ${response.status}` }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : '连接失败' }
  }
}
const libraryStore = new LibraryStore(dataRoot, { homeDir: userHome, workspace: agentWorkspace, dshSkillsDir: path.join(dataRoot, 'dsh-home', 'skills') })
const voiceService = new VoiceService({
  dataRoot,
  codec: electronSecretCodec(),
  onJobProgress: (progress) => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('pet:voice:job-progress', progress)
    }
  }
})

function libraryServerName(name: string, id: string): string {
  // Prefer the user-visible name so the same server keeps the same tool prefix
  // in Claude and DSH (mcp__windows-mcp__Move, not mcp__lib_...__Move).
  const slug = (name || id).toLowerCase().replace(/[^a-z0-9_-]+/gu, '_').replace(/^_+|_+$/gu, '').slice(0, 40)
  if (slug) return slug
  let hash = 0x811c9dc5
  for (let index = 0; index < id.length; index += 1) hash = Math.imul(hash ^ id.charCodeAt(index), 0x01000193)
  return `lib_${(hash >>> 0).toString(36)}`
}

/** Turns `kind:id` keys into the engine's MCP map and plugin directories.
 *  Only installed entries survive, so a removed library simply disappears. */
const resolveLibraries: LibraryLaunchResolver = async (keys) => {
  const { mcp, plugins } = await libraryStore.launches(keys)
  const resolved: string[] = []
  const servers: Record<string, unknown> = {}
  const usedNames = new Set<string>()
  for (const item of mcp) {
    const launch = item.launch
    if (!launch) continue
    if (!launch.url && !launch.command) continue
    resolved.push(`mcp:${item.id}`)
    let serverName = libraryServerName(item.name, item.id)
    if (usedNames.has(serverName)) serverName = `${serverName}_${(item.id.length + usedNames.size).toString(36)}`
    usedNames.add(serverName)
    servers[serverName] = launch.url
      ? { type: 'http', url: launch.url }
      : {
          type: 'stdio',
          command: launch.command,
          args: launch.args ?? [],
          // Claude inherits PATH and the environment; DSH's MCP bridge scrubs
          // names matching KEY/PASSWORD/SECRET/TOKEN, so pass the declared
          // values explicitly from the main process environment.
          env: Object.fromEntries((launch.env ?? [])
            .map((name) => [name, process.env[name] ?? ''] as const)
            .filter(([, value]) => Boolean(value)))
        }
  }
  const pluginPaths: string[] = []
  for (const item of plugins) {
    if (!item.path) continue
    resolved.push(`${item.kind}:${item.id}`)
    pluginPaths.push(item.path)
  }
  return { resolved, mcp: servers, plugins: pluginPaths }
}
let controller: ConversationController | undefined
/** Set when a restart is queued; consumed after the running turns are saved. */
let relaunchOnQuit = false
/** The exe to relaunch after the final save; empty means the current process. */
let relaunchExecPath: string | undefined
/** Polls until every conversation is idle, then relaunches. */
let restartPoll: NodeJS.Timeout | undefined
const memory = new MemoryService(dataRoot, { onError: (error) => console.warn(error.message) })

/** 重启/换版的链路留痕：入口、目标 exe、看门狗各自写一行。 */
function logRestart(message: string): void {
  try {
    appendFileSync(path.join(dataRoot, 'restart.log'), `${new Date().toISOString()} ${message}\n`)
  } catch {
    // 日志写不进去不影响重启本身。
  }
}

/** 独立看门狗：旧进程退出后，如果目标 exe 没在跑，就由它把新版本拉起来。 */
function spawnRestartWatchdog(targetExe: string): void {
  try {
    const script = path.join(dataRoot, 'restart-watchdog.ps1')
    const log = path.join(dataRoot, 'restart-watchdog.log')
    writeFileSync(script, [
      'param([string]$TargetExe,[int]$OldPid,[string]$Log)',
      '$ErrorActionPreference = "SilentlyContinue"',
      // 从 Electron 宿主继承来的这个变量会让 exe 按 Node 模式跑，参数直接判非法、秒退。
      'Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue',
      'function L($m){ "$(Get-Date -Format o) $m" | Add-Content -LiteralPath $Log }',
      'L "watchdog old=$OldPid target=$TargetExe"',
      'for($i=0;$i -lt 90;$i++){ if(-not (Get-Process -Id $OldPid -ErrorAction SilentlyContinue)){ break }; Start-Sleep -Milliseconds 500 }',
      'Start-Sleep -Milliseconds 800',
      'if(-not (Test-Path -LiteralPath $TargetExe)){ L "missing $TargetExe"; exit 1 }',
      '$running = Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $TargetExe }',
      'if($running){ L "already running"; exit 0 }',
      'for($attempt=1;$attempt -le 3;$attempt++){',
      '  Start-Process -FilePath $TargetExe -WorkingDirectory (Split-Path -LiteralPath $TargetExe) -ErrorAction Stop',
      '  Start-Sleep -Milliseconds 600',
      '  $running = Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $TargetExe }',
      '  if($running){ L "started attempt=$attempt"; exit 0 }',
      '  L "not running after attempt=$attempt"; Start-Sleep -Seconds 2',
      '}',
      'L "gave up"'
    ].join('\r\n'), 'utf8')
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script,
      '-TargetExe', targetExe, '-OldPid', String(process.pid), '-Log', log],
    { detached: true, stdio: 'ignore', windowsHide: true }).unref()
  } catch (error) {
    console.error('Restart watchdog failed:', error)
  }
}

type RestartOutcome = 'restarted' | 'waiting' | 'cancelled'

/** 重启请示一次只开一张卡：重复请求复用同一次答复，避免叠两张勾叉。 */
let restartApproval: Promise<boolean | null> | undefined

function askRestartApproval(): Promise<boolean | null> {
  restartApproval ??= requestApproval(
    '还有任务在跑，现在就重启吗？',
    '点勾：立刻退出重启，正在跑的任务会被打断；点叉：这次不重启，等你说下一步。'
  ).finally(() => { restartApproval = undefined })
  return restartApproval
}

/** 别的任务还在跑就要用户点头：勾=现在就走，叉=取消这次重启。
 *  只有请求者自己的回合在跑时不算“别人”，照旧等它跑完再重启。 */
async function decideRestart(excludeConversationId?: string): Promise<'now' | 'wait' | 'cancel'> {
  const otherBusy = (controller?.hasRunningWorkExcept(excludeConversationId) ?? false) || sideChat.isBusy()
  if (!otherBusy) return 'wait'
  return (await askRestartApproval()) === true ? 'now' : 'cancel'
}

/** 关闭前给人物一个告别表情：只等一小会儿，绝不拖住退出。 */
function playAvatarFarewell(): Promise<void> {
  const win = avatarWindow && !avatarWindow.isDestroyed() ? avatarWindow : null
  if (!win) return Promise.resolve()
  try {
    win.webContents.send('pet:avatar:farewell')
  } catch {
    return Promise.resolve()
  }
  return new Promise((resolve) => setTimeout(resolve, 700))
}

/** 退出并拉起指定 exe：快捷方式先切，看门狗兜底。 */
async function restartNow(executable: string): Promise<void> {
  await playAvatarFarewell()
  pointShortcutsAt(executable)
  spawnRestartWatchdog(executable)
  relaunchOnQuit = true
  relaunchExecPath = executable
  app.quit()
}

/** Restarts without cutting a running turn. 有别人的任务在跑时先弹勾叉：
 *  勾=立刻重启（打断它们），叉=取消并等用户下一条消息。 */
async function requestRestart(excludeConversationId?: string, beforeQuit?: () => void): Promise<RestartOutcome> {
  const decision = await decideRestart(excludeConversationId)
  if (decision === 'cancel') return 'cancelled'
  beforeQuit?.()
  if (decision === 'now' || (controller?.allConversationsIdle() ?? true)) {
    await restartNow(process.execPath)
    return 'restarted'
  }
  if (!restartPoll) {
    restartPoll = setInterval(() => {
      if (controller && !controller.allConversationsIdle()) return
      if (restartPoll) clearInterval(restartPoll)
      restartPoll = undefined
      void restartNow(process.execPath)
    }, 1000)
    restartPoll.unref?.()
  }
  return 'waiting'
}

async function backgroundProvider(): Promise<MemoryProvider | null> {
  const settings = (await activeController().getLibraryState()).settings
  const profile = settings.modelProfiles.find((item) => item.id === settings.activeModelProfileId)
  if (profile?.apiKey) return { baseUrl: profile.baseUrl, apiKey: profile.apiKey, model: profile.model, smallModel: profile.smallModel }
  const key = deepseekKey || apiKey
  return key ? { baseUrl: DEEPSEEK_ANTHROPIC_BASE_URL, apiKey: key, model: DEEPSEEK_DEFAULT_MODEL, smallModel: 'deepseek-flash' } : null
}

/** Every Nth publish re-sends the whole history, so a renderer that somehow
 *  missed a delta cannot stay desynced; between those only changed entries
 *  travel (see AgentRuntime.takeTimelineDelta). */
const FULL_TIMELINE_EVERY = 64
/** 全量快照最多带多少条历史；更早的走 timelinePage 按需拉。 */
const FULL_TIMELINE_WINDOW = 500
let publishesSinceFullTimeline = FULL_TIMELINE_EVERY
let lastPublishedSideParent: string | null | undefined

function snapshotWithSideStatuses() {
  const snapshot = publicSnapshot(activeController().getSnapshot())
  snapshot.conversationLibrary.conversations = sideChat.withSideStatuses(snapshot.conversationLibrary.conversations)
  return snapshot
}

function flushSnapshot(): void {
  if (!avatarWindow || avatarWindow.isDestroyed()) return
  if (!controller) return
  const snapshot = snapshotWithSideStatuses()
  if (rendererAvatarState) snapshot.avatarState = rendererAvatarState
  // The delta belongs to the displayed conversation's runtime; a cold
  // conversation (no runtime) is a full send by construction.
  const runtime = controller.displayedRuntime()
  const delta = runtime?.takeTimelineDelta()
  const full = !delta || delta.reset || publishesSinceFullTimeline <= 0
  // 总条数每帧都带：增量更新时渲染层也要知道窗口前面还有多少没加载。
  snapshot.timelineTotal = runtime ? runtime.timelineLength() : snapshot.timeline.length
  if (!full) {
    snapshot.timeline = delta!.entries
    snapshot.timelinePartial = true
  } else {
    // 全量只发尾部一段：大会话的整段历史不再每 64 次发布就重传一遍。
    // 渲染层滚到顶时按 timelineTotal 的差额走 timelinePage 往前补。
    const all = snapshot.timeline
    if (all.length > FULL_TIMELINE_WINDOW) {
      snapshot.timeline = all.slice(-FULL_TIMELINE_WINDOW)
    }
  }
  publishesSinceFullTimeline = full ? FULL_TIMELINE_EVERY : publishesSinceFullTimeline - 1
  avatarWindow.webContents.send('pet:snapshot', snapshot)
  panelWindow?.webContents.send('pet:snapshot', snapshot)
  // A tab switch changes the child that belongs on screen. Send its full
  // snapshot after the main one so a renderer with stale tab state can still
  // recover even if side and main events were otherwise reordered.
  const parentId = activeSideChatParentId(controller.displayedConversationId(), snapshot.conversationLibrary)
  if (lastPublishedSideParent !== parentId) {
    lastPublishedSideParent = parentId
    const sideSnapshot = sideChat.takePublishSnapshot()
    avatarWindow.webContents.send('pet:side-snapshot', sideSnapshot)
    panelWindow?.webContents.send('pet:side-snapshot', sideSnapshot)
  }
}

// A streaming turn changes state once per model delta. Forwarding every delta makes the
// renderer re-render the whole panel (including its Markdown) per token and the window
// stops reacting to clicks until the turn ends. Publish at a fixed cadence instead; the
// scheduler always keeps the trailing send, so the final state still reaches the renderer.
// 80 ms: the stream still reads as typing, while every published frame costs a panel
// redraw plus a full-window composite twice over (GPU process + dwm) — the panel's
// measured ~16% at 20 Hz scales with the commit rate.
const snapshotScheduler = createSnapshotScheduler(flushSnapshot, 80)
let reconcilingSideParents = false
function publishSnapshot(): void {
  if (controller && !reconcilingSideParents) {
    reconcilingSideParents = true
    try { sideChat.discardMissingParents(controller.liveConversationIds()) }
    finally { reconcilingSideParents = false }
  }
  snapshotScheduler.publish()
}

/** Tools for the selfEvolve tier. Scheduling and status are cheap; restart is
 *  deferred until the running turn is idle so the current answer is saved. */
function evolveHooksFor(conversationId: string): Omit<EvolveBridge, 'enabled'> {
  return {
    schedule: async (input) => {
      const task = evolveStore.schedule(conversationId, input)
      return {
        taskId: task.id,
        goal: task.goalCondition ?? null,
        pending: task.steps.filter((step) => step.status === 'pending')
          .map((step) => ({ id: step.id, kind: step.kind, text: step.text.slice(0, 300) })),
        restartCount: task.restartCount
      }
    },
    status: async () => {
      const task = evolveStore.load()
      if (!task || task.conversationId !== conversationId) return { active: false }
      return {
        active: task.status === 'active',
        status: task.status,
        goal: task.goalCondition ?? null,
        note: task.note ?? null,
        restartCount: task.restartCount,
        steps: task.steps.map((step) => ({
          id: step.id, kind: step.kind, status: step.status,
          text: step.text.slice(0, 300), result: step.result?.slice(0, 1_000)
        }))
      }
    },
    restart: async (version) => {
      let task = evolveStore.load()
      if (!task || task.conversationId !== conversationId) {
        // 目标模式下没有安排跨重启步骤也能重启：把当前目标写进任务，
        // 重启后 resumeEvolveTask 会重新装上目标并继续。
        const currentGoal = controller?.getSnapshot().goal?.condition
        if (!currentGoal) throw new Error('还没有安排跨重启任务；先调用 schedule。')
        task = evolveStore.schedule(conversationId, { goal: currentGoal })
      }
      if (task.status !== 'active') throw new Error('当前自我进化任务不在进行中。')
      if (!task.goalCondition) {
        const currentGoal = controller?.getSnapshot().goal?.condition
        if (currentGoal) task = evolveStore.schedule(conversationId, { goal: currentGoal })
      }
      if (!evolveStore.hasPending() && !task.goalCondition) throw new Error('没有待继续的目标或步骤，重启会直接结束任务。')
      // 次数只在用户同意之后才记：点叉取消的重启不该消耗额度。
      const noteRestart = (): void => {
        if (!evolveStore.noteRestart()) throw new Error('重启次数达到上限，任务已停止。')
      }
      if (version) {
        const executable = path.join(dataProjectRoot, 'release', `whale-companion-v${version}`, 'win-unpacked', 'Whale Companion Preview.exe')
        if (!existsSync(executable)) throw new Error(`找不到版本 ${version} 的安装目录。`)
        const outcome = await restartWhenIdle(version, conversationId, noteRestart)
        if (outcome === 'cancelled') {
          return { scheduled: false, cancelled: true, note: '用户点了叉：这次不重启，正在跑的任务继续。停下手上的事，等用户下一条消息。' }
        }
        return { scheduled: true, waiting: outcome === 'waiting', version }
      }
      const outcome = await requestRestart(conversationId, noteRestart)
      if (outcome === 'cancelled') {
        return { scheduled: false, cancelled: true, note: '用户点了叉：这次不重启，正在跑的任务继续。停下手上的事，等用户下一条消息。' }
      }
      return { scheduled: true, waiting: outcome === 'waiting' }
    }
  }
}

// Gray-switch the kernel through DESKTOP_PET_KERNEL=dsh. DSH is a vendored
// pnpm runtime; npm's flat tree resolves the tool scheduler to the wrong copy,
// which turns every tool call into TOOL_OUTCOME_UNKNOWN.
const dshBin = (() => {
  const override = process.env.DESKTOP_PET_DSH_BIN?.trim()
  const candidates = [
    override,
    app.isPackaged ? path.join(process.resourcesPath, 'dsh', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js') : '',
    path.join(projectRoot, 'reference', 'dsh-poc-pnpm', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  ].filter((value): value is string => Boolean(value))
  return candidates.find((value) => existsSync(value)) ?? null
})()
// DSH is the only agent kernel. Old records may still say `claude_code`; the
// store normalizes them to `dsh`, and no Claude runtime is loaded or packaged.
const useDshKernel = (): boolean => Boolean(dshBin)

const mcpBridgeScript = (() => {
  const override = process.env.DESKTOP_PET_MCP_BRIDGE?.trim()
  const candidates = [
    override,
    app.isPackaged ? path.join(process.resourcesPath, 'pet-mcp-bridge.cjs') : '',
    path.join(projectRoot, 'scripts', 'pet-mcp-bridge.cjs')
  ].filter((value): value is string => Boolean(value))
  return candidates.find((value) => existsSync(value)) ?? null
})()

// The CLI alone decides whether the SDK path exists; the key may arrive later
// from a saved model profile instead of the launch environment.
// One runtime (and one engine connection) per conversation that actually
// runs; the controller creates them on demand through this factory.
const winMcpClient = new WinMcpClient()
// WPS 工具共享一个懒启动的 HTTP 实例；所有会话不再各拉一个 stdio 进程。
const wpsMcpService = new WpsMcpService(() => {
  const override = process.env.DESKTOP_PET_WPS_MCP?.trim()
  const candidates = [
    override,
    app.isPackaged ? path.join(process.resourcesPath, 'wps-mcp-server.cjs') : '',
    path.join(projectRoot, 'scripts', 'wps-mcp-server.cjs')
  ].filter((value): value is string => Boolean(value))
  return candidates.find((value) => existsSync(value)) ?? null
})
const createRuntime = (conversationId: string, onChange: () => void, persistSession = true, enableEvolve = true): AgentRuntime => {
  const key = deepseekKey ?? apiKey ?? ''
  const dshModel = useDshKernel() && dshBin
    ? (() => {
      const bridge = new PetMcpBridge(key)
      // 打包/重启这类请示走角色旁的小批准卡，绿勾批准、红叉拒绝。
      bridge.setApprovalBridge({ request: (title, detail) => requestApproval(title, detail) })
      // 宿主侧提问卡：和内核提问共用面板上的同一张卡片，用来批准计划或选择方案。
      bridge.setAskBridge({
        ask: async (questions) => {
          const runtime = activeController().displayedRuntime()
          if (!runtime) throw new Error('当前没有正在显示的对话，无法提问。')
          return await runtime.askHost(questions)
        }
      })
      // 内置 Windows 工具：宿主转发给 windows-mcp 的 Python 后端，模型侧不再走 MCP。
      bridge.setWindowsMcpClient(winMcpClient)
      // 计划模式：模型用 submit_plan 把计划交给面板批准，批准后自动退出计划模式。
      bridge.setPlanBridge({
        submit: async (plan) => {
          const runtime = activeController().displayedRuntime()
          if (!runtime) throw new Error('当前没有正在显示的对话，无法提交计划。')
          return await runtime.askHostPlan(plan)
        }
      })
      // 用 adapter 目录里的模型 id：deepseek-flash 声明了图片输入，deepseek-v4-flash 不在目录里，会被读图工具判定为不支持图片。
      const model = normalizeDshModel(process.env.DSH_MODEL)
      if (process.env.DESKTOP_PET_DSH_TRANSPORT === 'sdk-minimal') {
        return new DshAgentClient({
          bridge,
          runtime: new DshRuntime({
            bin: dshBin,
            home: path.join(dataRoot, 'dsh-home'),
            cwd: agentWorkspace,
            provider: 'deepseek-official',
            model,
            env: { DEEPSEEK_API_KEY: key },
            mcpBridge: mcpBridgeScript
              ? { script: mcpBridgeScript, endpoint: () => bridge.endpoint }
              : undefined
          }),
          cwd: agentWorkspace
        })
      }
      const dshHome = path.join(dataRoot, 'dsh-home')
      const dshLibraries: { mcp: Record<string, unknown>; plugins: string[] } = { mcp: {}, plugins: [] }
      return new DshAcpAgentClient({
        bridge,
        cwd: agentWorkspace,
        provider: 'deepseek-official',
        model,
        deepseekApiKey: key,
        dshHome,
        libraries: dshLibraries,
        runtime: new DshAcpRuntime({
          bin: dshBin,
          home: dshHome,
          cwd: agentWorkspace,
          systemPrompt: 'You are XiaoJing, a helpful desktop companion. Reply in the user language.',
          env: { DEEPSEEK_API_KEY: key },
          mcpServers: async () => {
            const servers: DshAcpMcpServer[] = []
            const endpoint = bridge.endpoint
            // 优先直连主进程的 HTTP MCP：会话不再各拉一个 stdio 桥进程。
            // PET_MCP_HTTP=0 可回退到旧 stdio 桥，便于出问题时快速降级。
            if (endpoint && process.env.PET_MCP_HTTP !== '0') {
              servers.push({
                name: 'pet',
                type: 'http',
                url: `${endpoint.url}/mcp/${endpoint.token}`,
                headers: []
              })
            } else if (mcpBridgeScript && endpoint) {
              servers.push({
                name: 'pet',
                command: process.execPath,
                args: [mcpBridgeScript],
                env: [
                  { name: 'ELECTRON_RUN_AS_NODE', value: '1' },
                  { name: 'PET_BRIDGE_URL', value: endpoint.url },
                  { name: 'PET_BRIDGE_TOKEN', value: endpoint.token },
                  // 联网搜索关闭时桥不声明搜索/抓取工具。
                  { name: 'PET_MCP_WEB', value: bridge.webSearchEnabled ? '1' : '0' }
                ]
              })
            }
            const sharedWps = await wpsMcpService.start().catch(() => null)
            if (sharedWps) {
              servers.push({ name: 'wps', type: 'http', url: sharedWps.url, headers: [] })
            } else {
              const wpsScript = [
                app.isPackaged ? path.join(process.resourcesPath, 'wps-mcp-server.cjs') : '',
                path.join(projectRoot, 'scripts', 'wps-mcp-server.cjs')
              ].find((value) => value && existsSync(value));
              if (wpsScript) {
                servers.push({
                  name: 'wps',
                  command: process.execPath,
                  args: [wpsScript],
                  env: [{ name: 'ELECTRON_RUN_AS_NODE', value: '1' }]
                });
              }
            }
            for (const [name, raw] of Object.entries(dshLibraries.mcp)) {
              // Windows 工具已内置；库里的同名 MCP 不再交给 DSH。
              if (/windows[-_]?mcp/iu.test(name)) continue
              const server = toAcpMcpServer(name, raw)
              if (server) servers.push(server)
            }
            return servers
          }
        })
      })
    })()
    : undefined
  return new AgentRuntime(
    new NoteStore(projectRoot),
    apiKey ? new DeepSeekClient(apiKey) : undefined,
    onChange,
    dshModel as never,
    agentWorkspace,
    enableEvolve ? evolveHooksFor(conversationId) : undefined
  )
}
controller = new ConversationController(
  new ConversationStore(dataRoot, electronSecretCodec()),
  createRuntime,
  () => publishSnapshot(),
  (error) => { console.error('Conversation background task failed:', error) },
  deepseekKey || apiKey
    ? (source, locale, model) => generateConversationTitle((deepseekKey || apiKey)!, source, AbortSignal.timeout(20_000), locale, model)
    : undefined,
  // The launch environment, materialized as the first editable profile.
  deepseekKey
    ? { id: 'default', name: 'DeepSeek', baseUrl: DEEPSEEK_ANTHROPIC_BASE_URL, apiKey: deepseekKey,
        model: DEEPSEEK_DEFAULT_MODEL, smallModel: 'deepseek-flash' }
    : undefined,
  resolveLibraries
)
/** Post-turn reflection — fact extraction — is side
 *  work: it reads the finished turn and writes memory, and nothing in the
 *  next message waits on it. A serial chain keeps it ordered and off the
 *  drain's critical path, so memory becomes visible one turn later instead
 *  of holding a queued message behind a model request for up to 20 seconds. */
let postTurnWork: Promise<void> = Promise.resolve()
function schedulePostTurn(task: () => Promise<void>): void {
  postTurnWork = postTurnWork.then(task).catch((error: unknown) => {
    console.error('Conversation post-turn work failed:', error)
  })
}

controller.setTurnHooks({
  memoryContext: () => memory.contextBlock(),
  afterSuccessfulTurn: (turn) => {
    schedulePostTurn(async () => {
      await memory.observeTurn({ ...turn, success: true, provider: await backgroundProvider() })
    })
    return Promise.resolve()
  }
})

const sideSnapshotScheduler = createSnapshotScheduler(() => {
  if (avatarWindow && !avatarWindow.isDestroyed()) {
    avatarWindow.webContents.send('pet:side-snapshot', sideChat.takePublishSnapshot())
  }
}, 80)
const sideChat = new SideChatController(
  (sessionId, onChange, persistSession) => createRuntime(sessionId, onChange, persistSession, false),
  () => {
    const owner = activeController()
    const snapshot = owner.getSnapshot()
    const parentConversationId = activeSideChatParentId(owner.displayedConversationId(), snapshot.conversationLibrary)
    return {
      parentConversationId,
      mode: snapshot.mode,
      settings: snapshot.conversationLibrary.settings,
      history: parentConversationId ? owner.captureSideChatHistory() : []
    }
  },
  () => memory.contextBlock(),
  () => sideSnapshotScheduler.publish(),
  (error) => console.error('Temporary side chat failed:', error),
  () => activeController().displayedLiveConversationId(),
  () => activeController().currentSettings(),
  () => publishSnapshot()
)
controller.setSideBusyPredicate((id) => sideChat.isBusyForParent(id))
controller.setRuntimeConfigurationChangeListener((id) => {
  if (id) void sideChat.discardParent(id)
  else void sideChat.discardAll()
})

function discardSidesWithoutLiveParents(): void {
  sideChat.discardMissingParents(activeController().liveConversationIds())
}

function activeController(): ConversationController {
  if (!controller) throw new Error('会话库尚未就绪。')
  return controller
}

/** Opens the folder picker for the wizard or the settings window. */
async function pickWorkspaceDirectory(parent: BrowserWindow | undefined, current: string): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    title: '选择小鲸的工作目录',
    defaultPath: current,
    properties: ['openDirectory', 'createDirectory']
  }
  const result = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options)
  return result.canceled ? null : result.filePaths[0] ?? null
}

/** The one migration path used by both the wizard and settings: refuse while
 *  work is running, drop every live runtime, persist the choice, then let the
 *  next send rebuild against the new cwd. No files are moved and no Windows
 *  environment variable is touched. */
async function migrateAgentWorkspace(next: string): Promise<string> {
  if (!isUsableWorkspace(next)) throw new Error('工作目录必须是存在的绝对路径。')
  if (!isWritableWorkspace(next)) throw new Error('工作目录不可写，请选择有写权限的文件夹。')
  const normalized = path.normalize(next.trim())
  // Confirming the auto-detected directory still records the choice, but does
  // not need to tear down any live connection.
  if (normalized === agentWorkspace) {
    writeSavedWorkspace(dataRoot, normalized)
    process.env.DESKTOP_PET_WORKSPACE = agentWorkspace
    return agentWorkspace
  }
  const active = activeController()
  if (!active.allConversationsIdle() || sideChat.isBusy()) throw new Error('有任务正在运行，完成后再迁移工作目录。')
  await active.resetForWorkspace()
  writeSavedWorkspace(dataRoot, normalized)
  agentWorkspace = normalized
  libraryStore.setWorkspace(normalized)
  process.env.DESKTOP_PET_WORKSPACE = agentWorkspace
  return agentWorkspace
}

function rendererUrl(): string | undefined {
  const base = process.env.ELECTRON_RENDERER_URL
  return base ? `${base}/avatar.html` : undefined
}

function loadPage(win: BrowserWindow, balance = false): void {
  const url = rendererUrl()
  if (url) void win.loadURL(balance ? `${url}?balance=1` : url)
  else void win.loadFile(path.join(__dirname, '../renderer/avatar.html'), balance ? { query: { balance: '1' } } : undefined)
  sendUiSizeWhenLoaded(win)
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
}

/** 每个窗口的 preload 都监听 pet:ui-size；页面一加载完就灌当前档位。 */
function sendUiSizeWhenLoaded(win: BrowserWindow): void {
  win.webContents.once('did-finish-load', () => {
    if (!win.isDestroyed()) win.webContents.send('pet:ui-size', currentUiSize)
  })
}

function broadcastUiSize(size: UiSize): void {
  currentUiSize = size
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('pet:ui-size', size)
  }
}

function createAvatarWindow(): BrowserWindow {
  const work = screen.getPrimaryDisplay().workArea
  const width = AVATAR_WINDOW_WIDTH
  const height = AVATAR_WINDOW_HEIGHT
  // 预览实例固定到左下角：面板向上展开有空间，也不会和右下角的正式版叠在一起。
  const previewLeft = process.env.DESKTOP_PET_PREVIEW_LEFT === '1'
  const x = previewLeft ? work.x + 24 : work.x + work.width - width - 24
  const y = previewLeft
    ? work.y + work.height - height - 24
    : work.y + work.height - height - 24
  stageBounds = previewLeft
    ? { x: work.x + 24, y: work.y + work.height - STAGE_HEIGHT - 24, width: STAGE_WIDTH, height: STAGE_HEIGHT }
    : {
      x: work.x + work.width - STAGE_WIDTH - 24,
      y: work.y + work.height - STAGE_HEIGHT - 24,
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT
    }
  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    resizable: false,
    show: false,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'whale-tray-icon-pixel.ico')
      : path.join(projectRoot, 'src', 'renderer', 'assets', 'whale-tray-icon-pixel.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  if (process.platform === 'win32') win.setShape(avatarShape({ width, height }))
  // 人物永远在最上层：连其他置顶窗口（面板、播放器）也不能把她盖住。
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.on('show', () => win.setAlwaysOnTop(true, 'screen-saver'))
  win.once('ready-to-show', () => {
    win.show()
    win.moveTop()
  })
  win.on('move', () => {
    // 拖动的是头像窗口；逻辑舞台跟着它平移，面板窗口再跟着舞台走。
    // 越过屏幕中线时改由 syncStageBounds 重算展开方向。
    const bounds = win.getBounds()
    if (stageBounds) {
      stageBounds = {
        ...stageBounds,
        x: bounds.x - (stageBounds.width - bounds.width),
        y: panelDirection === 'down'
          ? bounds.y + bounds.height
          : bounds.y - (stageBounds.height - bounds.height)
      }
    }
    syncPanelBounds()
    syncBalancePosition()
  })
  win.on('resize', () => { syncPanelBounds(); syncBalancePosition() })
  win.on('closed', () => {
    if (shapeShrinkTimer) clearTimeout(shapeShrinkTimer)
    shapeShrinkTimer = undefined
    avatarWindow = undefined
    app.quit()
  })
  loadPage(win)
  return win
}

/** 拖动缩放手柄时的全局悬浮手柄：独立置顶小窗，拖出面板也看得见。 */
const RESIZE_GHOST_SIZE = 240
let resizeGhostWindow: BrowserWindow | undefined

function resizeGhostAt(pos: { x: number; y: number } | null): void {
  if (pos === null) {
    resizeGhostWindow?.hide()
    return
  }
  if (!resizeGhostWindow || resizeGhostWindow.isDestroyed()) {
    const win = new BrowserWindow({
      width: RESIZE_GHOST_SIZE,
      height: RESIZE_GHOST_SIZE,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      show: false,
      webPreferences: { sandbox: false, backgroundThrottling: false }
    })
    win.setAlwaysOnTop(true, 'screen-saver', 1)
    win.setIgnoreMouseEvents(true)
    const html = '<!doctype html><html><body style="margin:0;overflow:hidden;background:transparent">'
      + '<svg width="240" height="240" viewBox="0 0 240 240" style="position:absolute;inset:0;overflow:visible">'
      + '<path d="M130 110 L122 110 A12 12 0 0 0 110 122 L110 130" fill="none" stroke="rgba(80,160,255,.22)" stroke-width="28.8" stroke-linecap="round" filter="blur(7.2px)"/>'
      + '<path d="M130 110 L122 110 A12 12 0 0 0 110 122 L110 130" fill="none" stroke="rgba(90,180,255,.4)" stroke-width="17.6" stroke-linecap="round" filter="blur(4px)"/>'
      + '<path d="M130 110 L122 110 A12 12 0 0 0 110 122 L110 130" fill="none" stroke="rgba(150,220,255,.65)" stroke-width="8.8" stroke-linecap="round" filter="blur(1.6px)"/>'
      + '<path d="M130 110 L122 110 A12 12 0 0 0 110 122 L110 130" fill="none" stroke="#e8f9ff" stroke-width="2.1" stroke-linecap="round"/></svg></body></html>'
    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    resizeGhostWindow = win
  }
  resizeGhostWindow.setBounds({
    // 弧的 45° 点（圆心 122,122，半径 12）对准鼠标，和原来的跟随方式一致。
    x: Math.round(pos.x - (122 - 12 / Math.SQRT2)),
    y: Math.round(pos.y - (122 - 12 / Math.SQRT2)),
    width: RESIZE_GHOST_SIZE,
    height: RESIZE_GHOST_SIZE
  }, false)
  if (!resizeGhostWindow.isVisible()) resizeGhostWindow.showInactive()
  // 任何应用之上：每次跟随都重新声明置顶，避免 show/其它窗口把它压下去。
  resizeGhostWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  resizeGhostWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  resizeGhostWindow.moveTop()
}

function createPanelWindow(): BrowserWindow {
  const avatar = avatarWindow
  const bounds = avatar && !avatar.isDestroyed()
    ? avatar.getBounds()
    : { x: 0, y: 0, width: stageSize.width, height: stageSize.height }
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    // 消息窗口不置顶：可以被其他应用盖住；角色窗口才保持最上层。
    alwaysOnTop: false,
    skipTaskbar: true,
    autoHideMenuBar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  win.on('closed', () => { if (panelWindow === win) panelWindow = undefined })
  sentPanelPlacement = undefined
  sentTailX = -1
  // 面板右键：复制选中的消息文本；输入框里额外提供剪切/粘贴；全选始终可用。
  win.webContents.on('context-menu', (_event, params) => {
    const menu = Menu.buildFromTemplate([
      { role: 'copy', label: '复制', enabled: params.selectionText.length > 0 || params.editFlags.canCopy },
      { role: 'cut', label: '剪切', enabled: params.isEditable && params.editFlags.canCut },
      { role: 'paste', label: '粘贴', enabled: params.isEditable && params.editFlags.canPaste },
      { type: 'separator' },
      { role: 'selectAll', label: '全选' }
    ])
    menu.popup({ window: win })
  })
  loadPanelPage(win)
  return win
}

function loadPanelPage(win: BrowserWindow): void {
  const url = rendererUrl()
  if (url) void win.loadURL(`${url}?mode=panel`)
  else void win.loadFile(path.join(__dirname, '../renderer/avatar.html'), { query: { mode: 'panel' } })
  sendUiSizeWhenLoaded(win)
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
}

function createBalanceWindow(): BrowserWindow {
  const avatar = avatarWindow
  if (!avatar || avatar.isDestroyed()) throw new Error('桌面角色尚未就绪。')
  const initial = balanceBoundsFor(avatar.getBounds())
  const win = new BrowserWindow({
    parent: avatar,
    x: initial.x,
    y: initial.y,
    width: initial.width,
    height: initial.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    autoHideMenuBar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  // Wait for the card's first painted frame before showing the transparent window.
  win.once('ready-to-show', () => {
    balanceWindowReady = true
    if (balanceOpen && !win.isDestroyed()) {
      syncBalancePosition()
      win.showInactive()
    }
  })
  win.on('closed', () => {
    if (balanceWindow !== win) return
    balanceWindow = undefined
    balanceWindowReady = false
    balanceOpen = false
    if (avatarWindow && !avatarWindow.isDestroyed()) avatarWindow.webContents.send('pet:balance-open', false)
  })
  loadPage(win, true)
  return win
}

function createSettingsWindow(initialTab?: string): BrowserWindow {
  const win = new BrowserWindow({
    title: '小鲸 设置',
    // 标题栏画在页面里（.settings-header），窗口不带系统边框。
    frame: false,
    width: 760,
    height: 620,
    minWidth: 560,
    minHeight: 420,
    show: false,
    backgroundColor: '#172d58',
    autoHideMenuBar: true,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'whale-tray-icon-pixel.ico')
      : path.join(projectRoot, 'src', 'renderer', 'assets', 'whale-tray-icon-pixel.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/settings.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  win.once('ready-to-show', () => { if (!win.isDestroyed()) win.show() })
  win.on('closed', () => { if (settingsWindow === win) settingsWindow = undefined })
  const base = process.env.ELECTRON_RENDERER_URL
  // 左栏的「浏览市场」直接打开库页：首次用 query 传目标分区，已打开的窗口走 IPC 事件。
  const query = initialTab ? `?tab=${encodeURIComponent(initialTab)}` : ''
  if (base) void win.loadURL(`${base}/settings.html${query}`)
  else if (initialTab) void win.loadFile(path.join(__dirname, '../renderer/settings.html'), { query: { tab: initialTab } })
  else void win.loadFile(path.join(__dirname, '../renderer/settings.html'))
  sendUiSizeWhenLoaded(win)
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  return win
}

/** Runs one cross-restart command in the agent workspace. Output is clipped so
 *  a chatty build cannot blow up the task file or the conversation. */
function runEvolveCommand(command: string): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      // Self-evolution commands are mostly build/package steps, so the project
      // root is the useful default; absolute paths still address the workspace.
      cwd: dataProjectRoot,
      timeout: 10 * 60_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true
    }, (error, stdout, stderr) => {
      const output = `${stdout ?? ''}\n${stderr ?? ''}`.trim()
      resolve({ ok: !error, output: (output || (error ? error.message : '')).slice(-8_000) })
    })
  })
}

/** Picks up an active self-evolution task after a restart: re-selects the
 *  conversation, restores the approval tier, runs queued commands, re-arms the
 *  goal, and sends the pending prompt. Failure marks the task instead of
 *  looping forever. */
async function resumeEvolveTask(): Promise<void> {
  const task = evolveStore.load()
  if (!task || task.status !== 'active') return
  // 手动启动不自动续跑：只有计划重启（noteRestart 置位）才继续。
  if (!task.resumePending) {
    evolveStore.setStatus('paused', '应用是手动启动的，目标未自动续跑。')
    return
  }
  evolveStore.markResumed()
  if (!task || task.status !== 'active') return
  const id = task.conversationId
  try {
    const record = await controller?.selectConversation(id)
    if (!record) throw new Error('找不到要恢复的对话。')
    if (normalizeModelMode(record.mode) !== 'dsh') throw new Error('对话不在小鲸引擎模式，无法恢复。')
    await controller?.setApprovalMode('selfEvolve', id).catch(() => undefined)

    const notes: string[] = []
    for (const step of task.steps.filter((item) => item.kind === 'command' && item.status === 'pending')) {
      evolveStore.updateStep(step.id, { status: 'running' })
      const result = await runEvolveCommand(step.text)
      evolveStore.updateStep(step.id, { status: result.ok ? 'done' : 'failed', result: result.output })
      notes.push(`跨重启命令${result.ok ? '完成' : '失败'}：${step.text}\n${result.output}`)
      if (!result.ok) {
        evolveStore.setStatus('failed', `跨重启命令失败：${result.output.slice(0, 300)}`)
        break
      }
    }

    const refreshed = evolveStore.load()
    if (!refreshed || refreshed.status !== 'active') return
    const next = refreshed.steps.find((item) => item.kind === 'prompt' && item.status === 'pending')
    if (next) {
      evolveStore.updateStep(next.id, { status: 'done' })
      // 重启后只发一条普通消息：prompt 原文。不拼「已重启，继续执行目标」，
      // 也不走目标模式；自检就是这一条消息，模型收到后直接去查结果。
      await controller?.sendMessage(next.text, [], 'queue', id)
    }
    // 不再自动恢复 /goal：目标模式由主人自己开，重启只负责把待办消息发出来。
    if (!notes.length && !next && !refreshed.goalCondition) {
      evolveStore.setStatus('done', '没有待继续的步骤。')
    }
  } catch (error) {
    evolveStore.setStatus('failed', error instanceof Error ? error.message : String(error))
  }
}

function setBalanceOpen(open: boolean): void {
  if (balanceOpen === open) return
  balanceOpen = open
  if (open) {
    if (!balanceWindow || balanceWindow.isDestroyed()) balanceWindow = createBalanceWindow()
    if (balanceWindowReady) {
      syncBalancePosition()
      balanceWindow.showInactive()
    }
  } else if (balanceWindow && !balanceWindow.isDestroyed()) {
    balanceWindow.hide()
  }
  avatarWindow?.webContents.send('pet:balance-open', open)
  if (balanceWindowReady && balanceWindow && !balanceWindow.isDestroyed()) {
    balanceWindow.webContents.send('pet:balance-open', open)
  }
}

function showPanel(): void {
  if (balanceOpen) setBalanceOpen(false)
  if (!panelOpen) {
    panelOpen = true
    syncStageBounds()
    applyPointerShape()
    // 面板是独立窗口：要真正激活它，输入框才能拿到键盘。
    if (panelWindow && !panelWindow.isDestroyed()) {
      // 先透明显示一帧，等边界/布局落定后再亮出。否则 Windows 会先画
      // 旧 bounds 的那一帧，看起来像先后弹出两个窗口。
      panelWindow.setOpacity(0)
      panelWindow.show()
      // show 之后窗口才 isVisible，命中形状这时才能按面板矩形裁掉重叠区。
      applyPointerShape()
      setTimeout(() => {
        if (!panelOpen || !panelWindow || panelWindow.isDestroyed()) return
        panelWindow.setOpacity(1)
        panelWindow.focus()
      }, 16)
    }
    avatarWindow?.webContents.send('pet:panel-open', true)
  } else {
    panelWindow?.focus()
  }
}

function openSettings(tab?: string): void {
  if (!settingsWindow || settingsWindow.isDestroyed()) settingsWindow = createSettingsWindow(tab)
  else {
    if (settingsWindow.isMinimized()) settingsWindow.restore()
    settingsWindow.show()
    settingsWindow.focus()
    if (tab) settingsWindow.webContents.send('pet:settings-tab', tab)
  }
}

function createOnboardingWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: '小鲸 首次配置',
    width: 560,
    height: 620,
    minWidth: 520,
    minHeight: 560,
    show: false,
    backgroundColor: '#172d58',
    autoHideMenuBar: true,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'whale-tray-icon-pixel.ico')
      : path.join(projectRoot, 'src', 'renderer', 'assets', 'whale-tray-icon-pixel.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/onboarding.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  win.once('ready-to-show', () => { if (!win.isDestroyed()) win.show() })
  win.on('closed', () => {
    // Closing without finishing is an explicit "later": remember it so the
    // wizard is not pushed again on every launch.
    if (!readOnboardingMarker(dataRoot)) writeOnboardingMarker(dataRoot, 'skipped')
    if (onboardingWindow === win) onboardingWindow = undefined
  })
  const base = process.env.ELECTRON_RENDERER_URL
  if (base) void win.loadURL(`${base}/onboarding.html`)
  else void win.loadFile(path.join(__dirname, '../renderer/onboarding.html'))
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  return win
}

function openOnboarding(): void {
  if (!onboardingWindow || onboardingWindow.isDestroyed()) onboardingWindow = createOnboardingWindow()
  else {
    if (onboardingWindow.isMinimized()) onboardingWindow.restore()
    onboardingWindow.show()
    onboardingWindow.focus()
  }
}

/** 隐藏人物和聊天窗口，只留通知区域图标；左击图标再把人物叫回来。 */
function hideAvatar(): void {
  if (balanceOpen) setBalanceOpen(false)
  hidePanel()
  avatarWindow?.hide()
}

/** 打包/重启这类请示的小卡：绿勾批准、红叉拒绝，点一下回传。 */
interface PendingApproval {
  resolve: (approved: boolean | null) => void
  timer: NodeJS.Timeout
}
const pendingApprovals = new Map<string, PendingApproval>()

/** 打包/重启这类请示的小卡：只用来批准或拒绝。
 *
 *  卡片按内容取自然宽度，标题和待批准内容完整显示，按钮固定在底部；
 *  位置锚定当前会话标签（例如“开发1”）的正下方，而不是面板窗口最下沿。
 *  标签位置由渲染进程量出来，主进程只负责把它换算成屏幕坐标。 */
function activeTabRect(win: BrowserWindow): Promise<ApprovalRect | null> {
  return win.webContents.executeJavaScript(`(() => {
    const el = document.querySelector('.panel-quick-tab.is-current');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  })()`).then((value: unknown) => {
    if (!value || typeof value !== 'object') return null
    const rect = value as Record<string, unknown>
    const numbers = [rect.x, rect.y, rect.width, rect.height].map((item) => Number(item))
    if (!numbers.every((item) => Number.isFinite(item)) || numbers[2] <= 0 || numbers[3] <= 0) return null
    return { x: numbers[0], y: numbers[1], width: numbers[2], height: numbers[3] }
  }).catch(() => null)
}

/** 标签按钮测不到时（面板刚切换/头部重绘），退回面板头部下沿；
 *  绝不退到整个面板窗口的底边。 */
function panelHeaderRect(win: BrowserWindow): Promise<ApprovalRect | null> {
  return win.webContents.executeJavaScript(`(() => {
    const el = document.querySelector('.panel-chat-header');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  })()`).then((value: unknown) => {
    if (!value || typeof value !== 'object') return null
    const rect = value as Record<string, unknown>
    const numbers = [rect.x, rect.y, rect.width, rect.height].map((item) => Number(item))
    if (!numbers.every((item) => Number.isFinite(item)) || numbers[2] <= 0 || numbers[3] <= 0) return null
    return { x: numbers[0], y: numbers[1], width: numbers[2], height: numbers[3] }
  }).catch(() => null)
}

function requestApproval(title: string, detail?: string, timeoutMs = 5 * 60_000): Promise<boolean | null> {
  const cardTitle = title.trim() || '需要你的批准'
  const cardDetail = (detail ?? '').trim()
  const cardWidth = approvalCardWidth(cardTitle, cardDetail)
  const cardHeight = approvalCardHeight(cardTitle, cardDetail, cardWidth)
  const html = approvalCardHtml(cardTitle, cardDetail, cardWidth)
  return new Promise((resolve) => {
    // 批准时把余额框收起来：同一位置只留批准/拒绝。
    if (balanceOpen) setBalanceOpen(false)
    const win = new BrowserWindow({
      // 左右各留 8px 给卡片阴影，不然阴影会被窗口边缘切掉。
      width: cardWidth + 16,
      // 先给足高度让正文按最终宽度排版，量完实际高度再缩到内容大小。
      height: Math.max(cardHeight, 480),
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: true,
      show: false,
      webPreferences: { sandbox: true }
    })
    win.setAlwaysOnTop(true, 'screen-saver')
    let settled = false
    const finish = (value: boolean | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (!win.isDestroyed()) win.destroy()
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    win.webContents.on('will-navigate', (event, url) => {
      event.preventDefault()
      if (url.includes('/approve')) finish(true)
      else if (url.includes('/reject')) finish(false)
    })
    win.on('closed', () => finish(null))
    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    win.webContents.once('did-finish-load', () => {
      void (async () => {
        if (win.isDestroyed()) return
        const panel = panelWindow && !panelWindow.isDestroyed() && panelWindow.isVisible() ? panelWindow.getBounds() : null
        const avatar = avatarWindow && !avatarWindow.isDestroyed() ? avatarWindow.getBounds() : null
        const work = screen.getDisplayMatching(panel ?? avatar ?? screen.getPrimaryDisplay().workArea).workArea
        let anchor: ApprovalRect | null = null
        // 优先挂当前会话标签：多标签时“开发1”的卡就落在“开发1”下面。
        if (panel && panelWindow && !panelWindow.isDestroyed()) {
          const tab = await activeTabRect(panelWindow)
          // 标签按钮暂时测不到时贴面板头部下沿；不能用 panel.height 退到窗口底边。
          const header = tab ? null : await panelHeaderRect(panelWindow)
          anchor = approvalAnchor(panel, tab, header)
        }
        if (!anchor) {
          const balance = avatar ? balanceBoundsFor(avatar) : null
          anchor = balance
            ? { x: balance.x + balance.width - 44, y: balance.y, width: 0, height: 0 }
            : { x: work.x + Math.round((work.width - cardWidth) / 2), y: work.y + 24, width: 0, height: 0 }
        }
        const size = { width: cardWidth + 16, height: cardHeight }
        // 估算只用于开窗；内容渲染完后按实际高度再定一次，避免正文被窗口裁掉。
        const measured = await win.webContents.executeJavaScript(`(() => {
          const r = document.querySelector('.card')?.getBoundingClientRect();
          return r ? { height: Math.ceil(r.height) } : null;
        })()`).catch(() => null) as { height?: number } | null
        if (measured?.height && Number.isFinite(measured.height)) {
          size.height = Math.min(490, Math.max(96, measured.height + 18))
        }
        const position = placeApprovalCard(anchor, size, work)
        const above = position.y < anchor.y
        win.setBounds({ ...position, ...size }, false)
        // 卡片被工作区夹住时指针仍指向标签中心；翻到标签上方时三角朝下。
        const pointer = approvalPointerLeft(anchor, { x: position.x + 8, width: cardWidth })
        await win.webContents.executeJavaScript(`(() => {
          document.documentElement.style.setProperty('--pointer-left', '${pointer}px');
          document.body.classList.toggle('is-above', ${above});
          const card = document.querySelector('.card');
          if (card) card.classList.toggle('is-above', ${above});
        })()`).catch(() => undefined)
        if (win.isDestroyed()) return
        win.show()
        win.moveTop()
        win.focus()
      })()
    })
  })
}

/** 启动/切换模型后探测一次供应商地址。ConnectionRefused 时明确告诉用户
 *  是本地代理没起来，并给一个“切换到官方地址”的按钮；用户选“暂不”后同一
 *  地址不再反复弹。 */
let providerCheckInFlight: Promise<void> | undefined
let dismissedProviderBaseUrl = ''
function checkProviderHealth(): Promise<void> {
  providerCheckInFlight ??= (async () => {
    if (process.argv.includes('--self-test')) return
    const settings = (await activeController().getLibraryState()).settings
    const profile = settings.modelProfiles.find((item) => item.id === settings.activeModelProfileId)
    if (!profile?.baseUrl) return
    const health = await probeProviderHealth(profile.baseUrl)
    if (health.ok || !health.localProxy) {
      if (health.ok) dismissedProviderBaseUrl = ''
      return
    }
    if (dismissedProviderBaseUrl === profile.baseUrl) return
    const options = {
      type: 'warning' as const,
      title: '模型地址无法连接',
      message: health.message,
      detail: '本地代理没有运行时，DSH 请求会直接 ConnectionRefused。启动代理后重试，或现在切到 DeepSeek 官方 Anthropic 兼容地址。',
      buttons: ['切换到官方地址', '暂不切换'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    }
    const parent = panelWindow && !panelWindow.isDestroyed() ? panelWindow : undefined
    const result = parent ? await dialog.showMessageBox(parent, options) : await dialog.showMessageBox(options)
    if (result.response !== 0) {
      dismissedProviderBaseUrl = profile.baseUrl
      return
    }
    try {
      await activeController().useOfficialEndpoint()
      dismissedProviderBaseUrl = ''
    } catch (error) {
      dialog.showErrorBox('切换官方地址失败', error instanceof Error ? error.message : String(error))
    }
  })().catch((error: unknown) => {
    console.warn('Provider health check unavailable:', error instanceof Error ? error.message : String(error))
  }).finally(() => {
    providerCheckInFlight = undefined
  })
  return providerCheckInFlight
}

function createTray(): void {
  const asset = app.isPackaged
    ? path.join(process.resourcesPath, 'whale-tray-icon-pixel-24.png')
    : path.join(projectRoot, 'src', 'renderer', 'assets', 'whale-tray-icon-pixel-24.png')
  const icon = nativeImage.createFromPath(asset)
  if (icon.isEmpty()) throw new Error(`通知区域图标资源不可用：${asset}`)
  contextMenu = Menu.buildFromTemplate([
    { label: '配置向导', click: openOnboarding },
    { label: '选项', click: () => { openSettings() } },
    { type: 'separator' },
    { label: '隐藏', click: hideAvatar },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ])
  tray = new Tray(icon)
  tray.setToolTip('小鲸')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    // 隐藏后左击图标只把人物叫回来，不顺手弹开聊天气泡；人物可见时仍
    // 按原来的行为打开/聚焦面板。
    if (avatarWindow && !avatarWindow.isVisible()) {
      avatarWindow.show()
      avatarWindow.moveTop()
      return
    }
    avatarWindow?.show()
    showPanel()
  })
  // Windows 11 默认把新图标收进任务栏溢出区；晚一点再把它标记为常驻显示。
  setTimeout(promoteTrayIcon, 1_500)
  setTimeout(promoteTrayIcon, 4_000)
}

/** 把本程序的托盘图标标记为常驻，避免默认被收进任务栏的折叠区。 */
function promoteTrayIcon(): void {
  if (process.platform !== 'win32') return
  const exe = process.execPath.toLowerCase()
  const reg = (args: string[]): Promise<string> => new Promise((resolve) => {
    execFile('reg.exe', args, { windowsHide: true }, (error, stdout) => resolve(error ? '' : stdout))
  })
  void (async () => {
    const listing = await reg(['query', 'HKCU\\Control Panel\\NotifyIconSettings', '/s'])
    if (!listing) return
    let current = ''
    const matches: string[] = []
    for (const line of listing.split(/\r?\n/u)) {
      const key = /^(HKEY_CURRENT_USER\\[^\r\n]+)$/u.exec(line.trim())
      if (key) {
        current = key[1]
        continue
      }
      const pathValue = /^\s+ExecutablePath\s+REG_\w+\s+(.+)$/u.exec(line)
      if (pathValue && pathValue[1].trim().toLowerCase() === exe) matches.push(current)
    }
    for (const key of matches) {
      await reg(['add', key, '/v', 'IsPromoted', '/t', 'REG_DWORD', '/d', '1', '/f'])
    }
  })()
}

function hidePanel(): void {
  if (!panelOpen) return
  panelOpen = false
  panelWindow?.setOpacity(currentWindowOpacity)
  panelWindow?.hide()
  // 面板隐藏后置顶角标也要收起来，否则会孤零零留在桌面上。
  avatarWindow?.webContents.send('pet:panel-open', false)
  if (shapeShrinkTimer) clearTimeout(shapeShrinkTimer)
  shapeShrinkTimer = undefined
  applyPointerShape()
}

function isScreenPoint(value: unknown): value is Electron.Point {
  return Boolean(value && typeof value === 'object' && Number.isFinite((value as Electron.Point).x) && Number.isFinite((value as Electron.Point).y))
}

function conversationSettingsPatch(value: unknown): Partial<ConversationSettings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('会话设置无效。')
  const input = value as Record<string, unknown>
  const editable = ['visibleConversationTabs', 'autoArchiveAfterDays', 'effort', 'goalMaxIterations', 'goalMaxMinutes', 'memoryEnabled', 'uiSize', 'avatarSize', 'avatarRenderer', 'toolRowDetail', 'webSearchEnabled', 'personaId', 'agentKernel', 'autoCompactPercent', 'assistantAvatar', 'enableAutoTitleGeneration', 'showMessageTimestamps', 'userName', 'assistantName', 'panelPlacement', 'panelTheme',
    'outputStyle', 'appendSystemPrompt', 'autoScroll', 'expandFileEditsByDefault', 'sessionSort', 'titleLocale', 'titleModel', 'loadUserSettings']
  if (Object.keys(input).some((key) => !editable.includes(key))) throw new Error('会话设置无效。')
  const patch: Partial<ConversationSettings> = {}
  if (input.agentKernel !== undefined) {
    const kernel = normalizeAgentKernelKind(input.agentKernel)
    if (!kernel) throw new Error('Agent 内核设置无效。')
    patch.agentKernel = kernel
  }
  if (input.visibleConversationTabs !== undefined) {
    const tabs = input.visibleConversationTabs
    if (typeof tabs !== 'number' || !Number.isInteger(tabs) || tabs < 1 || tabs > 12) throw new Error('快捷切换数应为 1–12。')
    patch.visibleConversationTabs = tabs
  }
  if (input.autoArchiveAfterDays !== undefined) {
    const days = input.autoArchiveAfterDays
    if (days !== 0 && days !== 7 && days !== 14 && days !== 30) throw new Error('自动归档设置无效。')
    patch.autoArchiveAfterDays = days
  }
  if (input.effort !== undefined) {
    if (!isEffortLevel(input.effort)) throw new Error('思考强度设置无效。')
    patch.effort = input.effort
  }
  if (input.goalMaxIterations !== undefined) {
    const count = input.goalMaxIterations
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 300) throw new Error('目标轮数上限应为 1–300。')
    patch.goalMaxIterations = count
  }
  if (input.goalMaxMinutes !== undefined) {
    const minutes = input.goalMaxMinutes
    if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw new Error('目标时长上限应为 1–1440 分钟。')
    patch.goalMaxMinutes = minutes
  }
  if (input.memoryEnabled !== undefined) {
    if (typeof input.memoryEnabled !== 'boolean') throw new Error('记忆开关无效。')
    patch.memoryEnabled = input.memoryEnabled
  }
  if (input.uiSize !== undefined) {
    if (input.uiSize !== 'small' && input.uiSize !== 'medium' && input.uiSize !== 'large') throw new Error('界面尺寸设置无效。')
    patch.uiSize = input.uiSize
  }
  if (input.avatarSize !== undefined) {
    if (input.avatarSize !== 'small' && input.avatarSize !== 'medium' && input.avatarSize !== 'large') throw new Error('人物大小设置无效。')
    patch.avatarSize = input.avatarSize
  }
  if (input.avatarRenderer !== undefined) {
    if (!isAvatarRenderer(input.avatarRenderer)) throw new Error('人物渲染方式无效。')
    patch.avatarRenderer = input.avatarRenderer
  }
  if (input.panelPlacement !== undefined) {
    if (input.panelPlacement !== 'top' && input.panelPlacement !== 'bottom' &&
        input.panelPlacement !== 'left' && input.panelPlacement !== 'right') {
      throw new Error('面板位置设置无效。')
    }
    patch.panelPlacement = input.panelPlacement
  }
  if (input.panelTheme !== undefined) {
    if (input.panelTheme !== 'dark' && input.panelTheme !== 'light') throw new Error('面板主题设置无效。')
    patch.panelTheme = input.panelTheme
  }
  if (input.toolRowDetail !== undefined) {
    if (input.toolRowDetail !== 'full' && input.toolRowDetail !== 'brief' && input.toolRowDetail !== 'name') {
      throw new Error('工具行详细程度无效。')
    }
    patch.toolRowDetail = input.toolRowDetail
  }
  if (input.webSearchEnabled !== undefined) {
    if (typeof input.webSearchEnabled !== 'boolean') throw new Error('联网搜索设置无效。')
    patch.webSearchEnabled = input.webSearchEnabled
  }
  if (input.personaId !== undefined) {
    if (!isPersonaId(input.personaId)) throw new Error('人设预设无效。')
    patch.personaId = input.personaId
  }
  if (input.autoCompactPercent !== undefined) {
    if (!isAutoCompactPercent(input.autoCompactPercent)) throw new Error('自动压缩阈值应为 50–90 之间的整数。')
    patch.autoCompactPercent = input.autoCompactPercent
  }
  // 切换人设时清掉自定义头像，让预设头像生效；上传仍走单独的字节通道。
  if (input.assistantAvatar !== undefined) {
    if (input.assistantAvatar !== null) throw new Error('对话头像只能通过上传修改。')
    patch.assistantAvatar = null
  }
  if (input.enableAutoTitleGeneration !== undefined) {
    if (typeof input.enableAutoTitleGeneration !== 'boolean') throw new Error('标题设置无效。')
    patch.enableAutoTitleGeneration = input.enableAutoTitleGeneration
  }
  if (input.showMessageTimestamps !== undefined) {
    if (typeof input.showMessageTimestamps !== 'boolean') throw new Error('时间戳设置无效。')
    patch.showMessageTimestamps = input.showMessageTimestamps
  }
  for (const key of ['userName', 'assistantName'] as const) {
    if (input[key] === undefined) continue
    if (typeof input[key] !== 'string') throw new Error('称呼无效。')
    patch[key] = input[key]
  }
  if (input.outputStyle !== undefined) {
    if (typeof input.outputStyle !== 'string' || input.outputStyle.length > 64) throw new Error('回答风格无效。')
    patch.outputStyle = input.outputStyle
  }
  if (input.appendSystemPrompt !== undefined) {
    if (typeof input.appendSystemPrompt !== 'string' || input.appendSystemPrompt.length > 4_000) throw new Error('附加指令不能超过 4000 字。')
    patch.appendSystemPrompt = input.appendSystemPrompt
  }
  for (const key of ['autoScroll', 'expandFileEditsByDefault'] as const) {
    if (input[key] === undefined) continue
    if (typeof input[key] !== 'boolean') throw new Error('显示设置无效。')
    patch[key] = input[key]
  }
  if (input.sessionSort !== undefined) {
    if (input.sessionSort !== 'updated' && input.sessionSort !== 'created') throw new Error('会话排序设置无效。')
    patch.sessionSort = input.sessionSort
  }
  if (input.titleLocale !== undefined) {
    if (input.titleLocale !== 'auto' && input.titleLocale !== 'zh' && input.titleLocale !== 'en') throw new Error('标题语言设置无效。')
    patch.titleLocale = input.titleLocale
  }
  if (input.titleModel !== undefined) {
    if (typeof input.titleModel !== 'string' || input.titleModel.length > 64) throw new Error('标题模型设置无效。')
    patch.titleModel = input.titleModel
  }
  if (input.loadUserSettings !== undefined) {
    if (typeof input.loadUserSettings !== 'boolean') throw new Error('用户设置加载开关无效。')
    patch.loadUserSettings = input.loadUserSettings
  }
  return patch
}

/** 解析真正可用的发布 exe：优先指定版本，否则退回最新的可用版本。 */
function resolveLaunchTarget(version?: string): string {
  const releaseRoot = path.join(dataProjectRoot, 'release')
  if (version) {
    const preferred = path.join(releaseRoot, `whale-companion-v${version}`, 'win-unpacked', 'Whale Companion Preview.exe')
    if (existsSync(preferred)) return preferred
  }
  try {
    const candidates = readdirSync(releaseRoot)
      .filter((name) => /^whale-companion-v\d+\.\d+\.\d+$/.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .reverse()
      .map((name) => path.join(releaseRoot, name, 'win-unpacked', 'Whale Companion Preview.exe'))
      .filter((file) => existsSync(file))
    if (candidates[0]) return candidates[0]
  } catch {
    // release 目录不可读时退回当前进程。
  }
  return process.execPath
}

/** 把项目根和桌面的小鲸快捷方式指到指定 exe；目标不存在时绝不写入。 */
function pointShortcutsAt(executable: string): void {
  if (process.platform !== 'win32' || !app.isPackaged || !existsSync(executable)) return
  const targets = [path.join(dataProjectRoot, '小鲸.lnk')]
  try {
    targets.push(path.join(app.getPath('desktop'), '小鲸.lnk'))
  } catch {
    // 没有桌面目录时只处理项目根。
  }
  for (const shortcut of targets) {
    try {
      const ok = shell.writeShortcutLink(shortcut, 'create', {
        target: executable,
        cwd: path.dirname(executable),
        description: '小鲸',
        icon: executable,
        iconIndex: 0
      })
      if (!ok) console.error('Shortcut switch returned false:', shortcut)
    } catch (error) {
      console.error('Shortcut switch failed:', shortcut, error)
    }
  }
}

/** 启动时只补缺失/失效的快捷方式。用户从旧版手动启动时，不能把已经指向
 *  新版的快捷方式改回旧版——那会让下一次点击又回到旧版本。 */
function repairShortcutsIfMissing(executable: string): void {
  if (process.platform !== 'win32' || !app.isPackaged || !existsSync(executable)) return
  const targets = [path.join(dataProjectRoot, '小鲸.lnk')]
  try {
    targets.push(path.join(app.getPath('desktop'), '小鲸.lnk'))
  } catch {
    // 没有桌面目录时只处理项目根。
  }
  for (const shortcut of targets) {
    try {
      if (existsSync(shortcut)) {
        const current = shell.readShortcutLink(shortcut)
        if (current.target && existsSync(current.target)) continue
      }
      const ok = shell.writeShortcutLink(shortcut, 'create', {
        target: executable,
        cwd: path.dirname(executable),
        description: '小鲸',
        icon: executable,
        iconIndex: 0
      })
      if (!ok) console.error('Shortcut repair returned false:', shortcut)
    } catch (error) {
      console.error('Shortcut repair failed:', shortcut, error)
    }
  }
}

let adoptedRestartTimer: NodeJS.Timeout | undefined

/** 切到指定版本并退出；告别动作播完再走。relaunch 放到 before-quit 的最后
 *  一步，等对话写完、子进程收干净再拉起，避免和新旧实例的单例锁抢跑。 */
async function adoptVersion(executable: string): Promise<void> {
  logRestart(`adopt ${executable} pid=${process.pid}`)
  await playAvatarFarewell()
  pointShortcutsAt(executable)
  spawnRestartWatchdog(executable)
  relaunchOnQuit = true
  relaunchExecPath = executable
  app.quit()
}

async function restartWhenIdle(version: string, excludeConversationId?: string, beforeQuit?: () => void): Promise<RestartOutcome> {
  if (adoptedRestartTimer) clearInterval(adoptedRestartTimer)
  const executable = resolveLaunchTarget(version)
  const decision = await decideRestart(excludeConversationId)
  if (decision === 'cancel') return 'cancelled'
  beforeQuit?.()
  if (decision === 'now' || (controller?.allConversationsIdle() ?? true)) {
    await adoptVersion(executable)
    return 'restarted'
  }
  const startedAt = Date.now()
  adoptedRestartTimer = setInterval(() => {
    // 等对话空闲，但最多等 2 分钟：旧实例里可能有永远不结束的回合，
    // 不能让版本切换无限期卡住（表现就是一直停在旧版本）。
    if (!controller?.allConversationsIdle() && Date.now() - startedAt < 120_000) return
    if (adoptedRestartTimer) clearInterval(adoptedRestartTimer)
    adoptedRestartTimer = undefined
    void fsp.access(executable)
      .then(() => adoptVersion(executable))
      .catch((error: unknown) => console.error('Adopted version restart failed:', error))
  }, 1500)
  adoptedRestartTimer.unref?.()
  return 'waiting'
}

const AVATARS_DIR = path.join(dataRoot, 'avatars')
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

/** Stores an avatar image (PNG/JPEG, by magic bytes) and swaps the settings
 *  reference, removing the previous file. */
async function storeAvatar(kind: 'user' | 'assistant', bytes: number[]): Promise<void> {
  const buffer = Buffer.from(bytes)
  if (buffer.length === 0 || buffer.length > AVATAR_MAX_BYTES) throw new Error('头像图片需小于 2 MB。')
  const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (!isPng && !isJpeg) throw new Error('头像仅支持 PNG 或 JPEG 图片。')
  const name = `${kind}-${Date.now()}.${isPng ? 'png' : 'jpg'}`
  mkdirSync(AVATARS_DIR, { recursive: true })
  await fsp.writeFile(path.join(AVATARS_DIR, name), buffer)
  const settings = activeController().getSnapshot().conversationLibrary.settings
  const previous = kind === 'user' ? settings.userAvatar : settings.assistantAvatar
  await activeController().updateSettings(kind === 'user' ? { userAvatar: name } : { assistantAvatar: name })
  if (previous && previous !== name) await fsp.rm(path.join(AVATARS_DIR, previous), { force: true })
}

async function readAvatarDataUrl(kind: 'user' | 'assistant'): Promise<string | null> {
  const settings = activeController().getSnapshot().conversationLibrary.settings
  const name = kind === 'user' ? settings.userAvatar : settings.assistantAvatar
  if (!name) return null
  try {
    const buffer = await fsp.readFile(path.join(AVATARS_DIR, name))
    const mime = name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

/** 设置窗口发来的请求只认设置窗口自己；设置相关的 IPC 在 ipc-settings.ts。 */
const settingsTrusted = (event: Electron.IpcMainInvokeEvent): boolean => event.sender.id === settingsWindow?.webContents.id
/** 头像窗口、面板窗口和设置窗口都能改模型配置；余额窗口只认自己。 */
const modelTrusted = (event: Electron.IpcMainInvokeEvent): boolean => trusted(event) || settingsTrusted(event)
const balanceTrusted = (event: Electron.IpcMainInvokeEvent): boolean => event.sender.id === balanceWindow?.webContents.id

/** 设置 IPC 的依赖：可变状态用 getter，函数直接传引用。 */
function buildSettingsIpcDeps() {
  return {
    settingsTrusted,
    activeController,
    memory,
    conversationSettingsPatch,
    discardSidesWithoutLiveParents,
    broadcastUiSize,
    opacityFor,
    get currentWindowOpacity() { return currentWindowOpacity },
    set currentWindowOpacity(value: typeof currentWindowOpacity) { currentWindowOpacity = value },
    get panelWindow() { return panelWindow },
    get avatarWindow() { return avatarWindow },
    get currentAvatarSize() { return currentAvatarSize },
    set currentAvatarSize(value: typeof currentAvatarSize) { currentAvatarSize = value },
    get panelPlacement() { return panelPlacement },
    set panelPlacement(value: typeof panelPlacement) { panelPlacement = value },
    get settingsWindow() { return settingsWindow },
    get agentWorkspace() { return agentWorkspace },
    dataRoot,
    readSavedWorkspace,
    pickWorkspaceDirectory,
    migrateAgentWorkspace,
    syncStageBounds,
    syncBalancePosition,
    publishSnapshot,
    requestRestart,
  }
}
export type SettingsIpcDeps = ReturnType<typeof buildSettingsIpcDeps>

/** 头像窗口和面板窗口发来的请求都算受信；库、插件、记忆的 IPC 在 ipc-libraries.ts。 */
const trusted = (event: Electron.IpcMainInvokeEvent): boolean =>
  event.sender.id === avatarWindow?.webContents.id || event.sender.id === panelWindow?.webContents.id

/** 库、插件、记忆 IPC 的依赖。 */
function buildLibrariesIpcDeps() {
  return {
    settingsTrusted,
    trusted,
    libraryStore,
    activeController,
    dataRoot,
    memory,
  }
}
export type LibrariesIpcDeps = ReturnType<typeof buildLibrariesIpcDeps>

/** 引导窗口发来的请求只认引导窗口自己；引导相关 IPC 在 ipc-onboarding.ts。 */
const onboardingTrusted = (event: Electron.IpcMainInvokeEvent): boolean => event.sender.id === onboardingWindow?.webContents.id

/** 引导 IPC 的依赖。 */
function buildOnboardingIpcDeps() {
  return {
    onboardingTrusted,
    activeController,
    dataRoot,
    probeAnthropicEndpoint,
    pickWorkspaceDirectory,
    migrateAgentWorkspace,
    get agentWorkspace() { return agentWorkspace },
    get onboardingWindow() { return onboardingWindow },
  }
}
export type OnboardingIpcDeps = ReturnType<typeof buildOnboardingIpcDeps>

/** 权限 IPC 的依赖。 */
function buildPermissionsIpcDeps() {
  return { trusted, activeController }
}
export type PermissionsIpcDeps = ReturnType<typeof buildPermissionsIpcDeps>

/** 模型配置与显示开关 IPC 的依赖。 */
function buildModelsIpcDeps() {
  return {
    modelTrusted,
    trusted,
    activeController,
    checkProviderHealth,
    probeAnthropicEndpoint,
    storeAvatar,
  }
}
export type ModelsIpcDeps = ReturnType<typeof buildModelsIpcDeps>

/** 余额、外部链接和文件预览 IPC 的依赖。 */
function buildBalanceIpcDeps() {
  return {
    trusted,
    balanceTrusted,
    settingsTrusted,
    setBalanceOpen,
    get balanceOpen() { return balanceOpen },
    activeController,
    deepseekKey,
  }
}
export type BalanceIpcDeps = ReturnType<typeof buildBalanceIpcDeps>

/** 会话设置开关 IPC 的依赖。 */
function buildConversationSettingsIpcDeps() {
  return { trusted, activeController }
}
export type ConversationSettingsIpcDeps = ReturnType<typeof buildConversationSettingsIpcDeps>

/** 窗口拖动 IPC 的依赖。 */
function buildWindowDragIpcDeps() {
  return {
    trusted,
    isScreenPoint,
    get avatarWindow() { return avatarWindow },
    get panelWindow() { return panelWindow },
    get dragOrigin() { return dragOrigin },
    set dragOrigin(value: typeof dragOrigin) { dragOrigin = value },
    get avatarDragging() { return avatarDragging },
    set avatarDragging(value: typeof avatarDragging) { avatarDragging = value },
    get currentAvatarSize() { return currentAvatarSize },
    syncBalancePosition,
    syncStageBounds,
  }
}
export type WindowDragIpcDeps = ReturnType<typeof buildWindowDragIpcDeps>

/** 面板显隐 IPC 的依赖。 */
function buildPanelIpcDeps() {
  return {
    trusted,
    showPanel,
    hidePanel,
    get panelOpen() { return panelOpen },
    get panelPlacement() { return panelPlacement },
    get panelDirection() { return panelDirection },
    syncStageBounds,
  }
}
export type PanelIpcDeps = ReturnType<typeof buildPanelIpcDeps>

/** 头像、窗口打开和右键菜单 IPC 的依赖。 */
function buildShellIpcDeps() {
  return {
    trusted,
    modelTrusted,
    readAvatarDataUrl,
    openSettings,
    openOnboarding,
    get avatarWindow() { return avatarWindow },
    get contextMenu() { return contextMenu },
  }
}
export type ShellIpcDeps = ReturnType<typeof buildShellIpcDeps>

/** 附件、快照、角色状态、语音日志和退出 IPC 的依赖。 */
function buildMiscIpcDeps() {
  return {
    trusted,
    dataRoot,
    snapshotWithSideStatuses,
    activeController,
    publishSnapshot,
    get rendererAvatarState() { return rendererAvatarState },
    set rendererAvatarState(value: typeof rendererAvatarState) { rendererAvatarState = value },
  }
}
export type MiscIpcDeps = ReturnType<typeof buildMiscIpcDeps>

/** 气泡布局、可见框和面板尺寸 IPC 的依赖。 */
function buildWindowStateIpcDeps() {
  return {
    trusted,
    get bubbleLayout() { return bubbleLayout },
    set bubbleLayout(value: typeof bubbleLayout) { bubbleLayout = value },
    get compactBubbleHeight() { return compactBubbleHeight },
    set compactBubbleHeight(value: typeof compactBubbleHeight) { compactBubbleHeight = value },
    get stageBounds() { return stageBounds },
    get panelDirection() { return panelDirection },
    stageSize,
    bubbleRegion,
    syncPanelBounds,
    applyPointerShape,
    get shapeShrinkTimer() { return shapeShrinkTimer },
    set shapeShrinkTimer(value: typeof shapeShrinkTimer) { shapeShrinkTimer = value },
    get panelOpen() { return panelOpen },
    setBubbleExpanded,
    get avatarWindow() { return avatarWindow },
    get avatarBox() { return avatarBox },
    set avatarBox(value: typeof avatarBox) { avatarBox = value },
    syncStageBounds,
    get bubblePanelSize() { return bubblePanelSize },
    set bubblePanelSize(value: typeof bubblePanelSize) { bubblePanelSize = value },
    panelMinWidth: PANEL_MIN_WIDTH,
    panelMinHeight: PANEL_MIN_HEIGHT,
    schedulePanelSizeSave,
  }
}
export type WindowStateIpcDeps = ReturnType<typeof buildWindowStateIpcDeps>

function registerIpc(): void {
  const resolveAttachments = async (items: UserAttachment[]): Promise<UserAttachment[]> => {
    const resolved = await Promise.all(items.map(async (item) => {
      if (!item.path) return item
      // Library mentions (mcp:/skill:/plugin:) are not files; treating them as
      // attachments makes every send fail with “找不到引用文件”.
      if (/^(?:mcp|skill|plugin):/iu.test(item.path)) return null
      const file = await verifyDroppedFilePath(item.path)
      return { ...item, path: file.path, name: file.name }
    }))
    return resolved.filter((item): item is UserAttachment => item !== null)
  }
  // The settings window manages model profiles and avatars too — the data
  // lives beside its own settings — so those channels accept either window.
  // Everything else stays avatar-only on purpose.

  registerOnboardingIpc(buildOnboardingIpcDeps())
  registerSettingsIpc(buildSettingsIpcDeps())
  registerLibrariesIpc(buildLibrariesIpcDeps())
  registerMiscIpc(buildMiscIpcDeps())
  registerSideIpc({ trusted, sideChat, activeController, validAttachmentList, resolveAttachments, get avatarWindow() { return avatarWindow } })
  registerConversationsIpc({ trusted, activeController, sideChat, get panelWindow() { return panelWindow } })
  registerConversationControlIpc({ trusted, activeController, sideChat, get agentWorkspace() { return agentWorkspace } })
  registerModelsIpc(buildModelsIpcDeps())
  registerShellIpc(buildShellIpcDeps())
  registerPanelIpc(buildPanelIpcDeps())
  registerBalanceIpc(buildBalanceIpcDeps())
  registerWindowStateIpc(buildWindowStateIpcDeps())
  ipcMain.on('pet:resize-ghost', (event, pos: unknown) => {
    if (!trusted(event)) return
    if (pos === null) {
      resizeGhostAt(null)
      return
    }
    const point = pos && typeof pos === 'object' ? pos as { x?: unknown; y?: unknown } : null
    if (point && typeof point.x === 'number' && typeof point.y === 'number' &&
      Number.isFinite(point.x) && Number.isFinite(point.y)) {
      resizeGhostAt({ x: point.x, y: point.y })
    }
  })
  ipcMain.on('pet:approval-result', (event, id: unknown, approved: unknown) => {
    if (!trusted(event)) return
    if (typeof id !== 'string') return
    const pending = pendingApprovals.get(id)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingApprovals.delete(id)
    pending.resolve(approved === true)
  })
  registerConversationSettingsIpc(buildConversationSettingsIpcDeps())
  registerPermissionsIpc(buildPermissionsIpcDeps())

  registerVoiceIpc({
    ipcMain,
    service: voiceService,
    trusted,
    settingsTrusted,
    broadcastConfig: async () => {
      const config = await voiceService.getVoiceConfig()
      for (const win of [avatarWindow, panelWindow]) {
        if (win && !win.isDestroyed()) win.webContents.send('pet:voice-config-changed', config)
      }
    },
    sendJobProgress: (progress) => {
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.send('pet:voice:job-progress', progress)
      }
    },
    pickDocument: async () => {
      if (!settingsWindow) throw new Error('设置窗口不可用。')
      const result = await dialog.showOpenDialog(settingsWindow, {
        title: '选择要转成音频的文档',
        properties: ['openFile'],
        filters: [{ name: '文档', extensions: ['md', 'txt'] }]
      })
      const filePath = result.filePaths[0]
      if (result.canceled || !filePath) return null
      const info = await fsp.stat(filePath)
      if (!info.isFile()) throw new Error('请选择一个文档文件。')
      return { path: filePath, name: path.basename(filePath), size: info.size }
    },
    openExternal: async (url) => { await shell.openExternal(url) },
    openPath: async (target) => {
      await fsp.mkdir(target, { recursive: true }).catch(() => undefined)
      const error = await shell.openPath(target)
      if (error) throw new Error('无法打开目录。')
    }
  })
  registerWindowDragIpc(buildWindowDragIpcDeps())
}

// 隔离冒烟测试：配合 DESKTOP_PET_WORKSPACE 指向临时目录时，允许再起一个实例。
const ownsSingleInstance = process.env.DESKTOP_PET_MULTI_INSTANCE === '1' || app.requestSingleInstanceLock()
if (!ownsSingleInstance) {
  // 带控制参数的第二实例只负责把命令转给主实例；静默退出，不弹“已在运行”。
  // 回合进行中请求重启时，弹窗会让主人以为启动失败。
  const controlCommand = process.argv.includes('--quit') || process.argv.includes('--restart') ||
    process.argv.some((arg) => arg === '--restart-to' || arg.startsWith('--restart-to='))
  if (controlCommand) {
    void app.whenReady().then(() => app.quit())
  } else {
    // Do not disappear silently: a second copy looks like a crash otherwise.
    void app.whenReady().then(async () => {
      try {
        await dialog.showMessageBox({
          type: 'info',
          title: '小鲸已在运行',
          message: '已经有一个小鲸实例在运行。请先从托盘退出旧实例，再启动新版本。'
        })
      } finally {
        app.quit()
      }
    })
  }
}
app.on('second-instance', (_event, commandLine) => {
  // Lets the packaging script close a running copy without killing it.
  if (commandLine.includes('--quit')) {
    app.quit()
    return
  }
  // 由旧实例自己切版本：app.relaunch 指向目标版本，看门狗负责旧进程退出后
  // 拉起新版本，不靠外部脚本猜单实例锁什么时候释放。
  const restartToIndex = commandLine.findIndex((arg) => arg === '--restart-to' || arg.startsWith('--restart-to='))
  if (restartToIndex >= 0) {
    const raw = commandLine[restartToIndex]
    const version = raw.includes('=') ? raw.slice(raw.indexOf('=') + 1) : commandLine[restartToIndex + 1]
    if (version && /^\d+\.\d+\.\d+$/.test(version)) {
      logRestart(`second-instance restart-to ${version} pid=${process.pid}`)
      void restartWhenIdle(version)
    } else {
      logRestart(`second-instance restart-to invalid: ${version ?? ''}`)
      void requestRestart()
    }
    return
  }
  // One-command restart for the evolve loop: wait for idle, then relaunch.
  if (commandLine.includes('--restart')) {
    void requestRestart()
    return
  }
  avatarWindow?.show()
  showPanel()
})

if (ownsSingleInstance) void app.whenReady().then(async () => {
  // 全局急停：任何桌面操作进行中都能一键打断，不必先切回面板。
  globalShortcut.register('Control+Alt+Shift+Esc', () => {
    void activeController().interruptTurn().catch(() => undefined);
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  // Scripts can ask a fresh copy to close right away; without this the flag
  // would only work when another instance already holds the single-instance lock.
  if (process.argv.includes('--quit')) {
    app.quit()
    return
  }
  await activeController().initialize()
  inboxWatcher = new InboxWatcher(path.join(dataRoot, 'inbox'), activeController())
  inboxWatcher.start()
  const initialSettings = (await activeController().getLibraryState()).settings
  memory.setEnabled(initialSettings.memoryEnabled)
  currentUiSize = initialSettings.uiSize
  currentAvatarSize = initialSettings.avatarSize
  panelPlacement = initialSettings.panelPlacement ?? 'top'
  panelDirection = panelPlacement === 'bottom' ? 'down' : 'up'
  const savedPanelSize = initialSettings.panelSize
  if (savedPanelSize) bubblePanelSize = { width: savedPanelSize.width, height: savedPanelSize.height }
  await memory.initialize()
  registerIpc()
  // 启动只修缺失/失效的快捷方式；指向其他已存在版本的快捷方式保持不动。
  repairShortcutsIfMissing(process.execPath)
  // 预加载缩放手柄悬浮窗，避免按下时因首次创建/加载出现空档。
  resizeGhostAt({ x: -2000, y: -2000 })
  resizeGhostAt(null)
  avatarWindow = createAvatarWindow()
  panelWindow = createPanelWindow()
  // 预览实例默认把面板打开，省得每次手动点头像。等面板页面加载完再开，
  // 不用固定延时——固定 1.5 秒会赶在渲染层就绪之前调用，窗口留在透明态。
  if (process.env.DESKTOP_PET_PREVIEW_PANEL === '1' && panelWindow && !panelWindow.isDestroyed()) {
    const openPreviewPanel = (): void => { setTimeout(() => showPanel(), 300) }
    if (panelWindow.webContents.isLoading()) panelWindow.webContents.once('did-finish-load', openPreviewPanel)
    else openPreviewPanel()
  }
  createTray()
  // 全局键鼠活动：面板提示框里实时显示按键与鼠标三键。
  startInputActivity((activity) => {
    for (const win of [panelWindow, avatarWindow]) {
      if (win && !win.isDestroyed()) win.webContents.send('pet:input-activity', activity)
    }
  })
  // 启动探测放在窗口出现之后，弹提示时才有正确的父窗口；自检模式不打扰。
  if (!process.argv.includes('--self-test')) setTimeout(() => { void checkProviderHealth() }, 3_000)

  // First run with no model configured: let the pet appear first, then offer
  // the DeepSeek wizard. The marker file makes "later" a decision we remember.
  const onboardProfiles = (await activeController().getLibraryState()).settings.modelProfiles
  if (shouldOfferOnboarding(readOnboardingMarker(dataRoot), onboardProfiles.length,
    onboardProfiles.some((profile) => profile.needsKeyReentry))) {
    setTimeout(openOnboarding, 1000)
  }

  // 自我进化：上一次运行留下了跨重启任务时，等窗口和运行时就绪后继续。
  // 自检模式不恢复，避免干扰打包验证。
  if (!process.argv.includes('--self-test')) {
    setTimeout(() => { void resumeEvolveTask() }, 2_000)
  }

  // 启动自检：打包脚本用 --self-test 启动新版本，结果落到 data/self-test，
  // 不弹额外窗口、不改用户设置；--self-test-exit 时跑完就退出。
  // 打包版每次启动都自检：重启看门狗和 evolve_restart 启动的新实例不带 --self-test，
  // 只认这个参数会让日常重启永远跳过自检。跨重启任务恢复仍按 --self-test 判断，互不影响。
  const selfTestStartedAt = Date.now()
  if (process.argv.includes('--self-test') || app.isPackaged) {
    setTimeout(() => {
      void (async () => {
        // 冷启动时窗口可能还没就绪，固定等 3 秒会误报 windows 失败。
        // 轮询到窗口可见为止，最多 15 秒，超时才判失败。
        const waitForWindows = async (timeoutMs: number): Promise<boolean> => {
          const deadline = Date.now() + timeoutMs
          while (Date.now() < deadline) {
            if (avatarWindow && !avatarWindow.isDestroyed() && avatarWindow.isVisible() &&
                panelWindow && !panelWindow.isDestroyed()) return true
            await new Promise((resolve) => setTimeout(resolve, 250))
          }
          return false
        }
        const windowsReady = await waitForWindows(15_000)
        const startedAt = selfTestStartedAt
        const settingsReady = await activeController().getLibraryState().then(() => true).catch(() => false)
        const result = runSelfTest({
          version: app.getVersion(),
          dataRoot,
          rendererRoot: path.join(__dirname, '../renderer'),
          windowsReady,
          settingsReady,
          env: {
            packaged: app.isPackaged,
            electron: process.versions.electron ?? 'unknown',
            elapsedMs: Date.now() - startedAt
          }
        })
        console.log(`Self-test ${result.ok ? 'passed' : 'failed'} (${result.version})`)
        if (process.argv.includes('--self-test-exit')) app.quit()
      })()
    }, 3_000)
  }

  // 自检模式：node/electron --self-test-asr 用测试音频调用 transcribeAudio
  if (process.argv.includes('--self-test-asr')) {
    voiceLog('[selftest] start', { args: process.argv })
    try {
      const fs = await import('node:fs')
      const testAudio = path.join(projectRoot, 'scripts', 'test-zh.wav')
      voiceLog('[selftest] audio path', { testAudio, exists: fs.existsSync(testAudio) })
      if (fs.existsSync(testAudio)) {
        const buffer = fs.readFileSync(testAudio)
        const bytes = Array.from(buffer)
        const apiKey = process.env.SILICONFLOW_API_KEY
        voiceLog('[selftest] config', { bytesLen: bytes.length, hasKey: !!apiKey })
        if (apiKey) {
          const result = await transcribeAudio({
            bytes,
            mimeType: 'audio/wav',
            apiKey,
            model: 'FunAudioLLM/SenseVoiceSmall',
          })
          voiceLog('[selftest] result', { textLength: result.text?.length ?? 0 })
        } else {
          voiceLogError('[selftest] no SILICONFLOW_API_KEY', new Error('missing key'))
        }
      } else {
        voiceLogError('[selftest] test audio not found', { testAudio })
      }
    } catch (error) {
      voiceLog('[selftest] failed', { kind: error instanceof Error ? error.name : 'UnknownError' })
    } finally {
      voiceLog('[selftest] done, quitting', undefined)
      setTimeout(() => app.quit(), 500)
    }
  }
}).catch((error: unknown) => {
  if (error instanceof SecretProtectionUnavailableError) {
    dialog.showErrorBox('小鲸无法读取加密配置', 'Windows 密钥保护暂不可用。原配置未更改，请稍后重试。')
  }
  console.error('Desktop companion failed to start:', error)
  app.quit()
})

let quitting = false
let inboxWatcher: InboxWatcher | undefined
app.on('before-quit', (event) => {
  stopInputActivity()
  if (quitting) return
  quitting = true
  // Hold the quit until the running turn has been written. A turn normally
  // saves when it finishes; quitting mid-turn used to drop everything since
  // the last save, which looked like the last work block disappearing.
  event.preventDefault()
  inboxWatcher?.stop()
  inboxWatcher = undefined
  controller?.stopAll(true)
  voiceService.dispose()
  void sideChat.discardAll()
  if (balanceWindow && !balanceWindow.isDestroyed()) balanceWindow.destroy()
  balanceWindow = undefined
  tray?.destroy()
  tray = undefined
  void Promise.race([
    controller?.flushAll() ?? Promise.resolve(),
    new Promise<void>((resolve) => setTimeout(resolve, 2_000))
  ]).catch((error: unknown) => {
    console.error('Final conversation save failed:', error)
  }).finally(async () => {
    await controller?.disposeAll().catch(() => undefined)
    wpsMcpService.close()
    if (relaunchOnQuit) {
      try {
        app.relaunch(relaunchExecPath ? { execPath: relaunchExecPath } : undefined)
      } catch (error) {
        console.error('Relaunch failed; the watchdog will retry:', error)
      }
    }
    app.quit()
  })
})

// The tray owns the app lifecycle. Closing one window (or a startup window
// failing to open) must not take down the resident process; only an explicit
// tray/menu quit or a failed startup does that.
app.on('window-all-closed', () => {
  if (!tray) app.quit()
})


