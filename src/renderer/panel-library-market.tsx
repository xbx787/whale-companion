import { LIBRARY_LABELS, type LibraryItem } from '../shared/libraries'

type MarketKind = 'plugin' | 'skill' | 'mcp'

/** 会话库的「拓展」页：已安装的插件、技能和 MCP。 */
export function LibraryMarket({ kind, setKind, installed }: {
  kind: MarketKind
  setKind: (kind: MarketKind) => void
  installed: Array<Pick<LibraryItem, 'id' | 'name' | 'version' | 'description'> & { disabled?: boolean }>
}) {
  return <div className="panel-library-market">
    <div className="panel-right-market-kinds" role="tablist" aria-label="拓展分类">
      {([['plugin', '插件'], ['skill', '技能'], ['mcp', 'MCP']] as const).map(([value, label]) => (
        <button key={value} type="button" role="tab" aria-selected={kind === value}
          className={kind === value ? 'is-active' : ''} onClick={() => setKind(value)}>{label}</button>
      ))}
    </div>
    {installed.length === 0
      ? <p className="panel-right-empty is-centered">还没有安装{LIBRARY_LABELS[kind]}，去市场里找一个</p>
      : <div className="panel-library-installed">
          {installed.map((item) => (
            <div key={item.id} className={`panel-library-installed-item${item.disabled ? ' is-disabled' : ''}`}>
              <span className="panel-library-installed-name">{item.name}{item.version && <small>v{item.version}</small>}</span>
              {item.description && <span className="panel-library-installed-source" title={item.description}>{item.description}</span>}
              {item.disabled && <span className="panel-library-installed-source">已停用</span>}
            </div>
          ))}
        </div>}
    <button type="button" className="panel-library-market-open" onClick={() => { void window.pet.openSettings('libraries') }}>浏览市场</button>
  </div>
}
