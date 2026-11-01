import { memo, useEffect, useMemo, useState, type MouseEvent } from 'react'
import type { TimelineEntry, ToolRowDetail } from '../shared/contracts'
import { mcpServerLabel, mcpToolRef, toolLabel } from '../shared/tool-labels'
import { formatDuration } from './duration'
import { abbreviateWorkspace, MessageBody, stripAnsi, timeText, toolImagePath } from './panel-message'
import { AvatarGlyph, ToolElapsed } from './panel-atoms'
import { RunningDots } from './running-dots'
import { kindLabels, senderBadge } from './panel-utils'
import { petBridge } from './pet-state'
import { ThinkingItem } from './thinking-item'
import { toolArgumentPreview, toolPlanText } from './tool-arguments'
import { toolDiffPreview } from './tool-diff'
import { ToolDiffBody } from './tool-diff-body'
import { ToolIcon } from './tool-icons'
import { ToolImageOutput } from './tool-images'
import { ToolInputDetails } from './tool-input-details'
import { sameTimelineEntry } from './timeline-groups'

const KILL_AFTER_MS = 60_000;

/** The display preferences a row needs beyond its entry itself. */
export interface RowDisplay {
  showTimestamps: boolean
  avatars: { user: string | null; assistant: string | null }
  /** Built-in avatar of the current persona, used when no custom one exists. */
  personaAvatar?: string | null
  /** Open Edit/Write/MultiEdit rows on first render. */
  expandEditsByDefault?: boolean
  /** 工具行右侧显示多少信息。 */
  toolRowDetail?: ToolRowDetail
  /** 工作区绝对路径：工具行里的长路径缩成 `~/…`。 */
  workspace?: string
}

