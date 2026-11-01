// 生成图标风格对比页：四行（Carbon / Phosphor Fill / Solar Bold / Material Symbols），
// 每行十个常用概念。图标从 Iconify 公共接口取，内联成 HTML，浏览器直接看。
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const concepts = [
  ['主页', 'carbon/home', 'ph/house-fill', 'solar/home-bold', 'material-symbols/home'],
  ['设置', 'carbon/settings', 'ph/gear-fill', 'solar/settings-bold', 'material-symbols/settings'],
  ['文件夹', 'carbon/folder', 'ph/folder-fill', 'solar/folder-bold', 'material-symbols/folder'],
  ['文件', 'carbon/document', 'ph/file-fill', 'solar/document-bold', 'material-symbols/description'],
  ['搜索', 'carbon/search', 'ph/magnifying-glass-fill', 'solar/magnifer-bold', 'material-symbols/search'],
  ['用户', 'carbon/user', 'ph/user-fill', 'solar/user-bold', 'material-symbols/person'],
  ['对话', 'carbon/chat', 'ph/chat-circle-fill', 'solar/chat-round-bold', 'material-symbols/chat'],
  ['发送', 'carbon/send', 'ph/paper-plane-tilt-fill', 'solar/plain-bold', 'material-symbols/send'],
  ['运行', 'carbon/play', 'ph/play-fill', 'solar/play-bold', 'material-symbols/play-arrow'],
  ['停止', 'carbon/stop', 'ph/stop-fill', 'solar/stop-bold', 'material-symbols/stop']
]

const libraries = [
  { title: 'Carbon（IBM · 纯色 · 几何 · Apache 2.0）', index: 1 },
  { title: 'Phosphor Fill（纯色 · 圆润 · MIT）', index: 2 },
  { title: 'Solar Bold（纯色 · 现代 · CC BY 4.0）', index: 3 },
  { title: 'Material Symbols（纯色 · 覆盖最广 · Apache 2.0）', index: 4 }
]

const base = 'https://api.iconify.design'
const color = '%23e8f1ff'

async function fetchSvg(id) {
  try {
    const response = await fetch(`${base}/${id}.svg?height=44&color=${color}`)
    if (!response.ok) return null
    const text = await response.text()
    return text.trim().startsWith('<svg') ? text : null
  } catch {
    return null
  }
}

const rows = []
for (const library of libraries) {
  const cells = []
  for (const concept of concepts) {
    const svg = await fetchSvg(concept[library.index])
    cells.push({ label: concept[0], id: concept[library.index], svg })
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
<title>图标风格对比</title>
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
  <h1>图标风格对比</h1>
  <p class="sub">四行分别是 Carbon、Phosphor Fill、Solar Bold、Material Symbols，每行十个常用概念。</p>
  ${rows.map(rowHtml).join('')}
</body>
</html>`

const target = resolve('D:/DesktopPetProject/data/icon-showcase.html')
writeFileSync(target, html, 'utf8')
const missing = rows.flatMap((row) => row.cells.filter((cell) => !cell.svg).map((cell) => cell.id))
console.log(`wrote ${target}`)
console.log(missing.length ? `missing: ${missing.join(', ')}` : 'all icons loaded')
