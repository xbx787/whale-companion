import { ipcMain } from 'electron'
import type { LocalAsr } from './local-asr'
import type { VoiceModelStore } from './voice-model'

export interface VoiceIpcDeps {
  trusted: (event: Electron.IpcMainInvokeEvent) => boolean
  /** 设置窗口也要能状态查询和下载模型。 */
  settingsTrusted: (event: Electron.IpcMainInvokeEvent) => boolean
  voiceModel: VoiceModelStore
  localAsr: LocalAsr
}

/** 本地语音：模型状态、按需下载、取消，以及 PCM 识别。 */
export function registerLocalAsrIpc(deps: VoiceIpcDeps): void {
  const allow = (event: Electron.IpcMainInvokeEvent): boolean => deps.trusted(event) || deps.settingsTrusted(event)
  ipcMain.handle('pet:voice-model-status', (event) => {
    if (!allow(event)) throw new Error('无效的界面请求。')
    return deps.voiceModel.refresh()
  })
  ipcMain.handle('pet:voice-model-download', (event) => {
    if (!allow(event)) throw new Error('无效的界面请求。')
    return deps.voiceModel.download()
  })
  ipcMain.handle('pet:voice-model-cancel', (event) => {
    if (!allow(event)) return
    deps.voiceModel.cancel()
  })
  ipcMain.handle('pet:voice-transcribe-local', async (event, payload: unknown) => {
    if (!allow(event)) throw new Error('无效的界面请求。')
    const data = payload as { samples?: unknown; sampleRate?: unknown } | null
    const raw = data?.samples
    const samples = raw instanceof Float32Array
      ? raw
      : Array.isArray(raw) ? Float32Array.from(raw as number[]) : null
    if (!samples?.length) throw new Error('没有收到录音数据。')
    const sampleRate = typeof data?.sampleRate === 'number' ? data.sampleRate : 16_000
    const text = await deps.localAsr.transcribe(samples, sampleRate)
    return { available: deps.localAsr.available(), text: text ?? '' }
  })
}
