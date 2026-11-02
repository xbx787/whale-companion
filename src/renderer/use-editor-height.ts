import { useEffect, useLayoutEffect, type RefObject } from 'react'
import { fitEditorHeight } from './panel-editor'
import type { ComposerEditorHandle } from './composer-editor'

/** 编辑器高度：内容变化时量一次，窗口宽度或界面字号变化时重量。 */
export function useEditorHeight({ editorRef, composerOpen, draft, expanded, compactEmpty, visible, setComposerHeight }: {
  editorRef: RefObject<ComposerEditorHandle | null>
  composerOpen: boolean
  draft: string
  expanded: boolean
  compactEmpty: boolean
  visible: boolean
  setComposerHeight: (updater: (current: number) => number) => void
}) {
  useLayoutEffect(() => {
    const editor = editorRef.current?.element()
    if (!composerOpen || !editor) return
    const nextHeight = fitEditorHeight(editor)
    if (nextHeight === null) return
    setComposerHeight((current) => current === nextHeight ? current : nextHeight)
  }, [draft, composerOpen, expanded, compactEmpty, visible, editorRef, setComposerHeight])

  useEffect(() => {
    const editor = editorRef.current?.element()
    if (!composerOpen || !editor) return
    let width = editor.clientWidth
    const remeasure = (): void => {
      const nextHeight = fitEditorHeight(editor)
      if (nextHeight === null) return
      setComposerHeight((current) => current === nextHeight ? current : nextHeight)
    }
    const observer = new ResizeObserver(() => {
      if (editor.clientWidth === width) return
      width = editor.clientWidth
      remeasure()
    })
    observer.observe(editor)
    // UI scale is written straight to <html data-ui-size> by the preload; the
    // React tree does not re-render, so watch the attribute to re-measure the
    // one-line floor when the type scale changes.
    const sizeObserver = new MutationObserver(remeasure)
    sizeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ui-size'] })
    return () => {
      observer.disconnect()
      sizeObserver.disconnect()
    }
  }, [composerOpen, editorRef, setComposerHeight])
}
