import { ArchiveIcon, DeleteIcon, PinIcon, SelectIcon } from './panel-icons'

/** 会话库底部的批量操作条。选中 ID 由调用方闭包持有，这里只派发动作。 */
export function LibraryBatchBar({ confirm, busy, count, visibleCount, archived, unpin, onConfirm, onCancelConfirm, onDelete, onSelectAll, onManage }: {
  confirm: boolean
  busy: boolean
  count: number
  visibleCount: number
  archived: boolean
  unpin: boolean
  onConfirm: () => void
  onCancelConfirm: () => void
  onDelete: () => void
  onSelectAll: () => void
  onManage: (action: 'archive' | 'restore' | 'delete' | 'pin' | 'unpin') => void
}) {
  return <div className="panel-library-batch" aria-label="批量会话操作">
    {confirm ? <>
      <span className="panel-library-batch-confirm">永久删除 {count} 个会话？</span>
      <button type="button" disabled={busy || count === 0} onClick={onConfirm}>删除</button>
      <button type="button" onClick={onCancelConfirm}>取消</button>
    </> : <>
      <span className="panel-library-batch-count">已选 {count}</span>
      <button type="button" aria-label="全选当前列表" title="全选当前列表" disabled={busy || visibleCount === 0} onClick={onSelectAll}><SelectIcon /></button>
      {!archived && <button type="button" aria-label={unpin ? '取消置顶已选会话' : '置顶已选会话'} title={unpin ? '取消置顶已选会话' : '置顶已选会话'} disabled={busy || count === 0} onClick={() => onManage(unpin ? 'unpin' : 'pin')}><PinIcon pinned={unpin} /></button>}
      <button type="button" aria-label={archived ? '恢复已选会话' : '归档已选会话'} title={archived ? '恢复已选会话' : '归档已选会话'} disabled={busy || count === 0} onClick={() => onManage(archived ? 'restore' : 'archive')}><ArchiveIcon restore={archived} /></button>
      <button type="button" aria-label="删除已选会话" title="删除已选会话" disabled={busy || count === 0} onClick={onDelete}><DeleteIcon /></button>
    </>}
  </div>
}
