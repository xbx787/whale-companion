import { useState } from 'react'
import { MessageMarkdown } from './message-markdown'
import type { PlanApprovalRequest } from '../shared/contracts'

/**
 * The parked ExitPlanMode, shown where the composer usually sits. The plan
 * arrives as Markdown and is read as a document; 开始执行 lets the CLI leave
 * plan mode and implement it, 继续调整 rejects it so the model stays in plan
 * mode and revises before proposing again.
 */
export function PlanApprovalPanel({ request, onDecide }: {
  request: PlanApprovalRequest
  onDecide: (approved: boolean, note?: string) => Promise<boolean>
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function decide(approved: boolean): Promise<void> {
    if (busy) return
    setBusy(true)
    if (!await onDecide(approved, note)) setBusy(false)
  }

  return <div className="panel-plan" aria-label="等待批准的计划">
    <section className="panel-plan-block">
      <span className="panel-plan-header">批准计划</span>
      <div className="panel-plan-text"><MessageMarkdown text={request.plan} /></div>
    </section>
    <label className="panel-plan-note">
      <span>或者，自己写修改意见</span>
      <textarea value={note} rows={2} placeholder="写清楚要改哪里；点「继续调整」后会带回输入框"
        onChange={(event) => setNote(event.target.value)} />
    </label>
    <div className="panel-plan-actions">
      <button type="button" className="panel-plan-revise" disabled={busy} onClick={() => { void decide(false) }}>继续调整</button>
      <button type="button" className="panel-plan-approve" disabled={busy} onClick={() => { void decide(true) }}>{busy ? '发送中…' : '开始执行'}</button>
    </div>
  </div>
}
