import type { ConversationSummary, PetAPI } from '../shared/contracts'
import { modeLabels, stampText } from './panel-message'
import { ArchiveIcon, DeleteIcon, EditIcon, ExportIcon, PinIcon } from './panel-icons'
import { statusRunning } from './panel-utils'

/** 会话列表的一行：重命名、删除确认、操作按钮和元信息。 */
export function SessionRow({ item, active, selected, multiSelect, busy, renaming, deleting, renameDraft, onRenameDraft, onStartRename, onCancelRename, onSaveRename, onStartDelete, onCancelDelete, onSelect, onToggleSelected, onLibraryAction, onForgetParentSide }: {
  item: ConversationSummary
  active: boolean
  selected: boolean
  multiSelect: boolean
  busy: boolean
  renaming: boolean
  deleting: boolean
  renameDraft: string
  onRenameDraft: (value: string) => void
  onStartRename: () => void
  onCancelRename: () => void
  onSaveRename: () => void
  onStartDelete: () => void
  onCancelDelete: () => void
  onSelect: () => void
  onToggleSelected: () => void
  onLibraryAction: (action: (bridge: PetAPI) => Promise<void>, after?: () => void) => void
  onForgetParentSide: (id: string) => void
}) {
  if (!multiSelect && renaming) {
    return <div className={`panel-session${active ? ' is-current' : ''}`}>
      <form className="panel-session-edit" onSubmit={(event) => { event.preventDefault(); onSaveRename(); }}>
        <input autoFocus aria-label="会话名称" maxLength={120} value={renameDraft} onChange={(event) => onRenameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') onCancelRename(); }} />
        <button type="submit" className="panel-session-save" aria-label="保存名称" title="保存名称" disabled={busy}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4.8 10.6 3.4 3.4 7-7.4" /></svg></button><button type="button" onClick={onCancelRename}>取消</button>
      </form>
    </div>
  }
  if (!multiSelect && deleting) {
    return <div className={`panel-session${active ? ' is-current' : ''}`}>
      <div className="panel-session-confirm">
        <span>永久删除“{item.title}”？</span>
        <button type="button" disabled={busy} onClick={() => onLibraryAction((bridge) => bridge.deleteConversation(item.id), () => { onForgetParentSide(item.id); onCancelDelete(); })}>确认删除</button>
        <button type="button" onClick={onCancelDelete}>取消</button>
      </div>
    </div>
  }
  return <div className={`panel-session${active ? ' is-current' : ''}${selected ? ' is-selected' : ''}`}>
    <button type="button" className={`panel-session-main${multiSelect ? ' is-selecting' : ''}`} disabled={busy} aria-pressed={multiSelect ? selected : undefined} aria-label={multiSelect ? `${selected ? '取消选择' : '选择'} ${item.title}` : undefined} onKeyDown={(event) => { if (event.altKey && event.key === 'Enter') { event.preventDefault(); onToggleSelected(); } }} onClick={(event) => { if (multiSelect || event.altKey) onToggleSelected(); else onSelect(); }}>
      {multiSelect && <i className={`panel-session-check${selected ? ' is-checked' : ''}`} aria-hidden="true">{selected ? '✓' : ''}</i>}
      <strong>{item.title}</strong><span>{item.preview || (item.archivedAt ? '点击恢复' : '暂无消息')}</span>
    </button>
    {!multiSelect && <div className="panel-session-actions">
      <button type="button" aria-label={`导出 ${item.title}`} title="导出会话" disabled={busy}
        onClick={() => onLibraryAction(async (bridge) => { await bridge.exportConversation?.(item.id); })}><ExportIcon /></button>
      {!item.archivedAt && <button type="button" aria-label={item.pinnedAt ? '取消置顶' : '置顶会话'} title={item.pinnedAt ? '取消置顶' : '置顶会话'} disabled={busy} onClick={() => onLibraryAction((bridge) => bridge.setConversationPinned(item.id, !item.pinnedAt))}><PinIcon pinned={Boolean(item.pinnedAt)} /></button>}
      <button type="button" aria-label={`重命名 ${item.title}`} title="重命名" onClick={onStartRename}><EditIcon /></button>
      <button type="button" aria-label={`${item.archivedAt ? '恢复' : '归档'} ${item.title}`} title={statusRunning(item) ? '这个会话还在运行，结束后才能归档' : item.archivedAt ? '恢复' : '归档'} disabled={busy || statusRunning(item)} onClick={() => onLibraryAction((bridge) => item.archivedAt ? bridge.restoreConversation(item.id) : bridge.archiveConversation(item.id), () => { if (!item.archivedAt) onForgetParentSide(item.id); })}><ArchiveIcon restore={Boolean(item.archivedAt)} /></button>
      <button type="button" aria-label={`删除 ${item.title}`} title={statusRunning(item) ? '这个会话还在运行，结束后才能删除' : '删除'} disabled={busy || statusRunning(item)} onClick={onStartDelete}><DeleteIcon /></button>
    </div>}
    {!multiSelect && <div className="panel-session-meta" aria-hidden="true">
      <span>{modeLabels[item.mode]}</span>
      <span>创建 {stampText(item.createdAt)}</span>
      <span>活动 {stampText(item.lastActivityAt)}</span>
      <span>{item.messageCount} 条消息</span>
    </div>}
  </div>
}
