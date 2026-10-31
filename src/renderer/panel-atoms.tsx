import { useEffect, useState } from 'react'
import type { ProposedAction } from '../shared/contracts'
import { formatCommandDuration, formatToolDuration } from './duration'
import { petBridge } from './pet-state'

export const avatarCache = new Map<string, string | null>();

/** 头像按文件名缓存，换头像或改名都会产生新键；不设上限会随使用一直涨。 */
const AVATAR_CACHE_LIMIT = 32;

function rememberAvatar(name: string, data: string | null): void {
  avatarCache.delete(name);
  rememberAvatar(name, data);
  while (avatarCache.size > AVATAR_CACHE_LIMIT) {
    const oldest = avatarCache.keys().next().value;
    if (oldest === undefined) break;
    avatarCache.delete(oldest);
  }
}

export function AvatarGlyph({ kind, name, fallback, presetSrc }: { kind: 'user' | 'assistant'; name: string | null; fallback: string; presetSrc?: string | null }) {
  const [url, setUrl] = useState<string | null>(() => name ? avatarCache.get(name) ?? null : presetSrc ?? null);
  useEffect(() => {
    if (!name) { setUrl(presetSrc ?? null); return; }
    let cancelled = false;
    void petBridge().readAvatar(kind).then((data) => {
      avatarCache.set(name, data);
      if (!cancelled) setUrl(data);
    }).catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [kind, name, presetSrc]);
  return (
    <span className="panel-avatar-shell">
      <span className="panel-event-glyph">{fallback}</span>
      {url && (
        <img
          className="panel-avatar-img"
          src={url}
          alt=""
          onError={() => setUrl(null)}
        />
      )}
    </span>
  );
}

/** 运行中的工具每秒刷新已用时间；完成后停在最终耗时。 */
export function ToolElapsed({ startedAt, durationMs, running, command }: { startedAt?: string; durationMs?: number; running: boolean; command: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running || !startedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [running, startedAt]);
  const started = startedAt ? Date.parse(startedAt) : NaN;
  const elapsed = durationMs ?? (running && Number.isFinite(started) ? Math.max(0, now - started) : undefined);
  if (elapsed === undefined || !Number.isFinite(elapsed)) return null;
  const label = command ? formatCommandDuration(elapsed) : formatToolDuration(elapsed);
  return <span className="panel-tool-time" title={`执行耗时 ${label}`}>{label}</span>;
}

export function ApprovalCard({ proposal, busy, onApprove, onReject }: {
  proposal: ProposedAction;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const note = proposal.tool === 'write_test_note';
  const riskLabel = proposal.risk === 'execute' ? '命令' : proposal.risk === 'read' ? '读取' : '写入';
  return (
    <section className="panel-approval" aria-labelledby="approval-heading">
      <div className="panel-approval-heading">
        <span className="panel-approval-symbol" aria-hidden="true">!</span>
        <div>
          <span className="panel-eyebrow">需要你的决定</span>
          <h3 id="approval-heading">{note ? '批准后才会写入文件' : '允许这一步电脑操作？'}</h3>
        </div>
        <span className="panel-risk">{riskLabel}</span>
      </div>
      <p className="panel-approval-description">{proposal.description}</p>
      <dl className="panel-approval-detail">
        <div><dt>操作</dt><dd>{note ? '写入测试笔记' : '小鲸工具请求'}</dd></div>
        <div><dt>目标</dt><dd className="panel-path">{proposal.target}</dd></div>
      </dl>
      <div className="panel-preview-label">{note ? '将写入的内容' : '完整参数'}</div>
      <pre className="panel-preview">{proposal.content}</pre>
      <div className="panel-approval-actions">
        <button type="button" className="panel-button panel-button-quiet" onClick={onReject} disabled={busy}>拒绝</button>
        <button type="button" className="panel-button panel-button-primary" onClick={onApprove} disabled={busy}>{busy ? '处理中…' : note ? '批准写入' : '允许一次'}</button>
      </div>
    </section>
  );
}
