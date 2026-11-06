/** The panel's one duration format: mm:ss, zero-padded, minutes uncapped. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

/** 一般工具（编辑、读取等）的耗时：100ms 以下给毫秒，100ms 到 1 秒给零点几秒，
 *  1 秒以上一律整数秒，再长走 mm:ss。 */
export function formatToolDuration(ms: number): string {
  const value = Math.max(0, ms)
  if (value < 100) return `${Math.round(value)}ms`
  if (value < 1_000) {
    // 0.85s、0.35s；去掉末尾的 0，但保留 0.1s 这种一位。
    return `${(value / 1_000).toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '')}s`
  }
  if (value < 60_000) return `${Math.round(value / 1_000)}s`
  return formatDuration(value / 1_000)
}

/** 标签为「执行命令」的工具用整数秒；超过一分钟统一走 mm:ss。 */
export function formatCommandDuration(ms: number): string {
  const value = Math.max(0, ms)
  if (value >= 60_000) return formatDuration(value / 1_000)
  return `${Math.round(value / 1_000)}s`
}
