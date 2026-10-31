import { promises as fs } from 'node:fs'
import path from 'node:path'

/** 插件包格式（对齐 Claudian 的四类内容）。
 *
 *  data/plugins/<目录>/plugin.json：
 *  {
 *    name, version, description,
 *    skills?:    [{ name, instructions }],
 *    connectors?:[{ name, command, args, env }],
 *    agents?:    [{ name, prompt }],
 *    hooks?:     [{ event, command }]
 *  }
 *
 *  扫描只读不写；安装/卸载由调用方决定。 */
export interface PluginPackage {
  id: string
  name: string
  version: string
  description?: string
  skills: Array<{ name: string; instructions: string }>
  connectors: Array<{ name: string; command: string; args: string[]; env: Record<string, string> }>
  agents: Array<{ name: string; prompt: string }>
  hooks: Array<{ event: string; command: string }>
  dir: string
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function parsePackage(dir: string, raw: unknown): PluginPackage | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const name = text(record.name)
  const version = text(record.version)
  if (!name || !version) return null
  const skills = Array.isArray(record.skills)
    ? record.skills.flatMap((item) => {
      const entry = item as Record<string, unknown> | null
      const skillName = text(entry?.name)
      const instructions = text(entry?.instructions)
      return skillName && instructions ? [{ name: skillName, instructions }] : []
    })
    : []
  const connectors = Array.isArray(record.connectors)
    ? record.connectors.flatMap((item) => {
      const entry = item as Record<string, unknown> | null
      const connectorName = text(entry?.name)
      const command = text(entry?.command)
      if (!connectorName || !command) return []
      const env = entry?.env && typeof entry.env === 'object' && !Array.isArray(entry.env)
        ? Object.fromEntries(Object.entries(entry.env as Record<string, unknown>).flatMap(([key, value]) => typeof value === 'string' ? [[key, value]] : []))
        : {}
      return [{ name: connectorName, command, args: strings(entry?.args), env }]
    })
    : []
  const agents = Array.isArray(record.agents)
    ? record.agents.flatMap((item) => {
      const entry = item as Record<string, unknown> | null
      const agentName = text(entry?.name)
      const prompt = text(entry?.prompt)
      return agentName && prompt ? [{ name: agentName, prompt }] : []
    })
    : []
  const hooks = Array.isArray(record.hooks)
    ? record.hooks.flatMap((item) => {
      const entry = item as Record<string, unknown> | null
      const event = text(entry?.event)
      const command = text(entry?.command)
      return event && command ? [{ event, command }] : []
    })
    : []
  return {
    id: path.basename(dir),
    name,
    version,
    description: text(record.description) || undefined,
    skills,
    connectors,
    agents,
    hooks,
    dir
  }
}

/** 把插件包映射成库条目：connector 变 MCP，skill 变技能条目。
 *  环境变量只登记名字，值不落库；agents/hooks 暂不注入。 */
export interface PluginLibraryItem {
  id: string
  kind: 'mcp' | 'skill'
  name: string
  description: string
  source: string
  version: string
  launch: { type: 'mcp' | 'plugin'; command?: string; args?: string[]; env?: string[]; path?: string }
}

export function toLibraryItems(pack: PluginPackage): PluginLibraryItem[] {
  const items: PluginLibraryItem[] = []
  for (const connector of pack.connectors) {
    items.push({
      id: `plugin:${pack.id}:${connector.name}`,
      kind: 'mcp',
      name: connector.name,
      description: `${pack.name} 提供的连接器`,
      source: `plugin:${pack.id}`,
      version: pack.version,
      launch: { type: 'mcp', command: connector.command, args: connector.args, env: Object.keys(connector.env) }
    })
  }
  for (const skill of pack.skills) {
    items.push({
      id: `plugin:${pack.id}:skill:${skill.name}`,
      kind: 'skill',
      name: skill.name,
      description: skill.instructions.slice(0, 160),
      source: `plugin:${pack.id}`,
      version: pack.version,
      launch: { type: 'plugin', path: pack.dir }
    })
  }
  return items
}

/** 扫描插件目录；坏包跳过，不影响其他包。 */
export async function scanPlugins(root: string): Promise<PluginPackage[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(root)
  } catch {
    return []
  }
  const packages: PluginPackage[] = []
  for (const entry of entries) {
    const dir = path.join(root, entry)
    let raw: string
    try {
      raw = await fs.readFile(path.join(dir, 'plugin.json'), 'utf8')
    } catch {
      continue
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue
    }
    const pack = parsePackage(dir, parsed)
    if (pack) packages.push(pack)
  }
  return packages.sort((left, right) => left.name.localeCompare(right.name))
}
