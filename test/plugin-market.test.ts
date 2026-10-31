import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { scanPlugins } from '../src/main/plugin-market'

async function withPlugins(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'whale-plugins-'))
  try {
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe('plugin market scan', () => {
  it('reads a plugin package with all four component kinds', async () => {
    await withPlugins(async (root) => {
      const dir = path.join(root, 'office-kit')
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, 'plugin.json'), JSON.stringify({
        name: 'Office Kit',
        version: '1.0.0',
        description: '办公工具',
        skills: [{ name: '周报', instructions: '按模板写周报' }],
        connectors: [{ name: 'wps', command: 'node', args: ['wps.js'], env: { MODE: 'read' } }],
        agents: [{ name: '校对', prompt: '只找错别字' }],
        hooks: [{ event: 'session-start', command: 'echo hi' }]
      }))
      const packs = await scanPlugins(root)
      expect(packs).toHaveLength(1)
      expect(packs[0]).toMatchObject({ id: 'office-kit', name: 'Office Kit', version: '1.0.0' })
      expect(packs[0]?.skills[0]?.name).toBe('周报')
      expect(packs[0]?.connectors[0]?.env.MODE).toBe('read')
      expect(packs[0]?.agents[0]?.name).toBe('校对')
      expect(packs[0]?.hooks[0]?.event).toBe('session-start')
    })
  })

  it('skips broken packages without failing the scan', async () => {
    await withPlugins(async (root) => {
      await mkdir(path.join(root, 'broken'), { recursive: true })
      await writeFile(path.join(root, 'broken', 'plugin.json'), '{ not json')
      await mkdir(path.join(root, 'no-version'), { recursive: true })
      await writeFile(path.join(root, 'no-version', 'plugin.json'), JSON.stringify({ name: 'x' }))
      const good = path.join(root, 'good')
      await mkdir(good, { recursive: true })
      await writeFile(path.join(good, 'plugin.json'), JSON.stringify({ name: 'Good', version: '2.0.0' }))
      const packs = await scanPlugins(root)
      expect(packs.map((pack) => pack.name)).toEqual(['Good'])
    })
  })

  it('returns an empty list when the directory does not exist', async () => {
    await expect(scanPlugins(path.join(os.tmpdir(), 'whale-plugins-missing'))).resolves.toEqual([])
  })
})
