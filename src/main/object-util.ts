/** 共用的普通对象判定：会话存储和记忆服务原来各写了一份。 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
