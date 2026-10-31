/** 高风险裁剪：打包后删掉 Electron 运行时里我们用不到的文件。
 *
 *  这不是安全操作——dxcompiler/dxil 是 D3D12 着色器编译组件，
 *  vk_swiftshader 是软件渲染回退，删掉后在没有可用 GPU 的机器上可能
 *  直接起不来。先试一版，确认本机能跑再决定是否保留。 */

const fs = require('node:fs')
const path = require('node:path')

const REMOVE = [
  'dxcompiler.dll',
  'dxil.dll',
  'vk_swiftshader.dll',
  'vk_swiftshader_icd.json',
  'LICENSES.chromium.html',
  'default_app.asar'
]

module.exports = async function afterPack(context) {
  const outDir = context.appOutDir
  let removed = 0
  for (const name of REMOVE) {
    const file = path.join(outDir, name)
    if (!fs.existsSync(file)) continue
    fs.rmSync(file, { force: true })
    removed += 1
  }
  // 语言包只留中文和英文，其余删掉。
  const locales = path.join(outDir, 'locales')
  if (fs.existsSync(locales)) {
    for (const file of fs.readdirSync(locales)) {
      if (/^(zh-CN|en-US)\.pak$/u.test(file)) continue
      fs.rmSync(path.join(locales, file), { force: true })
      removed += 1
    }
  }
  console.log(`[trim-electron] removed ${removed} files from ${outDir}`)
}
