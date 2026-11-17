import { useEffect, useRef, useState } from 'react'

/** 采样参数滑条：拖动只改本地草稿，松手才提交；旁边的数字框可以直接输入。
 *  和思考强度滑条同一套「commit on release」纪律，避免拖动时每一格都发一次请求。 */
export function SamplingSlider({ label, value, min, max, step, disabled = false, onCommit }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState<number | null>(null)
  const [text, setText] = useState(() => formatSampling(value))
  const inputRef = useRef<HTMLInputElement | null>(null)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    const commit = (): void => commitRef.current(Number(input.value))
    input.addEventListener('change', commit)
    return () => input.removeEventListener('change', commit)
  }, [])

  useEffect(() => {
    if (draft !== null && value === draft) setDraft(null)
  }, [value, draft])

  // 保存后的值回流时同步数字框；用户正在输入时 value 不变，不会被覆盖。
  useEffect(() => { setText(formatSampling(value)) }, [value])

  const shown = draft ?? value

  function commitText(): void {
    const next = Number(text)
    if (!Number.isFinite(next) || next < min || next > max) {
      setText(formatSampling(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, next))
    setDraft(null)
    setText(formatSampling(clamped))
    commitRef.current(clamped)
  }

  return <div className="panel-sampling-row">
    <span className="panel-sampling-label">{label}</span>
    <input ref={inputRef} type="range" className="panel-sampling-range" min={min} max={max} step={step}
      value={shown} disabled={disabled} aria-label={label}
      onChange={(event) => {
        const next = Number(event.target.value)
        setDraft(next)
        setText(formatSampling(next))
      }} />
    <input type="number" className="panel-sampling-number" min={min} max={max} step={step}
      value={text} disabled={disabled} aria-label={`${label} 数值`}
      onChange={(event) => setText(event.target.value)}
      onBlur={commitText}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        commitText()
      }} />
  </div>
}

/** 统一两位小数显示，避免 0.30000000000000004 这种浮点尾巴。 */
export function formatSampling(value: number): string {
  return String(Number(value.toFixed(2)))
}
