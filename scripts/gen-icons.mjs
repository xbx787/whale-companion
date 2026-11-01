// 生成渲染层图标模块：主用 Material Symbols，缺失的用 Phosphor Fill 补。
// 每个图标提取 viewBox 和 path d，输出成纯 React 组件，运行时不需要网络。
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 逻辑名 → [主候选, 补候选]
const icons = {
  home: ['material-symbols/home', 'ph/house-fill'],
  settings: ['material-symbols/settings', 'ph/gear-fill'],
  folder: ['material-symbols/folder', 'ph/folder-fill'],
  file: ['material-symbols/description', 'ph/file-fill'],
  search: ['material-symbols/search', 'ph/magnifying-glass-fill'],
  user: ['material-symbols/person', 'ph/user-fill'],
  chat: ['material-symbols/chat', 'ph/chat-circle-fill'],
  send: ['material-symbols/send', 'ph/paper-plane-tilt-fill'],
  play: ['material-symbols/play-arrow', 'ph/play-fill'],
  stop: ['material-symbols/stop', 'ph/stop-fill'],
  plus: ['material-symbols/add', 'ph/plus-fill'],
  close: ['material-symbols/close', 'ph/x-fill'],
  chevronDown: ['material-symbols/keyboard-arrow-down', 'ph/caret-down-fill'],
  chevronRight: ['material-symbols/keyboard-arrow-right', 'ph/caret-right-fill'],
  more: ['material-symbols/more-horiz', 'ph/dots-three-fill'],
  refresh: ['material-symbols/refresh', 'ph/arrows-clockwise-fill'],
  copy: ['material-symbols/content-copy', 'ph/copy-fill'],
  check: ['material-symbols/check', 'ph/check-fill'],
  warning: ['material-symbols/warning', 'ph/warning-fill'],
  trash: ['material-symbols/delete', 'ph/trash-fill'],
  edit: ['material-symbols/edit', 'ph/pencil-simple-fill'],
  pin: ['material-symbols/push-pin', 'ph/push-pin-fill'],
  archive: ['material-symbols/archive', 'ph/archive-fill'],
  attach: ['material-symbols/attach-file', 'ph/paperclip-fill'],
  mic: ['material-symbols/mic', 'ph/microphone-fill'],
  panel: ['material-symbols/right-panel-open', 'ph/sidebar-simple-fill'],
  target: ['material-symbols/target', 'ph/target-fill'],
  checklist: ['material-symbols/checklist', 'ph/list-checks-fill'],
  language: ['material-symbols/language', 'ph/globe-fill'],
  dragIndicator: ['material-symbols/drag-indicator', 'ph/dots-six-vertical-fill'],
  keyboardReturn: ['material-symbols/keyboard-return', 'ph/arrow-elbow-down-left-fill'],
  tune: ['material-symbols/tune', 'ph/sliders-fill'],
  checkBox: ['material-symbols/check-box', 'ph/check-square-fill'],
  download: ['material-symbols/download', 'ph/download-fill'],
  upload: ['material-symbols/upload', 'ph/upload-fill'],
  panTool: ['material-symbols/pan-tool', 'ph/hand-fill'],
  verifiedUser: ['material-symbols/verified-user', 'ph/shield-check-fill'],
  hexagon: ['material-symbols/hexagon', 'ph/hexagon-fill']
}

const base = 'https://api.iconify.design'

async function fetchIcon(id) {
  const response = await fetch(`${base}/${id}.svg?height=24&color=currentColor`)
  if (!response.ok) return null
  return response.text()
}

function parseSvg(svg) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1]
  const paths = [...svg.matchAll(/<path[^>]*d="([^"]+)"/g)].map((match) => match[1])
  if (!viewBox || paths.length === 0) return null
  return { viewBox, paths }
}

const resolved = []
const missing = []
for (const [name, candidates] of Object.entries(icons)) {
  let parsed = null
  let used = ''
  for (const id of candidates) {
    const svg = await fetchIcon(id)
    if (!svg) continue
    parsed = parseSvg(svg)
    if (parsed) { used = id; break }
  }
  if (!parsed) { missing.push(name); continue }
  resolved.push({ name, ...parsed, used })
}

const body = resolved.map((icon) => `
/** ${icon.name} — ${icon.used} */
export const Icon${icon.name[0].toUpperCase()}${icon.name.slice(1)} = (props: IconProps) => (
  <svg viewBox="${icon.viewBox}" aria-hidden="true" {...props}>
    ${icon.paths.map((d) => `<path d="${d}" />`).join('')}
  </svg>
)`).join('\n')

const file = `// 由 scripts/gen-icons.mjs 生成，请勿手改。
// 主用 Material Symbols，缺失的用 Phosphor Fill 补；颜色跟随 currentColor。
import type { CSSProperties, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number; style?: CSSProperties }

function withSize({ size = 18, style, ...rest }: IconProps) {
  return { ...rest, style: { width: size, height: size, flex: 'none', fill: 'currentColor', stroke: 'none', ...style } }
}
${resolved.map((icon) => `
/** ${icon.name} — ${icon.used} */
export const Icon${icon.name[0].toUpperCase()}${icon.name.slice(1)} = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="${icon.viewBox}" fill="currentColor" aria-hidden="true" {...sized}>
      ${icon.paths.map((d) => `<path d="${d}" />`).join('')}
    </svg>
  )
}`).join('\n')}
`

const target = resolve('D:/DesktopPetProject/.worktrees/dsh-p0/src/renderer/icons.tsx')
writeFileSync(target, file, 'utf8')
console.log(`wrote ${target} (${resolved.length} icons)`)
console.log(missing.length ? `missing: ${missing.join(', ')}` : 'all icons resolved')
