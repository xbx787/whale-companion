import { describe, expect, it } from 'vitest'
import { isLibraryItem, libraryMentionToken, parseLibraryMentions, stripLibraryMentions } from '../src/shared/libraries'

describe('library mentions', () => {
  it('strips the token from the text sent to the engine', () => {
    expect(stripLibraryMentions('@skill:code-review 合理运用 Skill 进行审核')).toBe('合理运用 Skill 进行审核')
    expect(stripLibraryMentions('@mcp:demo 看下这个')).toBe('看下这个')
    expect(stripLibraryMentions('普通文本')).toBe('普通文本')
  })

  it('inserts a kind:name token that parses back', () => {
    const token = libraryMentionToken({ kind: 'skill', name: 'code-review' })
    expect(token).toBe('@skill:code-review')
    expect(parseLibraryMentions(`用 ${token} 看一下`)).toEqual([{ kind: 'skill', id: 'code-review' }])
  })

  it('deduplicates and keeps different kinds apart', () => {
    expect(parseLibraryMentions('@skill:anthropics/pdf @skill:anthropics/pdf @plugin:demo')).toEqual([
      { kind: 'skill', id: 'anthropics/pdf' },
      { kind: 'plugin', id: 'demo' }
    ])
  })

  it('leaves email addresses and plain @ words alone', () => {
    expect(parseLibraryMentions('mail me at a@mcp:example.com or just @ here')).toEqual([])
  })
})

describe('market entry validation', () => {
  const base = { id: 'demo', kind: 'mcp', name: 'Demo', description: 'x', source: 'test' }

  it('accepts a stdio launch and rejects path-like repos', () => {
    expect(isLibraryItem({ ...base, launch: { type: 'mcp', command: 'npx', args: ['-y', 'pkg'], env: ['KEY'] } })).toBe(true)
    expect(isLibraryItem({ ...base, repo: '../escape' })).toBe(false)
    expect(isLibraryItem({ ...base, subdir: '../escape' })).toBe(false)
  })

  it('rejects unknown kinds and malformed launches', () => {
    expect(isLibraryItem({ ...base, kind: 'theme' })).toBe(false)
    expect(isLibraryItem({ ...base, launch: { type: 'mcp', args: [1] } })).toBe(false)
  })
})
