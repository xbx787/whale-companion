import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/renderer/panel.css', 'utf8')

describe('quick tab animation', () => {
  it('pops a new tab in and folds it out before removal', () => {
    expect(css).toContain('@keyframes quick-tab-in')
    expect(css).toContain('@keyframes quick-tab-out')
    expect(css).toMatch(/\.panel-quick-tab\.is-closing[^}]*quick-tab-out \.18s/u)
  })

  it('keeps the tab animations out of reduced motion', () => {
    const reduce = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduce).toContain('.panel-quick-tab')
  })
})
