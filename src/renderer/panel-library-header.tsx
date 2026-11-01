import { BackIcon, ImportIcon, PlusIcon, SelectIcon } from './panel-icons'

/** 会话库顶部：返回、标题、多选、导入、新建。 */
export function LibraryHeader({ tab, busy, multiSelect, atLimit = false, limitHint, onBack, onToggleMulti, onImport, onNew }: {
  tab: 'sessions' | 'market'
  busy: boolean
  multiSelect: boolean
  /** 未归档会话已到上限：加号禁掉，不再让人点了才发现建不了。 */
  atLimit?: boolean
  limitHint?: string
  onBack: () => void
  onToggleMulti: () => void
  onImport: () => void
  onNew: () => void
}) {
  return <header className="panel-library-header">
    <button type="button" className="panel-library-icon panel-library-back" aria-label="返回对话" title="返回对话" onClick={onBack}><BackIcon /></button>
    <h2>{tab === 'sessions' ? '会话' : '拓展'}<span className="panel-rail-step">{tab === 'sessions' ? '(1/2)' : '(2/2)'}</span></h2>
    {tab === 'sessions' && <>
      <button type="button" className="panel-library-icon panel-library-select" aria-label={multiSelect ? '退出多选' : '多选会话'} title={multiSelect ? '退出多选' : '多选会话'} aria-pressed={multiSelect} disabled={busy} onClick={onToggleMulti}><SelectIcon /></button>
      <button type="button" className="panel-library-icon panel-library-import" aria-label="导入会话" title="从文件导入会话" disabled={busy} onClick={onImport}><ImportIcon /></button>
      <button type="button" className="panel-library-icon panel-library-new" disabled={busy || atLimit} aria-label="新建会话" title={atLimit ? (limitHint ?? '未归档会话已到上限，先归档一个再新建') : '新建会话'} onClick={() => { if (!atLimit) onNew() }}><PlusIcon /></button>
    </>}
  </header>
}
