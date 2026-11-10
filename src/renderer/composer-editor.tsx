import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent, Ref } from 'react'

/** 输入框里的一段：普通文字，或一个不可拆的会话引用胶囊。 */
export type ComposerSegment =
  | { type: 'text'; text: string }
  | { type: 'mention'; token: string; label: string; kind: 'local' | 'phone' }

const TOKEN = /@\[((?:\\.|[^\]\\])*)\]\((xiaojing-(?:session|phone):([A-Za-z0-9._:-]+))\)/gu

function unescapeLabel(label: string): string {
  return label.replace(/\\([\\\]])/gu, '$1')
}

/** 把 `draft` 字符串拆成文字与引用胶囊；token 之外的内容一律按原文保留。 */
export function parseComposerDoc(value: string): ComposerSegment[] {
  const segments: ComposerSegment[] = []
  let last = 0
  for (const match of value.matchAll(TOKEN)) {
    const index = match.index ?? 0
    if (index > last) segments.push({ type: 'text', text: value.slice(last, index) })
    segments.push({
      type: 'mention',
      token: match[0],
      label: unescapeLabel(match[1]),
      kind: match[2].startsWith('xiaojing-phone:') ? 'phone' : 'local'
    })
    last = index + match[0].length
  }
  if (last < value.length) segments.push({ type: 'text', text: value.slice(last) })
  return segments
}

export function serializeComposerDoc(segments: readonly ComposerSegment[]): string {
  return segments.map((segment) => segment.type === 'text' ? segment.text : segment.token).join('')
}

export interface ComposerEditorHandle {
  focus(): void
  element(): HTMLDivElement | null
  getValue(): string
  getCaret(): number
  setCaret(offset: number): void
  replaceRange(start: number, end: number, text: string): void
  insertAtStart(token: string, label: string, kind: 'local' | 'phone'): void
}

interface ComposerEditorProps {
  value: string
  onChange: (next: string, caret: number) => void
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  onPaste?: (event: ClipboardEvent<HTMLDivElement>) => void
  placeholder: string
  height: number
  maxLength?: number
  ariaLabel: string
  ariaControls?: string
  ariaExpanded?: boolean
  ariaActivedescendant?: string
}

function mentionElement(token: string, label: string, kind: 'local' | 'phone'): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = `composer-mention${kind === 'phone' ? ' is-phone' : ''}`
  span.setAttribute('contenteditable', 'false')
  span.dataset.token = token
  span.dataset.kind = kind
  span.textContent = label
  return span
}

function renderDoc(root: HTMLDivElement, value: string): void {
  root.textContent = ''
  for (const segment of parseComposerDoc(value)) {
    root.appendChild(segment.type === 'text'
      ? document.createTextNode(segment.text)
      : mentionElement(segment.token, segment.label, segment.kind))
  }
}

function readDoc(root: HTMLDivElement): string {
  let out = ''
  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? ''
      return
    }
    if (node instanceof HTMLElement && node.dataset.token) {
      out += node.dataset.token
      return
    }
    if (node instanceof HTMLBRElement) {
      out += '\n'
      return
    }
    for (const child of node.childNodes) visit(child)
  }
  for (const child of root.childNodes) visit(child)
  return out
}

function elementLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0
  if (node instanceof HTMLElement && node.dataset.token) return node.dataset.token.length
  if (node instanceof HTMLBRElement) return 1
  return 0
}

interface Point { node: Node; offset: number }

/** 把字符串偏移映射回 DOM 光标位置；落在胶囊内部时放到胶囊后面。 */
function locate(root: HTMLDivElement, target: number): Point {
  let remaining = Math.max(0, target)
  const visit = (node: Node): Point | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = elementLength(node)
      if (remaining <= length) return { node, offset: remaining }
      remaining -= length
      return null
    }
    if (node instanceof HTMLElement && node.dataset.token) {
      const length = elementLength(node)
      if (remaining <= length) {
        const parent = node.parentNode
        if (!parent) return null
        return { node: parent, offset: [...parent.childNodes].indexOf(node as ChildNode) + 1 }
      }
      remaining -= length
      return null
    }
    if (node instanceof HTMLBRElement) {
      if (remaining === 0) {
        const parent = node.parentNode
        if (!parent) return null
        return { node: parent, offset: [...parent.childNodes].indexOf(node) }
      }
      remaining -= 1
      return null
    }
    for (const child of node.childNodes) {
      const found = visit(child)
      if (found) return found
    }
    return null
  }
  return visit(root) ?? { node: root, offset: root.childNodes.length }
}

