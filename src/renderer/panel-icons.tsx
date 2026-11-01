import type { ApprovalMode, ContextUsageSnapshot } from '../shared/contracts'
import { IconArchive, IconCheckBox, IconChecklist, IconClose, IconDownload, IconDragIndicator, IconEdit, IconKeyboardReturn, IconLanguage, IconPanTool, IconPlus, IconRefresh, IconSparkle, IconTarget, IconTrash, IconTune, IconUpload, IconVerifiedUser } from './icons'

/** One icon per permission mode: a hand (manual approval), a pencil (workspace
 *  writes), a warning shield (everything runs), a hexagon (self restart). */
export function ApprovalIcon({ mode }: { mode: ApprovalMode }) {
  if (mode === 'read-only') return <IconPanTool size={18} />;
  if (mode === 'workspace-write') return <IconEdit size={18} />;
  if (mode === 'danger-full-access') return <IconVerifiedUser size={18} />;
  return <IconSparkle size={18} />;
}

/** Goal mode: a target with an arrow; plan mode: a checklist. */
export function GoalIcon() {
  return <IconTarget size={18} />;
}

export function PlanIcon() {
  return <IconChecklist size={18} />;
}

/** 联网搜索：地球加放大镜手柄，和搜索类工具图标同一套线条。 */
export function WebSearchIcon() {
  return <IconLanguage size={18} />;
}

export function PlusIcon() {
  return <IconPlus size={18} />;
}

export function GripIcon() {
  return <IconDragIndicator size={18} />;
}

export function CloseIcon() {
  return <IconClose size={18} />;
}

export function ReturnIcon() {
  return <IconKeyboardReturn size={18} />;
}

export function ModelIcon() {
  return <IconTune size={18} />;
}

export function ConversationsIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5h12M4 10h12M4 15h8" /></svg>;
}

export function SelectIcon() {
  return <IconCheckBox size={18} />;
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
  return <IconDownload size={18} />;
}

export function ImportIcon() {
  return <IconUpload size={18} />;
}

export function PinIcon({ pinned }: { pinned: boolean }) {
  // 竖直图钉；已置顶满亮度，未置顶压淡。
  return (
    <span className={`panel-pin${pinned ? ' is-pinned' : ''}`}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M15 3H9v2l1 1v4.6L7 13.6V16h4.2v5h1.6v-5H17v-2.4l-3-3V6l1-1V3Z" />
      </svg>
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
