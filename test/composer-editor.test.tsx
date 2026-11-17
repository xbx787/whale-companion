// @vitest-environment jsdom
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ComposerEditor, parseComposerDoc, serializeComposerDoc, type ComposerEditorHandle } from '../src/renderer/composer-editor'
import { phoneMentionToken, sessionMentionToken } from '../src/shared/session-mentions'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const id = '6e2dfe3c-f0ec-4b73-92aa-5ffec9b87780'
const local = sessionMentionToken('本机对话', id)
const phone = phoneMentionToken('手机对话', 'sess-1')

let container: HTMLDivElement | undefined
let root: Root | undefined

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

async function mount(initial: string, onChange: (next: string, caret: number) => void = () => undefined): Promise<{ view: HTMLDivElement; handle: ComposerEditorHandle | null }> {
  const ref = createRef<ComposerEditorHandle>()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root!.render(<ComposerEditor ref={ref} value={initial} onChange={onChange}
    placeholder="输入消息" height={23} ariaLabel="输入消息" />))
  return { view: container, handle: ref.current }
}

describe('parseComposerDoc', () => {
  it('splits text and conversation chips and round-trips the original string', () => {
    const value = `前 ${local} 中 ${phone} 后`
    const segments = parseComposerDoc(value)
    expect(segments).toEqual([
      { type: 'text', text: '前 ' },
      { type: 'mention', token: local, label: '本机对话', kind: 'local' },
      { type: 'text', text: ' 中 ' },
      { type: 'mention', token: phone, label: '手机对话', kind: 'phone' },
      { type: 'text', text: ' 后' }
    ])
    expect(serializeComposerDoc(segments)).toBe(value)
  })

  it('leaves ordinary @ text alone', () => {
    expect(parseComposerDoc('@某人 你好')).toEqual([{ type: 'text', text: '@某人 你好' }])
  })
})

describe('ComposerEditor', () => {
  it('renders a mention token as an inline, bold chip that keeps the token in data', async () => {
    const { view } = await mount(`看 ${local} 的结论`)
    const chip = view.querySelector('.composer-mention')
    expect(chip).not.toBeNull()
    expect(chip!.textContent).toBe('本机对话')
    expect(chip!.getAttribute('data-token')).toBe(local)
    expect(chip!.getAttribute('contenteditable')).toBe('false')
    expect(view.querySelector('.composer-editor')!.textContent).toContain('的结论')
  })

  it('inserts a phone chip at the very front and reports the new value', async () => {
    const changes: string[] = []
    const { view, handle } = await mount('原来的草稿', (next) => changes.push(next))
    await act(async () => handle!.insertAtStart(phone, '手机对话', 'phone'))
    expect(view.querySelector('.composer-mention')!.textContent).toBe('手机对话')
    expect(changes.at(-1)).toBe(`${phone} 原来的草稿`)
  })

  it('replaces a typed @query with a local chip', async () => {
    const changes: string[] = []
    const { view, handle } = await mount('@本机 ', (next) => changes.push(next))
    await act(async () => handle!.replaceRange(0, 4, local))
    const chip = view.querySelector('.composer-mention')!
    expect(chip.textContent).toBe('本机对话')
    expect(changes.at(-1)).toBe(local)
  })

  it('reports typed text on input', async () => {
    const changes: string[] = []
    const { view } = await mount('', (next) => changes.push(next))
    const root = view.querySelector('.composer-editor')!
    await act(async () => {
      root.textContent = '$'
      root.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })
    expect(changes.at(-1)).toBe('$')
  })

  it('rebuilds the document when the controlled value changes from outside', async () => {
    const { view } = await mount('旧内容')
    await act(async () => {
      root!.render(<ComposerEditor value={`新内容 ${local}`} onChange={() => undefined}
        placeholder="输入消息" height={23} ariaLabel="输入消息" />)
    })
    expect(view.querySelector('.composer-editor')!.textContent).toContain('新内容')
    expect(view.querySelector('.composer-mention')).not.toBeNull()
  })

  it('clears the DOM synchronously so a second Enter cannot resend the same text', async () => {
    const { view, handle } = await mount('会重复发送的一句')
    expect(handle!.getValue()).toBe('会重复发送的一句')
    // 不经过 React 渲染，直接读 DOM：发送后紧接着的那次回车必须看到空值。
    handle!.clear()
    expect(handle!.getValue()).toBe('')
    expect(view.querySelector('.composer-editor')!.textContent).toBe('')
  })

  it('treats a leftover line break as empty so the placeholder comes back', async () => {
    // contenteditable 删光后常残留一个 <br>，读出来是 "\n"；这不算有内容。
    const { view } = await mount('\n')
    expect(view.querySelector('.composer-editor')!.getAttribute('data-empty')).toBe('true')
  })
})
