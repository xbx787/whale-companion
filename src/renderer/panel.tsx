import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type AnimationEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { normalizeApprovalMode, type AppSnapshot, type AskAnswers, type AskQuestionRequest, ApprovalMode, BubbleLayout, AppCommandOption, ContextUsageSnapshot, ConversationSummary, EffortLevel, ModelMode, ModelProfile, PanelDirection, PanelPlacement, PendingMessage, PetAPI, ProposedAction, SideChatSnapshot, TaskMetrics, TaskStatus, TimelineEntry, type ToolRowDetail, UserAttachment, VoiceConfig } from '../shared/contracts';
import { AUTO_COMPACT_DEFAULT_PERCENT, AUTO_COMPACT_MAX_PERCENT, AUTO_COMPACT_MIN_PERCENT, PANEL_MIN_HEIGHT, PANEL_MIN_WIDTH } from '../shared/contracts';
import { formatCommandDuration, formatDuration, formatToolDuration } from './duration'
import { isImageAttachmentName } from '../shared/image-preview';
import { EffortSlider } from './effort-slider';
import { EventImages } from './event-images';
import { formatSelectionQuote } from './message-quote';
import { mcpServerLabel, mcpToolRef, toolLabel } from '../shared/tool-labels';
import { AttachmentPreview, previewPlacement, type PreviewPlacement } from './attachment-preview';
import { agentTasks } from './agent-tasks';
import { fileBadge, splitAttachmentNote } from './attachment-note';
import { ComposerSuggestions, detectComposerTrigger, fileMention, librarySuggestionItems, sessionSuggestionItems, workflowSuggestionItems, type ComposerSuggestion } from './composer-suggestions';
import { LIBRARY_LABELS, type LibraryItem } from '../shared/libraries';
import { pastedFileName, pastedFiles, restoreComposerState, stashComposerState, type StashedComposer } from './composer-drafts';
import { GoalBanner } from './goal-banner';
import { MessageMarkdown, writeClipboard } from './message-markdown';
import { abbreviateWorkspace, MessageBody, modeLabels, noopOpenImage, RunParagraph, stampText, stripAnsi, timeText, toolImagePath, turnMenuTitle } from './panel-message';
import { ApprovalCard, avatarCache, AvatarGlyph, ToolElapsed } from './panel-atoms';
import { clampEditorHeight, EDITOR_MAX_HEIGHT, EDITOR_ONE_LINE, editorHeightBounds, fileToBase64, fitEditorHeight, prepareFileAttachment } from './panel-editor';
import { useExitAnimation } from './panel-exit-animation';
import { APPROVAL_MODE_LABELS, APPROVAL_MODES, EARLIER_MIN_ENTRIES, EARLIER_STEP_GROUPS, EMPTY_TAB_ORDER, EMPTY_TIMELINE, HISTORY_STEP_ENTRIES, INITIAL_HISTORY_ENTRIES, UNARCHIVED_LIMIT } from './panel-constants';
import { RightRail } from './panel-right-rail';
import { LibraryMarket } from './panel-library-market';
import { LibraryHeader } from './panel-library-header';
import { SessionRow } from './panel-session-row';
import { LibraryBatchBar } from './panel-library-batch';
import { useFeedScroll } from './use-feed-scroll';
import { ModelPicker } from './panel-model-picker';
import { ApprovalMenu } from './panel-approval-menu';
import { ContextMenu } from './panel-context-menu';
import { BypassConfirmDialog, EvolveConfirmDialog } from './panel-permission-dialogs';
import { AttachmentPreviewStrip } from './panel-attachment-preview-strip';
import { AttachmentChips } from './panel-attachment-chips';
import { ComposerSendRow } from './panel-composer-send';
import { PanelStatusBar } from './panel-status-bar';
import { TurnBlock } from './panel-turn';
import { useComposerKeys } from './use-composer-keys';
import { useComposeDockHeight } from './use-compose-dock-height';
import { forgetParentSide, forgetSideSession, rememberVisibleSide as rememberVisibleSideUtil, sideSessionExists as sideSessionExistsUtil } from './panel-side-session';
import { useDraftPersist } from './use-draft-persist';
import { usePanelWindowChrome } from './use-panel-chrome';
import { useEditorHeight } from './use-editor-height';
import { useFeedAnchors } from './use-feed-anchors';
import { useDismissable } from './use-dismissable';
import { useEscapeToStop } from './use-escape-to-stop';
import { useTabFlip } from './use-tab-flip';
import { endPanelResize as endPanelResizeImpl } from './end-panel-resize';
import { beginPanelResize as beginPanelResizeImpl, beginWindowDrag as beginWindowDragImpl } from './panel-drag';
import { movePanelResize as movePanelResizeImpl } from './panel-drag';
import { useResizeFinish } from './use-resize-finish';
import { nudgeAutoCompact as nudgeAutoCompactImpl, openAttachmentImage as openAttachmentImageImpl, showAttachmentPreview as showAttachmentPreviewImpl } from './panel-attachments-actions';
import { decideAction, stopAction } from './panel-runtime-actions';
import { applyApprovalMode as applyApprovalModeImpl, chooseApprovalMode as chooseApprovalModeImpl, type ApprovalModeActionsDeps } from './panel-approval-actions';
import { chooseEffort as chooseEffortImpl, choosePlanMode as choosePlanModeImpl, discardSide as discardSideImpl, setSideExpanded as setSideExpandedImpl } from './panel-mode-actions';
import { loadOlderPage as loadOlderPageImpl } from './load-older-page';
import { EntryItem, TimelineItem, type RowDisplay } from './panel-timeline-item';
export { EntryItem, TimelineItem } from './panel-timeline-item';
export type { RowDisplay } from './panel-timeline-item';
export { clampEditorHeight, EDITOR_MAX_HEIGHT, EDITOR_ONE_LINE, editorHeightBounds } from './panel-editor';
import { TabContextMenu } from './tab-context-menu';
import { TurnContextMenu } from './turn-context-menu';
import { drawerBottomOffset } from './panel-drawer';
import { groupSessionSummaries } from './session-list-groups';
import { moveTab, orderConversationTabs, quickTabLimit, showNewTabButton } from './panel-tabs';
import { TaskStrip } from './task-strip';
import { AskQuestionPanel } from './ask-question';
import { PlanApprovalPanel } from './plan-approval';
import { ToolApprovalPanel } from './tool-approval';
import { ThinkingItem } from './thinking-item';
import { groupTimeline, sameTimelineEntry, segmentTurn, splitTurnTail, tailWindow, type TurnSegment } from './timeline-groups';
import { navMarks, NAV_WINDOW_COMPACT, NAV_WINDOW_WIDE, TimelineNav } from './timeline-nav';
import { ToolDiffBody } from './tool-diff-body';
import { ToolImageOutput } from './tool-images';
import { ToolIcon } from './tool-icons';
import { toolArgumentPreview, toolPlanText } from './tool-arguments';
import { toolDiffPreview } from './tool-diff';
import { ToolInputDetails } from './tool-input-details';
import { TurnStats } from './turn-stats';
import { WorkingIndicator } from './working-indicator';
import { SubagentTray } from './subagent-tray';
import { TurnProcess, WorkCluster } from './work-cluster';
import { petBridge } from './pet-state';
import {
  ApprovalIcon, GoalIcon, PlanIcon, WebSearchIcon, PlusIcon, GripIcon, CloseIcon, ReturnIcon,
  ModelIcon, ConversationsIcon, SelectIcon, BackIcon, EditIcon, ArchiveIcon, DeleteIcon,
  ExportIcon, ImportIcon, PinIcon, ContextMeter
} from './panel-icons';
import {
  APPROVAL_MODE_HINTS, MAIN_ONLY_SIDE_COMMANDS, taskLabels, sideOnlySlashError, senderBadge, localizeAskRequest, conversationStatus, statusRunning,
  restoreAskAnswers, kindLabels, mergeComposerDraft, mergeComposerAttachments,
  type DroppedAttachment
} from './panel-utils';
import { personaAvatarUrl } from './avatar-art';
import { VoiceManager, type VoiceManagerPhase } from './voice-manager';
import { VoiceButton, VoiceWaveform } from './voice-button';
import './voice.css';
import './panel.css';
import './panel-light.css';
import './panel-theme-tune.css';

// 审批菜单按 DSH 的沙箱预设排列，严格到宽松：只读、工作区写入、完全访问，
// 最后一档是应用自己的自我进化（完全访问 + 修改自身和重启）。
/** Module scope on purpose: a work cluster re-renders only when this identity is stable.
 *  The image viewer callback rides a ref so that identity survives. */
const openImageViewerRef: { current?: (name: string, url: string) => void } = {};

interface PanelBubbleProps {
  visible: boolean;
  snapshot: AppSnapshot | null;
  error: string | null;
  run: (action: (bridge: PetAPI) => Promise<void>) => Promise<boolean>;
  /** 面板相对人物的展开方向；默认向上，独立面板窗口由主进程推送。 */
  direction?: PanelDirection;
  /** 面板贴在人物的哪一侧；左/右时靠侧边对齐。 */
  placement?: PanelPlacement;
}

const COMPOSER_OPEN_KEY = 'whale.composer-open'

/** 每个会话记住输入框是展开还是收起：只有手动操作才写，切换时恢复。 */
function readComposerOpenPrefs(): Map<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(COMPOSER_OPEN_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return new Map()
    return new Map(Object.entries(parsed as Record<string, boolean>).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'))
  } catch {
    return new Map()
  }
}

function writeComposerOpenPrefs(prefs: Map<string, boolean>): void {
  try { localStorage.setItem(COMPOSER_OPEN_KEY, JSON.stringify(Object.fromEntries(prefs))) } catch { /* 存不了就只记在内存。 */ }
}

