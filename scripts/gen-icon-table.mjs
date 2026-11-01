// 生成图标替换表：现有线框图标 → Material Symbols 候选，每行一个"不同意"复选框。
// 勾选状态实时汇总到顶部，可一键复制清单；也可以直接截图给开发看。
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const iconsSource = readFileSync('D:/DesktopPetProject/.worktrees/dsh-p0/src/renderer/panel-icons.tsx', 'utf8')
// 已经换成新图标的那几项，从上一个提交里取旧的线框 SVG。
const legacySource = execSync('git show HEAD^:src/renderer/panel-icons.tsx', {
  cwd: 'D:/DesktopPetProject/.worktrees/dsh-p0',
  encoding: 'utf8'
})

/** 从 panel-icons.tsx 里按函数名抓第一个 <svg>。 */
function oldSvg(name) {
  for (const source of [iconsSource, legacySource]) {
    const start = source.indexOf(`export function ${name}`)
    if (start < 0) continue
    const next = source.indexOf('export function ', start + 10)
    const body = source.slice(start, next < 0 ? undefined : next)
    const match = /<svg[\s\S]*?<\/svg>/.exec(body)
    if (match) return match[0]
  }
  return null
}

const rows = [
  ['新建会话', 'PlusIcon', 'material-symbols/add'],
  ['关闭会话标签', 'CloseIcon', 'material-symbols/close'],
  ['重命名会话', 'EditIcon', 'material-symbols/edit'],
  ['删除会话', 'DeleteIcon', 'material-symbols/delete'],
  ['归档会话', 'ArchiveIcon', 'material-symbols/archive'],
  ['恢复归档', 'ArchiveIcon', 'material-symbols/refresh'],
  ['置顶会话', 'PinIcon', 'material-symbols/push-pin'],
  ['会话列表', 'ConversationsIcon', 'material-symbols/chat'],
  ['模型切换', 'ModelIcon', 'material-symbols/tune'],
  ['上下文占用', 'ContextMeter', 'material-symbols/data-usage'],
  ['返回', 'BackIcon', 'material-symbols/arrow-back'],
  ['发送消息', 'ReturnIcon', 'material-symbols/send'],
  ['停止任务', 'PlanIcon', 'material-symbols/stop'],
  ['运行/继续', 'GoalIcon', 'material-symbols/play-arrow'],
  ['搜索', 'WebSearchIcon', 'material-symbols/search'],
  ['文件夹', 'ExportIcon', 'material-symbols/folder'],
  ['文件', 'ImportIcon', 'material-symbols/description'],
  ['用户', 'SelectIcon', 'material-symbols/person'],
  ['设置', 'GripIcon', 'material-symbols/settings'],
  ['更多操作', 'GripIcon', 'material-symbols/more-horiz'],
  ['复制', 'ExportIcon', 'material-symbols/content-copy'],
  ['勾选/完成', 'SelectIcon', 'material-symbols/check'],
  ['警告', 'PlanIcon', 'material-symbols/warning'],
  ['添加附件', 'PlusIcon', 'material-symbols/attach-file'],
  ['语音输入', 'ApprovalIcon', 'material-symbols/mic'],
  ['右侧面板', 'ConversationsIcon', 'material-symbols/right-panel-open'],
  ['目标模式', 'GoalIcon', 'material-symbols/target'],
  ['计划模式', 'PlanIcon', 'material-symbols/checklist'],
  ['联网搜索', 'WebSearchIcon', 'material-symbols/language'],
  ['审批模式', 'ApprovalIcon', 'material-symbols/verified-user'],
  ['回车确认', 'ReturnIcon', 'material-symbols/keyboard-return'],
  ['拖拽手柄', 'GripIcon', 'material-symbols/drag-indicator'],
  ['多选', 'SelectIcon', 'material-symbols/check-box'],
  ['导入配置', 'ImportIcon', 'material-symbols/file-upload'],
  ['导出配置', 'ExportIcon', 'material-symbols/file-download']
]

const base = 'https://api.iconify.design'

async function fetchSvg(id) {
  try {
    const response = await fetch(`${base}/${id}.svg?height=24&color=currentColor`)
    if (!response.ok) return null
    const text = await response.text()
    if (!text.trim().startsWith('<svg')) return null
    // 统一成 fill=currentColor、去掉尺寸，由 HTML 控制。
    return text
      .replace(/width="[^"]*"/, '')
      .replace(/height="[^"]*"/, '')
      .replace('<svg', '<svg fill="currentColor" stroke="none"')
  } catch {
    return null
  }
}

const items = []
for (let index = 0; index < rows.length; index += 1) {
  const [scene, oldName, newId] = rows[index]
  items.push({
    no: index + 1,
    scene,
    oldName,
    old: oldSvg(oldName),
    newId,
    new: await fetchSvg(newId)
  })
}

