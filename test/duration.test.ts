import { describe, expect, it } from 'vitest'
import { formatCommandDuration, formatToolDuration } from '../src/renderer/duration'

describe('tool duration labels', () => {
  it('shows milliseconds below 100ms', () => {
    expect(formatToolDuration(0)).toBe('0ms')
    expect(formatToolDuration(10)).toBe('10ms')
    expect(formatToolDuration(85)).toBe('85ms')
  })

  it('shows fractional seconds from 100ms to one second', () => {
    expect(formatToolDuration(100)).toBe('0.1s')
    expect(formatToolDuration(350)).toBe('0.35s')
    expect(formatToolDuration(850)).toBe('0.85s')
  })

  it('shows one decimal second under a minute', () => {
    expect(formatToolDuration(1_000)).toBe('1.0s')
    expect(formatToolDuration(12_340)).toBe('12.3s')
    expect(formatToolDuration(59_900)).toBe('59.9s')
  })

  it('falls back to mm:ss for long ordinary tools', () => {
    expect(formatToolDuration(60_000)).toBe('01:00')
    expect(formatToolDuration(185_000)).toBe('03:05')
  })

  it('uses whole seconds for the command tool', () => {
    expect(formatCommandDuration(0)).toBe('0s')
    expect(formatCommandDuration(850)).toBe('1s')
    expect(formatCommandDuration(12_340)).toBe('12s')
  })

  it('switches every duration over a minute to mm:ss', () => {
    expect(formatCommandDuration(60_000)).toBe('01:00')
    expect(formatCommandDuration(185_000)).toBe('03:05')
  })
})
