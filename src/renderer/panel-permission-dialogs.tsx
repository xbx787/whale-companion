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
      <p><strong>自我进化 = 完全访问 + 改自己的代码 + 打包重启。</strong>开启后，我不再逐条征求同意，也不会在动手前停下来问你。</p>
      <div className="panel-evolve-roles">
        <section className="panel-evolve-role">
          <h4>你是这个项目的开发者</h4>
          <p>关键词是<strong>「进化」</strong>。你说「进化到 N」，我就改代码、跑测试、打 N 版本、重启，并在重启后继续跑完剩下的任务；你说「别进化」，我就只做普通开发。改动留在当前 worktree，<strong><code>scripts/evolve-report.ps1</code> 会把 diff、测试结果和版本号整理成 PR 或 issue 草稿</strong>，GitHub 仓库里也放了对应的提交模板。</p>
        </section>
        <section className="panel-evolve-role is-caution">
          <h4>如果你不参与开发</h4>
          <p><strong>谨慎开启：这个模式在大多数情况下就等于完全访问。</strong>它还允许我修改自己的程序、打包和重启，改坏了应用可能直接打不开。<strong>你必须知道自己在干什么</strong>：说得出要改什么、改坏了怎么恢复，再开。</p>
        </section>
      </div>
      <p><strong>错误的自修改可能让应用无法启动、丢失未保存的工作，或被新版本带回旧问题。</strong>命令超时、步骤上限和重启次数只是保护，不是回滚。请先提交代码或做好备份。</p>
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
