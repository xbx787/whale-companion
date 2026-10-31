import type { AppSnapshot } from '../shared/contracts'

/** 右侧面板：计划与预览两页。目标本身显示在下方目标条，不在这里重复。 */
export function RightRail({ railTab, snapshot, preview, bottom, onClose }: {
  railTab: 'plan' | 'preview'
  snapshot: AppSnapshot | null
  preview: { path: string; text: string; truncated?: boolean } | null
  bottom: number
  onClose: () => void
}) {
  return <aside className="panel-right-rail" aria-label="右侧面板" style={{ bottom }}>
    <header className="panel-right-rail-head">
      <h2>{railTab === 'plan' ? '计划' : '预览'}<span className="panel-rail-step">{railTab === 'plan' ? '(1/2)' : '(2/2)'}</span></h2>
      <button type="button" className="panel-right-rail-close" aria-label="收起右侧面板" title="收起右侧面板" onClick={onClose}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-5-5 5 5-5 5" /></svg>
      </button>
    </header>
    <div className="panel-right-rail-body">
      {railTab === 'plan' && (snapshot?.plan?.plan
        ? <div className="panel-right-plan">
            <pre className="panel-right-plan-text">{snapshot.plan.plan}</pre>
          </div>
        : <p className="panel-right-empty is-centered">当前没有计划</p>)}
      {railTab === 'preview' && <div className="panel-right-preview">
        {preview ? <>
          <p className="panel-right-preview-path">{preview.path}</p>
          <pre className="panel-right-preview-text">{preview.text}{preview.truncated ? '\n…（已截断）' : ''}</pre>
        </> : <p className="panel-right-empty is-centered">这里显示最近生成或修改的代码、文档</p>}
      </div>}
    </div>
  </aside>
}
