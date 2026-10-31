import type { VoiceManagerPhase } from './voice-manager'
import { VoiceButton } from './voice-button'

/** 输入区右侧的语音与发送按钮。空输入且任务在跑时，同一位置变成停止。 */
export function ComposerSendRow({ phase, canListen, busy, sending, active, empty, snapshotReady, compacting, goalPrompting, mode, onToggleVoice, onStop }: {
  phase: VoiceManagerPhase
  canListen: boolean
  busy: boolean
  sending: boolean
  active: boolean
  empty: boolean
  snapshotReady: boolean
  compacting: boolean
  goalPrompting: boolean
  mode: 'dsh' | 'live' | undefined
  onToggleVoice: () => void
  onStop: () => void
}) {
  const isStop = active && empty
  const hint = isStop ? '停止任务（Esc）'
    : sending ? '发送中…'
    : goalPrompting ? '回车设定目标'
    : active ? (mode === 'dsh' ? 'Enter 排队发送，Ctrl+Enter 插队发送' : 'Enter 排队发送，Ctrl+Enter 优先排队')
    : '发送消息（Enter）'
  return <>
    <VoiceButton phase={phase} canListen={canListen} disabled={busy && phase === 'idle'} onToggle={onToggleVoice} />
    <button type={isStop ? 'button' : 'submit'} className={`panel-send${sending ? ' is-sending' : ''}`}
      disabled={(!active && empty) || busy || sending || !snapshotReady || (compacting && !isStop)}
      aria-label={goalPrompting ? '设定目标' : sending ? '发送中…' : isStop ? '停止任务' : active ? '排队发送消息' : '发送消息'}
      title={hint}
      onClick={isStop ? onStop : undefined}>
      {sending ? <span className="panel-send-spinner" aria-hidden="true" /> : isStop ? <span className="panel-stop-square" /> : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-5-5 5 5-5 5" /></svg>}
    </button>
  </>
}
