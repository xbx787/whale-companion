import type { RefObject } from 'react'
import type { ApprovalMode } from '../shared/contracts'
import { APPROVAL_MODE_LABELS, APPROVAL_MODES } from './panel-constants'
import { ApprovalIcon } from './panel-icons'
import { APPROVAL_MODE_HINTS } from './panel-utils'

/** 输入区左下角的审批模式选择。包装 ref 由调用方持有，保留点击外部关闭。 */
export function ApprovalMenu({ wrapperRef, mode, open, disabled, onToggle, onClose, onChoose }: {
  wrapperRef: RefObject<HTMLDivElement | null>
  mode: ApprovalMode
  open: boolean
  disabled: boolean
  onToggle: () => void
  onClose: () => void
  onChoose: (mode: ApprovalMode) => void
}) {
  return <div className="panel-approval-wrap" ref={wrapperRef}>
    <button type="button" className={`panel-tool-button panel-approval-button is-${mode === 'workspace-write' ? 'write' : mode === 'danger-full-access' ? 'bypass' : mode === 'selfEvolve' ? 'evolve' : 'readonly'}`}
      aria-label={`审批模式：${APPROVAL_MODE_LABELS[mode]}`}
      aria-haspopup="dialog" aria-expanded={open}
      title={`审批模式：${APPROVAL_MODE_LABELS[mode]}`}
      disabled={disabled}
      onClick={onToggle}>
      <ApprovalIcon mode={mode} />
    </button>
    <div className={`panel-approval-menu${open ? ' is-open' : ''}`} role="dialog" aria-label="审批模式" aria-hidden={!open} inert={!open}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <div className="panel-popover-heading">审批模式</div>
      {APPROVAL_MODES.map((item) => <button key={item} type="button" role="radio" aria-checked={mode === item}
        className={`panel-approval-pick${mode === item ? ' is-active' : ''}`}
        onClick={() => onChoose(item)}>
        <span className={`panel-approval-pick-icon is-${item}`} aria-hidden="true"><ApprovalIcon mode={item} /></span>
        <span className="panel-approval-pick-text">
          <span>{APPROVAL_MODE_LABELS[item]}</span>
          <small>{APPROVAL_MODE_HINTS[item]}</small>
        </span>
        {mode === item && <span className="panel-model-check" aria-hidden="true">✓</span>}
      </button>)}
    </div>
  </div>
}
