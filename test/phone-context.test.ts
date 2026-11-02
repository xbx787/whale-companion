import { describe, expect, it, vi } from 'vitest'
import { snapshotPhoneMentions } from '../src/main/phone-context'
import { phoneMentionToken } from '../src/shared/session-mentions'
import type { PhoneMessageRecord } from '../src/shared/contracts'

describe('snapshotPhoneMentions', () => {
  it('pairs adjacent user/assistant messages and keeps only the latest eight turns', async () => {
    const records: PhoneMessageRecord[] = Array.from({ length: 10 }, (_, index) => ([
      { role: 'user' as const, text: `第${index + 1}问` },
      { role: 'assistant' as const, text: `第${index + 1}答` }
    ])).flat()
    const read = vi.fn(async () => records)
    const context = await snapshotPhoneMentions(`看 ${phoneMentionToken('手机会话', 'sess-1')}`, read)
    expect(read).toHaveBeenCalledWith('sess-1')
    expect(context).toContain('<referenced_conversations>')
    expect(context).toContain('第10问')
    expect(context).toContain('第10答')
    expect(context).not.toContain('第1问')
    expect(context).not.toContain('第2问')
  })

  it('ignores local mention tokens and returns nothing when only those exist', async () => {
    const read = vi.fn(async () => [] as PhoneMessageRecord[])
    const context = await snapshotPhoneMentions('@[本机](xiaojing-session:6e2dfe3c-f0ec-4b73-92aa-5ffec9b87780)', read)
    expect(context).toBe('')
    expect(read).not.toHaveBeenCalled()
  })

  it('explains an unreadable phone session instead of silently dropping it', async () => {
    const read = vi.fn(async () => { throw new Error('手机端还没有连接。') })
    await expect(snapshotPhoneMentions(phoneMentionToken('手机会话', 'sess-1'), read))
      .rejects.toThrow('读取手机会话「手机会话」失败')
  })

  it('rejects a phone session without a complete question/answer pair', async () => {
    const read = vi.fn(async () => [{ role: 'user' as const, text: '只有问题' }])
    await expect(snapshotPhoneMentions(phoneMentionToken('手机会话', 'sess-1'), read))
      .rejects.toThrow('还没有可引用的完整问答')
  })
})