export function PanelBubble({ visible, snapshot: mainSnapshot, error, run, direction = 'up', placement = 'top' }: PanelBubbleProps) {
  usePanelWindowChrome(direction, placement);

  // 主题只作用于聊天面板；状态色在 CSS 里单独成组，不跟主题覆盖。
  const panelTheme = mainSnapshot?.conversationLibrary?.settings.panelTheme ?? 'dark';
  useEffect(() => {
    if (!document.body.classList.contains('panel-window')) return;
    document.body.classList.toggle('panel-theme-light', panelTheme === 'light');
    return () => { document.body.classList.remove('panel-theme-light'); };
  }, [panelTheme]);
  const [sideChat, setSideChat] = useState<SideChatSnapshot | null>(null);
  const sideSessionId = sideChat?.parentConversationId === (mainSnapshot?.conversationLibrary?.activeConversationId ?? null)
    ? sideChat?.sessionId ?? null : null;
  const sideExpanded = Boolean(sideSessionId && sideChat?.expanded && sideChat.snapshot);
  const snapshot = sideExpanded ? sideChat!.snapshot : mainSnapshot;
  const sideChatRef = useRef<SideChatSnapshot | null>(null);
  const sideSnapshots = useRef(new Map<string, SideChatSnapshot>());
  const destinationRef = useRef<'main' | 'side'>('main');
  const sideComposerStash = useRef(new Map<string, StashedComposer<DroppedAttachment>>());
  const mainComposerOpenRef = useRef(false);
  const sideComposerOpenRef = useRef(new Map<string, boolean>());
  const applySideSnapshotRef = useRef<(next: SideChatSnapshot) => void>(() => undefined);
  const sideSubmitLockRef = useRef(new Set<string>());
  const [sideSendingIds, setSideSendingIds] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState(false);
  const [bubbleWidth, setBubbleWidth] = useState(0);
  const resizePending = useRef(false);
  const drawerExit = useExitAnimation(190);
  const [libraryOpen, setLibraryOpenRaw] = useState(false);
  // 右栏：closed 收起、overlay 覆盖在消息流上。和左侧会话库同一套抽屉。
  const [rightRail, setRightRail] = useState<'closed' | 'overlay'>('closed');
  // 右栏的代码预览：只读，最多 200KB，由主进程截断。
  const [preview, setPreview] = useState<{ path: string; text: string; truncated: boolean } | null>(null);
  // 左栏分区：会话 / 拓展（插件、技能、MCP 都来自库索引）。
  const [libraryTab, setLibraryTab] = useState<'sessions' | 'market'>('sessions');
  // 右栏分区：目标 / 预览。
  const [railTab, setRailTab] = useState<'plan' | 'preview'>('plan');
  const [railLibraries, setRailLibraries] = useState<LibraryItem[]>([]);
  const [railMarketKind, setRailMarketKind] = useState<'plugin' | 'skill' | 'mcp'>('plugin');
  // 右栏里直接改目标条件：提交时仍走 CLI 的 /goal 命令。
  const [goalDraft, setGoalDraft] = useState('');
  useEffect(() => {
    setGoalDraft(snapshot?.goal?.condition ?? '');
  }, [snapshot?.goal?.condition]);
  // 工具行里的文件路径点一下，就把内容送进右栏预览。
  useEffect(() => {
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<string>).detail;
      if (!detail) return;
      setRightRail((current) => current === 'closed' ? 'overlay' : current);
      void window.pet.previewFile(detail).then(setPreview).catch(() => setPreview({ path: detail, text: '读取失败', truncated: false }));
    };
    window.addEventListener('pet-preview-path', handler);
    return () => window.removeEventListener('pet-preview-path', handler);
  }, []);
  useEffect(() => {
    if (libraryTab !== 'market') return;
    void window.pet.listLibraries().then((items) => { if (Array.isArray(items)) setRailLibraries(items) }).catch(() => undefined);
  }, [libraryTab]);
  // The 534px expanded bubble can hold a 190px library and a 320px chat.
  // Smaller displays keep the overlay drawer so the composer remains usable.
  // Date headings ("今天/昨天/更早") only pay off in the wide shape. The drawer
  // itself is always a floating pane over the bubble — never a column that
  // squeezes the conversation beside it.
  const libraryGrouped = expanded && bubbleWidth >= 510 && (libraryOpen || drawerExit.closing);
  // 左栏只展示已安装条目；市场统一在设置窗口的「库」里。
  const installedExtended = railLibraries.filter((item) => item.kind === railMarketKind);
  // Closing plays the drawer's exit animation first: the raw setter flips the
  // state, the wrapper starts the animation that keeps the drawer mounted
  // until it has slid away.
  function setLibraryOpen(open: boolean) {
    if (!open) {
      drawerExit.beginClose();
      setMultiSelect(false);
      setSelectedSessionIds(new Set());
      setBatchDeleteConfirm(false);
    }
    setLibraryOpenRaw(open);
  }
  // The drawer's distance from the workspace's bottom edge — the composer
  // dock's height at this moment; live values arrive from the dock observer.
  const [drawerBottom, setDrawerBottom] = useState<number | null>(null);
  const [libraryArchived, setLibraryArchived] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  // 左栏收起再打开时，下级列表的滚动位置也要回到原处。
  const sessionListRef = useRef<HTMLDivElement>(null);
  const sessionScrollRef = useRef(0);
  useLayoutEffect(() => {
    if (!libraryOpen || libraryTab !== 'sessions' || !sessionListRef.current) return;
    sessionListRef.current.scrollTop = sessionScrollRef.current;
  }, [libraryOpen, libraryTab]);
  const [librarySearch, setLibrarySearch] = useState<{
    key: string; status: 'idle' | 'loading' | 'done' | 'error'; results: ConversationSummary[];
  }>({ key: '', status: 'idle', results: [] });
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(() => new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const multiSelectRef = useRef(multiSelect);
  multiSelectRef.current = multiSelect;
  const batchDeleteConfirmRef = useRef(batchDeleteConfirm);
  batchDeleteConfirmRef.current = batchDeleteConfirm;
  const [compactBusy, setCompactBusy] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const [tabMenu, setTabMenu] = useState<{ item: ConversationSummary; container: HTMLElement; x: number; y: number } | null>(null);
  const [turnMenu, setTurnMenu] = useState<{ turnUserId: string; title: string; running: boolean; container: HTMLElement; x: number; y: number } | null>(null);
  const [draft, setDraft] = useState('');
  const [caretIndex, setCaretIndex] = useState(0);
  const [installedLibraries, setInstalledLibraries] = useState<LibraryItem[]>([]);
  const [suggestionItems, setSuggestionItems] = useState<ComposerSuggestion[]>([]);
  const [suggestionSelected, setSuggestionSelected] = useState(0);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionFailed, setSuggestionFailed] = useState(false);
  const [dismissedSuggestion, setDismissedSuggestion] = useState<string | null>(null);
  const [busy, setBusy] = useState<'approve' | 'reject' | 'stop' | null>(null);
  const [sendingConversationIds, setSendingConversationIds] = useState<Set<string | null>>(() => new Set());
  const composerExit = useExitAnimation(150);
  const [composerOpen, setComposerOpenRaw] = useState(false);
  const composerOpenByConversation = useRef<Map<string, boolean>>(readComposerOpenPrefs());
  const [autoCompactPreview, setAutoCompactPreview] = useState<number | null>(null);
  function setComposerOpen(open: boolean) {
    if (!open) composerExit.beginClose();
    if (destinationRef.current === 'side') {
      const id = sideChatRef.current?.sessionId;
      if (id) sideComposerOpenRef.current.set(id, open);
    }
    else {
      mainComposerOpenRef.current = open;
      const id = activeConversationIdRef.current;
      if (id) {
        composerOpenByConversation.current.set(id, open);
        writeComposerOpenPrefs(composerOpenByConversation.current);
      }
    }
    setComposerOpenRaw(open);
  }
  // One-line fallback until fitEditorHeight measures the editor; the same
  // floor clampEditorHeight enforces, so a failed measurement can never
  // shrink the box below a readable line.
  const [composerHeight, setComposerHeight] = useState(EDITOR_ONE_LINE);
  const [attachments, setAttachments] = useState<DroppedAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  // Hover previews of image chips: data URLs land here keyed by file path, so a
  // second hover (or a conversation switch and back) never re-reads the disk.
  const [attachmentPreviews, setAttachmentPreviews] = useState<Record<string, string>>({});
  const [previewCard, setPreviewCard] = useState<{ path: string; name: string; placement: PreviewPlacement } | null>(null);
  const requestedPreviews = useRef(new Set<string>());
  const composerRef = useRef<HTMLFormElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const measure = () => setBubbleWidth(workspace.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [expanded]);
  const composeDockRef = useRef<HTMLDivElement>(null);
  // 输入区实际高度：窗口底边要按它算，不能再用固定估值，否则按钮下半截
  // 会落到窗口外，看起来就是“点不到”。
  const composeDockHeight = useComposeDockHeight(composeDockRef, [composerOpen, attachments.length, composerHeight]);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [approvalMenuOpen, setApprovalMenuOpen] = useState(false);
  const [bypassConfirmOpen, setBypassConfirmOpen] = useState(false);
  const [evolveConfirmOpen, setEvolveConfirmOpen] = useState(false);
  // Self-evolution is the only mode that requires a typed authorization.
  const [evolveAuthorizeText, setEvolveAuthorizeText] = useState('');
  const evolveAuthorizePhrase = '我授权你自动进化';
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [goalPrompting, setGoalPrompting] = useState(false);
  const [imageViewer, setImageViewer] = useState<{ name: string; url: string } | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voicePhase, setVoicePhase] = useState<VoiceManagerPhase>('idle');
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [feedAtBottom, setFeedAtBottom] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const sessionHeaderRef = useRef<HTMLElement>(null);
  const quickTabsRef = useRef<HTMLElement>(null);
  // The tab drag: `tabDragOrder` is the live preview arrangement while a
  // pointer carries a tab around; the drop commits it and the store's own
  // `tabOrder` takes over.
  const [tabDragOrder, setTabDragOrder] = useState<string[] | null>(null);
  // 单个标签挤到 44px 以下时缩成序号；宽度变化由下面的 ResizeObserver 重算。
  const [tabCompact, setTabCompact] = useState(false)
  const tabDragRef = useRef<{ id: string; startX: number; moved: boolean } | null>(null);
  // 拖拽开始时各标签的静态中心：拖拽中不再随 DOM 重排重算，否则目标槽位会在
  // 两个位置之间来回跳，表现为标签不断切换。
  const tabDragCentersRef = useRef<Array<{ id: string; center: number }>>([]);
  const tabClickSuppressRef = useRef(false);
  const followFeedRef = useRef(true);
  // The first content of a conversation is not there yet when the panel
  // mounts. Until the feed actually becomes scrollable once, keep forcing the
  // bottom so a delayed store load cannot leave the view at the top.
  const startupScrollRef = useRef(true);
  /** 切换对话后的短时间窗里，程序滚动不能被 onScroll 当成“用户离开底部”。 */
  const switchJumpRef = useRef(false);
  const onFeedScroll = useFeedScroll({ switchJumpRef, followFeedRef, setFeedAtBottom, loadEarlier });
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const feedWrapRef = useRef<HTMLDivElement>(null);
  const openImageViewer = useCallback((name: string, url: string) => setImageViewer({ name, url }), []);
  openImageViewerRef.current = openImageViewer;
  const composerStash = useRef(new Map<string, StashedComposer<DroppedAttachment>>());
  const goalPromptStash = useRef(new Map<string, boolean>());
  const composerStateRef = useRef({ draft, attachments });
  composerStateRef.current = { draft, attachments };
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const approvalMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const composeTriggerRef = useRef<HTMLButtonElement>(null);
  const voiceManagerRef = useRef<VoiceManager | null>(null);
  const submitLockRef = useRef<Set<string | null>>(new Set());
  const workflowCacheRef = useRef<AppCommandOption[] | null>(null);
  const pendingNewConversationRef = useRef(false);
  const library = mainSnapshot?.conversationLibrary;
  const activeConversationIdRef = useRef<string | null>(library?.activeConversationId ?? null);
  const sideSessionExists = (sessionId: string): boolean => sideSessionExistsUtil(sessionId, sideSnapshots);
  const rememberVisibleSide = (): void => rememberVisibleSideUtil({ destinationRef, sideChatRef, sideSnapshots, composerStateRef, sideComposerStash, sideComposerOpenRef, composerOpen });
  useLayoutEffect(() => {
    const nextId = library?.activeConversationId ?? null;
    const previousId = activeConversationIdRef.current;
    if (library) {
      const valid = new Set(library.conversations.filter((item) => item.archivedAt === null).map((item) => item.id));
      for (const [parentId, saved] of sideSnapshots.current) {
        if (valid.has(parentId)) continue;
        sideSnapshots.current.delete(parentId);
        forgetSideSession(saved.sessionId, sideComposerStash, sideComposerOpenRef);
      }
    }
    if (previousId !== nextId) {
      rememberVisibleSide();
      const carryNewDraft = pendingNewConversationRef.current && previousId === null && nextId !== null && destinationRef.current === 'main';
      if (destinationRef.current === 'main' && previousId) {
        // 切走前记下这个会话的输入框开合，回来时原样恢复。
        composerOpenByConversation.current.set(previousId, mainComposerOpenRef.current);
        writeComposerOpenPrefs(composerOpenByConversation.current);
        if (library?.conversations.some((item) => item.id === previousId)) {
          const current = composerStateRef.current;
          stashComposerState(composerStash.current, previousId, current.draft, current.attachments);
          flushDraft(previousId, current.draft);
          goalPromptStash.current.set(previousId, goalPrompting);
        } else {
          composerStash.current.delete(previousId);
          goalPromptStash.current.delete(previousId);
        }
      }
      activeConversationIdRef.current = nextId;
      destinationRef.current = 'main';
      sideChatRef.current = null;
      setSideChat(null);
      if (carryNewDraft) {
        stashComposerState(composerStash.current, nextId, composerStateRef.current.draft, composerStateRef.current.attachments);
      } else {
        const restored = restoreComposerState(composerStash.current, nextId);
        composerStateRef.current = restored;
        setDraft(restored.draft);
        setAttachments(restored.attachments);
        setCaretIndex(restored.draft.length);
        const goalDraftOpen = Boolean(nextId && goalPromptStash.current.get(nextId));
        setGoalPrompting(goalDraftOpen);
        const rememberedOpen = nextId ? composerOpenByConversation.current.get(nextId) : undefined;
        mainComposerOpenRef.current = rememberedOpen ?? Boolean(restored.draft || restored.attachments.length || goalDraftOpen);
        setComposerOpenRaw(mainComposerOpenRef.current);
        // 切到正在思考或运行的会话时，直接落到最新一条。
        const targetRunning = nextId
          ? library?.conversations.find((item) => item.id === nextId)?.taskStatus !== 'idle'
          : false;
        if (targetRunning) window.requestAnimationFrame(() => scrollToBottom());
      }
      setAttachmentError(null);
      setDismissedSuggestion(null);
      setModelPickerOpen(false);
      setContextMenuOpen(false);
      pendingNewConversationRef.current = false;
      draftRestoredRef.current = false;
      const targetSide = nextId ? sideSnapshots.current.get(nextId) : null;
      if (targetSide) applySideSnapshotRef.current(targetSide);
      return;
    }
  }, [library?.activeConversationId, library?.conversations]);
  applySideSnapshotRef.current = (next) => {
    const parentId = next.parentConversationId;
    if (!parentId) return;
    if (library && !library.conversations.some((item) => item.id === parentId && item.archivedAt === null)) return;
    const saved = sideSnapshots.current.get(parentId);
    if (next.sessionId && saved?.sessionId === next.sessionId && next.snapshot &&
        saved.snapshot && next.snapshot.timelineRevision < saved.snapshot.timelineRevision) return;
    if (saved?.sessionId && saved.sessionId !== next.sessionId) forgetSideSession(saved.sessionId, sideComposerStash, sideComposerOpenRef);
    sideSnapshots.current.set(parentId, next);
    if (parentId !== activeConversationIdRef.current) return;
    const previousSide = sideChatRef.current;
    const nextDestination = next.sessionId && next.expanded && next.snapshot &&
      next.parentConversationId === activeConversationIdRef.current ? 'side' : 'main';
    const previousDestination = destinationRef.current;
    sideChatRef.current = next;
    if (nextDestination !== previousDestination ||
        (nextDestination === 'side' && previousSide?.sessionId !== next.sessionId)) {
      const current = composerStateRef.current;
      if (previousDestination === 'side' && previousSide?.sessionId &&
          previousSide.sessionId === next.sessionId) {
        stashComposerState(sideComposerStash.current, previousSide.sessionId, current.draft, current.attachments);
      } else {
        if (previousDestination === 'main') {
          const id = activeConversationIdRef.current;
          stashComposerState(composerStash.current, id, current.draft, current.attachments);
          flushDraft(id, current.draft);
          if (id) goalPromptStash.current.set(id, goalPrompting);
        }
      }
      const restored = nextDestination === 'side'
        ? restoreComposerState(sideComposerStash.current, next.sessionId)
        : restoreComposerState(composerStash.current, activeConversationIdRef.current);
      composerStateRef.current = { draft: restored.draft, attachments: [...restored.attachments] };
      setDraft(restored.draft);
      setAttachments([...restored.attachments]);
      setCaretIndex(restored.draft.length);
      setAttachmentError(null);
      setDismissedSuggestion(null);
      setModelPickerOpen(false);
      setContextMenuOpen(false);
      setGoalPrompting(nextDestination === 'main' && Boolean(goalPromptStash.current.get(activeConversationIdRef.current ?? '')));
      setComposerOpenRaw(nextDestination === 'side'
        ? sideComposerOpenRef.current.get(next.sessionId!) ?? true : mainComposerOpenRef.current);
      destinationRef.current = nextDestination;
    }
    setSideChat(next);
  };
  useEffect(() => {
    let mounted = true;
    let sawEvent = false;
    let bridge: PetAPI;
    try { bridge = petBridge(); } catch { return; }
    if (typeof bridge.onSideChatSnapshot !== 'function' || typeof bridge.getSideChat !== 'function') return;
    const unsubscribe = bridge.onSideChatSnapshot((next) => {
      if (!mounted) return;
      sawEvent = true;
      applySideSnapshotRef.current(next);
    });
    void bridge.getSideChat().then((next) => {
      if (mounted && !sawEvent) applySideSnapshotRef.current(next);
    }).catch(() => undefined);
    return () => { mounted = false; unsubscribe(); };
  }, []);
  // 头像一挂载就去读一遍并缓存：发送新消息时 AvatarGlyph 初始 state 能直接
  // 命中，不会先闪一个占位字再换图。
  useEffect(() => {
    const preload = (kind: 'user' | 'assistant', name: string | null | undefined): void => {
      if (!name || avatarCache.has(name)) return;
      try {
        void petBridge().readAvatar(kind).then((data) => avatarCache.set(name, data)).catch(() => undefined);
      } catch { /* 静态预览无桥。 */ }
    };
    preload('user', library?.settings.userAvatar);
    preload('assistant', library?.settings.assistantAvatar);
  }, [library?.settings.userAvatar, library?.settings.assistantAvatar]);
  const rowDisplay: RowDisplay = {
    showTimestamps: library?.settings.showMessageTimestamps ?? true,
    avatars: { user: library?.settings.userAvatar ?? null, assistant: library?.settings.assistantAvatar ?? null },
    personaAvatar: personaAvatarUrl(library?.settings.personaId),
    expandEditsByDefault: library?.settings.expandFileEditsByDefault === true,
    toolRowDetail: library?.settings.toolRowDetail ?? 'brief',
    workspace: snapshot?.workspace
  };
  // The stop action is defined lower in the component, but rows rendered
  // through renderEntry still need a stable callback. The ref carries the
  // latest stop closure without forcing every memoized row to re-render.
  const killTurnRef = useRef<() => void>(() => undefined);
  const killTurn = useCallback(() => killTurnRef.current(), []);
  // Stable while the display settings are unchanged — that is what keeps the
  // memoized clusters from re-rendering on every stream tick. The image
  // viewer callback rides a ref for the same reason.
  const renderEntry = useCallback(
    (entry: TimelineEntry, running: boolean) => (
      <EntryItem entry={entry} running={running} onOpenImage={openImageViewerRef.current} onKill={killTurn} display={rowDisplay} />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowDisplay.showTimestamps, rowDisplay.avatars.user, rowDisplay.avatars.assistant, rowDisplay.expandEditsByDefault, rowDisplay.toolRowDetail, rowDisplay.workspace, killTurn]
  );
  // The progress sentences inside a folded turn render the same way they do
  // outside one — the same RunParagraph rows, from a ref-stable callback.
  const renderNote = useCallback(
    (entry: TimelineEntry) => <RunParagraph entry={entry} onOpenImage={openImageViewerRef.current} />,
    []
  );
  const libraryRevision = JSON.stringify(library?.conversations.map((item) => [
    item.id, item.title, item.archivedAt, item.pinnedAt, item.updatedAt, item.messageCount
  ]) ?? []);
  const librarySearchKey = JSON.stringify([libraryQuery.trim(), libraryArchived, libraryRevision]);
  const sendingCurrent = sideExpanded ? sideSendingIds.has(sideSessionId!) : sendingConversationIds.has(library?.activeConversationId ?? null);
  const contextUsage = snapshot?.contextUsage;
  const contextCompacting = compactBusy || Boolean(snapshot?.contextCompacting);
  const recentSessions = useMemo(() => (library?.conversations ?? []).filter((item) => !item.archivedAt), [library?.conversations]);
  const hiddenTabs = library?.settings.hiddenTabIds ?? EMPTY_TAB_ORDER;
  const tabLimit = quickTabLimit(library?.settings.visibleConversationTabs);
  // While a drag is in flight the preview order wins, so the tab under the
  // pointer sits where the user has carried it; the drop commits the order.
  const orderedSessions = useMemo(() => orderConversationTabs(recentSessions.filter((item) => !hiddenTabs.includes(item.id)), tabDragOrder ?? library?.settings.tabOrder ?? EMPTY_TAB_ORDER), [recentSessions, hiddenTabs, tabDragOrder, library?.settings.tabOrder]);
  const orderedSessionsRef = useRef(orderedSessions);
  orderedSessionsRef.current = orderedSessions;
  const tabDragOrderRef = useRef(tabDragOrder);
  tabDragOrderRef.current = tabDragOrder;
  const quickTabs = orderedSessions.slice(0, tabLimit);
  const selectedSession = recentSessions.find((item) => item.id === library?.activeConversationId);
  if (selectedSession && !quickTabs.some((item) => item.id === selectedSession.id)) quickTabs.splice(Math.max(0, tabLimit - 1), 1, selectedSession);
  // 单个标签的实际宽度决定要不要缩成序号：窗口或标签数一变就重算。
  useEffect(() => {
    const nav = quickTabsRef.current
    if (!nav) return
    const update = (): void => {
      const count = nav.querySelectorAll('.panel-quick-tab[data-tab-id]').length
      if (!count) return
      // 44px 是「序号 + 内边距 + 关闭键」还能读得下的下限。
      const next = nav.clientWidth / count < 44
      setTabCompact((current) => (current === next ? current : next))
    }
    update()
    // jsdom 里没有 ResizeObserver；真实 Electron 里一定有。
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [quickTabs.length, expanded, libraryRevision])
  const suggestionTrigger = detectComposerTrigger(draft, caretIndex);
  const suggestionKey = suggestionTrigger ? `${suggestionTrigger.kind}:${suggestionTrigger.start}:${suggestionTrigger.query}` : null;
  const suggestionOpen = Boolean(suggestionKey && suggestionKey !== dismissedSuggestion && composerOpen);
  const composerKeys = useComposerKeys({ setDraft, setCaretIndex, setDismissedSuggestion, suggestionOpen, suggestionItems, suggestionSelected, setSuggestionSelected, suggestionKey, acceptSuggestion, goalPrompting, editorRef, addFiles, send });
  useEffect(() => {
    if (!visible) return;
    let active = true;
    try {
      void petBridge().listLibraries().then((items) => {
        if (active && Array.isArray(items)) setInstalledLibraries(items);
      }).catch(() => undefined);
    } catch {
      // The static HTML preview has no desktop bridge.
    }
    return () => { active = false; };
  }, [visible, composerOpen]);
  function refreshContextUsage(): void {
    try {
      const bridge = petBridge();
      void (sideExpanded && sideSessionId
        ? bridge.getSideChatContextUsage(sideSessionId)
        : bridge.getContextUsage()).catch(() => undefined);
    } catch {
      // The static HTML preview has no desktop bridge.
    }
  }

  useEffect(() => {
    let bridge: PetAPI;
    try { bridge = petBridge(); } catch { return; }
    return bridge.onSlashUiAction((action) => {
      setSessionMenuOpen(false);
      if (action === 'sessions') {
        setLibraryOpen(true);
        setModelPickerOpen(false);
        setLibraryError(null);
      } else if (action === 'model') {
        setLibraryOpen(false);
        setComposerOpen(true);
        setModelPickerOpen(true);
      } else {
        setLibraryOpen(false);
        setComposerOpen(true);
        setModelPickerOpen(false);
        workflowCacheRef.current = null;
        setDismissedSuggestion(null);
        setDraft('/');
        setCaretIndex(1);
        requestAnimationFrame(() => {
          editorRef.current?.focus();
          editorRef.current?.setSelectionRange(1, 1);
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!suggestionOpen || (suggestionTrigger?.kind !== 'workflow' && suggestionTrigger?.kind !== 'skill')) workflowCacheRef.current = null;
  }, [suggestionOpen, suggestionTrigger?.kind]);

  useEffect(() => {
    setSuggestionSelected(0);
    if (!suggestionOpen || !suggestionTrigger) {
      setSuggestionItems([]);
      setSuggestionLoading(false);
      setSuggestionFailed(false);
      return;
    }
    let cancelled = false;
    let timer: number | undefined;
    setSuggestionLoading(true);
    setSuggestionFailed(false);
    let bridge: PetAPI;
    try {
      bridge = petBridge();
    } catch {
      setSuggestionLoading(false);
      setSuggestionItems([]);
      setSuggestionFailed(true);
      return;
    }
    if (suggestionTrigger.kind === 'workflow' || suggestionTrigger.kind === 'skill') {
      const fetchOptions = workflowCacheRef.current
        ? Promise.resolve(workflowCacheRef.current)
        : bridge.listAppCommands().then((options) => { workflowCacheRef.current = options; return options; });
      void fetchOptions.then((options) => {
        if (cancelled) return;
        const available = sideExpanded
          ? options.filter((option) => option.kind !== 'command' || !MAIN_ONLY_SIDE_COMMANDS.has(option.name.replace(/^\//u, '').toLowerCase()))
          : options;
        setSuggestionItems(workflowSuggestionItems(available.map((option) =>
          !sideExpanded && option.kind === 'command' && (option.name === 'side' || option.name === 'btw')
            ? { ...option, description: '填写问题后开启临时会话；空命令不会开启' }
            : option), suggestionTrigger));
      }).catch(() => { if (!cancelled) { setSuggestionItems([]); setSuggestionFailed(true); } }).finally(() => { if (!cancelled) setSuggestionLoading(false); });
    } else {
      const libraryItems = librarySuggestionItems(installedLibraries, suggestionTrigger.query);
      const sessions = sessionSuggestionItems(library?.conversations ?? [], suggestionTrigger.query, library?.activeConversationId ?? null);
      setSuggestionItems([...libraryItems, ...sessions]);
      timer = window.setTimeout(() => {
        void bridge.searchWorkspaceFiles(suggestionTrigger.query).then((files) => {
          if (cancelled) return;
          const fileItems = files.slice(0, 8).map((file) => ({
            id: file.relativePath,
            label: file.name,
            detail: `${file.kind === 'directory' ? '目录' : '文件'}，${file.relativePath}`,
            insertText: fileMention(file.relativePath)
          }));
          setSuggestionItems([...libraryItems, ...sessions, ...fileItems].slice(0, 10));
        }).catch(() => { if (!cancelled) { setSuggestionItems([...libraryItems, ...sessions]); setSuggestionFailed(true); } }).finally(() => { if (!cancelled) setSuggestionLoading(false); });
      }, 120);
    }
    return () => { cancelled = true; if (timer !== undefined) window.clearTimeout(timer); };
  }, [suggestionKey, suggestionOpen, libraryRevision, sideExpanded, installedLibraries]);

  useDismissable({ open: sessionMenuOpen, onClose: () => setSessionMenuOpen(false), ignoreRef: sessionHeaderRef });

  useDismissable({ open: modelPickerOpen, onClose: () => setModelPickerOpen(false), ignoreRef: modelPickerRef, capture: true, closeOnBlur: true, onOpen: refreshContextUsage, extraDeps: [library?.activeConversationId, snapshot?.mode, sideSessionId, sideExpanded] });

  useDismissable({ open: approvalMenuOpen, onClose: () => setApprovalMenuOpen(false), ignoreRef: approvalMenuRef });

  useEffect(() => {
    if (!bypassConfirmOpen && !evolveConfirmOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setBypassConfirmOpen(false);
        setEvolveConfirmOpen(false);
      }
    };
    document.addEventListener('keydown', closeOnEscape, true);
    return () => document.removeEventListener('keydown', closeOnEscape, true);
  }, [bypassConfirmOpen, evolveConfirmOpen]);

  useDismissable({ open: Boolean(imageViewer), onClose: () => setImageViewer(null), stopPropagation: true });

  useDismissable({ open: contextMenuOpen, onClose: () => setContextMenuOpen(false), ignoreRef: contextMenuRef, capture: true, onOpen: refreshContextUsage, extraDeps: [sideSessionId, sideExpanded] });

  // The meter has to be right the moment a conversation appears, not only after a
  // turn finishes: loading a conversation resets it to "unreadable", and waiting
  // for the next reply (or opening the model picker) left it blank for minutes.
  useEffect(() => {
    if (snapshot?.mode !== 'dsh') return;
    refreshContextUsage();
  }, [library?.activeConversationId, snapshot?.mode, sideSessionId, sideExpanded]);

  // A finished turn just changed the context: refresh the meter on its own
  // instead of waiting for someone to open the model picker.
  useEffect(() => {
    if (!snapshot?.taskMetrics?.finishedAt || snapshot?.mode !== 'dsh') return;
    refreshContextUsage();
  }, [snapshot?.taskMetrics?.finishedAt, snapshot?.mode, sideSessionId, sideExpanded]);

  useEffect(() => {
    if (!libraryOpen || !libraryQuery.trim()) {
      setLibrarySearch((current) => current.status === 'idle' ? current : { key: '', status: 'idle', results: [] });
      return;
    }
    let cancelled = false;
    setLibrarySearch({ key: librarySearchKey, status: 'loading', results: [] });
    const timer = window.setTimeout(() => {
      try {
        void petBridge().searchConversations(libraryQuery, libraryArchived).then((results) => {
          if (!cancelled) setLibrarySearch({ key: librarySearchKey, status: 'done', results });
        }).catch(() => {
          if (!cancelled) setLibrarySearch({ key: librarySearchKey, status: 'error', results: [] });
        });
      } catch {
        if (!cancelled) setLibrarySearch({ key: librarySearchKey, status: 'error', results: [] });
      }
    }, 150);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [libraryOpen, librarySearchKey]);

  // While the library drawer is open its lower edge tracks the composer's top
  // edge: the dock's distance from the workspace's bottom is re-measured
  // whenever either box resizes, so the drawer follows the composer through
  // collapses, expansions, and every added line.
  useLayoutEffect(() => {
    if (!libraryOpen && rightRail === 'closed') {
      // Closing: keep the frozen offset so the exit plays where it was.
      if (!drawerExit.closing) setDrawerBottom(null);
      return;
    }
    const workspace = workspaceRef.current;
    const dock = composeDockRef.current;
    if (!workspace || !dock) return;
    const measure = () => setDrawerBottom(drawerBottomOffset(workspace.getBoundingClientRect().bottom, dock.getBoundingClientRect().top));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(workspace);
    observer.observe(dock);
    return () => observer.disconnect();
  }, [libraryOpen, rightRail, drawerExit.closing]);

  useEffect(() => {
    if (!voiceError) return
    const timer = window.setTimeout(() => setVoiceError(null), 4000)
    return () => window.clearTimeout(timer)
  }, [voiceError])

  useEffect(() => {
    if (!visible) {
      setComposerOpen(false);
      setModelPickerOpen(false);
      setSessionMenuOpen(false);
      setTabMenu(null);
      setLibraryOpen(false);
      voiceManagerRef.current?.stop();
      return;
    }
    // 打开窗口时如果会话正在思考或运行，直接落到最新一条。
    if (snapshot?.taskStatus && snapshot.taskStatus !== 'idle') {
      window.requestAnimationFrame(() => scrollToBottom());
    }
  }, [visible]);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    void (async () => {
      try {
        const bridge = petBridge();
        const config = await bridge.getVoiceConfig();
        if (!active) return;
        setVoiceConfig(config);
        const manager = new VoiceManager(bridge, {
          onPhaseChange: (phase) => { if (active) setVoicePhase(phase); },
          onError: (message) => { if (active) setVoiceError(message); },
          onRequestText: async (text) => {
            if (!active) return;
            const sideId = destinationRef.current === 'side' ? sideChatRef.current?.sessionId : null;
            if (sideId) await bridge.sendSideChatMessage(sideId, text);
            else await bridge.sendMessage(text);
          },
        }, config);
        voiceManagerRef.current = manager;
        setVoiceReady(true);
        try {
          unsubscribe = bridge.onVoiceConfigChanged((next) => {
            if (!active) return;
            setVoiceConfig(next);
            voiceManagerRef.current?.updateConfig(next);
          });
        } catch {
          // A static preview has no bridge event.
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
      unsubscribe();
      voiceManagerRef.current?.destroy();
      voiceManagerRef.current = null;
    };
  }, []);

  useEffect(() => {
    voiceManagerRef.current?.updateFromSnapshot(snapshot ?? {
      mode: 'dsh',
      modelReady: false,
      dshReady: false,
      avatarState: 'idle',
      taskStatus: 'idle',
      timeline: [],
      timelineRevision: 0,
    });
  }, [snapshot]);

  useEffect(() => {
    if (!composerOpen) return;
    const frame = requestAnimationFrame(() => editorRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [composerOpen]);

  const newestText = snapshot?.timeline[snapshot.timeline.length - 1]?.text;
  useEffect(() => {
    const feed = feedRef.current;
    if (!visible || !feed || !followFeedRef.current || library?.settings.autoScroll === false || window.getSelection()?.toString()) return;
    // Reading scrollHeight forces a layout; do it once per frame instead of once per snapshot.
    const frame = requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
    return () => cancelAnimationFrame(frame);
  }, [visible, composerOpen, snapshot?.timeline.length, newestText, snapshot?.proposal?.id, library?.settings.autoScroll]);

  // 切换对话：把视图钉在最新一条。只滚一次不够——切换后的快照可能晚一拍
  // 才到，平滑滚动又会被 onScroll 当成“用户离开底部”，跟随就断了。这里用
  // 多次直接赋值，并让 onScroll 在这段时间里保持跟随；用户主动滚动或超时
  // 后结束。
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !visible) return;
    switchJumpRef.current = true;
    startupScrollRef.current = true;
    followFeedRef.current = true;
    setFeedAtBottom(true);
    const jump = (): void => {
      if (!switchJumpRef.current) return;
      feed.scrollTop = feed.scrollHeight;
    };
    jump();
    const timers = [40, 120, 260, 450, 700, 1000].map((ms) => window.setTimeout(jump, ms));
    const release = (): void => { switchJumpRef.current = false; };
    feed.addEventListener('wheel', release, { passive: true });
    feed.addEventListener('touchstart', release, { passive: true });
    const stopTimer = window.setTimeout(release, 1200);
    return () => {
      switchJumpRef.current = false;
      for (const timer of timers) window.clearTimeout(timer);
      window.clearTimeout(stopTimer);
      feed.removeEventListener('wheel', release);
      feed.removeEventListener('touchstart', release);
    };
  }, [snapshot?.conversationId, visible]);
  // 新对话的内容晚到时再补一次；已经到底就自然结束。
  useEffect(() => {
    if (!switchJumpRef.current) return;
    const feed = feedRef.current;
    if (!feed) return;
    const frame = requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
    return () => cancelAnimationFrame(frame);
  }, [snapshot?.timeline.length, snapshot?.timelineRevision]);
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !visible || !startupScrollRef.current) return;
    followFeedRef.current = true;
    setFeedAtBottom(true);
    const jump = () => {
      if (!startupScrollRef.current) return;
      feed.scrollTop = feed.scrollHeight;
      if (feed.scrollHeight > feed.clientHeight + 1) startupScrollRef.current = false;
    };
    jump();
    const frame = requestAnimationFrame(jump);
    const soon = window.setTimeout(jump, 120);
    const settle = window.setTimeout(jump, 400);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(soon);
      window.clearTimeout(settle);
    };
  }, [visible, snapshot?.conversationId, snapshot?.timeline.length]);

  function restoreRejectedSubmission(originId: string | null, sentDraft: string,
    sentAttachments: DroppedAttachment[], goal = false): void {
    const stillHere = destinationRef.current === 'main' && activeConversationIdRef.current === originId;
    const current = stillHere ? composerStateRef.current : restoreComposerState(composerStash.current, originId);
    const restored = {
      draft: mergeComposerDraft(sentDraft, current.draft),
      attachments: mergeComposerAttachments(sentAttachments, current.attachments)
    };
    if (originId) {
      stashComposerState(composerStash.current, originId, restored.draft, restored.attachments);
      if (goal) goalPromptStash.current.set(originId, true);
    }
    if (!stillHere) return;
    composerStateRef.current = restored;
    setDraft(restored.draft);
    setAttachments(restored.attachments);
    if (restored.attachments.length > 5) setAttachmentError('已保留全部附件；一次最多发送 5 个，请先移除多余附件。');
    if (goal) setGoalPrompting(true);
    setComposerOpen(true);
  }

  function beginSubmission(conversationId: string | null): boolean {
    if (submitLockRef.current.has(conversationId)) return false;
    submitLockRef.current.add(conversationId);
    setSendingConversationIds(new Set(submitLockRef.current));
    return true;
  }

  function endSubmission(conversationId: string | null): void {
    submitLockRef.current.delete(conversationId);
    setSendingConversationIds(new Set(submitLockRef.current));
  }

  async function sendSide(strategy: 'queue' | 'steer'): Promise<void> {
    const sessionId = sideChatRef.current?.sessionId;
    if (!sessionId || sideSubmitLockRef.current.has(sessionId) || contextCompacting) return;
    const message = draft.trim() || (attachments.length ? '请阅读附件并帮助我。' : '');
    if (!message) return;
    const commandError = sideOnlySlashError(message);
    if (commandError) {
      setAttachmentError(commandError);
      return;
    }
    if (attachments.length > 5) {
      setAttachmentError('一次最多发送 5 个附件，请先移除多余附件。');
      return;
    }
    const attachmentSize = attachments.reduce((sum, item) => sum + item.content.length + (item.path?.length ?? 0) + item.name.length + 100, 0);
    if (message.length + attachmentSize > 8_000) {
      setAttachmentError('消息与附件内容合计不能超过 8000 字，请移除较大的文件。');
      return;
    }
    const sentDraft = draft;
    const sentAttachments = attachments;
    const payload = attachments.map(({ name, content, path }) => ({ name, content, path }));
    sideSubmitLockRef.current.add(sessionId);
    setSideSendingIds(new Set(sideSubmitLockRef.current));
    stashComposerState(sideComposerStash.current, sessionId, '', []);
    composerStateRef.current = { draft: '', attachments: [] };
    setDraft('');
    setAttachments([]);
    setAttachmentError(null);
    followFeedRef.current = true;
    let accepted = false;
    try {
      accepted = await run((bridge) => bridge.sendSideChatMessage(sessionId, message, payload, strategy));
    } catch {
      accepted = false;
    } finally {
      sideSubmitLockRef.current.delete(sessionId);
      setSideSendingIds(new Set(sideSubmitLockRef.current));
    }
    if (accepted || !sideSessionExists(sessionId)) return;
    const stillHere = destinationRef.current === 'side' && sideChatRef.current?.sessionId === sessionId;
    const current = stillHere ? composerStateRef.current : restoreComposerState(sideComposerStash.current, sessionId);
    const restored = {
      draft: mergeComposerDraft(sentDraft, current.draft),
      attachments: mergeComposerAttachments(sentAttachments, current.attachments)
    };
    stashComposerState(sideComposerStash.current, sessionId, restored.draft, restored.attachments);
    if (stillHere) {
      composerStateRef.current = restored;
      setDraft(restored.draft);
      setAttachments(restored.attachments);
      setComposerOpen(true);
      setAttachmentError('临时会话发送失败，草稿已恢复。');
    }
  }

  async function send(strategy: 'queue' | 'steer' = 'queue') {
    if (destinationRef.current === 'side') {
      await sendSide(strategy);
      return;
    }
    if (goalPrompting) {
      const goal = draft.trim();
      const originId = activeConversationIdRef.current;
      if (!goal || submitLockRef.current.has(originId) || contextCompacting) return;
      const sentDraft = draft;
      if (originId) {
        stashComposerState(composerStash.current, originId, '', attachments);
        goalPromptStash.current.set(originId, false);
      }
      composerStateRef.current = { draft: '', attachments };
      setDraft('');
      setGoalPrompting(false);
      const accepted = await sendGoal(`/goal ${goal}`, originId);
      if (!accepted) restoreRejectedSubmission(originId, sentDraft, [], true);
      return;
    }
    const message = draft.trim() || (attachments.length ? '请阅读附件并帮助我。' : '');
    const originId = activeConversationIdRef.current;
    if (!message || submitLockRef.current.has(originId) || contextCompacting) return;
    if (attachments.length > 5) {
      setAttachmentError('一次最多发送 5 个附件，请先移除多余附件。');
      return;
    }
    const attachmentSize = attachments.reduce((sum, item) => sum + item.content.length + (item.path?.length ?? 0) + item.name.length + 100, 0);
    if (message.length + attachmentSize > 8_000) {
      setAttachmentError('消息与附件内容合计不能超过 8000 字，请移除较大的文件。');
      return;
    }
    followFeedRef.current = true;
    const sentDraft = draft;
    const sentAttachments = attachments;
    const payload = attachments.map(({ name, content, path }) => ({ name, content, path }));
    if (!beginSubmission(originId)) return;
    if (originId) stashComposerState(composerStash.current, originId, '', []);
    composerStateRef.current = { draft: '', attachments: [] };
    setDraft('');
    setAttachments([]);
    setAttachmentError(null);
    let accepted = false;
    try {
      accepted = await run((bridge) => bridge.sendMessage(message, payload, strategy, originId ?? undefined));
    } catch (cause) {
      setAttachmentError(cause instanceof Error ? cause.message : '发送失败，草稿已恢复。');
    } finally {
      endSubmission(originId);
    }
    if (!accepted) restoreRejectedSubmission(originId, sentDraft, sentAttachments);
    // Let the new row render, then settle at the newest message.
    window.setTimeout(scrollToBottom, 300);
  }

  function acceptSuggestion(item: ComposerSuggestion) {
    if (!suggestionTrigger) return;
    const after = draft.slice(suggestionTrigger.end);
    const inserted = item.insertText + (after && /^\s/.test(after) ? '' : ' ');
    const next = draft.slice(0, suggestionTrigger.start) + inserted + after;
    const nextCaret = suggestionTrigger.start + inserted.length;
    setDraft(next);
    setCaretIndex(nextCaret);
    setDismissedSuggestion(null);
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(nextCaret, nextCaret);
      setCaretIndex(nextCaret);
    });
  }

  async function addFiles(files: File[]) {
    const origin = destinationRef.current;
    const originSideId = origin === 'side' ? sideChatRef.current?.sessionId : null;
    const originConversationId = origin === 'main' ? activeConversationIdRef.current : null;
    const originIsCurrent = () => destinationRef.current === origin && (origin === 'side'
      ? sideChatRef.current?.sessionId === originSideId
      : activeConversationIdRef.current === originConversationId);
    setAttachmentError(null);
    const remaining = Math.max(0, 5 - attachments.length);
    if (!remaining) { setAttachmentError('一次最多添加 5 个文件。'); return; }
    if (files.length > remaining) setAttachmentError('一次最多添加 5 个文件。');
    let bridge: PetAPI;
    try { bridge = petBridge(); }
    catch { if (originIsCurrent()) setAttachmentError('文件服务尚未就绪。'); return; }
    const prepared = await Promise.allSettled(files.slice(0, remaining).map((file) => prepareFileAttachment(bridge, file)));
    const failed = prepared.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected' && originIsCurrent()) setAttachmentError(failed.reason instanceof Error ? failed.reason.message : '文件读取失败。');
    if (origin === 'side' && (!originSideId || !sideSessionExists(originSideId))) return;
    const mergePrepared = (current: DroppedAttachment[]): DroppedAttachment[] => {
      const next = [...current];
      for (const result of prepared) {
        if (result.status !== 'fulfilled' || next.length >= 5) continue;
        if (!next.some((item) => item.path === result.value.path)) next.push({ id: crypto.randomUUID(), ...result.value });
      }
      return next;
    };
    if (originIsCurrent()) setAttachments(mergePrepared);
    else if (origin === 'side' && originSideId) {
      const saved = restoreComposerState(sideComposerStash.current, originSideId);
      stashComposerState(sideComposerStash.current, originSideId, saved.draft, mergePrepared(saved.attachments));
    }
    else if (originConversationId) {
      const stashed = restoreComposerState(composerStash.current, originConversationId);
      stashComposerState(composerStash.current, originConversationId, stashed.draft, mergePrepared(stashed.attachments));
    }
  }

  /** Fetch an image chip's bytes once; later hovers reuse the data URL. */
  function requestAttachmentPreview(attachment: UserAttachment) {
    const target = attachment.path;
    if (!target || requestedPreviews.current.has(target)) return;
    requestedPreviews.current.add(target);
    try {
      void petBridge().readImagePreview(target).then((url) => {
        if (url) setAttachmentPreviews((current) => ({ ...current, [target]: url }));
        else requestedPreviews.current.delete(target); // Let a later hover retry a file that was briefly unreadable.
      }).catch(() => requestedPreviews.current.delete(target));
    } catch { requestedPreviews.current.delete(target); }
  }

  function showAttachmentPreview(attachment: UserAttachment, chip: HTMLElement): void {
    showAttachmentPreviewImpl({ attachment, chip, composerRef, requestPreview: requestAttachmentPreview, setPreviewCard });
  }
  async function openAttachmentImage(attachment: UserAttachment): Promise<void> {
    await openAttachmentImageImpl({ attachment, previews: attachmentPreviews, setPreviews: setAttachmentPreviews, setPreviewCard, openViewer: openImageViewer });
  }
  async function chooseEffort(level: EffortLevel): Promise<void> {
    await chooseEffortImpl({ level, current: snapshot?.effort, destination: destinationRef.current, run });
  }
  /** 上下文弹窗里的阈值行：一格 5%，滚动只改预览，停下才提交。 */
  function nudgeAutoCompact(delta: number): void {
    nudgeAutoCompactImpl({
      delta,
      current: autoCompactPreview ?? library?.settings.autoCompactPercent,
      run,
      onPreview: setAutoCompactPreview
    });
  }
  async function choosePlanMode(on: boolean): Promise<void> {
    await choosePlanModeImpl({ on, current: snapshot?.planMode, destination: destinationRef.current, sideSessionId: sideChatRef.current?.sessionId, run });
  }
  const approvalDeps = (): ApprovalModeActionsDeps => ({
    approvalMode: snapshot?.approvalMode, destination: destinationRef.current, run,
    closeMenu: () => setApprovalMenuOpen(false), setBypassOpen: setBypassConfirmOpen,
    setEvolveOpen: setEvolveConfirmOpen, resetEvolveText: () => setEvolveAuthorizeText('')
  });
  async function applyApprovalMode(mode: ApprovalMode): Promise<void> {
    await applyApprovalModeImpl(mode, approvalDeps());
  }
  async function chooseApprovalMode(mode: ApprovalMode): Promise<void> {
    await chooseApprovalModeImpl(mode, approvalDeps());
  }
  /** Goal mode is the CLI's own /goal: the command starts the stop-hook loop.
   *  Setting it is an ordinary queued turn; clearing it goes through clearGoal
   *  instead — steered into the running loop the command never reaches the CLI
   *  as a command. The composer draft is left untouched. */
  async function sendGoal(text: string, conversationId: string | null = activeConversationIdRef.current): Promise<boolean> {
    if (!snapshot || !text.trim() || !beginSubmission(conversationId)) return false;
    try {
      return await run((bridge) => bridge.sendMessage(text, [], 'queue', conversationId ?? undefined));
    } catch (cause) {
      setAttachmentError(cause instanceof Error ? cause.message : '目标发送失败，内容已恢复。');
      return false;
    } finally {
      endSubmission(conversationId);
    }
  }

  /** The banner's stop button: the main process interrupts the goal loop's
   *  current turn and delivers /goal clear as the next turn of its own. */
  function clearGoal(): void {
    void run((bridge) => bridge.clearGoal(activeConversationIdRef.current ?? undefined));
  }

  /** The goal switch flips the composer into "write the goal" mode: opening
   *  closes the menu and prompts in place; closing clears a running goal, or
   *  just backs out of the prompt. */
  function toggleGoal(): void {
    if (goalPrompting) { setGoalPrompting(false); return; }
    if (snapshot?.goal) { clearGoal(); return; }
    setGoalPrompting(true);
    setModelPickerOpen(false);
    setComposerOpen(true);
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  async function chooseModel(mode: ModelMode) {
    const sideId = destinationRef.current === 'side' ? sideChatRef.current?.sessionId : null;
    const accepted = await run((bridge) => sideId ? bridge.setSideChatModelMode(sideId, mode) : bridge.setModelMode(mode));
    if (accepted) setModelPickerOpen(false);
  }

  async function switchModelProfile(id: string): Promise<void> {
    if (destinationRef.current === 'side') return;
    await run((bridge) => bridge.setModelProfile(id));
  }

  async function compactContext() {
    if (compactBusy || snapshot?.contextCompacting) return;
    setCompactBusy(true);
    try {
      const sideId = destinationRef.current === 'side' ? sideChatRef.current?.sessionId : null;
      const accepted = await run((bridge) => sideId ? bridge.compactSideChat(sideId) : bridge.compactConversation());
      if (accepted) setModelPickerOpen(false);
    } finally {
      setCompactBusy(false);
    }
  }

  function closeComposer() {
    setComposerOpen(false);
    setModelPickerOpen(false);
  }

  async function decide(approved: boolean): Promise<void> {
    await decideAction({ approved, proposalId: snapshot?.proposal?.id, busy, sending: sendingCurrent, setBusy, destination: destinationRef.current, sideSessionId: sideChatRef.current?.sessionId, run });
  }
  async function stop(): Promise<void> {
    await stopAction({ busy, setBusy, destination: destinationRef.current, sideSessionId: sideChatRef.current?.sessionId, stopSpeaking: () => voiceManagerRef.current?.stopSpeaking(), run });
  }
  // 工具行的叉先尝试只结束当前命令进程：命令退出后 DSH 会继续这一轮，
  // 思考不被打断。找不到对应进程时才退回整轮停止。
  killTurnRef.current = () => {
    void (async () => {
      let stopped = false
      try { stopped = await petBridge().stopCommand() } catch { stopped = false }
      if (!stopped) await stop()
    })()
  };

  async function setSideExpanded(expanded: boolean): Promise<void> {
    await setSideExpandedImpl({ expanded, sideSessionId: sideChatRef.current?.sessionId, run });
  }
  async function discardSide(): Promise<void> {
    await discardSideImpl({ sideSessionId: sideChatRef.current?.sessionId, run });
  }
  async function moveQueuedMessage(messageId: string, beforeId: string | null) {
    const sessionId = sideExpanded ? sideChatRef.current?.sessionId : null;
    await run((bridge) => sessionId
      ? bridge.moveSideQueuedMessage(sessionId, messageId, beforeId)
      : bridge.moveQueuedMessage(messageId, beforeId));
  }

  async function editQueuedMessage(message: PendingMessage) {
    const origin = destinationRef.current;
    const sideId = origin === 'side' ? sideChatRef.current?.sessionId : null;
    const conversationId = origin === 'main' ? activeConversationIdRef.current : null;
    const accepted = await run((bridge) => sideId
      ? bridge.removeSideQueuedMessage(sideId, message.id) : bridge.removeQueuedMessage(message.id));
    if (!accepted) return;
    if (sideId && !sideSessionExists(sideId)) return;
    const stillHere = destinationRef.current === origin && (origin === 'side'
      ? sideChatRef.current?.sessionId === sideId
      : activeConversationIdRef.current === conversationId);
    const current = stillHere ? composerStateRef.current : origin === 'side'
      ? restoreComposerState(sideComposerStash.current, sideId) : restoreComposerState(composerStash.current, conversationId);
    const recalled = message.text;
    const next: StashedComposer<DroppedAttachment> = {
      draft: current.draft.trim() ? `${recalled}\n\n${current.draft}` : recalled,
      attachments: [...current.attachments]
    };
    let dropped = false;
    for (const attachment of message.attachments) {
      if (next.attachments.length >= 5) { dropped = true; continue; }
      if (next.attachments.some((item) => item.name === attachment.name && (item.path ?? '') === (attachment.path ?? ''))) continue;
      next.attachments.push({ id: crypto.randomUUID(), ...attachment });
    }
    if (!stillHere) {
      if (origin === 'side') stashComposerState(sideComposerStash.current, sideId, next.draft, next.attachments);
      else if (conversationId) stashComposerState(composerStash.current, conversationId, next.draft, next.attachments);
      return;
    }
    composerStateRef.current = next;
    setDraft(next.draft);
    setAttachments(next.attachments);
    if (dropped) setAttachmentError('最多 5 个附件，部分附件未剪切回。');
    setComposerOpen(true);
    const recalledEnd = recalled.length;
    setCaretIndex(recalledEnd);
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(recalledEnd, recalledEnd);
      setCaretIndex(recalledEnd);
    });
  }

  function scrollToBottom() {
    const feed = feedRef.current;
    if (!feed) return;
    followFeedRef.current = true;
    setFeedAtBottom(true);
    // 流式输出时 20fps 的更新会不断打断平滑滚动，直接用 scrollTop 落到底，
    // 发送后和“回到底部”都走这条稳定路径。
    feed.scrollTop = feed.scrollHeight;
  }

  function toggleVoice(): void {
    const manager = voiceManagerRef.current;
    if (!manager) {
      setVoiceError('语音功能尚未就绪。');
      return;
    }
    if (!manager.available) {
      setVoiceError('还没有配置语音服务。请在设置 → 语音里填写 SiliconFlow API Key。');
      void run((bridge) => bridge.openSettings());
      return;
    }
    setVoiceError(null);
    manager.toggle();
  }

  async function openLibrary() {
    await expandPanel();
    // 左右栏各占一半；面板不够宽时不允许同时打开，先收起右栏。
    if (rightRail !== 'closed' && bubbleWidth < 380) setRightRail('closed');
    setLibraryOpen(true);
    setModelPickerOpen(false);
    setSessionMenuOpen(false);
    setTabMenu(null);
    setDeleteId(null);
    setRenameId(null);
    setLibraryError(null);
  }

  function showTabMenu(event: MouseEvent<HTMLButtonElement>, item: ConversationSummary) {
    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget.closest<HTMLElement>('.panel-bubble');
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    setSessionMenuOpen(false);
    setTabMenu({ item, container, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  }

  function showTurnMenu(event: MouseEvent<HTMLElement>, turnUserId: string, title: string, running: boolean) {
    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget.closest<HTMLElement>('.panel-bubble');
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    setTurnMenu({ turnUserId, title, running, container, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  }

  function beginTabDrag(event: ReactPointerEvent<HTMLButtonElement>, item: ConversationSummary) {
    if (event.button !== 0 || libraryBusy) return;
    tabDragRef.current = { id: item.id, startX: event.clientX, moved: false };
  }

  // The drag's settle animation: whenever the tab order can change, each tab
  // that moved glides from its old spot — a DOM reorder has no transition of
  // its own, so the old x is captured and replayed as a one-off transform
  // (the FLIP pass), skipped under reduced motion.
  const tabPositionsRef = useRef(new Map<string, number>());
  useTabFlip({ tabsRef: quickTabsRef, positionsRef: tabPositionsRef, deps: [tabDragOrder, libraryRevision, tabLimit, expanded, quickTabs.length, library?.activeConversationId] });

  // A press on a tab becomes a drag after five pixels; the row reorders under
  // the pointer and the drop commits the arrangement. Pointer events (not
  // HTML5 dnd) keep the ghost image out and the click suppression close by.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = tabDragRef.current;
      if (!drag) return;
      if (!drag.moved) {
        if (Math.abs(event.clientX - drag.startX) < 5) return;
        drag.moved = true;
        setTabDragOrder(orderedSessionsRef.current.map((item) => item.id));
        const tabs = quickTabsRef.current;
        tabDragCentersRef.current = tabs
          ? Array.from(tabs.querySelectorAll<HTMLElement>('.panel-quick-tab[data-tab-id]'))
            .filter((button) => button.dataset.tabId !== drag.id)
            .map((button) => {
              const rect = button.getBoundingClientRect();
              return { id: button.dataset.tabId!, center: rect.left + rect.width / 2 };
            })
          : [];
      }
      const tabs = quickTabsRef.current;
      if (!tabs) return;
      const centers = tabDragCentersRef.current;
      const buttons = Array.from(tabs.querySelectorAll<HTMLElement>('.panel-quick-tab:not(.panel-quick-tab-new)'));
      const maxIndex = Math.max(0, buttons.length - 1);
      const toIndex = Math.min(maxIndex, centers.filter((item) => event.clientX > item.center).length);
      setTabDragOrder((current) => (current ? moveTab(current, drag.id, toIndex) : current));
    };
    const onEnd = () => {
      const drag = tabDragRef.current;
      if (!drag) return;
      tabDragRef.current = null;
      tabDragCentersRef.current = [];
      if (!drag.moved) return;
      // Swallow the click the pointerup is about to send — this gesture was a
      // drag, not a tab switch.
      tabClickSuppressRef.current = true;
      window.setTimeout(() => { tabClickSuppressRef.current = false; }, 0);
      const order = tabDragOrderRef.current;
      if (!order) return;
      void run((bridge) => bridge.setConversationTabOrder(order)).then(() => {
        setTabDragOrder((latest) => (latest === order ? null : latest));
      });
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onEnd);
    document.addEventListener('pointercancel', onEnd);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onEnd);
      document.removeEventListener('pointercancel', onEnd);
    };
  }, [run]);

  async function libraryAction(action: (bridge: PetAPI) => Promise<void>, onSuccess?: () => void) {
    if (libraryBusy) return;
    setLibraryBusy(true);
    setLibraryError(null);
    const accepted = await run(action);
    setLibraryBusy(false);
    if (accepted) onSuccess?.();
  }

  function clearSelection(): void {
    setSelectedSessionIds(new Set());
    setBatchDeleteConfirm(false);
  }

  function toggleSelected(id: string): void {
    if (!selectedSessionIds.has(id) && selectedSessionIds.size >= 100) {
      setLibraryError('一次最多选择 100 个会话。');
      return;
    }
    setMultiSelect(true);
    setBatchDeleteConfirm(false);
    setSelectedSessionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function batchManage(action: 'archive' | 'restore' | 'delete' | 'pin' | 'unpin', ids: string[]): Promise<void> {
    if (libraryBusy || ids.length === 0) return;
    let outcomes: Array<{ id: string; status: 'updated' | 'skipped'; reason?: string }> = [];
    await libraryAction(async (bridge) => {
      outcomes = (await bridge.batchManageConversations(action, ids)).outcomes;
    }, () => {
      const updated = outcomes.filter((item) => item.status === 'updated');
      const unresolved = outcomes.filter((item) => item.status === 'skipped' && ['busy', 'archived'].includes(item.reason ?? ''));
      const missing = outcomes.filter((item) => item.status === 'skipped' && item.reason === 'not_found');
      const resolved = new Set(outcomes.filter((item) => item.status === 'updated' || !unresolved.includes(item)).map((item) => item.id));
      setSelectedSessionIds((current) => new Set([...current].filter((id) => !resolved.has(id))));
      if (action === 'delete' || action === 'archive') for (const item of updated) {
        forgetParentSide(item.id, { sideSnapshots, activeConversationIdRef, applySideSnapshotRef, sideComposerStash, sideComposerOpenRef });
        if (action === 'delete') composerStash.current.delete(item.id);
      }
      if (unresolved.length === 0) {
        setMultiSelect(false);
        clearSelection();
        if (missing.length) setLibraryError(`${missing.length} 个会话已不存在，其余操作已完成。`);
      } else {
        const reasons = new Set(unresolved.map((item) => item.reason));
        setLibraryError(`已处理 ${updated.length} 个，跳过 ${unresolved.length} 个${reasons.has('busy') ? '（会话仍在运行或排队）' : ''}${missing.length ? `；${missing.length} 个已不存在` : ''}。`);
      }
    });
    setBatchDeleteConfirm(false);
  }

  async function createConversation() {
    if (recentSessions.length >= UNARCHIVED_LIMIT) {
      setLibraryError(`未归档最多 ${UNARCHIVED_LIMIT} 个会话，先归档一个再新建。`);
      return;
    }
    const currentId = activeConversationIdRef.current;
    const mainComposer = destinationRef.current === 'main'
      ? composerStateRef.current : restoreComposerState(composerStash.current, currentId);
    flushDraft(currentId, mainComposer.draft);
    stashComposerState(composerStash.current, currentId, mainComposer.draft, mainComposer.attachments);
    if (currentId && destinationRef.current === 'main') goalPromptStash.current.set(currentId, goalPrompting);
    await libraryAction((bridge) => bridge.createConversation(), () => {
      if (activeConversationIdRef.current !== currentId) {
        setLibraryOpen(false);
        setComposerOpen(true);
        return;
      }
      pendingNewConversationRef.current = true;
      rememberVisibleSide();
      activeConversationIdRef.current = null;
      destinationRef.current = 'main';
      sideChatRef.current = null;
      setSideChat(null);
      setLibraryOpen(false);
      composerStateRef.current = { draft: '', attachments: [] };
      setDraft('');
      setAttachments([]);
      setGoalPrompting(false);
      setComposerOpen(true);
    });
  }

  /** A draft write that must never surface an error: it runs on a debounce
   *  and on every switch, and a failed save must not bother the writer. */
  const { flushDraft } = useDraftPersist({ destinationRef, conversationId: library?.activeConversationId, activeConversationIdRef, composerStateRef, draft });

  // 应用重启后第一次进入：当前会话的草稿从会话记录里拿回来。内存里的 stash
  // 优先（它是这次运行中最新的），只有它没有记录时才碰磁盘。
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (destinationRef.current !== 'main') return;
    const id = library?.activeConversationId;
    if (!id || draftRestoredRef.current || composerStash.current.has(id)) return;
    draftRestoredRef.current = true;
    let bridge: PetAPI;
    try { bridge = petBridge(); } catch { return; }
    void bridge.getDraft(id).then((text) => {
      if (!text || activeConversationIdRef.current !== id) return;
      if (destinationRef.current === 'side') {
        if (!composerStash.current.has(id)) stashComposerState(composerStash.current, id, text, []);
        return;
      }
      if (composerStateRef.current.draft) return;
      composerStateRef.current = { draft: text, attachments: [] };
      setDraft(text);
      setCaretIndex(text.length);
      setComposerOpen(true);
    }).catch(() => undefined);
  }, [library?.activeConversationId, sideExpanded]);

  /** 关闭顶部标签：只从标签条移除，会话仍留在未归档列表。 */
  async function closeQuickTab(item: ConversationSummary) {
    // 关掉的是当前标签时，先把视图切到下一个可见标签，否则当前会话会被
    // 「当前标签必须显示」的规则又插回来。
    if (item.id === library?.activeConversationId) {
      const next = quickTabs.find((tab) => tab.id !== item.id)
      if (next) await selectConversation(next)
    }
    const hidden = new Set(library?.settings.hiddenTabIds ?? []);
    hidden.add(item.id);
    await run((bridge) => bridge.setHiddenTabs([...hidden]));
  }

  async function selectConversation(item: ConversationSummary) {
    if (item.archivedAt !== null && recentSessions.length >= UNARCHIVED_LIMIT) {
      setLibraryError(`未归档最多 ${UNARCHIVED_LIMIT} 个会话，先归档一个再恢复。`);
      return;
    }
    const hidden = library?.settings.hiddenTabIds ?? [];
    if (hidden.includes(item.id)) {
      void run((bridge) => bridge.setHiddenTabs(hidden.filter((id) => id !== item.id))).catch(() => undefined);
    }
    const currentId = activeConversationIdRef.current;
    const mainComposer = destinationRef.current === 'main'
      ? composerStateRef.current : restoreComposerState(composerStash.current, currentId);
    flushDraft(currentId, mainComposer.draft);
    stashComposerState(composerStash.current, currentId, mainComposer.draft, mainComposer.attachments);
    if (currentId && destinationRef.current === 'main') goalPromptStash.current.set(currentId, goalPrompting);
    const operation = item.archivedAt === null
      ? (bridge: PetAPI) => bridge.selectConversation(item.id)
      : (bridge: PetAPI) => bridge.restoreConversation(item.id);
    await libraryAction(operation, () => {
      rememberVisibleSide();
      activeConversationIdRef.current = item.id;
      destinationRef.current = 'main';
      sideChatRef.current = null;
      setSideChat(null);
      setLibraryOpen(false);
      setSessionMenuOpen(false);
      const goalDraftOpen = goalPromptStash.current.get(item.id) ?? false;
      setGoalPrompting(goalDraftOpen);
      const stashed = composerStash.current.get(item.id);
      if (stashed) {
        const saved = { draft: stashed.draft, attachments: [...stashed.attachments] };
        composerStateRef.current = saved;
        setDraft(saved.draft);
        setAttachments(saved.attachments);
        setCaretIndex(saved.draft.length);
        setAttachmentError(saved.attachments.length > 5 ? '已保留全部附件；一次最多发送 5 个，请先移除多余附件。' : null);
        setComposerOpen(Boolean(saved.draft || saved.attachments.length || goalDraftOpen));
        const targetSide = sideSnapshots.current.get(item.id);
        if (targetSide) applySideSnapshotRef.current(targetSide);
        return;
      }
      // 内存里没有这个会话的草稿（应用重启后的第一次切换）：从会话记录
      // 里拿回来，晚到的磁盘值不覆盖已经开始的新输入。
      composerStateRef.current = { draft: '', attachments: [] };
      setDraft('');
      setAttachments([]);
      setCaretIndex(0);
      setAttachmentError(null);
      setComposerOpen(goalDraftOpen);
      let bridge: PetAPI;
      try { bridge = petBridge(); } catch { return; }
      void bridge.getDraft(item.id).then((text) => {
        if (!text || activeConversationIdRef.current !== item.id) return;
        if (destinationRef.current === 'side') {
          if (!composerStash.current.has(item.id)) stashComposerState(composerStash.current, item.id, text, []);
          return;
        }
        if (composerStateRef.current.draft) return;
        composerStateRef.current = { draft: text, attachments: [] };
        setDraft(text);
        setCaretIndex(text.length);
        setComposerOpen(true);
      }).catch(() => undefined);
      const targetSide = sideSnapshots.current.get(item.id);
      if (targetSide) applySideSnapshotRef.current(targetSide);
    });
  }

  async function saveRename(id: string) {
    const title = renameDraft.trim();
    if (!title) { setLibraryError('请输入会话名称。'); return; }
    await libraryAction((bridge) => bridge.renameConversation(id, title), () => setRenameId(null));
  }

  const searchActive = Boolean(libraryQuery.trim());
  const searchStatus = searchActive
    ? librarySearch.key === librarySearchKey ? librarySearch.status : 'loading'
    : 'idle';
  const visibleConversations = searchActive
    ? searchStatus === 'done' ? librarySearch.results : []
    : library?.conversations.filter((item) => (item.archivedAt !== null) === libraryArchived) ?? [];
  const selectedVisibleConversations = visibleConversations.filter((item) => selectedSessionIds.has(item.id));
  const selectedVisibleIds = selectedVisibleConversations.map((item) => item.id);
  const batchUnpin = selectedVisibleConversations.length > 0 && selectedVisibleConversations.every((item) => item.pinnedAt !== null);
  const visibleSessionIds = visibleConversations.map((item) => item.id);
  const visibleSessionKey = JSON.stringify(visibleSessionIds);
  useEffect(() => {
    if (searchStatus === 'loading') return;
    const visible = new Set(visibleSessionIds);
    setSelectedSessionIds((current) => {
      const remaining = [...current].filter((id) => visible.has(id));
      return remaining.length === current.size ? current : new Set(remaining);
    });
  }, [visibleSessionKey, searchStatus]);
  const tabbedIds = new Set(quickTabs.map((tab) => tab.id));
  // 未归档列表分两段：标签页里显示的按标签顺序，其余按最近活动时间。
  const tabbedConversations = !libraryArchived && !searchActive
    ? quickTabs
      .map((tab) => visibleConversations.find((item) => item.id === tab.id))
      .filter((item): item is ConversationSummary => Boolean(item))
    : [];
  const untabbedConversations = !libraryArchived && !searchActive
    ? visibleConversations
      .filter((item) => !tabbedIds.has(item.id))
      .sort((left, right) => (Date.parse(right.lastActivityAt || right.updatedAt) || 0) - (Date.parse(left.lastActivityAt || left.updatedAt) || 0))
    : [];
  const displayedGroups: Array<{ key: string; label: string | null; conversations: ConversationSummary[]; dividerBefore?: boolean }> =
    !libraryArchived && !searchActive
      ? [
          { key: 'tabbed', label: null, conversations: tabbedConversations },
          { key: 'untabbed', label: null, conversations: untabbedConversations, dividerBefore: tabbedConversations.length > 0 }
        ]
      : libraryGrouped
        ? groupSessionSummaries(visibleConversations, libraryArchived, Date.now())
        : [{ key: 'all', label: null, conversations: visibleConversations }];

  // A parked plan, question or permission is waiting on the user; the turn is
  // not executing, even if the runtime's last coarse status said so.
  const awaitingInteraction = (source?: typeof snapshot): boolean => Boolean(source?.proposal || source?.plan || source?.question || source?.permission);
  const status = awaitingInteraction(snapshot) ? 'awaiting_approval' : snapshot?.taskStatus ?? 'idle';
  const sideStatus = sideSessionId
    ? awaitingInteraction(sideChat?.snapshot) ? 'awaiting_approval' : sideChat?.snapshot?.taskStatus ?? 'idle'
    : 'idle';
  // Live per-conversation statuses arrive through the library summaries now,
  // so every tab dot is truthful — the displayed conversation included.
  const active = ['planning', 'awaiting_approval', 'executing', 'verifying'].includes(status);
  const statusLive = status === 'planning' || status === 'executing' || status === 'verifying';
  const pendingMessages = sideExpanded ? sideChat?.pendingMessages ?? [] : snapshot?.pendingMessages ?? [];
  const queuedCount = pendingMessages.length;
  const empty = !libraryOpen && !sendingCurrent && !error && !voiceError && status === 'idle' && !snapshot?.currentTask && !snapshot?.timeline.length && !snapshot?.proposal && queuedCount === 0;
  // With no conversation left the bubble keeps its full shape: the ball form
  // has no tab strip and no room for the "+", and starting fresh is exactly
  // what the owner wants to do next.
  const compactEmpty = empty && !sideSessionId && !expanded && !modelPickerOpen && !suggestionOpen && recentSessions.length > 0;
  const layout: BubbleLayout = !compactEmpty ? 'full' : !composerOpen ? 'empty' : attachments.length ? 'composer_attachments' : 'composer';
  const compactComposerHeight = Math.max(112, composeDockHeight || (112 + composerHeight + (attachments.length ? 26 : 0)));
  // 30fps 的呼吸式动效：扫光与脉冲点改用 CSS 变量推进，值每 1/30 秒走一步——
  // 合成器只在步进的帧上提交新内容（60fps 时是每帧），dwm 的合成次数减半。
  // 没有动效在跑时这个计时器根本不启动，变量停在各自的静止位。
  useEffect(() => {
    if (!active && !sendingCurrent) return;
    const started = performance.now();
    const tri = (now: number, period: number, offset: number): number => {
      const t = ((((now - started + offset) % period) + period) % period) / period;
      return t < 0.5 ? t * 2 : (1 - t) * 2;
    };
    const tick = (): void => {
      const now = performance.now();
      const root = document.documentElement.style;
      // 状态灯和三个等待点都保持静止：不再逐帧改 pulse/bounce 变量。
      root.setProperty('--panel-sweep-p', tri(now, 3400, 0).toFixed(3));
      // 只有底部「正在执行」这一行的三点跳动；分组标题的圆点仍保持静止。
      root.setProperty('--panel-bounce-p1', tri(now, 1200, 0).toFixed(3));
      root.setProperty('--panel-bounce-p2', tri(now, 1200, -180).toFixed(3));
      root.setProperty('--panel-bounce-p3', tri(now, 1200, -360).toFixed(3));
    };
    tick();
    const timer = window.setInterval(tick, 33);
    return () => window.clearInterval(timer);
  }, [active, sendingCurrent]);
  // Grouping and task extraction scan the whole history; with incremental
  // snapshots an unchanged timeline keeps its identity, so these memos let
  // every render that doesn't touch the timeline reuse the last result.
  const timeline = snapshot?.timeline ?? EMPTY_TIMELINE;
  const activeSummary = library?.conversations.find((item) => item.id === (library?.activeConversationId ?? snapshot?.conversationId));
  // 不再用“时间线为空”判断加载：首帧可能先到会话摘要、后到 timeline，
  // 那会把面板挂在“正在加载历史”上。数据由 usePetState 重试补齐。
  const [historyEntries, setHistoryEntries] = useState(INITIAL_HISTORY_ENTRIES);
  useEffect(() => { setHistoryEntries(INITIAL_HISTORY_ENTRIES) }, [snapshot?.conversationId]);
  // 主进程全量只发尾部一段；更早的历史按需拉回来，拼在这里。
  const [olderEntries, setOlderEntries] = useState<typeof timeline>([]);
  useEffect(() => { setOlderEntries([]) }, [snapshot?.conversationId]);
  const mergedTimeline = useMemo(
    () => olderEntries.length ? [...olderEntries, ...timeline] : timeline,
    [olderEntries, timeline]
  );
  // 首帧只 group 尾部，避免 1.6 万条历史在打开会话时一次性分组。
  const timelineForRender = useMemo(
    () => mergedTimeline.length > historyEntries ? mergedTimeline.slice(-historyEntries) : mergedTimeline,
    [mergedTimeline, historyEntries]
  );
  // While a turn runs, its start marks the live window: a user line past it
  // was steered into the running turn. New records carry the flag on the entry
  // itself; this covers the steers already on disk without one.
  const liveTurnStart = active && snapshot?.taskMetrics && !snapshot.taskMetrics.finishedAt
    ? Date.parse(snapshot.taskMetrics.startedAt) : NaN;
  const liveTurnStartMs = Number.isFinite(liveTurnStart) ? liveTurnStart : undefined;
  const timelineGroups = useMemo(() => groupTimeline(timelineForRender, liveTurnStartMs), [timelineForRender, liveTurnStartMs]);
  const tasks = useMemo(() => agentTasks(timelineForRender), [timelineForRender]);
  // 刻度按整段对话生成：渲染可以分页，左侧条的条数不能跟着缩水。
  // 跳到未渲染的条目时 jumpToEntry 会先扩大渲染窗口，再滚动过去。
  const navMarkList = useMemo(() => navMarks(groupTimeline(mergedTimeline, liveTurnStartMs)), [mergedTimeline, liveTurnStartMs]);
  const [earlierGroups, setEarlierGroups] = useState(0);
  const earlierAnchorRef = useRef<{ height: number } | null>(null);
  const pendingJumpRef = useRef<string | null>(null);
  const visibleGroups = useMemo(
    () => tailWindow(timelineGroups, EARLIER_MIN_ENTRIES, earlierGroups),
    [timelineGroups, earlierGroups]
  );
  const totalEntries = snapshot?.timelineTotal ?? mergedTimeline.length;
  const hasUnloadedOlder = mergedTimeline.length < totalEntries;
  const hasEarlier = mergedTimeline.length > timelineForRender.length ||
    visibleGroups.length < timelineGroups.length || hasUnloadedOlder;
  // Reaching the top of the feed pulls in the next stretch of older history,
  // keeping the reader's place by the height the new rows added above.
  function loadEarlier(): void {
    const feed = feedRef.current;
    if (!feed || !hasEarlier) return;
    earlierAnchorRef.current = { height: feed.scrollHeight };
    if (hasUnloadedOlder) {
      void loadOlderPage();
      return;
    }
    if (mergedTimeline.length > timelineForRender.length) {
      setHistoryEntries((count) => Math.min(mergedTimeline.length, count + HISTORY_STEP_ENTRIES));
      return;
    }
    setEarlierGroups((count) => count + EARLIER_STEP_GROUPS);
  }
  const loadingOlderRef = useRef(false);
  async function loadOlderPage(): Promise<void> {
    await loadOlderPageImpl({ conversationId: snapshot?.conversationId, total: snapshot?.timelineTotal, loaded: mergedTimeline.length, loadingRef: loadingOlderRef, onPage: (page) => setOlderEntries((previous) => [...page, ...previous]), pageSize: HISTORY_STEP_ENTRIES });
  }
  /** The rail's click: scroll to a message, widening the rendered window to
   *  include it first when it lies in the folded history above. */
  function jumpToEntry(id: string): void {
    const target = feedRef.current?.querySelector(`[data-entry-id="${id}"]`);
    if (target) {
      followFeedRef.current = false;
      target.scrollIntoView({ block: 'start' });
      return;
    }
    // 刻度按全量对话生成，目标可能还没渲染：先用全量分组定位，再折算
    // 需要多展开多少组，交给 pendingJump 的 effect 滚过去。
    const allGroups = groupTimeline(timeline, liveTurnStartMs);
    const fullIndex = allGroups.findIndex((group) => group.kind === 'turn'
      ? group.user.id === id || group.items.some((item) => item.id === id)
      : group.entry.id === id);
    if (fullIndex < 0) return;
    const renderedGroups = timelineGroups.length;
    const missing = Math.max(0, allGroups.length - renderedGroups);
    if (fullIndex < missing) {
      pendingJumpRef.current = id;
      setEarlierGroups((count) => count + (missing - fullIndex));
      return;
    }
    const groupIndex = fullIndex - missing;
    const visibleStart = renderedGroups - visibleGroups.length;
    if (groupIndex >= visibleStart) return; // Rendered but somehow not found; leave it be.
    pendingJumpRef.current = id;
    setEarlierGroups((count) => count + (visibleStart - groupIndex));
  }
  let latestTurnIndex = -1;
  for (let index = visibleGroups.length - 1; index >= 0; index--) {
    if (visibleGroups[index].kind === 'turn') { latestTurnIndex = index; break; }
  }
  // What the panel should say while nothing is streaming: the model is thinking,
  // or a specific command is running.
  const liveEntry = active ? timeline[timeline.length - 1] : undefined;
  const liveThinking = Boolean(liveEntry && liveEntry.kind === 'thinking' && !liveEntry.endedAt);
  let runningTool: string | undefined;
  for (let index = timeline.length - 1; index >= 0; index--) {
    const entry = timeline[index];
    if (entry.kind === 'tool' && entry.tool?.status === 'running') { runningTool = entry.tool.name; break; }
  }

  useFeedAnchors({ feedRef, earlierAnchorRef, pendingJumpRef, followFeedRef, earlierGroups, olderEntriesLength: olderEntries.length, historyEntries, visibleGroups });

  useEditorHeight({ editorRef, composerOpen, draft, expanded, compactEmpty, visible, setComposerHeight });

  // 选中消息文字后右键：弹系统菜单，选“引用”放进输入框，或在原地复制。
  useEffect(() => {
    if (!visible) return;
    const onContextMenu = (event: globalThis.MouseEvent): void => {
      const selection = window.getSelection?.();
      const text = selection?.toString().trim() ?? '';
      if (!text) return;
      const anchor = selection?.anchorNode;
      const element = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
      const message = element?.closest('.panel-event-assistant, .panel-event-user') ?? null;
      if (!message || !feedWrapRef.current?.contains(message)) return;
      event.preventDefault();
      void window.pet.showTextMenu({ text })
        .then((action) => {
          if (action === 'quote') applyQuote(text);
          else if (action === 'copy') void writeClipboard(text);
        })
        .catch(() => undefined);
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, [visible]);

  function applyQuote(text: string): void {
    if (!text) return;
    const block = formatSelectionQuote(text);
    setDraft((current) => (current.trim() ? `${current.trimEnd()}\n\n${block}\n` : `${block}\n`));
    setComposerOpen(true);
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      editor.setSelectionRange(editor.value.length, editor.value.length);
    });
  }

  // A popover owns Escape while it is open: the first Esc closes the popover, a
  // second one stops the task. Without this guard the capture-phase listener
  // below would steal the key from an open menu and kill the running turn.
  const escOwners = libraryOpen || modelPickerOpen || contextMenuOpen || sessionMenuOpen || Boolean(tabMenu) || suggestionOpen || renameId !== null || deleteId !== null;
  const escOwnersRef = useRef(escOwners);
  escOwnersRef.current = escOwners;

  // The compose trigger comes back only once the exit animation has fully
  // unmounted the form, so it takes the focus after that — not in the frame
  // the form disappeared.
  const composerWasOpenRef = useRef(false);
  useEffect(() => {
    if (composerWasOpenRef.current && !composerOpen && !composerExit.closing) composeTriggerRef.current?.focus();
    composerWasOpenRef.current = composerOpen;
  }, [composerOpen, composerExit.closing]);

  // A click anywhere outside the rename row gives up on it — the same as
  // pressing 取消, without needing to aim at the button.
  useEffect(() => {
    if (renameId === null) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('.panel-session-edit')) return;
      setRenameId(null);
    };
    document.addEventListener('pointerdown', closeOutside, true);
    return () => document.removeEventListener('pointerdown', closeOutside, true);
  }, [renameId]);

  // Clicking outside the open library drawer puts it away — the conversation
  // beside it is the obvious target, so a plain click there should just work.
  // The buttons that open the drawer toggle it themselves, so they are left
  // alone to avoid closing and reopening in one gesture.
  useEffect(() => {
    if (!libraryOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('.panel-library-drawer')) return;
      // 顶栏空白处是拖动手柄：拖动窗口时不能把左栏关掉。
      if (target.closest('.panel-chat-header')) return;
      // 调窗口大小的手柄也在抽屉外面，拖动它不是在点抽屉外部。
      if (target.closest('.panel-resize-grip')) return;
      if (target.closest('.panel-library-toggle, .panel-conversations-button, .panel-session-menu-all')) return;
      setLibraryOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside, true);
    return () => document.removeEventListener('pointerdown', closeOutside, true);
  }, [libraryOpen]);

  // Escape first dismisses a batch confirmation, then exits selection, then
  // closes the drawer. The capture listener must handle each layer before the
  // document-wide Esc-to-stop handler sees the key.
  useEffect(() => {
    if (!libraryOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || renameId !== null || deleteId !== null) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (batchDeleteConfirmRef.current) { setBatchDeleteConfirm(false); return; }
      if (multiSelectRef.current) { setMultiSelect(false); clearSelection(); return; }
      setLibraryOpen(false);
    };
    // Window capture runs before the document's Esc-to-stop listener.
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, [libraryOpen, renameId, deleteId]);

  useEscapeToStop({ visible, active, escOwnersRef, onStop: () => { void stop(); } });

  useEffect(() => {
    const tabs = quickTabsRef.current;
    const current = tabs?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!tabs || !current) return;
    const left = current.offsetLeft - tabs.offsetLeft;
    const right = left + current.offsetWidth;
    if (left < tabs.scrollLeft) tabs.scrollLeft = left;
    else if (right > tabs.scrollLeft + tabs.clientWidth) tabs.scrollLeft = right - tabs.clientWidth;
  }, [library?.activeConversationId, expanded, tabLimit, libraryRevision, compactEmpty]);

  // 小窗没有抽屉；需要左栏或右栏时先把面板放大。
  async function expandPanel(): Promise<void> {
    if (expanded) return;
    await petBridge().setBubbleExpanded(true).catch(() => undefined);
    setExpanded(true);
  }

  async function toggleExpanded() {
    if (resizePending.current) return;
    resizePending.current = true;
    const next = !expanded;
    try {
      if (!next) setRightRail('closed');
      await petBridge().setBubbleExpanded(next);
      setSessionMenuOpen(false);
      setExpanded(next);
    } finally {
      resizePending.current = false;
    }
  }

  // 展开面板的角上拖拽：拖动时只记录目标尺寸并给手柄一圈蓝色高光，窗口
  // 不跟着指针实时变形；松开后再一次性 setPanelSize，减少重绘和内存压力。
  // 用屏幕坐标而不是视口坐标，窗口变形后不会形成反馈回路。
  const resizeSession = useRef<{
    pointerId: number; grip: HTMLDivElement
    startScreenX: number; startScreenY: number; startW: number; startH: number
    lastSent: number; lastWidth: number; lastHeight: number
  } | null>(null);
  const [resizingPanel, setResizingPanel] = useState(false);
  // 待发送消息的拖拽排序：只记录被拖的 id 和目标位置，落点时再写回主进程。
  const [queueDragId, setQueueDragId] = useState<string | null>(null);
  const [queueDropBefore, setQueueDropBefore] = useState<string | null>(null);
  const resizeMovedRef = useRef(false);
  function beginPanelResize(event: ReactPointerEvent<HTMLDivElement>): void {
    beginPanelResizeImpl({ event, expanded, sessionRef: resizeSession, movedRef: resizeMovedRef, setResizing: setResizingPanel, onEnd: () => endPanelResize() });
  }
  function beginWindowDrag(event: ReactPointerEvent<HTMLElement>, fromHeader = false): void {
    beginWindowDragImpl(event, fromHeader);
  }
  function movePanelResize(event: ReactPointerEvent<HTMLDivElement>): void {
    movePanelResizeImpl({ event, sessionRef: resizeSession, direction: direction === 'down' ? 'down' : 'up', minWidth: PANEL_MIN_WIDTH, minHeight: PANEL_MIN_HEIGHT, onEnd: endPanelResize });
  }
  function endPanelResize(event?: ReactPointerEvent<HTMLDivElement>): void {
    endPanelResizeImpl({ event, sessionRef: resizeSession, movedRef: resizeMovedRef, setResizing: setResizingPanel });
  }
  // Pointer capture can be lost when the window itself moves under the cursor.
  // End the session from the window as well, so no ghost resize survives a
  // missing pointerup and the resize cursor cannot stick after release.
  useResizeFinish({ resizing: resizingPanel, onFinish: () => endPanelResize() });

  useEffect(() => {
    try {
      void petBridge().setBubbleLayout(layout, layout === 'composer' || layout === 'composer_attachments' ? compactComposerHeight : undefined).catch(() => undefined);
    } catch {
      // The HTML preview can render before the desktop bridge exists.
    }
  }, [layout, compactComposerHeight]);

  // A parked question, plan or tool approval takes over the composer slot
  // until it is settled.
  const ask = snapshot?.question ?? null;
  const plan = snapshot?.plan ?? null;
  const permission = snapshot?.permission ?? null;
  const approvalMode = normalizeApprovalMode(snapshot?.approvalMode);

  return (
    <section className={`panel-bubble${compactEmpty ? ' is-empty' : ''}${expanded ? ' is-expanded' : ''}${sideExpanded ? ' is-side-chat' : ''}${composerOpen || composerExit.closing || ask || plan ? ' is-composing' : ''}${attachments.length ? ' has-attachments' : ''}${modelPickerOpen ? ' is-choosing-model' : ''}`} style={compactEmpty && (composerOpen || composerExit.closing) ? { height: compactComposerHeight } : undefined} aria-label="交互气泡" hidden={!visible} onPointerDown={beginWindowDrag} onDragOver={(event) => { if (event.dataTransfer.types.includes('files')) event.preventDefault(); }} onDrop={(event) => {
      if (!event.dataTransfer.files?.length) return;
      event.preventDefault();
      if (libraryOpen) return;
      setComposerOpen(true);
      void addFiles(Array.from(event.dataTransfer.files));
    }}>
      {expanded && <div className={`panel-resize-grip${resizingPanel ? ' is-resizing' : ''}`} role="separator" aria-label="调整面板大小" onPointerDown={beginPanelResize} onPointerMove={movePanelResize} onPointerUp={endPanelResize} onPointerCancel={endPanelResize} onLostPointerCapture={() => endPanelResize()} />}
      {(!compactEmpty || composerOpen) && <button type="button" className="panel-expand-toggle panel-window-action" aria-label={expanded ? '还原对话气泡' : '放大对话气泡'} title={expanded ? '还原对话' : '放大对话'} onClick={() => { void toggleExpanded().catch(() => undefined); }}>
        {expanded ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 8h4V4M12 4v4h4M16 12h-4v4M8 16v-4H4" /></svg> : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4H4v4M12 4h4v4M16 12v4h-4M4 12v4h4" /></svg>}
      </button>}
      {(!compactEmpty || composerOpen) && <button type="button" className="panel-window-close panel-window-action" aria-label="关闭聊天窗口" title="关闭聊天窗口" onClick={() => { void run((bridge) => bridge.hidePanel()); }}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg></button>}
      {(error || voiceError) && (
        <div className="panel-toast-stack" aria-label="通知">
          {error && <div className="panel-toast panel-toast-error" role="alert">{error}</div>}
          {voiceError && <div className="panel-toast panel-toast-voice" role="status">{voiceError}</div>}
        </div>
      )}
      {tabMenu && visible && <TabContextMenu
        title={tabMenu.item.title}
        x={tabMenu.x}
        y={tabMenu.y}
        container={tabMenu.container}
        busy={libraryBusy}
        running={statusRunning(tabMenu.item)}
        current={tabMenu.item.id === library?.activeConversationId}
        onRename={() => { openLibrary(); setRenameDraft(tabMenu.item.title); setRenameId(tabMenu.item.id); }}
        onCloseTab={() => { void closeQuickTab(tabMenu.item); }}
        onArchive={() => { void libraryAction((bridge) => bridge.archiveConversation(tabMenu.item.id), () => forgetParentSide(tabMenu.item.id, { sideSnapshots, activeConversationIdRef, applySideSnapshotRef, sideComposerStash, sideComposerOpenRef })); }}
        onDelete={() => { openLibrary(); setDeleteId(tabMenu.item.id); }}
        onClose={() => setTabMenu(null)}
      />}
      {turnMenu && visible && <TurnContextMenu
        title={turnMenu.title}
        x={turnMenu.x}
        y={turnMenu.y}
        container={turnMenu.container}
        running={turnMenu.running}
        onDelete={() => { const id = library?.activeConversationId; if (id) void run((bridge) => bridge.deleteTurn(id, turnMenu.turnUserId)); }}
        onClose={() => setTurnMenu(null)}
      />}
      <section className="panel-workspace" ref={workspaceRef}>
        {!compactEmpty && <header className={`panel-chat-header${expanded ? ' is-browser' : ' is-numeric'}`} ref={sessionHeaderRef} onPointerDown={(event) => { const target = event.target as HTMLElement; if (target.closest('button, a, input, textarea, .panel-quick-tab')) return; beginWindowDrag(event, true); }}>
          <button type="button" className="panel-library-toggle" aria-label={expanded ? '会话/拓展' : '会话菜单'} title={expanded ? '会话 → 拓展 → 收起' : '会话菜单'} aria-haspopup={expanded ? undefined : 'menu'} aria-expanded={expanded ? libraryOpen : sessionMenuOpen} onClick={expanded ? () => {
            // 大窗三态循环：会话 → 拓展 → 收起；再次打开回到会话，筛选与搜索保留。
            if (!libraryOpen) { setLibraryTab('sessions'); void openLibrary(); return }
            if (libraryTab === 'sessions') { setLibraryTab('market'); return }
            setLibraryOpen(false);
          } : () => setSessionMenuOpen((open) => !open)}><ConversationsIcon /></button>
          <button type="button" className="panel-rail-toggle" aria-label="右侧面板" title="右侧面板：目标、预览与拓展"
            aria-expanded={rightRail !== 'closed'}
            onClick={() => {
              if (rightRail !== 'closed') {
                if (railTab === 'plan') { setRailTab('preview'); return }
                setRightRail('closed'); return
              }
              void (async () => {
                await expandPanel()
                // 宽度不足时左右栏不能同时开，先收起会话库。
                if (libraryOpen && bubbleWidth < 380) setLibraryOpen(false)
                setRailTab('plan')
                setRightRail('overlay')
              })()
            }}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.2" y="4" width="13.6" height="12" rx="2.2" /><path d="M13 4v12" /></svg>
          </button>
          {!expanded && sessionMenuOpen && <div className="panel-session-menu" id="panel-session-menu" role="menu" aria-label="会话菜单"
            onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setSessionMenuOpen(false); } }}>
            <div className="panel-session-menu-heading">快捷会话</div>
            {quickTabs.map((item, index) => <button key={item.id} type="button" role="menuitem" aria-current={item.id === library?.activeConversationId ? 'page' : undefined} aria-disabled={libraryBusy || item.id === library?.activeConversationId} onContextMenu={(event) => showTabMenu(event, item)} title={`${item.title}，${taskLabels[conversationStatus(item)]}`} onClick={() => { if (!libraryBusy && item.id !== library?.activeConversationId) void selectConversation(item); }}><i className={`panel-task-dot panel-task-dot-${conversationStatus(item)}`} aria-hidden="true" /><span className="panel-session-menu-number">{index + 1}</span><span className="panel-session-menu-title">{item.title}</span></button>)}
            <button type="button" role="menuitem" className="panel-session-menu-all" onClick={openLibrary}>查看全部会话</button>
          </div>}
          {/* The strip keeps its place even when the last conversation is
              closed: the "+" stays put so a new session is one click away,
              and the row never blinks out under the pointer. */}
          <nav className={`panel-quick-tabs${tabDragOrder ? ' is-dragging' : ''}`} ref={quickTabsRef} aria-label={expanded ? '顶部会话标签' : '顶部会话数字快捷切换'}>
            {quickTabs.map((item, index) => <button key={item.id} type="button" data-tab-id={item.id} className={`panel-quick-tab${item.id === library?.activeConversationId ? ' is-current' : ''}${tabDragOrder && tabDragRef.current?.id === item.id ? ' is-dragging' : ''}`} aria-label={`${index + 1}：${item.title}，${taskLabels[conversationStatus(item)]}`} aria-current={item.id === library?.activeConversationId ? 'page' : undefined} title={`${item.title}，${taskLabels[conversationStatus(item)]}`} aria-disabled={libraryBusy || item.id === library?.activeConversationId} onContextMenu={(event) => showTabMenu(event, item)} onPointerDown={(event) => beginTabDrag(event, item)} onClick={() => { if (tabClickSuppressRef.current) { tabClickSuppressRef.current = false; return; } if (!libraryBusy && item.id !== library?.activeConversationId) void selectConversation(item); }}><i className={`panel-task-dot panel-task-dot-${conversationStatus(item)}`} aria-hidden="true" /><span className="panel-quick-tab-label">{expanded && !tabCompact ? item.title : index + 1}</span>{expanded && <span role="button" tabIndex={-1} className="panel-quick-tab-close" aria-label={`关闭标签：${item.title}`} title="关闭标签，会话保留在未归档" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); void closeQuickTab(item); }}>×</span>}</button>)}
            {showNewTabButton(quickTabs.length, tabLimit) && <button type="button" className="panel-quick-tab panel-quick-tab-new" aria-label="新建会话" title="新建会话" onClick={() => { if (!libraryBusy) void createConversation(); }}><PlusIcon /></button>}
          </nav>
        </header>}
        {rightRail !== 'closed' && <RightRail railTab={railTab} snapshot={snapshot} preview={preview} bottom={drawerBottom ?? 0} onClose={() => setRightRail('closed')} />}
        <div className="panel-chat-body">
        {(libraryOpen || drawerExit.closing) && drawerBottom !== null && <aside className={`panel-library-drawer${libraryOpen ? '' : ' is-closing'}`} style={{ bottom: drawerBottom ?? 0 }} aria-label="会话列表" onAnimationEnd={drawerExit.endClose}>
          <LibraryHeader tab={libraryTab} busy={libraryBusy} multiSelect={multiSelect} onBack={() => setLibraryOpen(false)} onToggleMulti={() => { if (multiSelect) { setMultiSelect(false); clearSelection(); } else { setMultiSelect(true); setDeleteId(null); setRenameId(null); } }} onImport={() => { void run(async (bridge) => { await bridge.importConversation?.(); }); }} onNew={() => { void createConversation(); }} />
          {libraryTab === 'sessions' && <>
          <div className="panel-library-tabs" role="tablist" aria-label="会话状态">
            <button type="button" role="tab" aria-selected={!libraryArchived} onClick={() => { setLibraryArchived(false); clearSelection(); }}>未归档</button>
            <button type="button" role="tab" aria-selected={libraryArchived} onClick={() => { setLibraryArchived(true); clearSelection(); }}>已归档</button>
          </div>
          <input className="panel-library-search" type="search" aria-label="搜索会话" placeholder="搜索会话与消息" value={libraryQuery} onChange={(event) => { setLibraryQuery(event.target.value); clearSelection(); }} />
          {libraryError && <div className="panel-library-error" role="alert">{libraryError}</div>}
          <div className="panel-session-list" ref={sessionListRef} onScroll={(event) => { sessionScrollRef.current = event.currentTarget.scrollTop; }} aria-label={libraryArchived ? '已归档会话' : '未归档会话'}>
            {searchStatus === 'loading' && <div className="panel-library-empty" role="status">正在搜索…</div>}
            {searchStatus === 'error' && <div className="panel-library-empty" role="alert">搜索失败，请重新输入或切换分类后重试。</div>}
            {visibleConversations.length === 0 && (searchStatus === 'done' || !searchActive) && <div className="panel-library-empty">{searchActive ? '没有找到会话' : libraryArchived ? '暂无归档会话' : '开始一个新对话'}</div>}
            {displayedGroups.map((group) => <div key={group.key} className="panel-library-group">
              {group.dividerBefore && <div className="panel-library-divider" role="separator" aria-label="标签页中的会话与其余会话的分界" />}
              {group.label && <div className="panel-library-group-heading">{group.label}</div>}
              {group.conversations.map((item) => <SessionRow key={item.id} item={item} active={library?.activeConversationId === item.id} selected={selectedSessionIds.has(item.id)} multiSelect={multiSelect} busy={libraryBusy} renaming={renameId === item.id} deleting={deleteId === item.id} renameDraft={renameDraft} onRenameDraft={setRenameDraft} onStartRename={() => { setRenameId(item.id); setRenameDraft(item.title); }} onCancelRename={() => setRenameId(null)} onSaveRename={() => { void saveRename(item.id); }} onStartDelete={() => setDeleteId(item.id)} onCancelDelete={() => setDeleteId(null)} onSelect={() => { void selectConversation(item); }} onToggleSelected={() => toggleSelected(item.id)} onLibraryAction={libraryAction} onForgetParentSide={(id) => { forgetParentSide(id, { sideSnapshots, activeConversationIdRef, applySideSnapshotRef, sideComposerStash, sideComposerOpenRef }); composerStash.current.delete(id); }} />)}
            </div>)}
          </div>
          {multiSelect && <LibraryBatchBar confirm={batchDeleteConfirm} busy={libraryBusy} count={selectedVisibleIds.length} visibleCount={visibleSessionIds.length} archived={libraryArchived} unpin={batchUnpin} onConfirm={() => { void batchManage('delete', selectedVisibleIds); }} onCancelConfirm={() => setBatchDeleteConfirm(false)} onDelete={() => setBatchDeleteConfirm(true)} onSelectAll={() => { setSelectedSessionIds(new Set(visibleSessionIds.slice(0, 100))); if (visibleSessionIds.length > 100) setLibraryError('一次最多选择前 100 个会话。'); }} onManage={(action) => { void batchManage(action, selectedVisibleIds); }} />}
          </>}
          {libraryTab === 'market' && <LibraryMarket kind={railMarketKind} setKind={setRailMarketKind} installed={installedExtended} />}
        </aside>}
        <div className="panel-chat-main">
        <PanelStatusBar sideOpen={Boolean(sideSessionId)} sideExpanded={sideExpanded} onToggleSide={(expanded) => { void setSideExpanded(expanded); }} onDiscardSide={() => { void discardSide(); }} status={status} sideStatus={sideStatus} queuePaused={Boolean(sideChat?.queuePaused)} queueReason={sideChat?.pauseReason} snapshot={snapshot} conversationId={library?.activeConversationId ?? undefined} controlsEnabled={snapshot?.subagentControls !== false} onBackgroundTask={(task) => { const toolUseId = task.toolUseId; if (!toolUseId) return; void run(async (bridge) => { await bridge.backgroundTask(toolUseId, activeConversationIdRef.current ?? undefined); }); }} onStopTask={(task) => { void run(async (bridge) => { await bridge.stopTask(task.taskId, activeConversationIdRef.current ?? undefined); }); }} onMessageSubagent={(task, text) => { const toolUseId = task.toolUseId; if (!toolUseId) return; void run(async (bridge) => { await bridge.messageSubagent(toolUseId, text, activeConversationIdRef.current ?? undefined); }); }} />
        <div className="panel-feed-wrap" ref={feedWrapRef}>
          <TimelineNav marks={navMarkList} onJump={jumpToEntry} windowSize={expanded ? NAV_WINDOW_WIDE : NAV_WINDOW_COMPACT} baseWidth={expanded ? 12 : 8.8} />
          <div className="panel-feed" ref={feedRef} aria-label="对话与任务时间线" onScroll={onFeedScroll}>
            {sideExpanded && <p className="panel-side-intro">临时会话，记录不进入会话库</p>}
            {!snapshot && <p className="panel-history-loading" role="status">正在连接对话…</p>}
            {visibleGroups.map((group, index) => {
              if (group.kind === 'single') {
                if (group.entry.divider) {
                  return <div key={group.entry.id} className="panel-timeline-divider"><span>{group.entry.text.split('\n')[0]}</span></div>;
                }
                return <EntryItem key={group.entry.id} entry={group.entry} running={false} onOpenImage={openImageViewer} onKill={killTurn} display={rowDisplay} />;
              }
              const segments = segmentTurn(group.items);
              const isLiveTurn = index === latestTurnIndex && active;
              // 插话不再抬到顶部：按时间顺序留在思考链里，由 TurnProcess 的
              // renderUser 渲染，和前后步骤保持先后关系。
              const { head, tail } = splitTurnTail(segments, isLiveTurn);
              // One reply is one box — avatar and clock once at its top, the
              // pieces listed beneath like an unordered list — so alignment is
              // structural, and none of the pieces become rail marks.
              const firstReplyId = group.items.find((item) => item.kind === 'assistant')?.id;
              // 最后一轮在模型开口前也先渲染助手块：头像和竖线在发送那一刻
              // 就该在，不能等第一条思考/工具条目出现才跟着冒出来。
              const runAnchor = group.items[0] ?? (index === visibleGroups.length - 1 ? group.user : undefined);
              return <TurnBlock key={group.user.id} user={group.user} asides={[]} head={head} tail={tail} runAnchor={runAnchor} firstReplyId={firstReplyId} live={isLiveTurn} display={rowDisplay} showAsides={!sideExpanded} onOpenImage={openImageViewer} onKill={killTurn} onAvatarMenu={(event) => showTurnMenu(event, group.user.id, turnMenuTitle(group.user), isLiveTurn)} renderEntry={renderEntry} renderNote={renderNote} stats={{ entries: group.items, metrics: group.user.metrics ?? (index === latestTurnIndex && active ? snapshot?.taskMetrics : undefined), running: index === latestTurnIndex && active, showMissingUsage: index === latestTurnIndex && !active }} />;
            })}
            <WorkingIndicator sending={sendingCurrent} thinking={liveThinking} status={status} tool={runningTool}
              compacting={Boolean(snapshot?.contextCompacting)} compactingAuto={Boolean(snapshot?.contextCompactingAuto)}
              startedAt={snapshot?.taskMetrics?.startedAt} />
            {snapshot?.proposal && (
              <ApprovalCard
                proposal={snapshot.proposal}
                busy={Boolean(busy) || sendingCurrent}
                onApprove={() => { void decide(true); }}
                onReject={() => { void decide(false); }}
              />
            )}
          </div>

          {!feedAtBottom && !modelPickerOpen && !contextMenuOpen && <button
            type="button"
            className={`panel-scroll-bottom${active ? ' is-running' : ''}`}
            aria-label="回到底部"
            title={active ? '回到底部（任务运行中）' : '回到底部'}
            onClick={scrollToBottom}
          >
            {active && <svg className="panel-scroll-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16" pathLength="100" /></svg>}
            <svg className="panel-scroll-arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.8v10.4m-4.4-4.3L10 15.3l4.4-4.4" /></svg>
          </button>}
        </div>

        {!sideExpanded && snapshot?.steering && <div className="panel-queue panel-steering" aria-label="正在插话">
          <div className="panel-queue-heading">正在插话</div>
          <div className="panel-queue-list"><div className="panel-queue-item">
            <span title={snapshot.steering.text}>{snapshot.steering.text}</span>
          </div></div>
        </div>}

        {pendingMessages.length > 0 && <div className="panel-queue" aria-label="待发送消息">
          <div className="panel-queue-heading">待发送 <strong>{pendingMessages.length}</strong></div>
          <div className="panel-queue-list">{pendingMessages.map((message) => <div key={message.id}
            className={`panel-queue-item${queueDragId === message.id ? ' is-dragging' : ''}${queueDropBefore === message.id && queueDragId !== message.id ? ' is-drop-before' : ''}`}
            onDragOver={(event) => {
              if (!queueDragId || queueDragId === message.id) return;
              event.preventDefault();
              setQueueDropBefore(message.id);
            }}
            onDrop={(event) => {
              if (!queueDragId) return;
              event.preventDefault();
              const moving = queueDragId;
              const before = message.id;
              setQueueDragId(null);
              setQueueDropBefore(null);
              if (moving !== before) void moveQueuedMessage(moving, before);
            }}>
            <button type="button" className="panel-queue-grip" draggable aria-label="拖动调整待发送消息顺序" title="拖动调整顺序"
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', message.id);
                // 只拖三横标本身，不拖整行。
                event.dataTransfer.setDragImage(event.currentTarget, 9, 11);
                setQueueDragId(message.id);
              }}
              onDragEnd={() => { setQueueDragId(null); setQueueDropBefore(null); }}>
              <GripIcon />
            </button>
            <span title={message.text}>{message.text || `附件 ${message.attachments.length} 个`}</span>
            <button type="button" aria-label={`引导：${message.text.slice(0, 20)}`} title="插队发送（不打断当前回答，Ctrl+Enter）" onClick={() => { const id = sideExpanded ? sideSessionId : null; void run((bridge) => id ? bridge.steerSideQueuedMessage(id, message.id) : bridge.steerQueuedMessage(message.id)); }}><ReturnIcon /></button>
            <button type="button" aria-label={`修改待发送消息：${message.text.slice(0, 20)}`} title="修改" onClick={() => { void editQueuedMessage(message); }}><EditIcon /></button>
            <button type="button" aria-label={`移除待发送消息：${message.text.slice(0, 20)}`} title="从队列移除" onClick={() => { const id = sideExpanded ? sideSessionId : null; void run((bridge) => id ? bridge.removeSideQueuedMessage(id, message.id) : bridge.removeQueuedMessage(message.id)); }}><CloseIcon /></button>
          </div>)}
          {queueDragId && <div className="panel-queue-tail" aria-hidden="true"
            onDragOver={(event) => { event.preventDefault(); setQueueDropBefore(null); }}
            onDrop={(event) => {
              event.preventDefault();
              const moving = queueDragId;
              setQueueDragId(null);
              setQueueDropBefore(null);
              void moveQueuedMessage(moving, null);
            }} />}
          </div>
        </div>}

        {!compactEmpty && <TaskStrip key={sideExpanded ? sideSessionId : library?.activeConversationId} tasks={tasks}
          planMode={Boolean(snapshot?.planMode)} planSummary={sideExpanded ? undefined : snapshot?.approvedPlan} />}

        {!compactEmpty && !sideExpanded && snapshot?.goal && <GoalBanner goal={snapshot.goal} onClear={clearGoal}
          onPause={(paused) => { void (async () => {
            const ok = await run((bridge) => bridge.setGoalPaused(paused));
            // 从暂停切回播放等于发一条“继续目标”，让 agent 立刻接着跑。
            if (ok && !paused) await sendGoal('继续执行目标');
          })(); }}
          onEdit={() => { setDraft(snapshot.goal?.condition ?? ''); setGoalPrompting(true); setComposerOpen(true); }}
          onContinue={() => { void sendGoal('继续执行目标') }} />}

        <div className={`panel-compose-dock${composerOpen || composerExit.closing || ask || plan || permission ? ' is-open' : ''}`} ref={composeDockRef}>
          {ask ? (
            <AskQuestionPanel
              key={ask.id}
              request={localizeAskRequest(ask)}
              onSubmit={(answers) => run((bridge) => sideExpanded && sideSessionId ? bridge.answerSideChatQuestion(sideSessionId, ask.id, answers) : bridge.answerQuestion(ask.id, restoreAskAnswers(answers)))}
              onSkip={() => run((bridge) => sideExpanded && sideSessionId ? bridge.answerSideChatQuestion(sideSessionId, ask.id, null) : bridge.answerQuestion(ask.id, null))}
            />
          ) : plan ? (
            <PlanApprovalPanel
              key={plan.id}
              request={plan}
              onDecide={(approved, note) => {
                // 自己写的修改意见随「继续调整」带回输入框，用户接着改再发。
                if (!approved && note?.trim()) setDraft(note.trim())
                return run((bridge) => sideExpanded && sideSessionId ? bridge.answerSideChatPlan(sideSessionId, plan.id, approved) : bridge.answerPlan(plan.id, approved))
              }}
            />
          ) : permission ? (
            <ToolApprovalPanel
              key={permission.id}
              request={permission}
              onDecide={(decision) => run((bridge) => bridge.answerPermission(permission.id, decision))}
            />
          ) : composerOpen || composerExit.closing ? (
          <form className={`panel-composer${composerOpen ? '' : ' is-closing'}`} ref={composerRef} onAnimationEnd={composerExit.endClose} onSubmit={(event) => { event.preventDefault(); void send('queue'); }} onKeyDown={(event) => {
              if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
                event.preventDefault();
                event.stopPropagation();
                // Esc 专门用来打断回复；不收起输入框，也不让面板折叠。
                if (modelPickerOpen) setModelPickerOpen(false);
              }
            }}>
              {!compactEmpty && <button type="button" className="panel-composer-collapse" aria-label="收起输入框" title="收起输入框" onClick={closeComposer}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg></button>}
              {suggestionOpen && suggestionTrigger && <ComposerSuggestions kind={suggestionTrigger.kind} query={suggestionTrigger.query} items={suggestionItems} selectedIndex={suggestionSelected} loading={suggestionLoading} failed={suggestionFailed} onSelect={acceptSuggestion} />}
              <AttachmentChips attachments={attachments} onHover={showAttachmentPreview} onLeave={() => setPreviewCard(null)} onOpen={(attachment) => { void openAttachmentImage(attachment); }} onRemove={(id) => setAttachments((current) => current.filter((item) => item.id !== id))} />
              <AttachmentPreviewStrip preview={previewCard} previews={attachmentPreviews} names={attachments.map((item) => item.path)} error={attachmentError} />
              <div className="panel-composer-inputrow">
                <textarea
                  ref={editorRef}
                  aria-label="输入消息"
                  value={draft}
                  maxLength={8000}
                  rows={1}
                  style={{ height: composerHeight }}
                  placeholder={sideExpanded ? '在临时会话中提问…' : goalPrompting ? (expanded ? '写清目标，回车设定；按 Tab 补上“在把我交代的任务全部完成之前不要停下”' : '写清目标，回车设定') : (expanded ? '输入消息…（Enter 发送 · Ctrl+Enter 插话 · Esc 打断）' : '输入消息…')}
                  aria-controls={suggestionOpen ? 'panel-composer-suggestions' : undefined}
                  aria-expanded={suggestionOpen && (suggestionLoading || suggestionItems.length > 0)}
                  aria-activedescendant={suggestionOpen && suggestionItems.length > 0 ? `panel-suggestion-${suggestionSelected}` : undefined}
                  {...composerKeys}
                
                />
              </div>
              <VoiceWaveform phase={voicePhase} />
              <div className="panel-composer-toolbar">
                <input ref={attachmentInputRef} className="panel-attachment-input" type="file" multiple hidden
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = '';
                    if (files.length) void addFiles(files);
                  }} />
                {compactEmpty && (library?.conversations.length ?? 0) > 1 && <button type="button" className="panel-tool-button panel-conversations-button" aria-label="会话库" title="会话库" onClick={openLibrary}><ConversationsIcon /></button>}
                <ModelPicker wrapperRef={modelPickerRef} open={modelPickerOpen} dsh={snapshot?.mode === 'dsh'} sideExpanded={sideExpanded} goalOn={goalPrompting || Boolean(snapshot?.goal)} planOn={Boolean(snapshot?.planMode)} webOn={library?.settings.webSearchEnabled !== false} goalTitle={goalPrompting || snapshot?.goal ? '关闭目标模式' : '打开后写目标；按 Tab 补上“全部完成前不要停”，回车设定'} profiles={library?.settings.modelProfiles ?? []} activeId={library?.settings.activeModelProfileId} effort={snapshot?.effort ?? 'max'} onToggle={() => setModelPickerOpen((open) => !open)} onClose={() => setModelPickerOpen(false)} onToggleGoal={toggleGoal} onChoosePlan={choosePlanMode} onToggleWeb={() => { void run((bridge) => bridge.setWebSearchEnabled(library?.settings.webSearchEnabled === false)); }} onPickProfile={(id) => { void switchModelProfile(id); }} onManage={() => { void run((bridge) => bridge.openSettings()); }} onOpenOnboarding={() => { void run((bridge) => bridge.openOnboarding()); }} onEffort={chooseEffort} />
                {snapshot?.mode === 'dsh' && <ApprovalMenu wrapperRef={approvalMenuRef} mode={approvalMode} open={approvalMenuOpen} disabled={sideExpanded} onToggle={() => setApprovalMenuOpen((open) => !open)} onClose={() => setApprovalMenuOpen(false)} onChoose={(mode) => { void chooseApprovalMode(mode); }} />}
                <button type="button" className="panel-tool-button panel-attachment-button" aria-label="添加附件"
                  title="添加图片或文件（也可以直接拖入或粘贴）" onClick={() => attachmentInputRef.current?.click()}>
                  <PlusIcon />
                </button>
                <ContextMenu wrapperRef={contextMenuRef} usage={contextUsage} compacting={contextCompacting} open={contextMenuOpen} autoCompactPercent={autoCompactPreview ?? library?.settings.autoCompactPercent ?? AUTO_COMPACT_DEFAULT_PERCENT} onToggle={() => setContextMenuOpen((open) => !open)} onClose={() => setContextMenuOpen(false)} onNudge={nudgeAutoCompact} onCompact={() => { void compactContext(); }} />
                <ComposerSendRow phase={voicePhase} canListen={voiceReady && Boolean(voiceManagerRef.current?.available ?? voiceConfig?.siliconFlowAvailable)} busy={Boolean(busy)} sending={sendingCurrent} active={active} empty={!draft.trim() && !attachments.length} snapshotReady={Boolean(snapshot)} compacting={contextCompacting} goalPrompting={goalPrompting} mode={snapshot?.mode} onToggleVoice={toggleVoice} onStop={() => { void stop(); }} />
              </div>
            </form>
          ) : (
            <button ref={composeTriggerRef} type="button" className="panel-compose-trigger" aria-label="输入消息" onClick={() => setComposerOpen(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 11.5a7.5 7.5 0 0 1-7.5 7.5c-1.2 0-2.4-.3-3.4-.8L4 19l.8-4.1A7.5 7.5 0 1 1 19 11.5Z" /><path d="M9 11.5h5" /></svg>
            </button>
          )}
        </div>
        </div>

        </div>
      </section>
      {imageViewer && <button type="button" className="panel-image-viewer" aria-label={`关闭图片预览：${imageViewer.name}`} onClick={() => setImageViewer(null)}>
        <img src={imageViewer.url} alt={imageViewer.name} />
      </button>}
      <BypassConfirmDialog open={bypassConfirmOpen} onCancel={() => setBypassConfirmOpen(false)} onConfirm={() => { void applyApprovalMode('danger-full-access'); }} />
      <EvolveConfirmDialog open={evolveConfirmOpen} phrase={evolveAuthorizePhrase} text={evolveAuthorizeText} onText={setEvolveAuthorizeText} onCancel={() => setEvolveConfirmOpen(false)} onConfirm={() => { void applyApprovalMode('selfEvolve'); }} />
    </section>
  );
}


