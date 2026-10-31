import { useEffect, useState } from 'react'
import type { AgentGoal } from '../shared/contracts'

function GoalIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.4" /><circle cx="10" cy="10" r="2.6" /><path d="M10 10 16.4 3.6" /><path d="M13.2 3.6h3.2v3.2" /></svg>
}

function PauseIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="5" width="3.2" height="10" rx="1.2" /><rect x="10.8" y="5" width="3.2" height="10" rx="1.2" /></svg>
}

function PlayIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4.6v10.8L16 10 7 4.6Z" /></svg>
}

function EditIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 16 1-4 8.4-8.4 3 3L8 15l-4 1Z" /><path d="m12.4 4.6 3 3" /></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
}

/** 目标条：运行时间、目标文本、修改/暂停/删除三个键。
 *  暂停只决定对话停下后要不要自动继续，不停止当前回合。 */
export function GoalBanner({ goal, onEdit, onPause, onClear, onContinue }: {
  goal: AgentGoal
  onEdit?: () => void
  onPause?: (paused: boolean) => void
  onClear: () => void
  onContinue?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    // 暂停时不再走表：清掉计时器，显示停在暂停那一刻。
    if (goal.paused) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [goal.paused])
  const unverified = goal.phase === 'unverified'
  const paused = Boolean(goal.paused)
  const elapsed = Math.max(0, Math.floor((now - Date.parse(goal.startedAt)) / 1000))
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  return <div className={`panel-goal-banner${expanded ? ' is-expanded' : ''}${unverified ? ' is-unverified' : ''}${paused ? ' is-paused' : ''}`} aria-label="目标">
    <span className="panel-goal-banner-icon" aria-hidden="true"><GoalIcon /></span>
    <button type="button" className="panel-goal-banner-condition" aria-expanded={expanded}
      title={expanded ? '收起目标' : '点击查看目标全文'}
      onClick={() => setExpanded((open) => !open)}>{goal.condition}</button>
    {unverified && onContinue && <button type="button" className="panel-goal-continue" title="重启后目标尚未确认，点击继续执行"
      onClick={onContinue}>继续</button>}
    <time className="panel-goal-banner-time" dateTime={goal.startedAt}>{clock}</time>
    <span className="panel-goal-actions">
      <button type="button" className="panel-goal-action" aria-label="修改目标" title="修改目标" onClick={onEdit}><EditIcon /></button>
      <button type="button" className="panel-goal-action" aria-label={paused ? '恢复目标' : '暂停目标'}
        title={paused ? '恢复：对话停下后自动继续' : '暂停：对话停下后不再自动继续'}
        disabled={goal.phase === 'stopping'} onClick={() => onPause?.(!paused)}>{paused ? <PlayIcon /> : <PauseIcon />}</button>
      <button type="button" className="panel-goal-action is-danger" aria-label="删除目标" title="删除目标" onClick={onClear}><CloseIcon /></button>
    </span>
  </div>
}
