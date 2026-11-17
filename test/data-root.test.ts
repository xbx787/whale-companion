import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveDataRoot } from '../src/main/data-root'

const roots: string[] = []

function tempRoot(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'whale-data-root-'))
  roots.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('resolveDataRoot', () => {
  it('uses the writable preferred directory', () => {
    const root = tempRoot()
    const preferred = path.join(root, 'install', 'data')
    const fallback = path.join(root, 'appdata', 'data')
    expect(resolveDataRoot({ preferred, fallback })).toBe(preferred)
  })

  it('falls back when the preferred directory cannot be created', () => {
    const root = tempRoot()
    // 用一个文件占住父路径，mkdir 会失败。
    const blocker = path.join(root, 'blocker')
    writeFileSync(blocker, 'x')
    const fallback = path.join(root, 'appdata', 'data')
    const onFallback = vi.fn()
    const resolved = resolveDataRoot({ preferred: path.join(blocker, 'data'), fallback, onFallback })
    expect(resolved).toBe(fallback)
    expect(onFallback).toHaveBeenCalledWith(fallback)
  })

  it('honours an absolute override without touching the preferred directory', () => {
    const root = tempRoot()
    const override = path.join(root, 'portable')
    expect(resolveDataRoot({ preferred: path.join(root, 'never'), fallback: path.join(root, 'fb'), override }))
      .toBe(override)
  })
})
