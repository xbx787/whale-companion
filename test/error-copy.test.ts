import { describe, expect, it } from 'vitest'
import { publicErrorText } from '../src/shared/error-copy'

describe('public error copy', () => {
  it('removes vendor branding without touching unrelated text', () => {
    expect(publicErrorText('Claude Code process exited with code 1')).toBe('小鲸引擎 process exited with code 1')
    expect(publicErrorText('Claude Agent 运行失败。')).toBe('小鲸引擎 运行失败。')
    expect(publicErrorText('DeepSeek 认证失败：请检查 API Key。')).toBe('DeepSeek 认证失败：请检查 API Key。')
    expect(publicErrorText('DSH ACP 已退出（unknown）：stderr')).toBe('连接刚刚中断，消息已保留，请再发送一次。')
  })

  it('drops the Electron IPC wrapper so the bubble shows our own sentence', () => {
    expect(publicErrorText("Error invoking remote method 'pet:carry-conversation': Error: 未归档最多 8 个会话，先归档一个再新建。"))
      .toBe('未归档最多 8 个会话，先归档一个再新建。')
    expect(publicErrorText("Error invoking remote method 'pet:x': TypeError: 糟糕了"))
      .toBe('糟糕了')
  })
})