export const TimelineItem = memo(function TimelineItem({ entry, running = false, onOpenImage, onAvatarMenu, onKill, display }: { entry: TimelineEntry; running?: boolean; onOpenImage?: (name: string, url: string) => void; onAvatarMenu?: (event: MouseEvent<HTMLElement>) => void; onKill?: () => void; display: RowDisplay }) {
  const timeLabel = timeText(entry.time);
  const toolPreview = entry.kind === 'tool' ? (entry.text.trim().split(/\r?\n/, 1)[0] || '工具活动') : '';
  const legacyToolDetail = entry.kind === 'tool' ? entry.text.trim().split(/\r?\n/).slice(1).join('\n').trim() : '';
  const toolName = entry.kind === 'tool' ? (entry.tool?.name ?? toolPreview.split(' · ')[0].split('（')[0]) : '';
  // The line diff is an LCS over the edit's strings: recompute it only when the
  // edit itself changes, not on every streaming frame that re-renders this row.
  const toolDiff = useMemo(
    () => entry.kind === 'tool' ? toolDiffPreview(toolName, entry.tool?.input) : null,
    [entry.kind, toolName, entry.tool?.input]);
  // A tool that has been running past the minute mark can be killed from its
  // own row. One timeout for the remainder of that minute: the switch arrives
  // exactly at the mark, and a row that remounts for any reason just schedules
  // a fresh timeout for whatever is left — toggling the row can neither
  // summon the switch early nor keep it away.
  const [killable, setKillable] = useState(false);
  useEffect(() => {
    if (entry.kind !== 'tool' || !running || entry.tool?.status !== 'running') { setKillable(false); return; }
    const started = Date.parse(entry.time);
    if (!Number.isFinite(started)) return;
    const remaining = KILL_AFTER_MS - (Date.now() - started);
    if (remaining <= 0) { setKillable(true); return; }
    const timer = window.setTimeout(() => setKillable(true), remaining);
    return () => window.clearTimeout(timer);
  }, [entry.kind, entry.time, entry.tool?.status, running]);
  // The card body (diff preview, long output) mounts on first expand only.
  // Edit-like rows may start open when the reader asked for that.
  const editTool = entry.kind === 'tool' && ['Edit', 'Write', 'MultiEdit'].includes(toolName);
  const [toolOpened, setToolOpened] = useState(() => Boolean(display.expandEditsByDefault && editTool));
  if (entry.kind === 'subagent') {
    const task = entry.subagent;
    if (!task) return null;
    // 对话内稿：和消息一起滚动的子代理条目；顶部状态行仍保留图标和详情弹层。
    const stateLabel = task.status === 'running' ? '运行中' : task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : '已停止';
    const steps = task.timeline ?? [];
    const started = task.startedAt ? Date.parse(task.startedAt) : Number.NaN;
    const ended = task.endedAt ? Date.parse(task.endedAt) : Number.NaN;
    const elapsedMs = Number.isFinite(started) && Number.isFinite(ended) ? ended - started : task.durationMs;
    const elapsed = elapsedMs !== undefined && elapsedMs > 0 ? formatDuration(Math.floor(elapsedMs / 1000)) : '';
    return <details className={`panel-subagent-entry is-${task.status}`} open={task.status === 'running'}>
      <summary className="panel-subagent-entry-head">
        <span className="panel-subagent-entry-mark" aria-hidden="true">{task.status === 'running' ? '◌' : task.status === 'completed' ? '✓' : task.status === 'failed' ? '!' : '–'}</span>
        <span className="panel-subagent-entry-name">{task.description}</span>
        <span className="panel-subagent-entry-state">{stateLabel}{elapsed ? ` ${elapsed}` : ''}</span>
      </summary>
      {steps.length > 0 && <ol className="panel-subagent-entry-steps">
        {steps.slice(-8).map((step) => <li key={step.id} className={`is-${step.kind}`}>
          <span className="panel-subagent-entry-step-mark" aria-hidden="true">{step.kind === 'tool' ? (step.tool?.status === 'running' ? <RunningDots /> : step.tool?.status === 'error' ? '!' : '✓') : '·'}</span>
          <span className="panel-subagent-entry-step-text">{step.kind === 'tool' && step.tool ? toolLabel(step.tool.name) : step.text}</span>
        </li>)}
      </ol>}
    </details>;
  }
  if (entry.kind === 'tool') {
    const status = entry.tool?.status ?? 'done';
    const name = entry.tool?.name ?? toolPreview.split(' · ')[0].split('（')[0];
    const label = toolLabel(name);
    const mcp = mcpToolRef(name);
    const mcpToolLabel = mcp ? toolLabel(mcp.tool) : '';
    const rowLabel = mcp
      ? `${mcpServerLabel(mcp.server)} ${mcpToolLabel === '外部工具' || mcpToolLabel === '工具' ? mcp.tool : mcpToolLabel}`
      : label;
    const rowDetail = display.toolRowDetail ?? 'brief';
    const rawArgument = abbreviateWorkspace(toolArgumentPreview(entry.tool?.input), display.workspace);
    // 简略档不再按字符数硬截：行宽由 CSS 的 ellipsis 按实际空间决定，
    // 文件名能一直顶到时间前，也不会因为固定 28 字留下大片空白。
    const argument = rowDetail === 'name' ? '' : rawArgument;
    const diff = toolDiff;
    // A plan lives in the call's input; its output is only "approved". Showing
    // the plan itself is the whole point of plan mode.
    const plan = toolPlanText(name, entry.tool?.input);
    const detail = entry.tool?.output?.trim() ? entry.tool.output : legacyToolDetail;
    const images = entry.tool?.images ?? [];
    // 读取图片的工具没有 images 数组，路径只在参数里；右上角给一个直接入口。
    const openImagePath = toolImagePath(entry.tool);
    const imageDetail = images.length && detail
      ? stripAnsi(detail).replace(/^\[图片结果\]\s*$/gm, '').trim()
      : '';
    // A failed edit never touched the file, so the error is the only honest body
    // to show; a successful one answers "what actually changed" with its lines.
    const body = images.length
      ? <ToolImageOutput images={images} detail={imageDetail || undefined} />
      : plan
      ? <pre className="panel-tool-output panel-tool-plan">{plan}</pre>
      : diff && status !== 'error'
      ? <ToolDiffBody preview={diff} />
      : detail ? <pre className="panel-tool-output">{stripAnsi(detail)}</pre>
      : <div className="panel-tool-empty">{status === 'running' ? '正在运行…' : '没有输出'}</div>;
    return <details className={`panel-tool-activity${status === 'running' ? ' is-running' : ''}`}
      open={toolOpened} onToggle={(event) => setToolOpened(event.currentTarget.open)}>
      <summary aria-label={`${rowLabel}${argument ? ` ${argument}` : ''}${diff && rowDetail !== 'name' ? `，新增 ${diff.added} 行，删除 ${diff.removed} 行` : ''}，${status === 'error' ? '失败' : status === 'running' ? '执行中' : '已完成'}`}>
        <ToolIcon name={name} />
        <code className={status === 'running' ? 'panel-live-label' : undefined} title={mcp ? `MCP：${mcp.server} / ${mcp.tool}` : undefined}>{rowLabel}</code>
        {argument && <span className="panel-tool-argument" title={/^([A-Za-z]:[\\/]|\/)/.test(rawArgument) ? '点击在右栏预览' : undefined}
          onClick={(event) => {
            if (!/^([A-Za-z]:[\\/]|\/)/.test(rawArgument)) return;
            event.preventDefault();
            event.stopPropagation();
            window.dispatchEvent(new CustomEvent('pet-preview-path', { detail: rawArgument }));
          }}>{argument}</span>}
        <ToolElapsed startedAt={entry.tool?.startedAt} durationMs={entry.tool?.durationMs} running={status === 'running'} command={rowLabel === '执行命令'} />
        {diff && rowDetail !== 'name' && <span className="panel-tool-diff" aria-hidden="true">
          <span className="panel-tool-diff-add">+{diff.added}</span>
          {diff.removed > 0 && <span className="panel-tool-diff-del">−{diff.removed}</span>}
        </span>}
        {openImagePath && <button type="button" className="panel-tool-open-image" title="用系统默认程序打开原图" aria-label="查看原图"
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); void petBridge().openPath(openImagePath); }}>查看原图</button>}
        {status === 'running' && killable
          ? <button type="button" className="panel-tool-kill" aria-label="停止当前命令" title="停止当前命令"
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); onKill?.(); }}>×</button>
          : <span className={`panel-tool-result is-${status}`} aria-hidden="true">
              {status === 'error' ? '×' : status === 'running'
                ? <span className="panel-tool-dots"><i /><i /><i /></span>
                : '✓'}
            </span>}
      </summary>
      {toolOpened && body}
      {toolOpened && <ToolInputDetails input={entry.tool?.input} />}
    </details>;
  }
  if (entry.kind === 'system') {
    // A notice has no speaker: no glyph, no clock — the hairlines and the
    // centered, muted line set it apart from the dialogue instead. Errors
    // take the same row but a warning tone and a leading mark.
    const failed = entry.tone === 'error';
    return <article className={`panel-event panel-event-system${failed ? ' is-error' : ''}`} aria-label={`${kindLabels.system}${failed ? '，错误' : ''}`}>
      <div className="panel-event-body">
        {failed && <span className="panel-event-system-mark" aria-hidden="true">!</span>}
        {entry.tag && <span className="panel-event-tag">{entry.tag}</span>}
        <p>{entry.text}</p>
        {entry.retryText && <button type="button" className="panel-event-retry"
          onClick={() => { void petBridge().sendMessage(entry.retryText!).catch(() => undefined) }}>重试</button>}
      </div>
    </article>;
  }
  // Conversation-to-conversation messages carry their source title in the
  // body so the model sees it. The row turns that prefix into a visible
  // sender identity (name + first-character badge) instead of showing it as
  // ordinary prose.
  const sourceMatch = entry.kind === 'user'
    ? /^【(?:来自对话「([^」]{1,40})」|(定时任务|自动恢复|上下文压缩|重启恢复))】\r?\n?/u.exec(entry.text)
    : null;
  const sourceName = sourceMatch ? (sourceMatch[1] ?? sourceMatch[2] ?? '').trim() : '';
  const labelOnly = ['定时任务', '自动恢复', '上下文压缩', '重启恢复'].includes(sourceName);
  const sender = entry.kind === 'user'
    ? entry.sender ?? (sourceName ? { name: sourceName, badge: senderBadge(sourceName), ...(labelOnly ? { keepAvatar: true } : {}) } : undefined)
    : undefined;
  const senderFace = sender?.keepAvatar ? undefined : sender;
  // 跨端消息的正文里还留着 [来源 → 目标] 一行头，模型需要看到它，
  // 但界面上已经渲染成双框，正文里要剥掉，避免重复一遍。
  const routePrefix = entry.sender?.target
    ? /^\[[^\]\n]{1,60}?→[^\]\n]{1,60}\]\r?\n?/u.exec(entry.text)
    : null;
  const bodyEntry = routePrefix
    ? { ...entry, text: entry.text.slice(routePrefix[0].length) }
    : sourceMatch ? { ...entry, text: entry.text.slice(sourceMatch[0].length) } : entry;
  return (
    <article className={`panel-event panel-event-${entry.kind}`} data-entry-id={entry.id} aria-label={`${sender ? sender.name : kindLabels[entry.kind]}，${timeLabel}`}>
      <div className="panel-event-avatar" aria-hidden="true" onContextMenu={onAvatarMenu}>
        {entry.kind === 'user' || entry.kind === 'assistant'
          ? <AvatarGlyph kind={entry.kind}
              fallback={senderFace?.badge ?? (entry.kind === 'user' ? '你' : '鲸')}
              name={senderFace ? null : entry.kind === 'user' ? display.avatars.user : display.avatars.assistant}
              presetSrc={entry.kind === 'user' ? null : display.personaAvatar} />
          : <span className="panel-event-glyph">系</span>}
        {display.showTimestamps && <time className="panel-event-time" dateTime={entry.time}>{timeLabel}</time>}
        <span className="panel-event-line" />
      </div>
      <div className="panel-event-body">
        {sender && !sender.target && <span className="panel-event-sender">{sender.name}</span>}
        <MessageBody entry={bodyEntry} running={running} onOpenImage={onOpenImage} />
        {sender?.target && (
          <span className="panel-event-route">
            <svg className="route-arc" viewBox="0 0 28 24" aria-hidden="true">
              <path d="M1.5 1.5V10a8.5 8.5 0 0 0 8.5 8.5H26" />
              <circle cx="1.5" cy="1.5" r="3.4" />
              <circle cx="26" cy="18.5" r="3.4" />
            </svg>
            <span className={`route-box ${routeTone(sender.side, 'from')}`}>{sender.name}</span>
            <span className="route-arrow" aria-hidden="true">→</span>
            <span className={`route-box ${routeTone(sender.side, 'to')}`}>{sender.target}</span>
          </span>
        )}
      </div>
    </article>
  );
}, (prev, next) => prev.running === next.running && sameTimelineEntry(prev.entry, next.entry) &&
  prev.display.showTimestamps === next.display.showTimestamps &&
  (prev.display.avatars.user ?? null) === (next.display.avatars.user ?? null) &&
  (prev.display.avatars.assistant ?? null) === (next.display.avatars.assistant ?? null) &&
  (prev.display.personaAvatar ?? null) === (next.display.personaAvatar ?? null) &&
  prev.display.expandEditsByDefault === next.display.expandEditsByDefault &&
  prev.display.toolRowDetail === next.display.toolRowDetail &&
  (prev.display.workspace ?? null) === (next.display.workspace ?? null));

/** 跨端/内部转发消息的两个框各用哪种色：来源橙、目标按对方端。 */
function routeTone(side: 'pc' | 'phone' | 'internal' | undefined, slot: 'from' | 'to'): string {
  if (side === 'phone') return slot === 'from' ? 'is-phone' : 'is-pc';
  if (side === 'pc') return slot === 'from' ? 'is-pc' : 'is-phone';
  return slot === 'from' ? 'is-pc' : 'is-pc-target';
}

/** Thinking entries get their own expandable row; everything else keeps the message layout. */
export function EntryItem({ entry, running, onOpenImage, onKill, display }: { entry: TimelineEntry; running: boolean; onOpenImage?: (name: string, url: string) => void; onKill?: () => void; display: RowDisplay }) {
  return entry.kind === 'thinking'
    ? <ThinkingItem entry={entry} running={running} />
    : <TimelineItem entry={entry} running={running} onOpenImage={onOpenImage} onKill={onKill} display={display} />;
}


