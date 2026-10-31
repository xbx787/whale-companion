/** 统一的错误文本：对象带 message 时取它，否则 String()。
 *  DSH 运行时和 ACP 运行时原来各写了一份。 */
export function errorText(value: unknown): string {
  if (value && typeof value === 'object' && 'message' in value) return String((value as { message: unknown }).message)
  return String(value)
}
