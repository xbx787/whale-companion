import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/** 顶栏标签、右侧窗口按钮、输入框工具栏和收起按钮必须共用同一个 29px
 *  盒子和同一条中线；尺寸散开时肉眼很难发现，用这条测试兜住。 */

const css = readFileSync(path.resolve(__dirname, '../src/renderer/panel.css'), 'utf8')

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // 只认行首的选择器：复合规则（例如 `.panel-composer-toolbar .panel-model-button`）
  // 里也会出现同一个类名，但那不是定义尺寸的那一条。
  const match = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, 'u').exec(css)
  if (!match) throw new Error(`找不到规则：${selector}`)
  return match[1]
}

function declaration(selector: string, property: string): string | undefined {
  return new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`, 'u').exec(ruleBody(selector))?.[1].trim()
}

describe('panel control sizes', () => {
  it('keeps the top bar and composer controls in one 29px box', () => {
    for (const selector of [
      '.panel-tool-button',
      '.panel-model-button',
      '.panel-send',
      '.panel-window-action',
      '.panel-library-toggle',
      '.panel-chat-header .panel-rail-toggle',
      '.panel-composer-collapse'
    ]) {
      expect(declaration(selector, 'width'), selector).toBe('29px')
      expect(declaration(selector, 'height'), selector).toBe('29px')
    }
    expect(declaration('.panel-quick-tab', 'height')).toBe('29px')
    expect(declaration('.panel-quick-tab-new', 'flex')).toContain('29px')
  })
})
