import { useCallback } from 'react'
import type { KeyboardEvent, ClipboardEvent } from 'react'
import { pastedFiles } from './composer-drafts'
import type { ComposerSuggestion } from './composer-suggestions'
import type { ComposerEditorHandle } from './composer-editor'

/** 编辑器的事件处理：补全键盘导航、Tab 补目标、回车发送、粘贴文件。
 *  输入与光标同步在 ComposerEditor 内部完成，这里只管键位。 */
export function useComposerKeys({ setDismissedSuggestion, suggestionOpen, suggestionItems, suggestionSelected, setSuggestionSelected, suggestionKey, acceptSuggestion, goalPrompting, editorRef, addFiles, send }: {
  setDismissedSuggestion: (value: string | null) => void
  suggestionOpen: boolean
  suggestionItems: ComposerSuggestion[]
  suggestionSelected: number
  setSuggestionSelected: (updater: number | ((current: number) => number)) => void
  suggestionKey: string | null
  acceptSuggestion: (item: ComposerSuggestion) => void
  goalPrompting: boolean
  editorRef: React.RefObject<ComposerEditorHandle | null>
  addFiles: (files: File[]) => Promise<void> | void
  send: (strategy: 'queue' | 'steer') => Promise<void> | void
}) {
  const onPaste = useCallback((event: ClipboardEvent<HTMLElement>) => {
    const files = pastedFiles(event.clipboardData)
    if (!files.length) return
    event.preventDefault()
    void addFiles(files)
  }, [addFiles])

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (suggestionOpen && !event.nativeEvent.isComposing) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setDismissedSuggestion(suggestionKey)
        return
      }
      if (suggestionItems.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault()
        setSuggestionSelected((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + suggestionItems.length) % suggestionItems.length)
        return
      }
      // Tab 接受当前高亮项：命令、技能、文件和会话引用走同一套补全。
      // 不拦下的话 Tab 会把焦点移出输入框。
      if (suggestionItems.length > 0 && event.key === 'Tab') {
        event.preventDefault()
        acceptSuggestion(suggestionItems[suggestionSelected] ?? suggestionItems[0])
        return
      }
      if (suggestionItems.length > 0 && event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        acceptSuggestion(suggestionItems[suggestionSelected] ?? suggestionItems[0])
        return
      }
    }
    // 目标模式：Tab 直接补上“全部完成前不要停”，再回车就设定。
    if (goalPrompting && event.key === 'Tab' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      const editor = editorRef.current
      if (!editor || editor.getValue().trim()) return
      const defaultGoal = '在把我交代的任务全部完成之前不要停下'
      editor.replaceRange(0, editor.getValue().length, defaultGoal)
      requestAnimationFrame(() => {
        editor.focus()
        editor.setCaret(defaultGoal.length)
      })
      return
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send(event.ctrlKey || event.metaKey ? 'steer' : 'queue')
    }
  }, [suggestionOpen, suggestionItems, suggestionSelected, suggestionKey, acceptSuggestion, goalPrompting, editorRef, setDismissedSuggestion, setSuggestionSelected, send])

  return { onPaste, onKeyDown }
}
