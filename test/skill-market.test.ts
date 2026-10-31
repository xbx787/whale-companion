import { describe, expect, it } from 'vitest'
import { DEFAULT_SKILL_MARKET_SOURCES, SKILL_MARKET_SOURCES, enabledSkillMarketSources } from '../src/shared/skill-market'

describe('技能市场来源', () => {
  it('默认开三个预置主流来源：官方、Superpowers 与社区聚合', () => {
    expect([...DEFAULT_SKILL_MARKET_SOURCES]).toEqual(['anthropic', 'superpowers', 'awesome'])
    expect(enabledSkillMarketSources(undefined).map((source) => source.id)).toEqual(['anthropic', 'superpowers', 'awesome'])
  })

  it('显式空数组表示全部关闭，未知 id 会被过滤', () => {
    expect(enabledSkillMarketSources([])).toEqual([])
    expect(enabledSkillMarketSources(['awesome', 'nope']).map((source) => source.id)).toEqual(['awesome'])
  })

  it('来源表覆盖官方、Superpowers 和社区聚合', () => {
    expect(SKILL_MARKET_SOURCES.map((source) => source.id)).toEqual(['anthropic', 'superpowers', 'awesome'])
    expect(SKILL_MARKET_SOURCES.every((source) => source.repo.includes('/') && source.path)).toBe(true)
  })
})
