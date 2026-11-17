import { accessSync, constants, mkdirSync } from 'node:fs'
import path from 'node:path'

/** 应用数据目录的落点。
 *
 *  默认用安装目录下的 data；装到 Program Files 这类只读位置时，建目录会失败，
 *  此时退回用户目录，避免应用在启动阶段直接崩掉。已有可写目录的行为不变。 */
export function resolveDataRoot(options: {
  preferred: string
  fallback: string
  override?: string
  onFallback?: (fallback: string) => void
}): string {
  if (options.override && path.isAbsolute(options.override)) return options.override
  try {
    mkdirSync(options.preferred, { recursive: true })
    accessSync(options.preferred, constants.W_OK)
    return options.preferred
  } catch {
    mkdirSync(options.fallback, { recursive: true })
    options.onFallback?.(options.fallback)
    return options.fallback
  }
}
