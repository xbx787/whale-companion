import { useEffect, useState } from 'react';
import type { BalanceSnapshot } from '../shared/contracts';
import { getPeakStatus } from '../shared/deepseek-pricing';
import { petBridge } from './pet-state';
import './balance.css';

interface BalanceCardProps {
  visible: boolean;
  snapshot: BalanceSnapshot | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
  /** 有值时显示吐槽卡，否则显示余额。 */
  roast?: { text: string; at: number } | null;
  onRefreshRoast?: () => void | Promise<void>;
}

function formatNext(at: number, nextTier: 'peak' | 'off_peak'): string {
  const date = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(at));
  return `${date} 转${nextTier === 'peak' ? '峰时' : '谷时'}`;
}

export function BalanceCard({ visible, snapshot, loading, error, onRefresh, onClose, roast, onRefreshRoast }: BalanceCardProps) {
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  async function refreshRoast(): Promise<void> {
    if (refreshing) return;
    setRefreshing(true);
    try { await onRefreshRoast?.(); } finally { setRefreshing(false); }
  }  useEffect(() => {
    if (!visible) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [visible]);
  if (!visible) return null;

  if (roast) {
    const at = roast.at
      ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(roast.at))
      : '';
    return (
      <aside className="balance-peek is-roast" aria-label="吐槽">
        <div className="balance-top">
          <span className="balance-brand"><i aria-hidden="true" />吐槽</span>
          <span className="balance-updated">{at}</span>
          <div className="balance-actions">
            <button type="button" className={`balance-roast-refresh${refreshing ? ' is-spinning' : ''}`}
              aria-label="换一条" title={refreshing ? '正在生成' : '换一条'} disabled={refreshing}
              onClick={() => { void refreshRoast(); }}>↻</button>
            <button type="button" aria-label="收起吐槽卡片" title="收起" onClick={onClose}>×</button>
          </div>
        </div>
        <p className="balance-roast-text">{roast.text || '正在想…'}</p>
      </aside>
    );
  }

  const peak = getPeakStatus(now);
  const checked = snapshot?.checkedAt ? new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(snapshot.checkedAt)) : null;
  const notice = error || (snapshot?.available === false ? '账户当前不可调用 API' : '');
  const tierLabel = peak.tier === 'peak' ? '峰时' : peak.tier === 'off_peak' ? '谷时' : '时段待更新';
  const nextLabel = peak.nextChangeAt && peak.nextTier ? formatNext(peak.nextChangeAt, peak.nextTier) : '切换时间待确认';

  return (
    <aside className={`balance-peek${notice ? ' has-notice' : ''}`} aria-label="DeepSeek API 余额与峰谷时段">
      <div className="balance-top">
        <span className="balance-brand"><i aria-hidden="true" />DeepSeek</span>
        {checked && <span className="balance-updated" title="上次更新时间">{checked}</span>}
        <div className="balance-actions">
          <button type="button" aria-label="刷新余额" title="刷新余额" disabled={loading} onClick={onRefresh}>↻</button>
          <button type="button" aria-label="收起余额卡片" title="收起" onClick={onClose}>×</button>
        </div>
      </div>

      <div className="balance-amounts" aria-live="polite">
        {snapshot?.balances.length ? snapshot.balances.map((line) => (
          <span className="balance-amount" key={line.currency}>
            <strong>{line.total}</strong><small className="balance-symbol">{line.currency === 'CNY' ? '¥' : '$'}</small>
          </span>
        )) : <span className="balance-placeholder">{loading ? '正在查询余额…' : '余额暂不可用'}</span>}
      </div>

      <div className="balance-bottom">
        <span className={`balance-period balance-period-${peak.tier}`}>
          <i aria-hidden="true" />{tierLabel}
          <em>{nextLabel}</em>
        </span>
        <div className="balance-links">
          <button type="button" onClick={() => { void petBridge().openExternal('https://platform.deepseek.com/top_up').catch(() => undefined); }}>充值</button>
          <button type="button" onClick={() => { void petBridge().openExternal('https://platform.deepseek.com/usage').catch(() => undefined); }}>用量</button>
        </div>
      </div>

      {notice && <div className="balance-foot"><span title={error || undefined}>{notice}</span></div>}
    </aside>
  );
}
