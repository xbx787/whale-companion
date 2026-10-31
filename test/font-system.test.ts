import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/** 字体资源只有 design-tokens.css 一处：新增模块必须复用那里的字族和字号，
 *  不允许自己写具体字族或 px 字号。相对 em（如行内代码 .91em）是比例，放行。 */

const rendererDir = path.resolve(__dirname, '../src/renderer')

function cssFiles(): string[] {
  return readdirSync(rendererDir)
    .filter((name) => name.endsWith('.css') && name !== 'design-tokens.css')
    .map((name) => path.join(rendererDir, name))
}

function violations(pattern: RegExp, allowed: (value: string) => boolean): string[] {
  const found: string[] = []
  for (const file of cssFiles()) {
    readFileSync(file, 'utf8').split(/\r?\n/u).forEach((line, index) => {
      for (const match of line.matchAll(pattern)) {
        const value = match[1].trim().replace(/\s*!important$/u, '')
        if (!allowed(value)) found.push(`${path.basename(file)}:${index + 1} ${match[0].trim()}`)
      }
    })
  }
  return found
}

describe('font system', () => {
  it('only uses the token families, inheritance, or the design-tokens file', () => {
    const bad = violations(/font-family:\s*([^;}]+)/gu, (value) =>
      value === 'inherit' || /^var\(--font-(ui|mono)\)$/u.test(value))
    expect(bad).toEqual([])
  })

  it('only uses token sizes, relative em, or inherit for font-size', () => {
    const bad = violations(/font-size:\s*([^;}]+)/gu, (value) =>
      value === 'inherit' ||
      /^var\(--(text|glyph)-[a-z0-9-]+\)$/u.test(value) ||
      /^\d*\.?\d+em$/u.test(value))
    expect(bad).toEqual([])
  })
})
