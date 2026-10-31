import type { AppSnapshot, TaskStatus } from '../shared/contracts'
import { BackIcon } from './panel-icons'
import { taskLabels } from './panel-utils'
import { SubagentTray } from './subagent-tray'

/** 面板顶部的临时会话条与任务状态行。 */
export function PanelStatusBar({ sideOpen, sideExpanded, onToggleSide, onDiscardSide, status, sideStatus, queuePaused, queueReason, snapshot, conversationId, controlsEnabled, onBackgroundTask, onStopTask, onMessageSubagent }: {
  sideOpen: boolean
  sideExpanded: boolean
  onToggleSide: (expanded: boolean) => void
  onDiscardSide: () => void
  status: TaskStatus
  sideStatus: TaskStatus
  queuePaused: boolean
  queueReason?: string
  snapshot: AppSnapshot | null
  conversationId?: string
  controlsEnabled: boolean
  onBackgroundTask?: (task: { toolUseId?: string }) => void
  onStopTask?: (task: { taskId: string }) => void
  onMessageSubagent?: (task: { toolUseId?: string }, text: string) => void
}) {
  const live = ['planning', 'executing', 'verifying'].includes(status)
  return <>
    {sideOpen && <div className={`panel-side-strip${sideExpanded ? ' is-expanded' : ''}`} aria-label="临时会话">
      {sideExpanded ? <>
        <button type="button" className="panel-side-back" aria-label="收起临时会话，返回主线" title="返回主线，临时会话继续保留" onClick={() => onToggleSide(false)}><BackIcon /><span>主线</span></button>
        {status !== 'idle' && <span className={`panel-status panel-status-${status}`} role="status"><i />{live ? <span className="panel-live-label">{taskLabels[status]}</span> : taskLabels[status]}</span>}
        <span className="panel-side-meta">
          {queuePaused && <span className="panel-side-paused" title={queueReason || '发送新消息后继续处理保留的队列'}>已停止，队列保留</span>}
          <span className="panel-side-name">临时会话</span>
        </span>
      </> : <button type="button" className="panel-side-chip" aria-label={`展开临时会话，${queuePaused ? '已停止，队列保留' : taskLabels[sideStatus]}`} title={queuePaused ? '已停止，队列保留；点击展开' : '展开临时会话'} onClick={() => onToggleSide(true)}><i className={`panel-task-dot panel-task-dot-${sideStatus}`} aria-hidden="true" />临时会话</button>}
      <button type="button" className="panel-side-discard" aria-label="结束并丢弃临时会话" title="结束临时会话，记录不进入会话库" onClick={onDiscardSide}>×</button>
    </div>}
    {!sideExpanded && (
      <div className="panel-status-row">
        <span className={`panel-status panel-status-${status}`} role="status"><i />{live ? <span className="panel-live-label">{taskLabels[status]}</span> : taskLabels[status]}</span>
        <SubagentTray conversationId={conversationId} subagents={snapshot?.subagents} controlsEnabled={controlsEnabled}
          onBackgroundTask={!controlsEnabled || snapshot?.mode === 'dsh' ? undefined : onBackgroundTask}
          onStopTask={!controlsEnabled ? undefined : onStopTask}
          onMessageSubagent={!controlsEnabled ? undefined : onMessageSubagent} />
      </div>
    )}
  </>
}
