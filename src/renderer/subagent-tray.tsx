import { useEffect, useRef, useState } from 'react'
import type { SubagentTask } from '../shared/contracts'
import { formatDuration } from './duration'
import { RunningDots } from './running-dots'
import { toolLabel } from '../shared/tool-labels'

/** 状态栏里一行一只子智能体，箭头展开详情，详情里直接跑它的思考与工具。 */
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

/**
 * 状态栏里的子智能体列表：没有子智能体时整块不占位；有就逐行展开，
 * 点行或右侧箭头把详情铺在该行下面，详情里持续输出思考与工具。
 */
export function SubagentTray({ conversationId, subagents, controlsEnabled = true, onBackgroundTask, onStopTask, onMessageSubagent }: {
  /** 切换会话时才清空已保留的卡片；同一会话内不因快照抖动重挂载。 */
  conversationId?: string
  subagents?: SubagentTask[]
  controlsEnabled?: boolean
  onBackgroundTask?: (task: SubagentTask) => void
  onStopTask?: (task: SubagentTask) => void
  onMessageSubagent?: (task: SubagentTask, text: string) => void
}) {
  // 卡片状态按会话缓存在 sessionStorage：状态行重挂载（空面板转有内容）
  // 或快照抖动都不能把已完成的代理抹掉。
  const cacheKey = `subagent-cards:${conversationId ?? ''}`
  // 右键删掉的代理进黑名单：快照再送回来也不重新出现，换会话前一直生效。
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
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [messageDraft, setMessageDraft] = useState('')
  const [messageSent, setMessageSent] = useState(false)
  const sentTimer = useRef<number | undefined>(undefined)
  // 只有真正换会话才清空；快照里 subagents 短暂为空不能把卡片抹掉。
  const lastConversationRef = useRef(conversationId)
  useEffect(() => {
    if (lastConversationRef.current === conversationId) return
    lastConversationRef.current = conversationId
    setDisplayed([])
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

  // 子代理卡片常驻：任务结束后不移除，避免只闪一下就消失。
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
  return <div className="panel-subagent-list" role="group" aria-label="子智能体">
    {displayed.map((task, index) => {
      const open = openTaskId === task.taskId
      return <div key={task.taskId} className={`panel-subagent-row is-${task.status}${open ? ' is-open' : ''}`}>
        <button type="button" className="panel-subagent-row-head"
          aria-label={`子智能体 ${index + 1}：${task.description}，${STATUS_LABEL[task.status]}`}
          aria-expanded={open}
          title={task.description}
          onClick={() => setOpenTaskId(open ? null : task.taskId)}
          onContextMenu={(event) => {
            event.preventDefault()
            // 右键删掉这一行；只有已结束的代理可以删，运行中的留给停止按钮。
            if (task.status === 'running') return
            setDisplayed((current) => current.filter((item) => item.taskId !== task.taskId))
            setRemoved((current) => new Set(current).add(task.taskId))
            if (openTaskId === task.taskId) setOpenTaskId(null)
          }}>
          <span className={`panel-subagent-dot is-${task.status}`} aria-hidden="true" />
          <span className="panel-subagent-main">
            <span className="panel-subagent-name">{task.description}</span>
            <span className="panel-subagent-sub">
              {task.summary ?? (task.lastToolName ? `最近：${toolLabel(task.lastToolName)}` : STATUS_LABEL[task.status])}
            </span>
          </span>
          <span className="panel-subagent-figures">
            {tokenText(task) && <span>{tokenText(task)}</span>}
            <span>{elapsedText(task)}</span>
          </span>
          <span className={`panel-subagent-caret${open ? ' is-open' : ''}`} aria-hidden="true" />
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
  </div>
}
