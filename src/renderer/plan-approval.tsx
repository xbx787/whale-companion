import { useMemo, useState } from 'react'
import { MessageMarkdown } from './message-markdown'
import type { PlanApprovalRequest } from '../shared/contracts'

/** 计划标题：取 Markdown 第一行一级标题，没有就用「计划」。 */
export function planTitle(plan: string): string {
  const heading = plan.split(/\r?\n/u).find((line) => /^#\s+\S/u.test(line.trim()))
  return heading ? heading.trim().replace(/^#\s+/u, '').slice(0, 80) : '计划'
}

/**
 * 停住的 ExitPlanMode，占用输入框的位置。
 *
 * 结构照 DSH 的 PlanReviewPanel：外框 → 卡片 → 警告色顶条（状态点 + 标题）
 * → 摘要区 → 底部反馈与「讨论 / 批准」。区别只有一处：DSH 把完整计划放进
 * 右侧栏，这里必须让主人在审批框里直接读到全文，所以摘要区展开成可滚动的
 * Markdown 文档；「收起计划」只折叠文档，不影响审批。
 */
export function PlanApprovalPanel({ request, onDecide }: {
  request: PlanApprovalRequest
  onDecide: (approved: boolean, note?: string) => Promise<boolean>
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const title = useMemo(() => planTitle(request.plan), [request.plan])
  const empty = !request.plan.trim()

  async function decide(approved: boolean): Promise<void> {
    if (busy) return
    setBusy(true)
    setError(null)
    const accepted = await onDecide(approved, note)
    if (!accepted) {
      setBusy(false)
      setError(approved ? '批准没有送达，请重试。' : '修改意见没有送达，请重试。')
    }
  }

  return <div className="panel-plan-frame" aria-label="等待批准的计划">
    <section className="panel-plan-card" aria-busy={busy}>
      <div className="panel-plan-strip">
        <span className="panel-plan-dot" aria-hidden="true" />
        <span className="panel-plan-strip-label">计划待审阅</span>
        <button type="button" className="panel-plan-toggle" aria-expanded={!collapsed}
          onClick={() => setCollapsed((current) => !current)}>
          {collapsed ? '展开计划' : '收起计划'}
        </button>
      </div>
      <div className="panel-plan-summary">
        <h3 className="panel-plan-title" title={title}>{title}</h3>
        {!collapsed && <div className="panel-plan-document">
          {empty
            ? <p className="panel-plan-empty">计划正文没有读到。点「讨论」让模型重新提交一份带正文的计划。</p>
            : <MessageMarkdown text={request.plan} />}
        </div>}
      </div>
      <label className="panel-plan-note">
        <span>或者，自己写修改意见</span>
        <textarea value={note} rows={2} placeholder="写清楚要改哪里；点「讨论」后会带回输入框"
          onChange={(event) => setNote(event.target.value)} />
      </label>
      <div className="panel-plan-footer">
        <div className="panel-plan-feedback" role="status">{error}</div>
        <div className="panel-plan-actions">
          <button type="button" className="panel-plan-revise" disabled={busy} title="不接受这份计划，让模型继续调整"
            onClick={() => { void decide(false) }}>讨论</button>
          <button type="button" className="panel-plan-approve" disabled={busy} title="批准这份计划，开始执行"
            onClick={() => { void decide(true) }}>{busy ? '发送中…' : '批准'}</button>
        </div>
      </div>
    </section>
  </div>
}
