import { useEffect, useState } from 'react'
import type { PhoneCandidate, PhoneLinkStatus, PhoneSession } from '../shared/contracts'
import { petBridge } from './pet-state'

/**
 * DSH Go 手机端面板：同一 WiFi 的提示、搜索、连接、手机对话列表、断开。
 * 点一个手机对话只把 `@标题` 交给输入框，不切换本机会话，也不合并两边的库。
 */
export function PhoneLinkPanel({ status, onStatus, onClose, onPick }: {
  status: PhoneLinkStatus | null
  onStatus: (status: PhoneLinkStatus) => void
  onClose: () => void
  onPick: (session: PhoneSession) => void
}) {
  const [host, setHost] = useState(status?.host ?? '')
  const [password, setPassword] = useState('')
  const [candidates, setCandidates] = useState<PhoneCandidate[]>([])
  const [sessions, setSessions] = useState<PhoneSession[]>([])
  const [busy, setBusy] = useState<'scan' | 'connect' | 'refresh' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const connected = status?.state === 'connected'

  useEffect(() => {
    if (status?.host) setHost(status.host)
  }, [status?.host])

  useEffect(() => {
    if (!connected) return
    let alive = true
    void petBridge().phoneSessions().then((items) => {
      if (alive) setSessions(items)
    }).catch((cause: unknown) => {
      if (alive) setError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => { alive = false }
  }, [connected])

  async function refreshStatus(): Promise<void> {
    try {
      onStatus(await petBridge().phoneStatus())
    } catch {
      // 状态读不到时保持旧值，不打断面板。
    }
  }

  async function scan(): Promise<void> {
    if (busy) return
    setBusy('scan')
    setError(null)
    try {
      const found = await petBridge().phoneScan()
      setCandidates(found)
      if (found.length === 1 && !host) setHost(found[0].host)
      if (!found.length) setError('没有搜到手机。确认手机和电脑在同一个 WiFi，且 DSH Go 的局域网访问已打开。')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(null)
    }
  }

  async function connect(): Promise<void> {
    if (busy) return
    if (!host.trim()) {
      setError('先填手机地址，或点「搜索手机」。')
      return
    }
    setBusy('connect')
    setError(null)
    try {
      const items = await petBridge().phoneConnect(host.trim(), password || undefined)
      setSessions(items)
      await refreshStatus()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      await refreshStatus()
    } finally {
      setBusy(null)
    }
  }

  async function disconnect(): Promise<void> {
    try {
      await petBridge().phoneDisconnect()
      setSessions([])
      await refreshStatus()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  async function refreshSessions(): Promise<void> {
    if (busy) return
    setBusy('refresh')
    setError(null)
    try {
      setSessions(await petBridge().phoneSessions())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(null)
    }
  }

  return <div className="panel-phone-sheet" role="dialog" aria-label="DSH Go 手机端">
    <header className="panel-phone-head">
      <span className={`panel-phone-dot is-${status?.state ?? 'idle'}`} aria-hidden="true" />
      <span className="panel-phone-title">DSH Go 手机端</span>
      <span className="panel-phone-state">{connected ? '已连接' : status?.state === 'connecting' ? '连接中…' : '未连接'}</span>
      <button type="button" className="panel-phone-close" aria-label="关闭手机面板" onClick={onClose}>×</button>
    </header>
    <p className="panel-phone-hint">手机和电脑连同一个 WiFi；在手机 DSH Go 的设置里打开局域网访问，有密码就填在下面。</p>
    {connected ? <div className="panel-phone-connected">
      <div className="panel-phone-host-row">
        <span className="panel-phone-host">{status?.host}</span>
        <button type="button" className="panel-phone-link-button" disabled={busy === 'refresh'} onClick={() => { void refreshSessions() }}>刷新</button>
        <button type="button" className="panel-phone-link-button is-quiet" onClick={() => { void disconnect() }}>断开</button>
      </div>
      {sessions.length === 0
        ? <p className="panel-phone-empty">手机上还没有对话。</p>
        : <ul className="panel-phone-sessions">
          {sessions.map((session) => <li key={session.sessionId}>
            <button type="button" className="panel-phone-session" title="把这个对话引用到输入框最前面"
              onClick={() => { onPick(session) }}>
              <span className="panel-phone-session-title">{session.title}</span>
              {session.running && <span className="panel-phone-running">运行中</span>}
            </button>
          </li>)}
        </ul>}
    </div> : <div className="panel-phone-connect">
      <label className="panel-phone-field">
        <span>手机地址</span>
        <input value={host} inputMode="url" placeholder="192.168.31.12:3081"
          onChange={(event) => setHost(event.target.value)} />
      </label>
      <label className="panel-phone-field">
        <span>访问密码</span>
        <input value={password} type="password" placeholder="没设密码就留空"
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) void connect() }} />
      </label>
      <div className="panel-phone-actions">
        <button type="button" className="panel-phone-link-button" disabled={busy !== null} onClick={() => { void scan() }}>
          {busy === 'scan' ? '搜索中…' : '搜索手机'}
        </button>
        <button type="button" className="panel-phone-link-button is-primary" disabled={busy !== null} onClick={() => { void connect() }}>
          {busy === 'connect' ? '连接中…' : '连接'}
        </button>
      </div>
      {candidates.length > 0 && <ul className="panel-phone-candidates">
        {candidates.map((item) => <li key={item.host}>
          <button type="button" className={`panel-phone-candidate${item.host === host ? ' is-active' : ''}`}
            onClick={() => setHost(item.host)}>
            <span>{item.address}</span>
            <small>{item.source === 'adb' ? 'USB' : '局域网'}</small>
          </button>
        </li>)}
      </ul>}
    </div>}
    {error && <p className="panel-phone-error" role="status">{error}</p>}
  </div>
}
