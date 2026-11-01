import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** 可以热更新的功能开关：改 data/features.json，下一次读取就生效，不用重启。
 *  文件不存在或字段非法时回落到默认值。 */
export interface FeatureFlags {
  /** 会话间发消息限流：一分钟内每个发送方的条数；0 表示关闭。 */
  sessionSendLimit: number
  /** 重启后是否自动发出待办 prompt；false 时只标记步骤完成，不发消息。 */
  restartAutoSend: boolean
}

const DEFAULTS: FeatureFlags = { sessionSendLimit: 0, restartAutoSend: true }

export function readFeatureFlags(dataRoot: string | undefined): FeatureFlags {
  if (!dataRoot) return DEFAULTS
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(dataRoot, 'features.json'), 'utf8'))
    const record = (parsed ?? {}) as Record<string, unknown>
    const limit = record.sessionSendLimit
    const auto = record.restartAutoSend
    return {
      sessionSendLimit: typeof limit === 'number' && Number.isFinite(limit) && limit >= 0
        ? limit
        : DEFAULTS.sessionSendLimit,
      restartAutoSend: typeof auto === 'boolean' ? auto : DEFAULTS.restartAutoSend
    }
  } catch {
    return DEFAULTS
  }
}
