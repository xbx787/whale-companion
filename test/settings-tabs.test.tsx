import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SettingsPage } from '../src/renderer/settings'

describe('SettingsPage navigation', () => {
  it('puts category groups on the left and the group items on top', () => {
    const html = renderToStaticMarkup(<SettingsPage />)
    // 左栏是类别，顶部是当前类别下的栏目，两组 tablist 同时存在。
    expect(html).toContain('aria-label="设置分类"')
    expect(html).toContain('aria-label="对话下的栏目"')
    expect(html).toContain('settings-sidebar')
    expect(html).toContain('settings-subtab')
    for (const label of ['对话', '模型', '人物', '外观', '系统']) expect(html).toContain(`>${label}</span>`)
    // 默认停在“对话/常规”，其它栏目不渲染。
    expect(html).toContain('id="settings-panel-conversation"')
    expect(html).not.toContain('id="settings-panel-roast"')
    expect(html).not.toContain('id="settings-panel-models"')
  })
})
