# Claudian 对齐与遗留项完善计划

依据：Claudian 2.3.3、`docs/2026-10-19-subagent-mechanism.md`、
`docs/2026-10-24-cs146s-2026-gap.md`、`docs/2026-10-24-cs146s-remediation-plan.md`。

## 已先做的一步

- 勾叉批准卡停用：`request_approval` 已从 pet MCP 工具表移除，调用处直接失败。
  需要确认时改为在对话里问，或走面板提问窗口。代码已改、类型检查通过，待打包生效。

## 阶段 A：提问窗口打通（先决条件）

现状：面板已有 AskUserQuestion UI（`ask-question.tsx`），但当前 DSH 的
`sdk-minimal` profile 不暴露提问工具，模型侧调不到，所以这次没法用它来批准计划。

改动：
1. 宿主侧补一个提问通道：pet MCP 新增 `ask_user` 工具，问题与选项走
   `pet:ask-question` IPC，渲染层复用现有 ask-question 卡片。
2. 回传答案给工具调用；超时返回 null，并在对话里说明未答。
3. 去掉对 DSH profile 的依赖，Claude 路径和 DSH 路径都能用。

验收：模型调用 `ask_user` 后面板出现选项卡，选完后工具拿到答案；
不选超时也返回明确结果。

## 阶段 B：子代理对齐 Claudian

已具备：乱序事件缓存、终态不可逆、中断兜底、前台/后台切换、停止单任务、
向子代理发消息、详情浮层。

缺的：
1. **子代理定义扫描**：读 `.claude/agents/*.md` 的 name/description/tools/model，
   在 `@` 候选里列出子代理（Claudian 的 `@` 可提及 subagents）。
2. **详情跨重启恢复**：`SubagentTask` 写进会话记录，重启后恢复卡片，
   而不是只剩主时间线里的 Task 行。
3. **后台结果回读**：后台子代理完成后的最终输出可单独查看，
   不只依赖主时间线里的 Task 结果。
4. **并行视图**：同一轮多个子代理时按任务分组展示进度与耗时。

验收：`@` 能列出仓库里的子代理；重启后子代理卡片还在；
后台任务完成后能看到它的输出；并行任务各自独立收尾。

## 阶段 C：CS146S 剩余项

1. `AGENTS.md` + 仓库级文档合并：新增 `agent-docs.ts`，按仓库根到工作目录合并
   `AGENTS.md` / `CLAUDE.md`，接进宿主规则并每轮重读。
2. DSH 侧 hooks：`pre-tool` / `post-turn` 两个钩子点，配置读 `data/hooks.json`，
   拒绝规则走现有审批通道。
3. 轻量模型路由：规则表 + provider 健康故障转移，默认关闭，保持现有行为。
4. Agentic Code Review：复用成长实验的隔离 worktree，只输出评审不改工作区。
5. 技能生命周期：SKILL.md 的 version/requires 字段、旧版回滚、库健康检查。

验收：每项单独可开关、默认不影响现有行为；各自的回归测试通过。

## 阶段 D：ACP 遗留

1. 手动压缩空摘要：摘要为空时重试一次，再降级为确定性压缩，UI 给可重试提示，
   不再直接 `ACP Internal error`。
2. ACP 异常收敛：`DSH ACP 已退出` 这类底层错误在 UI 只显示可操作信息，
   原始文本进日志。

验收：大会话压缩失败后能重试或降级成功；界面上看不到原始 ACP 异常栈。

## 阶段 E：打包与验证

- 版本递增到 0.0.116，`pack:release` 产出安装器。
- 按 MEMORY 事故规则检查顶层 junction、`bin.js --version`、`fix-dsh-links -Check`。
- 推送 `codex/dsh-p0`。
- 重启后验证：提问窗口、勾叉卡不再出现、子代理卡片恢复。

## 顺序

A → B → C → D → E。A 必须先做，否则计划批准本身没法走提问窗口。
