// 第二轮图标对比：偏轻的描边套装，四行 Lucide / Phosphor / Tabler / Iconoir。
// 从 Iconify 公共接口取，内联成 HTML，浏览器直接看。
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const concepts = [
  ['主页', 'lucide/house', 'ph/house', 'tabler/home', 'iconoir/home'],
  ['设置', 'lucide/settings', 'ph/gear', 'tabler/settings', 'iconoir/settings'],
  ['文件夹', 'lucide/folder', 'ph/folder', 'tabler/folder', 'iconoir/folder'],
  ['文件', 'lucide/file-text', 'ph/file', 'tabler/file', 'iconoir/page'],
  ['搜索', 'lucide/search', 'ph/magnifying-glass', 'tabler/search', 'iconoir/search'],
  ['用户', 'lucide/user', 'ph/user', 'tabler/user', 'iconoir/user'],
  ['对话', 'lucide/message-circle', 'ph/chat-circle', 'tabler/message', 'iconoir/chat-bubble'],
  ['发送', 'lucide/send', 'ph/paper-plane-tilt', 'tabler/send', 'iconoir/send'],
  ['运行', 'lucide/play', 'ph/play', 'tabler/player-play', 'iconoir/play'],
  ['停止', 'lucide/square', 'ph/stop', 'tabler/player-stop', 'iconoir/stop']
]

const libraries = [
  { title: 'Lucide（细线 · 1.5 描边 · ISC）', index: 1, stroke: true },
  { title: 'Phosphor Regular（细线 · 柔和 · MIT）', index: 2, stroke: true },
  { title: 'Tabler（细线 · 1.5 描边 · MIT）', index: 3, stroke: true },
  { title: 'Iconoir（细线 · 极简 · MIT）', index: 4, stroke: true }
]

const base = 'https://api.iconify.design'

async function fetchSvg(id) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${base}/${id}.svg?height=44&color=%23e8f1ff`)
      if (!response.ok) continue
      const text = await response.text()
      return text.trim().startsWith('<svg') ? text : null
    } catch {
      // 网络抖动时重试。
    }
  }
  return null
}

const rows = []
for (const library of libraries) {
  const cells = []
  for (const concept of concepts) {
    cells.push({ label: concept[0], id: concept[library.index], svg: await fetchSvg(concept[library.index]) })
  }
  rows.push({ title: library.title, cells })
}

const cellHtml = (cell) => `
  <div class="cell" title="${cell.id}">
    <div class="glyph">${cell.svg ?? '<span class="missing">缺失</span>'}</div>
    <div class="name">${cell.label}</div>
  </div>`

const rowHtml = (row) => `
  <section>
    <h2>${row.title}</h2>
    <div class="row">${row.cells.map(cellHtml).join('')}</div>
  </section>`

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>图标风格对比（轻线）</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 28px 32px; background: #0b1730; color: #e8f1ff;
    font-family: "Microsoft YaHei UI", "Segoe UI", sans-serif; }
  h1 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
  .sub { color: #93a9cc; font-size: 12px; margin: 0 0 22px; }
  section { margin-bottom: 22px; }
  h2 { font-size: 13px; font-weight: 600; color: #b9cdf0; margin: 0 0 8px; }
  .row { display: grid; grid-template-columns: repeat(10, 1fr); gap: 8px; }
  .cell { display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 12px 6px 8px; border-radius: 10px; background: #12213f;
    border: 1px solid rgba(160, 190, 240, .18); }
  .glyph { height: 44px; display: flex; align-items: center; justify-content: center; }
  .glyph svg { width: 32px; height: 32px; }
  .name { font-size: 10px; color: #93a9cc; }
  .missing { font-size: 10px; color: #d9707a; }
</style>
</head>
<body>
  <h1>图标风格对比（轻线）</h1>
  <p class="sub">四行分别是 Lucide、Phosphor Regular、Tabler、Iconoir，统一 1.5 左右描边，不填充。</p>
  ${rows.map(rowHtml).join('')}
</body>
</html>`

const target = resolve('D:/DesktopPetProject/data/icon-showcase-light.html')
writeFileSync(target, html, 'utf8')
const missing = rows.flatMap((row) => row.cells.filter((cell) => !cell.svg).map((cell) => cell.id))
console.log(`wrote ${target}`)
console.log(missing.length ? `missing: ${missing.join(', ')}` : 'all icons loaded')
