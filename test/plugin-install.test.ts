import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { scanPlugins, toLibraryItems } from '../src/main/plugin-market'
import { LibraryStore } from '../src/main/library-store'

async function withRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'whale-plugin-install-'))
  try {
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe('plugin install', () => {
  it('registers connectors and skills into the library store', async () => {
    await withRoot(async (root) => {
      const plugins = path.join(root, 'plugins', 'office-kit')
      await mkdir(plugins, { recursive: true })
      await writeFile(path.join(plugins, 'plugin.json'), JSON.stringify({
        name: 'Office Kit',
        version: '1.2.0',
        connectors: [{ name: 'wps', command: 'node', args: ['wps.js'], env: { MODE: 'read' } }],
        skills: [{ name: '周报', instructions: '按模板写周报' }]
      }))
      const packs = await scanPlugins(path.join(root, 'plugins'))
      expect(packs).toHaveLength(1)
      const items = toLibraryItems(packs[0]!)
      expect(items).toHaveLength(2)

      const store = new LibraryStore(root)
      for (const entry of items) await store.install(entry as never)
      const snapshot = await store.snapshot()
      const mcp = snapshot.items.find((item) => item.kind === 'mcp')
      const skill = snapshot.items.find((item) => item.kind === 'skill')
      expect(mcp?.name).toBe('wps')
      expect(mcp?.launch?.command).toBe('node')
      expect(skill?.name).toBe('周报')
      expect(snapshot.items.every((item) => item.source === 'plugin:office-kit')).toBe(true)
    })
  })
})
