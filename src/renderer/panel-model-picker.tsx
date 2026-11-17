import type { RefObject } from 'react'
import type { EffortLevel, ModelProfile, PhoneLinkStatus } from '../shared/contracts'
import { TEMPERATURE_RANGE, TOP_P_RANGE } from '../shared/contracts'
import { EffortSlider } from './effort-slider'
import { SamplingSlider } from './sampling-slider'
import { GoalIcon, ModelIcon, PlanIcon, WebSearchIcon } from './panel-icons'

/** 两档采样预设：严谨偏确定，活泼给一点变化。数字来自实测可用的组合。 */
const SAMPLING_PRESETS = [
  { id: 'strict', label: '严谨', temperature: 0.4, topP: 0.1 },
  { id: 'lively', label: '活泼', temperature: 0.7, topP: 0.9 }
] as const

/** 输入区左下角的模型与上下文菜单：目标、计划、联网三个开关，手机端入口，模型列表和思考强度。 */
export function ModelPicker({ wrapperRef, open, dsh, sideExpanded, goalOn, planOn, webOn, goalTitle, profiles, activeId, effort, temperature, topP, phoneState, onOpenPhone, onToggle, onClose, onToggleGoal, onChoosePlan, onToggleWeb, onPickProfile, onManage, onOpenOnboarding, onEffort, onSampling }: {
  wrapperRef: RefObject<HTMLDivElement | null>
  open: boolean
  dsh: boolean
  sideExpanded: boolean
  goalOn: boolean
  planOn: boolean
  webOn: boolean
  goalTitle: string
  profiles: ModelProfile[]
  activeId?: string | null
  effort: EffortLevel
  temperature: number
  topP: number
  phoneState?: PhoneLinkStatus | null
  onOpenPhone?: () => void
  onToggle: () => void
  onClose: () => void
  onToggleGoal: () => void
  onChoosePlan: (on: boolean) => void
  onToggleWeb: () => void
  onPickProfile: (id: string) => void
  onManage: () => void
  onOpenOnboarding: () => void
  onEffort: (level: EffortLevel) => void
  onSampling: (temperature: number, topP: number) => void
}) {
  const enabled = profiles.filter((profile) => profile.enabled !== false)
  const phoneConnected = phoneState?.state === 'connected'
  return <div className="panel-model-picker-wrap" ref={wrapperRef}>
    <button type="button" className="panel-model-button" aria-label="模型与上下文" title="模型与上下文" aria-haspopup="dialog" aria-expanded={open} onClick={onToggle}>
      <ModelIcon />
    </button>
    <div className={`panel-model-menu${open ? ' is-open' : ''}`} role="dialog" aria-label="模型与上下文" aria-hidden={!open} inert={!open}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      {onOpenPhone && <button type="button" className="panel-phone-entry" onClick={onOpenPhone}>
        <span className={`panel-phone-dot is-${phoneState?.state ?? 'idle'}`} aria-hidden="true" />
        <span className="panel-phone-entry-label">连接 DSH Go 手机端</span>
        <span className="panel-phone-entry-state">{phoneConnected ? '已连接' : '未连接'}</span>
      </button>}
      <div className="panel-model-sampling">
        <div className="panel-popover-heading">采样参数</div>
        <div className="panel-sampling-presets" role="group" aria-label="采样预设">
          {SAMPLING_PRESETS.map((preset) => {
            const active = Math.abs(temperature - preset.temperature) < 0.001 && Math.abs(topP - preset.topP) < 0.001
            return <button key={preset.id} type="button" className={`panel-sampling-preset${active ? ' is-active' : ''}`}
              aria-pressed={active} disabled={sideExpanded || !dsh}
              onClick={() => onSampling(preset.temperature, preset.topP)}>{preset.label}</button>
          })}
        </div>
        <SamplingSlider label="Temperature" value={temperature} min={TEMPERATURE_RANGE.min} max={TEMPERATURE_RANGE.max} step={0.05}
          disabled={sideExpanded || !dsh} onCommit={(next) => onSampling(next, topP)} />
        <SamplingSlider label="Top P" value={topP} min={TOP_P_RANGE.min} max={TOP_P_RANGE.max} step={0.01}
          disabled={sideExpanded || !dsh} onCommit={(next) => onSampling(temperature, next)} />
      </div>
      <div className="panel-popover-modes">
        <div className="panel-popover-heading">模式</div>
        <button type="button" role="switch" aria-checked={goalOn} className={`panel-mode-toggle is-goal${goalOn ? ' is-on' : ''}`} disabled={sideExpanded || !dsh}
          title={goalTitle} onClick={onToggleGoal}>
          <span className="panel-mode-toggle-main"><span className="panel-mode-icon"><GoalIcon /></span><span>目标模式</span></span>
          <span className="panel-mode-switch" aria-hidden="true" />
        </button>
        <button type="button" role="switch" aria-checked={planOn} className={`panel-mode-toggle is-plan${planOn ? ' is-on' : ''}`} disabled={!dsh}
          onClick={() => onChoosePlan(!planOn)}>
          <span className="panel-mode-toggle-main"><span className="panel-mode-icon"><PlanIcon /></span><span>计划模式</span></span>
          <span className="panel-mode-switch" aria-hidden="true" />
        </button>
        <button type="button" role="switch" aria-checked={webOn}
          className={`panel-mode-toggle is-web${webOn ? ' is-on' : ''}`}
          disabled={sideExpanded || !dsh}
          title={webOn ? '关闭后模型不会尝试联网搜索' : '打开后模型可以联网搜索'}
          onClick={onToggleWeb}>
          <span className="panel-mode-toggle-main"><span className="panel-mode-icon"><WebSearchIcon /></span><span>联网搜索</span></span>
          <span className="panel-mode-switch" aria-hidden="true" />
        </button>
      </div>
      <div className="panel-popover-heading">模型</div>
      <div className="panel-model-list" role="radiogroup" aria-label="选择模型配置">
        {sideExpanded && <div className="panel-model-empty">临时会话沿用开启时的模型。回到主线可切换配置。</div>}
        {enabled.length === 0 &&
          <div className="panel-model-empty">还没有可用的模型配置——<button type="button" className="panel-model-empty-link" onClick={onOpenOnboarding}>打开配置向导</button></div>}
        {enabled.map((profile) => (
          <button key={profile.id} type="button" role="radio" aria-checked={profile.id === activeId}
            aria-label={profile.name}
            className={`panel-model-pick${profile.id === activeId ? ' is-active' : ''}`}
            disabled={sideExpanded}
            onClick={() => onPickProfile(profile.id)}>
            <span className="panel-model-name">{profile.name}</span>{profile.id === activeId && <span className="panel-model-check">✓</span>}
          </button>))}
        <button type="button" className="panel-model-manage" onClick={onManage}>在设置中管理…</button>
      </div>
      <div className="panel-model-effort">
        <div className="panel-popover-heading">思考强度</div>
        <EffortSlider value={effort} disabled={sideExpanded} onCommit={onEffort} />
      </div>
    </div>
  </div>
}
