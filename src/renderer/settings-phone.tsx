import { useEffect, useState } from 'react'
import type { PhoneCandidate, PhoneLinkStatus, PhoneSession } from '../shared/contracts'
import type { SettingsAPI } from '../preload/settings'

/** 设置里的手机端页：连接、断开、自动重连、查看手机对话。
 *  引用对话到输入框要在聊天面板里做，这里只管理连接。 */
export function SettingsPhoneSection({ api }: { api: SettingsAPI }) {
  const [status, setStatus] = useState<PhoneLinkStatus | null>(null)
  const [host, setHost] = useState('')
  const [password, setPassword] = useState('')
  const [candidates, setCandidates] = useState<PhoneCandidate[]>([])
  const [sessions, setSessions] = useState<PhoneSession[]>([])
  const [busy, setBusy] = useState<'scan' | 'connect' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const connected = status?.state === 'connected'

  async function refresh(): Promise<void> {
    if (!api.phoneStatus) {
      setError('当前版本不支持手机连接。')
      return
    }
    try {
      const next = await api.phoneStatus()
      setStatus(next)
      if (next.host) setHost(next.host)
      if (next.state === 'connected') setSessions((await api.phoneSessions?.()) ?? [])
    } catch {
      // 状态读不到时保留旧值。
    }
  }

  useEffect(() => { void refresh() }, [])

  async function scan(): Promise<void> {
    if (!api.phoneScan) return
    setBusy('scan')
    setError(null)
    try {
      const found = await api.phoneScan()
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
    if (!api.phoneConnect) return
    setBusy('connect')
    setError(null)
    try {
      setSessions(await api.phoneConnect(host.trim(), password || undefined))
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  async function disconnect(): Promise<void> {
    await api.phoneDisconnect?.()
    setSessions([])
    await refresh()
  }

  return <>
    <div className="settings-row">
      <div className="settings-copy">
        <label>DSH Go 手机端</label>
        <p>手机和电脑连同一个 WiFi，在手机 DSH Go 的设置里打开局域网访问。连接后可以在聊天面板的模型菜单里点「连接 DSH Go 手机端」引用手机对话。</p>
      </div>
      <div className="settings-phone-state">
        <span className={`settings-phone-dot is-${status?.state ?? 'idle'}`} aria-hidden="true" />
        <span>{connected ? '已连接' : status?.state === 'connecting' ? '连接中…' : '未连接'}</span>
      </div>
    </div>
    {connected ? <>
      <div className="settings-row">
        <div className="settings-copy"><label>当前手机</label><p>{status?.host}</p></div>
        <button type="button" className="settings-phone-button is-quiet" onClick={() => { void disconnect() }}>断开</button>
      </div>
      <div className="settings-phone-sessions">
        <span className="settings-phone-sessions-title">手机上的对话</span>
        {sessions.length === 0
          ? <p className="settings-phone-empty">手机上还没有对话。</p>
          : <ul>{sessions.map((session) => <li key={session.sessionId}>
            <span>{session.title}</span>
            {session.running && <small>运行中</small>}
          </li>)}</ul>}
      </div>
    </> : <>
      <div className="settings-phone-form">
        <label className="settings-phone-field"><span>手机地址</span>
          <input type="text" value={host} placeholder="192.168.31.12:3081" onChange={(event) => setHost(event.target.value)} />
        </label>
        <label className="settings-phone-field"><span>访问密码</span>
          <input type="password" value={password} placeholder="没设密码就留空" onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) void connect() }} />
        </label>
        <div className="settings-phone-buttons">
          <button type="button" className="settings-phone-button" disabled={busy !== null} onClick={() => { void scan() }}>
            {busy === 'scan' ? '搜索中…' : '搜索手机'}
          </button>
          <button type="button" className="settings-phone-button is-primary" disabled={busy !== null} onClick={() => { void connect() }}>
            {busy === 'connect' ? '连接中…' : '连接'}
          </button>
        </div>
        {candidates.length > 0 && <ul className="settings-phone-candidates">
          {candidates.map((item) => <li key={item.host}>
            <button type="button" className={item.host === host ? 'is-active' : ''} onClick={() => setHost(item.host)}>
              <span>{item.address}</span><small>{item.source === 'adb' ? 'USB' : '局域网'}</small>
            </button>
          </li>)}
        </ul>}
      </div>
    </>}
    <div className="settings-row">
      <div className="settings-copy"><label>启动时自动重连</label><p>记住上次的手机地址，打开应用后自己连一次。</p></div>
      <button type="button" role="switch" aria-checked={status?.autoConnect === true}
        className={`settings-switch${status?.autoConnect === true ? ' is-on' : ''}`}
        onClick={() => { void api.phoneSetAutoConnect?.(status?.autoConnect !== true).then(refresh) }} />
    </div>
    {error && <p className="settings-phone-error" role="status">{error}</p>}
  </>
}
