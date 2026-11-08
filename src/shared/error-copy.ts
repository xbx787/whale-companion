/** Removes vendor branding and transport noise from text shown in the app.
 *  Internal logs and stored history keep the original wording so failures stay
 *  diagnosable. */
export function publicErrorText(message: string): string {
  let text = message
  // Electron wraps a rejected IPC call as
  // `Error invoking remote method 'pet:xxx': Error: <ours>`. The channel name
  // and the duplicate `Error:` mean nothing to the person reading the bubble.
  for (let round = 0; round < 3; round += 1) {
    const stripped = text
      .replace(/^Error invoking remote method '[^']*':\s*/u, '')
      .replace(/^(?:Error|TypeError|ReferenceError|RangeError):\s*/u, '')
    if (stripped === text) break
    text = stripped
  }
  return text
    .replace(/Claude Code/gi, '小鲸引擎')
    .replace(/Claude Agent/gi, '小鲸引擎')
    .replace(/Claude 客户端/g, '小鲸引擎')
    .replace(/DSH ACP 已退出（[^）]*）(?:[：:][^\n]*)?/g, '连接刚刚中断，消息已保留，请再发送一次。')
}
