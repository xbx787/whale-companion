import { useState } from 'react'
import type { AskAnswers, AskQuestion, AskQuestionRequest } from '../shared/contracts'
import { MessageMarkdown } from './message-markdown'

/** Picked labels × free text, one entry per answered question — the exact shape
 *  the CLI reads back from updatedInput.answers. Free text wins a single-choice
 *  question and joins the labels on a multiSelect one; unanswered questions are
 *  left out entirely. */
export function composeAnswers(questions: AskQuestion[], picked: Record<string, string[]>, custom: Record<string, string>): AskAnswers {
  const answers: AskAnswers = {}
  for (const question of questions) {
    const free = (custom[question.key] ?? '').trim()
    const choices = picked[question.key] ?? []
    if (question.multiSelect) {
      const list = free ? [...choices, free] : choices
      if (list.length) answers[question.key] = list
    } else if (free) {
      answers[question.key] = free
    } else if (choices.length) {
      answers[question.key] = choices[0]
    }
  }
  return answers
}

/** DSH 的推荐后缀不改变答案值，只在界面上补一个小标签。 */
export function parseRecommendedLabel(label: string): { label: string; recommended: boolean } {
  const match = /^(.+?)\s*(?:（推荐）|\(Recommended\))$/u.exec(label.trim())
  return match ? { label: match[1], recommended: true } : { label, recommended: false }
}

/**
 * 停住的 AskUserQuestion，占用输入框的位置。
 *
 * 结构照 DSH 的 QuestionComposer：卡片 → 头部（eyebrow + 标题 + 进度）→
 * 题目与选项 → 底部（反馈 + 跳过/上一题/下一题/提交）。多题逐题前进，最后一题
 * 才出现「提交」；提交时缺哪题就跳回哪题，不另做汇总页。
 */
export function AskQuestionPanel({ request, onSubmit, onSkip }: {
  request: AskQuestionRequest
  onSubmit: (answers: AskAnswers) => Promise<boolean>
  onSkip: () => Promise<boolean>
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [tab, setTab] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = request.questions.length
  const multi = total > 1
  const index = Math.min(tab, total - 1)
  const question = request.questions[index]

  const answers = composeAnswers(request.questions, picked, custom)
  const free = (custom[question.key] ?? '').trim()
  const chosen = picked[question.key] ?? []
  const last = index === total - 1

  function pick(label: string): void {
    setError(null)
    setPicked((current) => {
      const choices = current[question.key] ?? []
      const next = question.multiSelect
        ? choices.includes(label) ? choices.filter((item) => item !== label) : [...choices, label]
        : [label]
      return { ...current, [question.key]: next }
    })
    // 单选就是决定：清掉自写答案；多题时自动进入下一题，最后一题停在原地等提交。
    if (!question.multiSelect) {
      setCustom((current) => ({ ...current, [question.key]: '' }))
      if (!last) setTab(index + 1)
    }
  }

  function typeFree(value: string): void {
    setError(null)
    setCustom((current) => ({ ...current, [question.key]: value }))
    // 自写答案覆盖单选；多选里它和已选项并存。
    if (!question.multiSelect && value.trim()) {
      setPicked((current) => ({ ...current, [question.key]: [] }))
    }
  }

  function goNext(): void {
    if (!last) setTab(index + 1)
  }

  async function submit(): Promise<void> {
    if (busy) return
    const missing = request.questions.findIndex((item) => !(item.key in answers))
    if (missing >= 0) {
      setTab(missing)
      setError('还有问题没有回答。')
      return
    }
    setBusy(true)
    setError(null)
    if (!await onSubmit(answers)) {
      setBusy(false)
      setError('回答没有送达，请重试。')
    }
  }

  async function skip(): Promise<void> {
    if (busy) return
    setBusy(true)
    setError(null)
    if (!await onSkip()) {
      setBusy(false)
      setError('跳过没有送达，请重试。')
    }
  }

  return <div className="panel-ask-frame" aria-label="等待回答的问题">
    <section className="panel-ask-card" aria-busy={busy}>
      <header className="panel-ask-header">
        <div className="panel-ask-heading">
          <div className="panel-ask-eyebrow">需要你的回答</div>
          <h3 className="panel-ask-title" title={question.question}>
            {question.header || (multi ? `问题 ${index + 1}` : '回答一下')}
          </h3>
        </div>
        {multi && <div className="panel-ask-header-actions">
          <span className="panel-ask-progress">{index + 1} / {total}</span>
        </div>}
      </header>
      <div className="panel-ask-body">
        <div className="panel-ask-question"><MessageMarkdown text={question.question} /></div>
        <div className="panel-ask-options" role={question.multiSelect ? 'group' : 'radiogroup'} aria-label={question.question}>
          {question.options.map((option) => {
            const active = chosen.includes(option.label)
            const shown = parseRecommendedLabel(option.label)
            return <button key={option.label} type="button" role={question.multiSelect ? 'checkbox' : 'radio'} aria-checked={active}
              className={`panel-ask-option${active ? ' is-picked' : ''}`} onClick={() => pick(option.label)}>
              <span className={`panel-ask-mark panel-ask-mark-${question.multiSelect ? 'check' : 'radio'}`} aria-hidden="true" />
              <span className="panel-ask-option-text">
                <span className="panel-ask-option-label">{shown.label}</span>
                {shown.recommended && <span className="panel-ask-recommended">推荐</span>}
                {option.description && <small>{option.description}</small>}
              </span>
            </button>
          })}
          <label className={`panel-ask-option panel-ask-custom${free ? ' is-picked' : ''}`}>
            <span className={`panel-ask-mark panel-ask-mark-${question.multiSelect ? 'check' : 'radio'}`} aria-hidden="true" />
            <input className="panel-ask-other" value={custom[question.key] ?? ''} aria-label={`${question.question} 的其他答案`} placeholder="其他…"
              onChange={(event) => typeFree(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
                event.preventDefault()
                if (last) void submit()
                else goNext()
              }} />
          </label>
        </div>
      </div>
      <footer className="panel-ask-footer">
        <div className="panel-ask-feedback" role="status">{error}</div>
        <div className="panel-ask-actions">
          <button type="button" className="panel-ask-skip" disabled={busy} onClick={() => { void skip() }}>跳过</button>
          {multi && index > 0 && <button type="button" className="panel-ask-nav" disabled={busy} onClick={() => setTab(index - 1)}>上一题</button>}
          {!last && <button type="button" className="panel-ask-nav" disabled={busy} onClick={goNext}>下一题</button>}
          {last && <button type="button" className="panel-ask-submit" disabled={busy} onClick={() => { void submit() }}>{busy ? '发送中…' : '提交'}</button>}
        </div>
      </footer>
    </section>
  </div>
}