const rowHtml = (item) => `
  <tr data-no="${item.no}">
    <td class="no">${item.no}</td>
    <td class="scene">${item.scene}</td>
    <td class="glyph old">${item.old ?? '<span class="missing">无</span>'}<span class="tag">${item.oldName}</span></td>
    <td class="arrow">→</td>
    <td class="glyph new">${item.new ?? '<span class="missing">缺失</span>'}<span class="tag">${item.newId}</span></td>
    <td class="vote"><label><input type="checkbox" data-vote="${item.no}" /> 不同意</label></td>
  </tr>`

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>图标替换表</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px 28px 60px; background: #0b1730; color: #e8f1ff;
    font-family: "Microsoft YaHei UI", "Segoe UI", sans-serif; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #93a9cc; font-size: 12px; margin: 0 0 16px; line-height: 1.7; }
  .bar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; margin: 0 0 14px; border-radius: 10px; background: #12213f;
    border: 1px solid rgba(160, 190, 240, .2); }
  .bar strong { color: #f2a560; }
  .bar button { margin-left: auto; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(160, 190, 240, .28);
    background: #1b2f57; color: #dce8ff; cursor: pointer; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 9px 10px; border-bottom: 1px solid rgba(160, 190, 240, .12); text-align: left; vertical-align: middle; }
  th { font-size: 11px; color: #93a9cc; font-weight: 500; position: sticky; top: 58px; background: #0b1730; }
  .no { width: 36px; color: #93a9cc; }
  .scene { width: 130px; }
  .glyph { width: 120px; }
  .glyph svg { width: 22px; height: 22px; vertical-align: middle; }
  .glyph.old svg { stroke: #a9c6f7; stroke-width: 1.6; fill: none; }
  .glyph.new svg { fill: #e8f1ff; stroke: none; }
  .tag { display: block; margin-top: 4px; font-size: 10px; color: #7f96bb; font-family: var(--font-mono, monospace); }
  .arrow { width: 26px; color: #6f86aa; }
  .vote { width: 110px; }
  .vote input { width: 16px; height: 16px; accent-color: #f2a560; vertical-align: middle; }
  .vote label { font-size: 12px; color: #b9cdf0; cursor: pointer; }
  .missing { color: #d9707a; font-size: 11px; }
  tr.voted { background: rgba(242, 165, 96, .07); }
</style>
</head>
<body>
  <h1>图标替换表</h1>
  <p class="sub">左列是现在的线框图标，右列是 Material Symbols 候选。觉得哪一项换得不好，就在该行勾“不同意”。<br />
  顶部会实时汇总，勾完点“复制清单”，把那一行发给我；也可以直接截图。</p>
  <div class="bar">
    <span>已勾选（不同意）：<strong id="summary">无</strong></span>
    <button type="button" id="copy">复制清单</button>
  </div>
  <table>
    <thead><tr><th>#</th><th>位置</th><th>现在</th><th></th><th>换成</th><th>选择</th></tr></thead>
    <tbody>
      ${items.map(rowHtml).join('')}
    </tbody>
  </table>
<script>
  const boxes = [...document.querySelectorAll('input[data-vote]')]
  const summary = document.getElementById('summary')

  function selected() {
    return boxes.filter((box) => box.checked).map((box) => Number(box.dataset.vote))
  }

  function render() {
    const list = selected()
    summary.textContent = list.length ? list.join(', ') : '无'
    boxes.forEach((box) => box.closest('tr').classList.toggle('voted', box.checked))
    try { localStorage.setItem('icon-replace-votes', JSON.stringify(list)) } catch {}
  }

  try {
    const saved = JSON.parse(localStorage.getItem('icon-replace-votes') || '[]')
    boxes.forEach((box) => { if (saved.includes(Number(box.dataset.vote))) box.checked = true })
  } catch {}

  boxes.forEach((box) => box.addEventListener('change', render))
  render()

  document.getElementById('copy').addEventListener('click', async () => {
    const list = selected()
    const text = list.length ? '不同意替换：' + list.join(', ') : '全部同意替换'
    try {
      await navigator.clipboard.writeText(text)
      document.getElementById('copy').textContent = '已复制'
      setTimeout(() => { document.getElementById('copy').textContent = '复制清单' }, 1200)
    } catch {
      window.prompt('复制下面这行发给开发：', text)
    }
  })
</script>
</body>
</html>`

const target = resolve('D:/DesktopPetProject/data/icon-replace-table.html')
writeFileSync(target, html, 'utf8')
const missingOld = items.filter((item) => !item.old).map((item) => item.no)
const missingNew = items.filter((item) => !item.new).map((item) => item.no)
console.log(`wrote ${target} rows=${items.length}`)
console.log(missingOld.length ? `missing old: ${missingOld.join(', ')}` : 'all old icons found')
console.log(missingNew.length ? `missing new: ${missingNew.join(', ')}` : 'all new icons loaded')
