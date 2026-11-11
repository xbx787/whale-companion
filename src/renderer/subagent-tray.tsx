import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SubagentTask } from '../shared/contracts'
import { formatDuration } from './duration'
import { RunningDots } from './running-dots'
import { toolLabel } from '../shared/tool-labels'

/** 状态栏只放一条摘要；点开是覆盖在消息区上的子智能体清单。 */
const STATUS_LABEL: Record<SubagentTask['status'], string> = {
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  stopped: '已停止'
}

function elapsedText(task: SubagentTask): string {
  const started = task.startedAt ? Date.parse(task.startedAt) : NaN
  const ended = task.endedAt ? Date.parse(task.endedAt) : NaN
  const settled = Number.isFinite(started) && Number.isFinite(ended) ? ended - started : task.durationMs
  const live = task.status === 'running' && Number.isFinite(started) ? Date.now() - started : undefined
  const ms = live ?? settled
  return ms !== undefined && ms > 0 ? formatDuration(Math.floor(ms / 1000)) : '—'
}

function tokenText(task: SubagentTask): string {
  const tokens = task.totalTokens
  if (typeof tokens !== 'number' || tokens <= 0) return ''
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K tok` : `${tokens} tok`
}

/** 下发的 prompt 没有单独字段，退回摘要或名字。 */
function promptText(task: SubagentTask): string {
  const summary = (task.summary ?? '').trim()
  if (summary && !/^started subagent/i.test(summary)) return summary
  return task.description
}

function Steps({ task }: { task: SubagentTask }) {
  const entries = task.timeline ?? []
  if (!entries.length) return <p className="panel-subagent-empty">还没有输出</p>
  return <ol className="panel-subagent-timeline">
    {entries.map((entry) => <li key={entry.id} className={`panel-subagent-step is-${entry.kind}`}>
      <span className="panel-subagent-step-mark" aria-hidden="true">
        {entry.kind === 'tool' ? (entry.tool?.status === 'running' ? <RunningDots /> : entry.tool?.status === 'error' ? '!' : '✓') : '·'}
      </span>
      <span className="panel-subagent-step-text">{entry.kind === 'tool' && entry.tool ? toolLabel(entry.tool.name) : entry.text}</span>
    </li>)}
  </ol>
}

export function SubagentTray({ conversationId, subagents, controlsEnabled = true, onBackgroundTask, onStopTask, onMessageSubagent }: {
  /** 切换会话时才清空已保留的卡片；同一会话内不因快照抖动重挂载。 */
  conversationId?: string
  subagents?: SubagentTask[]
  controlsEnabled?: boolean
  onBackgroundTask?: (task: SubagentTask) => void
  onStopTask?: (task: SubagentTask) => void
  onMessageSubagent?: (task: SubagentTask, text: string) => void
}) {
  const cacheKey = `subagent-cards:${conversationId ?? ''}`
  const removedKey = `subagent-removed:${conversationId ?? ''}`
  const [removed, setRemoved] = useState<Set<string>>(() => {
    try {
      const raw = window.sessionStorage.getItem(removedKey)
      return new Set(raw ? JSON.parse(raw) as string[] : [])
    } catch { return new Set() }
  })
  const [displayed, setDisplayed] = useState<SubagentTask[]>(() => {
    try {
      const raw = window.sessionStorage.getItem(cacheKey)
      return raw ? JSON.parse(raw) as SubagentTask[] : []
    } catch { return [] }
  })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<{ left: number; top: number; width: number } | null>(null)
  const [messageDraft, setMessageDraft] = useState('')
  const [messageSent, setMessageSent] = useState(false)
  const sentTimer = useRef<number | undefined>(undefined)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const lastConversationRef = useRef(conversationId)

  useEffect(() => {
    if (lastConversationRef.current === conversationId) return
    lastConversationRef.current = conversationId
    setDisplayed([])
    setSheetOpen(false)
    setOpenTaskId(null)
    try {
      const raw = window.sessionStorage.getItem(`subagent-removed:${conversationId ?? ''}`)
      setRemoved(new Set(raw ? JSON.parse(raw) as string[] : []))
    } catch { setRemoved(new Set()) }
  }, [conversationId])
  useEffect(() => {
    setMessageDraft('')
    setMessageSent(false)
  }, [openTaskId])
  useEffect(() => () => { if (sentTimer.current !== undefined) window.clearTimeout(sentTimer.current) }, [])

  useEffect(() => {
    const incoming = (subagents ?? []).filter((task) => !removed.has(task.taskId))
    if (!incoming.length) return
    setDisplayed((current) => {
      const next = new Map(current.map((task) => [task.taskId, task]))
      for (const task of incoming) next.set(task.taskId, task)
      return [...next.values()]
    })
  }, [subagents, removed])
  useEffect(() => {
    try {
      if (removed.size) window.sessionStorage.setItem(removedKey, JSON.stringify([...removed]))
      else window.sessionStorage.removeItem(removedKey)
    } catch { /* 存储不可用时只是少了跨挂载记忆 */ }
  }, [removed, removedKey])
  useEffect(() => {
    try {
      if (displayed.length) window.sessionStorage.setItem(cacheKey, JSON.stringify(displayed))
      else window.sessionStorage.removeItem(cacheKey)
    } catch { /* 存储不可用时只是少了跨挂载缓存 */ }
  }, [cacheKey, displayed])

  // 点外面或按 Esc 收起清单；点清单内部不关。
  useEffect(() => {
    if (!sheetOpen) return
    const closeOutside = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (sheetRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setSheetOpen(false)
    }
    const closeKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setSheetOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside, true)
    document.addEventListener('keydown', closeKey, true)
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true)
      document.removeEventListener('keydown', closeKey, true)
    }
  }, [sheetOpen])

  if (!displayed.length) return null
  const sendMessage = (): void => {
    const text = messageDraft.trim()
    const task = displayed.find((item) => item.taskId === openTaskId)
    if (!text || !task || !onMessageSubagent) return
    onMessageSubagent(task, text)
    setMessageDraft('')
    setMessageSent(true)
    if (sentTimer.current !== undefined) window.clearTimeout(sentTimer.current)
    sentTimer.current = window.setTimeout(() => setMessageSent(false), 2_000)
  }
  const toggleSheet = (): void => {
    if (sheetOpen) { setSheetOpen(false); return }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      // 浮层不能跟按钮一样窄：固定一个读得清的宽度，再按按钮中线居中。
      const width = Math.min(420, Math.max(320, window.innerWidth - 24))
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2))
      setAnchor({ left, top: rect.bottom + 6, width })
    }
    setSheetOpen(true)
  }
  return <>
    <button ref={triggerRef} type="button" className="panel-subagent-summary"
      aria-label={`${displayed.length} 个子智能体`} aria-expanded={sheetOpen} onClick={toggleSheet}>
      <span>{displayed.length} 个子智能体</span>
      <svg className={`panel-subagent-chevron${sheetOpen ? ' is-open' : ''}`} viewBox="0 0 12 12" aria-hidden="true">
        <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
      </svg>
    </button>
    {sheetOpen && anchor && createPortal(<div ref={sheetRef} className="panel-subagent-sheet" role="dialog" aria-label="子智能体"
      style={{ left: anchor.left, top: anchor.top, width: anchor.width }}>
      {displayed.map((task, index) => {
        const open = openTaskId === task.taskId
        return <div key={task.taskId} className={`panel-subagent-card is-${task.status}${open ? ' is-open' : ''}`}>
          <button type="button" className="panel-subagent-card-head"
            aria-label={`子智能体 ${index + 1}：${task.description}，${STATUS_LABEL[task.status]}`}
            aria-expanded={open} onClick={() => setOpenTaskId(open ? null : task.taskId)}>
            <span className={`panel-subagent-dot is-${task.status}`} aria-hidden="true" />
            <span className="panel-subagent-card-main">
              <span className="panel-subagent-name">{task.description}</span>
              <span className="panel-subagent-prompt">{promptText(task)}</span>
            </span>
            <span className="panel-subagent-figures">
              {tokenText(task) && <span>{tokenText(task)}</span>}
              <span>{elapsedText(task)}</span>
            </span>
            <svg className={`panel-subagent-caret${open ? ' is-open' : ''}`} viewBox="0 0 12 12" aria-hidden="true">
              <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
            </svg>
          </button>
          {open && <div className="panel-subagent-detail" role="region" aria-label={`子智能体 ${index + 1} 详情`}>
            <p className="panel-subagent-desc">{task.description}</p>
            <p className="panel-subagent-meta">
              {STATUS_LABEL[task.status]}
              {task.subagentType ? `　${task.subagentType}` : ''}
              {`　${task.toolUses ?? 0} 次工具，${elapsedText(task)}`}
              {task.totalTokens ? `，${task.totalTokens.toLocaleString()} tokens` : ''}
              {task.isBackgrounded ? '　后台运行' : ''}
            </p>
            <Steps task={task} />
            {(onBackgroundTask || onStopTask) && task.status === 'running' && <div className="panel-subagent-actions">
              {task.toolUseId && onBackgroundTask && !task.isBackgrounded &&
                <button type="button" onClick={() => onBackgroundTask(task)}>后台运行</button>}
              {onStopTask && <button type="button" className="is-stop" onClick={() => onStopTask(task)}>停止</button>}
            </div>}
            {!controlsEnabled && task.status === 'running' && <p className="panel-subagent-note">DSH 不支持单独停止子代理；需要中止时请用整轮「停止」。</p>}
            {task.status === 'running' && task.toolUseId && onMessageSubagent && <form className="panel-subagent-message"
              onSubmit={(event) => { event.preventDefault(); sendMessage() }}>
              <input value={messageDraft} maxLength={4_000}
                placeholder={messageSent ? '已转达' : '通过主对话转达'}
                aria-label="通过主对话转达给子代理"
                onChange={(event) => { setMessageDraft(event.target.value); setMessageSent(false) }} />
              <button type="submit" disabled={!messageDraft.trim()}>转达</button>
            </form>}
          </div>}
        </div>
      })}
    </div>, document.body)}
  </>
}