function rangeOf(root: HTMLDivElement, start: number, end: number): Range {
  const range = document.createRange()
  const from = locate(root, start)
  const to = locate(root, end)
  range.setStart(from.node, from.offset)
  range.setEnd(to.node, to.offset)
  return range
}

function caretOffset(root: HTMLDivElement): number {
  const selection = window.getSelection()
  // 没有选区（测试直接改 DOM、或刚重建完）时按末尾算：@/命令补全以最后
  // 输入的位置为准，不能因为读不到 selection 就退回 0。
  if (!selection || !selection.rangeCount || !root.contains(selection.anchorNode)) return readDoc(root).length
  const range = selection.getRangeAt(0)
  const prefix = range.cloneRange()
  prefix.selectNodeContents(root)
  prefix.setEnd(range.startContainer, range.startOffset)
  const holder = document.createElement('div')
  holder.appendChild(prefix.cloneContents())
  return readDoc(holder).length
}

/** 纯文本 + 原子胶囊的输入框。textarea 不能局部加粗，这里用 contenteditable
 *  承载同一份 `draft` 字符串：文字是文本节点，会话引用是不可拆的 span。 */
export const ComposerEditor = forwardRef(function ComposerEditor({
  value, onChange, onKeyDown, onPaste, placeholder, height, maxLength = 8000,
  ariaLabel, ariaControls, ariaExpanded, ariaActivedescendant
}: ComposerEditorProps, ref: Ref<ComposerEditorHandle>) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const lastValueRef = useRef<string | null>(null)
  const composingRef = useRef(false)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || composingRef.current) return
    if (lastValueRef.current === value) return
    renderDoc(root, value)
    lastValueRef.current = value
  }, [value])

  function sync(): void {
    const root = rootRef.current
    if (!root) return
    let next = readDoc(root)
    if (next.length > maxLength) {
      next = next.slice(0, maxLength)
      renderDoc(root, next)
    }
    lastValueRef.current = next
    onChange(next, caretOffset(root))
  }

  useImperativeHandle(ref, () => ({
    focus: () => rootRef.current?.focus(),
    element: () => rootRef.current,
    getValue: () => rootRef.current ? readDoc(rootRef.current) : '',
    getCaret: () => rootRef.current ? caretOffset(rootRef.current) : 0,
    setCaret: (offset: number) => {
      const root = rootRef.current
      if (!root) return
      const point = locate(root, offset)
      const range = document.createRange()
      range.setStart(point.node, point.offset)
      range.collapse(true)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      root.focus()
    },
    replaceRange: (start: number, end: number, text: string) => {
      const root = rootRef.current
      if (!root) return
      const range = rangeOf(root, Math.max(0, start), Math.max(start, end))
      range.deleteContents()
      const segments = parseComposerDoc(text)
      const fragment = document.createDocumentFragment()
      for (const segment of segments) {
        fragment.appendChild(segment.type === 'text'
          ? document.createTextNode(segment.text)
          : mentionElement(segment.token, segment.label, segment.kind))
      }
      range.insertNode(fragment)
      sync()
    },
    insertAtStart: (token: string, label: string, kind: 'local' | 'phone') => {
      const root = rootRef.current
      if (!root) return
      const fragment = document.createDocumentFragment()
      fragment.appendChild(mentionElement(token, label, kind))
      fragment.appendChild(document.createTextNode(' '))
      root.insertBefore(fragment, root.firstChild)
      sync()
    }
  }), [onChange])

  const empty = value.length === 0

  return <div
    ref={rootRef}
    className="composer-editor"
    contentEditable
    role="textbox"
    aria-multiline="true"
    aria-label={ariaLabel}
    aria-controls={ariaControls}
    aria-expanded={ariaExpanded}
    aria-activedescendant={ariaActivedescendant}
    data-empty={empty ? 'true' : 'false'}
    data-placeholder={placeholder}
    style={{ height }}
    suppressContentEditableWarning
    onInput={() => { if (!composingRef.current) sync() }}
    onCompositionStart={() => { composingRef.current = true }}
    onCompositionEnd={() => { composingRef.current = false; sync() }}
    onKeyDown={(event) => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return
      // Shift+Enter 是换行；单独 Enter 交给外层的发送逻辑。
      if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault()
        document.execCommand('insertText', false, '\n')
        sync()
        return
      }
      onKeyDown?.(event)
    }}
    onPaste={(event) => {
      onPaste?.(event)
      if (event.defaultPrevented) return
      event.preventDefault()
      const text = event.clipboardData.getData('text/plain')
      if (!text) return
      document.execCommand('insertText', false, text)
      sync()
    }}
    onDrop={(event) => { event.preventDefault() }}
  />
})
