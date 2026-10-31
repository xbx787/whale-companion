/** 开启完全访问前的风险确认。 */
export function BypassConfirmDialog({ open, onCancel, onConfirm }: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return <div className="panel-bypass-backdrop" onClick={onCancel}>
    <section className="panel-bypass panel-bypass-full" role="dialog" aria-modal="true" aria-labelledby="bypass-title" onClick={(event) => event.stopPropagation()}>
      <h3 id="bypass-title">开启「完全访问」？</h3>
      <p>这个模式会跳过所有工具调用的确认——AI 可以直接执行命令、修改文件、访问网络，不再逐条征求你的同意。</p>
      <p>请先充分了解其中的风险，再决定是否开启。另一方面，AI Agent 的顺畅运行依赖宽松的审批；从任务完成效率出发，了解风险后开启是合理的。开启之后，建议在对话中为它设定明确、有效的行为边界与约束。</p>
      <div className="panel-bypass-actions">
        <button type="button" className="panel-bypass-cancel" onClick={onCancel}>取消</button>
        <button type="button" className="panel-bypass-confirm" onClick={onConfirm}>我已了解风险，开启</button>
      </div>
    </section>
  </div>
}

/** 开启自我进化前的最高权限确认，必须手动输入授权短语。 */
export function EvolveConfirmDialog({ open, phrase, text, onText, onCancel, onConfirm }: {
  open: boolean
  phrase: string
  text: string
  onText: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return <div className="panel-bypass-backdrop" onClick={onCancel}>
    <section className="panel-bypass panel-evolve-confirm" role="dialog" aria-modal="true" aria-labelledby="evolve-title" onClick={(event) => event.stopPropagation()}>
      <h3 id="evolve-title">开启「自我进化」？这是最高权限。</h3>
      <p><strong>这不是普通的完全访问。</strong>开启后，我可以在没有逐条确认的情况下修改自己的源码、运行构建和测试、打包新版本、重启应用，并在重启后继续执行任务。</p>
      <p><strong>错误的自修改可能让应用无法启动、丢失未保存的工作，或被新版本带回旧问题。</strong>命令超时、步骤上限和重启次数只是保护，不是回滚。请先提交代码或做好备份，并只在明确知道要改什么时开启。</p>
      <p>随时切回其他审批模式即可停用。但已经启动的重启和已排队命令不会因为切换模式而取消。</p>
      <label className="panel-evolve-authorize">
        <span>必须手动输入下面的短语才能开启：<code>{phrase}</code></span>
        <input type="text" value={text} autoFocus spellCheck={false}
          placeholder={phrase}
          onChange={(event) => onText(event.target.value)} />
      </label>
      <div className="panel-bypass-actions">
        <button type="button" className="panel-bypass-cancel" onClick={onCancel}>取消</button>
        <button type="button" className="panel-bypass-confirm" disabled={text.trim() !== phrase} onClick={onConfirm}>授权并开启</button>
      </div>
    </section>
  </div>
}
