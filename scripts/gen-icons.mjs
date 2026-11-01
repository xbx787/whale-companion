// 生成渲染层图标模块：统一用 Phosphor Regular（细线），运行时不需要网络。
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 逻辑名 → Phosphor 图标名（regular 变体，无 -fill 后缀）。
const icons = {
  home: 'ph/house',
  settings: 'ph/gear',
  folder: 'ph/folder',
  file: 'ph/file',
  search: 'ph/magnifying-glass',
  user: 'ph/user',
  chat: 'ph/chat-circle',
  send: 'ph/paper-plane-tilt',
  play: 'ph/play',
  stop: 'ph/stop',
  plus: 'ph/plus',
  close: 'ph/x',
  chevronDown: 'ph/caret-down',
  chevronRight: 'ph/caret-right',
  more: 'ph/dots-three',
  refresh: 'ph/arrows-clockwise',
  copy: 'ph/copy',
  check: 'ph/check',
  warning: 'ph/warning',
  trash: 'ph/trash',
  edit: 'ph/pencil-simple',
  pin: 'ph/push-pin',
  pinFill: 'ph/push-pin-fill',
  archive: 'ph/archive',
  attach: 'ph/paperclip',
  mic: 'ph/microphone',
  panel: 'ph/sidebar-simple',
  target: 'ph/target',
  checklist: 'ph/list-checks',
  language: 'ph/globe',
  dragIndicator: 'ph/dots-six-vertical',
  keyboardReturn: 'ph/arrow-elbow-down-left',
  tune: 'ph/sliders',
  checkBox: 'ph/check-square',
  download: 'ph/download',
  upload: 'ph/upload',
  panTool: 'ph/hand',
  verifiedUser: 'ph/shield-check',
  hexagon: 'ph/hexagon',
  sparkle: 'ph/sparkle'
}

const phSource = JSON.parse(readFileSync('D:/DesktopPetProject/.worktrees/dsh-p0/node_modules/@iconify-json/ph/icons.json', 'utf8'))
const msSource = JSON.parse(readFileSync('D:/DesktopPetProject/.worktrees/dsh-p0/node_modules/@iconify-json/material-symbols/icons.json', 'utf8'))
const base = 'https://api.iconify.design'

function fetchIcon(id) {
  const parts = id.split("/")
  const prefix = parts[0]
  const name = parts.slice(1).join("/")
  const source = prefix === "ph" ? phSource : prefix === "material-symbols" ? msSource : null
  const entry = source && source.icons ? source.icons[name] : null
  if (!entry || !entry.body) return null
  return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " + source.width + " " + source.height + "\" fill=\"currentColor\">" + entry.body + "</svg>"
}
function parseSvg(svg) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1]
  const paths = [...svg.matchAll(/<path[^>]*d="([^"]+)"/g)].map((match) => match[1])
  if (!viewBox || paths.length === 0) return null
  return { viewBox, paths }
}

const resolved = []
const missing = []
for (const [name, id] of Object.entries(icons)) {
  const svg = await fetchIcon(id)
  const parsed = svg ? parseSvg(svg) : null
  if (!parsed) { missing.push(name); continue }
  resolved.push({ name, ...parsed, id })
}

const file = `// 由 scripts/gen-icons.mjs 生成，请勿手改。
// 统一 Phosphor Regular 细线图标；颜色跟随 currentColor。
import type { CSSProperties, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number; style?: CSSProperties }

function withSize({ size = 18, style, ...rest }: IconProps) {
  return { ...rest, style: { width: size, height: size, flex: 'none', fill: 'currentColor', ...style } }
}
${resolved.map((icon) => `
/** ${icon.name} — ${icon.id} */
export const Icon${icon.name[0].toUpperCase()}${icon.name.slice(1)} = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="${icon.viewBox}" aria-hidden="true" {...sized}>
      ${icon.paths.map((d) => `<path d="${d}" />`).join('')}
    </svg>
  )
}`).join('\n')}
`

const target = resolve('D:/DesktopPetProject/.worktrees/dsh-p0/src/renderer/icons.tsx')
writeFileSync(target, file, 'utf8')
console.log(`wrote ${target} (${resolved.length} icons)`)
console.log(missing.length ? `missing: ${missing.join(', ')}` : 'all icons resolved')








