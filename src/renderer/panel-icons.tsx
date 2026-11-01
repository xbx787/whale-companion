import type { ApprovalMode, ContextUsageSnapshot } from '../shared/contracts'
import { IconArchive, IconClose, IconEdit, IconPin, IconPlus, IconRefresh, IconTrash } from './icons'

/** One icon per permission mode: a hand (manual approval), a pencil (workspace
 *  writes), a warning shield (everything runs), a hexagon (self restart). */
export function ApprovalIcon({ mode }: { mode: ApprovalMode }) {
  if (mode === 'read-only') {
    // 手动审批：一只举起的手。
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.4 10.6V6.4a1.2 1.2 0 0 1 2.4 0v3.3" /><path d="M8.8 9.7V5.2a1.2 1.2 0 0 1 2.4 0v4.5" /><path d="M11.2 9.4V6.4a1.2 1.2 0 0 1 2.4 0v5.5c0 2.7-1.9 4.5-4.5 4.5H8.2c-1.4 0-2.5-.7-3.2-1.9l-1.2-2.1a1.1 1.1 0 0 1 1.8-1.2l1.4 1.4" /></svg>
  }
  if (mode === 'workspace-write') {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.2 15.8l.9-3.8 7.6-7.6a1.5 1.5 0 0 1 2.1 2.1l-7.6 7.6-3 .9Z" /><path d="m11.7 5.4 2.1 2.1" /></svg>
  }
  if (mode === 'danger-full-access') {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.8 16.2 5v5.1c0 3.5-2.4 6.3-6.2 7.4-3.8-1.1-6.2-3.9-6.2-7.4V5L10 2.8Z" /><path d="M10 7.1v4.1" /><path d="M10 13.7h.01" /></svg>
  }
  // 自我进化：科技感六边形 + 向上的箭头，紫色由 CSS 给。
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.4 16.4 6v8L10 17.6 3.6 14V6z" /><path d="M10 13.2V7.1" /><path d="m7.3 9.6 2.7-2.6 2.7 2.6" /><path d="M7 14.6h6" /><circle cx="10" cy="15.1" r=".6" /></svg>
}

/** Goal mode: a target with an arrow; plan mode: a checklist. */
export function GoalIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="3.2" /><path d="M10 10 16.2 3.8" /><path d="M12.8 3.8h3.4v3.4" /></svg>
}

export function PlanIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.4" y="3.6" width="11.2" height="13.2" rx="1.8" /><path d="M7.4 7.2h5.2" /><path d="M7.4 10h5.2" /><path d="M7.4 12.8h3.2" /></svg>
}

/** 联网搜索：地球加放大镜手柄，和搜索类工具图标同一套线条。 */
export function WebSearchIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.9" cy="8.9" r="5.3" /><path d="M3.9 8.9h10" /><path d="M8.9 3.6c1.5 1.6 2.3 3.3 2.3 5.3s-.8 3.7-2.3 5.3c-1.5-1.6-2.3-3.3-2.3-5.3s.8-3.7 2.3-5.3Z" /><path d="m12.9 12.9 3.1 3.1" /></svg>
}

export function PlusIcon() {
  return <IconPlus size={18} />;
}

export function GripIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6h8M6 10h8M6 14h8" /></svg>;
}

export function CloseIcon() {
  return <IconClose size={18} />;
}

export function ReturnIcon() {  // The enter/return arrow: the guide-a-queued-message action says it with a
  // key shape the way the keyboard actually does it.
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.5 5v5.2a2.3 2.3 0 0 1-2.3 2.3H5" /><path d="m8.2 9.3-3.2 3.2 3.2 3.2" /></svg>;
}

export function ModelIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5h12M4 10h12M4 15h12" /><circle cx="7" cy="5" r="1.5" /><circle cx="12" cy="10" r="1.5" /><circle cx="9" cy="15" r="1.5" /></svg>;
}

export function ConversationsIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5h12M4 10h12M4 15h8" /></svg>;
}

export function SelectIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="4" width="11" height="11" rx="2" /><path d="m6.5 9.4 2.3 2.2 3.6-3.8M16.5 7v9" /></svg>;
}

export function BackIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m11.8 4.5-5.5 5.5 5.5 5.5M6.8 10h9" /></svg>;
}

export function EditIcon() {
  return <IconEdit size={18} />;
}

export function ArchiveIcon({ restore = false }: { restore?: boolean }) {
  return restore ? <IconRefresh size={18} /> : <IconArchive size={18} />;
}

export function DeleteIcon() {
  return <IconTrash size={18} />;
}

export function ExportIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5v8.2m-3-3.1 3 3.1 3-3.1M4.5 13.5v2.2h11v-2.2" /></svg>;
}

export function ImportIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 11.7V3.5m-3 3.1 3-3.1 3 3.1M4.5 13.5v2.2h11v-2.2" /></svg>;
}

export function PinIcon({ pinned }: { pinned: boolean }) {
  return (
    <span className="panel-pin-icon">
      <IconPin size={18} />
      {pinned && (
        <svg className="panel-pin-slash" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20 20 4" />
        </svg>
      )}
    </span>
  );
}

export function ContextMeter({ usage, compacting, open, onToggle }: {
  usage?: ContextUsageSnapshot; compacting?: boolean; open: boolean; onToggle: () => void
}) {
  const available = usage?.status === 'available' && Number.isFinite(usage.usedPercent);
  const used = available ? Math.max(0, Math.min(100, Math.round(usage.usedPercent!))) : 0;
  return <button type="button" className={`panel-context-meter${available ? ' is-known' : ''}${compacting ? ' is-compacting' : ''}${used >= 70 ? ' is-high' : ''}`} aria-label="上下文" aria-haspopup="dialog" aria-expanded={open} title={compacting ? '正在压缩…' : available ? `上下文已用 ${used}%` : '用量暂不可读取'} onClick={onToggle}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle className="panel-context-track" cx="12" cy="12" r="9" /><circle className="panel-context-progress" cx="12" cy="12" r="9" pathLength="100" strokeDasharray={`${used} 100`} /></svg>
  </button>;
}
