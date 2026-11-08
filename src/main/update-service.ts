/** 更新检查：读 GitHub Release 的最新版本，与当前版本比较。
 *  发布产物是便携目录包，不做静默替换；检查到新版后给下载入口。 */
import { app, net } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { UpdateStatus } from '../shared/contracts'

const REPO = 'xbx787/whale-companion'
const RELEASES_URL = `https://github.com/${REPO}/releases`

function versionParts(version: string): number[] {
  return version.replace(/^v/iu, '').split(/[.\-+]/u).map((part) => Number.parseInt(part, 10) || 0)
}

/** 只比较数字段：v0.0.151 > v0.0.150。 */
export function isNewer(latest: string, current: string): boolean {
  const a = versionParts(latest)
  const b = versionParts(current)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] ?? 0
    const right = b[index] ?? 0
    if (left !== right) return left > right
  }
  return false
}

function statusFor(current: string, latest: string, url: string, checkedAt: string): UpdateStatus {
  const available = isNewer(latest, current)
  return {
    current,
    latest,
    url,
    updateAvailable: available,
    checkedAt,
    message: available ? `发现新版本 ${latest}。` : '已经是最新版本。'
  }
}

export class UpdateService {
  /** 上次检查结果：设置页和面板都从这里读，避免每次打开都打一次 GitHub。 */
  private last: UpdateStatus | null = null

  constructor(private readonly dataRoot: string) {}

  lastStatus(): UpdateStatus | null {
    return this.last
  }

  private settingsPath(): string {
    return path.join(this.dataRoot, 'update.json')
  }

  autoEnabled(): boolean {
    try {
      const parsed = JSON.parse(readFileSync(this.settingsPath(), 'utf8')) as { auto?: unknown }
      return parsed.auto !== false
    } catch {
      return true
    }
  }

  setAuto(enabled: boolean): void {
    writeFileSync(this.settingsPath(), JSON.stringify({ auto: enabled }), 'utf8')
  }

  async check(): Promise<UpdateStatus> {
    this.last = await this.fetchStatus()
    return this.last
  }

  private async fetchStatus(): Promise<UpdateStatus> {
    const current = app.getVersion()
    const checkedAt = new Date().toISOString()
    // 匿名 API 每个出口 IP 每小时只有 60 次，常被限流（403）。先走 API，
    // 失败再读 Release 的 Atom 订阅（不受 API 限流），两路都不行才报错。
    const api = await this.fromApi(current, checkedAt).catch(() => null)
    if (api?.latest) return api
    const atom = await this.fromAtom(current, checkedAt).catch(() => null)
    if (atom) return atom
    return {
      current,
      latest: '',
      url: RELEASES_URL,
      updateAvailable: false,
      checkedAt,
      message: `${api?.message ?? '检查更新失败：无法连接 GitHub。'}请检查网络连接。`
    }
  }

  private async fromApi(current: string, checkedAt: string): Promise<UpdateStatus> {
    const response = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'whale-companion' }
    })
    if (!response.ok) {
      return {
        current, latest: '', url: RELEASES_URL, updateAvailable: false, checkedAt,
        message: `检查失败：GitHub 返回 ${response.status}。`
      }
    }
    const body = await response.json() as { tag_name?: unknown; html_url?: unknown }
    const latest = typeof body.tag_name === 'string' ? body.tag_name.replace(/^v/iu, '') : ''
    if (!latest) {
      return { current, latest: '', url: RELEASES_URL, updateAvailable: false, checkedAt, message: '没有找到可用的版本号。' }
    }
    const url = typeof body.html_url === 'string' ? body.html_url : RELEASES_URL
    return statusFor(current, latest, url, checkedAt)
  }

  /** 不碰 API：Release 的 Atom 订阅里第一条 entry 就是最新版本。 */
  private async fromAtom(current: string, checkedAt: string): Promise<UpdateStatus | null> {
    const response = await net.fetch(`https://github.com/${REPO}/releases.atom`, {
      headers: { 'User-Agent': 'whale-companion' }
    })
    if (!response.ok) return null
    const text = await response.text()
    const match = /<entry>[\s\S]*?<link[^>]*href="([^"]*\/releases\/tag\/v?(\d+(?:\.\d+)*))"/iu.exec(text)
    if (!match) return null
    return statusFor(current, match[2], match[1], checkedAt)
  }
}
