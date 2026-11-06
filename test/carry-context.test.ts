import { describe, expect, it } from 'vitest'
import { composeCarriedContext, recentTurnText } from '../src/main/carry-context'

const line = (role: 'user' | 'assistant', content: string) => ({ role, content })

describe('carried conversation context', () => {
  it('keeps only the latest turns, oldest first', () => {
    const history = [
      line('user', '第一问'), line('assistant', '第一答'),
      line('user', '第二问'), line('assistant', '第二答'),
      line('user', '第三问'), line('assistant', '第三答'),
      line('user', '第四问'), line('assistant', '第四答')
    ]
    const text = recentTurnText(history, 2)
    expect(text).not.toContain('第一问')
    expect(text).not.toContain('第二问')
    expect(text.indexOf('第三问')).toBeLessThan(text.indexOf('第四问'))
    expect(text).toContain('用户：第三问')
    expect(text).toContain('助手：第四答')
  })

  it('skips empty lines and stays within the total budget', () => {
    const history = [line('user', '  '), line('assistant', '有效回答')]
    expect(recentTurnText(history)).toBe('助手：有效回答')
    const big = [line('user', 'x'.repeat(9_000)), line('assistant', 'y'.repeat(9_000))]
    const text = recentTurnText(big, 3)
    expect(text.length).toBeLessThanOrEqual(16_100)
  })

  it('says so when the summary failed', () => {
    const text = composeCarriedContext('旧对话', null, '用户：继续')
    expect(text).toContain('<carried_context>')
    expect(text).toContain('摘要这次没有生成成功')
    expect(text).toContain('用户：继续')
    expect(text).toContain('</carried_context>')
  })

  it('puts the summary above the recent turns', () => {
    const text = composeCarriedContext('旧对话', '已经完成一半。', '用户：继续')
    expect(text.indexOf('已经完成一半。')).toBeLessThan(text.indexOf('用户：继续'))
  })
})
