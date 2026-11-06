import type { RefObject } from 'react'
import type { ContextUsageSnapshot } from '../shared/contracts'
import { AUTO_COMPACT_DEFAULT_PERCENT, AUTO_COMPACT_MAX_PERCENT, AUTO_COMPACT_MIN_PERCENT } from '../shared/contracts'
import { ContextMeter } from './panel-icons'

/** 输入区的上下文用量与自动压缩阈值菜单。包装 ref 由调用方持有。 */
export function ContextMenu({ wrapperRef, usage, compacting, carrying, open, autoCompactPercent, onToggle, onClose, onNudge, onCompact, onCarry }: {
  wrapperRef: RefObject<HTMLDivElement | null>
  usage: ContextUsageSnapshot | undefined
  compacting: boolean
  carrying: boolean
  open: boolean
  autoCompactPercent: number
  onToggle: () => void
  onClose: () => void
  onNudge: (delta: number) => void
  onCompact: () => void
  onCarry: () => void
}) {
  return <div className="panel-context-wrap" ref={wrapperRef}>
    <ContextMeter usage={usage} compacting={compacting} open={open} onToggle={onToggle} />
    <div className={`panel-context-menu${open ? ' is-open' : ''}`} role="dialog" aria-label="上下文" aria-hidden={!open} inert={!open}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <div className="panel-popover-heading">上下文</div>
      {usage?.status === 'available' && Number.isFinite(usage.usedPercent) ? <>
        <div className="panel-context-stat"><span>已用</span><strong>{Math.round(usage.usedPercent!)}%</strong></div>
        {usage.maxTokens !== undefined && usage.usedTokens !== undefined && <div className="panel-context-tokens">{usage.usedTokens.toLocaleString()} / {usage.maxTokens.toLocaleString()} token</div>}
      </> : <div className="panel-context-unknown">用量暂不可读取</div>}
      {usage?.status === 'available' && usage.stale && <div className="panel-context-stale">上次读数，等待刷新</div>}
      <div className="panel-context-tokens panel-context-threshold" role="slider" tabIndex={0}
        aria-label="自动压缩阈值" aria-valuemin={AUTO_COMPACT_MIN_PERCENT} aria-valuemax={AUTO_COMPACT_MAX_PERCENT}
        aria-valuenow={autoCompactPercent}
        title="滚轮上下调整（50%–90%）"
        onWheel={(event) => { event.preventDefault(); onNudge(event.deltaY < 0 ? 1 : -1); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); onNudge(1); }
          else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); onNudge(-1); }
        }}>
        自动压缩阈值 {autoCompactPercent}%
      </div>
      <button type="button" className="panel-compact-button" disabled={carrying} onClick={onCarry}>{carrying ? '承接中…' : '在新对话中继续'}</button>
      <button type="button" className="panel-compact-button" disabled={compacting} onClick={onCompact}>{compacting ? '压缩中…' : '压缩上下文'}</button>
    </div>
  </div>
}
