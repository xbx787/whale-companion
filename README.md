<div align="center">
  <img src="src/renderer/assets/whale-tray-icon.png" alt="小鲸" width="112">

  <h1>小鲸 · Whale Companion</h1>

  <p><em>住在 Windows 桌面上的鲸鱼少女智能体。<br>点开就能聊天，也能读写文件、执行命令，把活干完。</em></p>

  <p>
    <a href="https://github.com/xbx787/whale-companion/releases/latest"><img src="https://img.shields.io/github/v/release/xbx787/whale-companion?display_name=tag&sort=semver" alt="Latest release"></a>
    <img src="https://img.shields.io/badge/platform-Windows%2010%2F11%20x64-0078D4" alt="Windows 10/11 x64">
    <img src="https://img.shields.io/badge/status-preview-orange" alt="Preview">
  </p>

  <p><strong>简体中文</strong> | <a href="README.en.md">English</a></p>
</div>

---

小鲸是一个常驻 Windows 桌面的智能体客户端：角色常驻，点开是对话面板，收起只剩角色。内核是裁剪过的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，也就是 DeepSeek 自家的智能体内核；界面和内核之间用 ACP 通信。ACP 是 Agent Client Protocol 的缩写，一套约定好的消息格式，让面板和内核能听懂对方在说什么。默认使用 DeepSeek API，也可以换成自己的兼容端点。

和网页或终端里的智能体相比，它把入口放在桌面上：不用切窗口，随时点开继续；关掉面板，任务仍在后台跑。角色只是入口，真正干活的是背后的运行时。

## 这版有什么

- **桌面角色**：点击回弹、呼吸、状态表情和姿势切换；拖动命中框保持稳定，空闲后自动暂停。
- **对话工作台**：消息、思考链、工具活动共用一条时间线；长回复分段折叠，工具调用可展开看参数和结果。
- **会话标签**：新建时弹出，关闭先收起再移除，编号跟着重排。
- **@ 引用**：文件、目录、历史会话，也能引用手机端对话；拖入图片或粘贴附件。
- **临时会话**：在当前气泡里开一条独立对话，收起后继续主线，不进入会话库。
- **手机端互通**：同一 WiFi 下连接 DSH Go，在桌面引用手机上的对话；两边会话库各存各的。
- **多模型与语音**：DeepSeek、Kimi、智谱 GLM 或自定义端点；语音输入、Markdown 与公式渲染。
- **五套人设**：小鲸、远坂凛、雷姆、平泽唯、雪之下雪乃，人设文字、头像和桌面角色一起切换。
- **吐槽模式**：默认开启，在余额位置常驻一张卡，按节奏换一句。自动轮换走本地语料，不花 token；点右上角随时换一条。
- **偷窥模式**：默认关闭。开启后定时截一张屏交给模型，给一句吐槽或建议；截图只在内存，不存文件。
- **自动检查更新**：启动后查一次 GitHub Release，发现新版在设置和面板提示。只提示，不自动下载替换。
- **自包含**：裁剪后的 DSH 运行时随包提供，解压即用。

## 下载

从 [Releases](https://github.com/xbx787/whale-companion/releases/latest) 选择一种：

| 方式 | 适合 | 说明 |
| --- | --- | --- |
| 安装器 `小鲸 Setup *.exe` | 大多数情况 | 按用户安装，装完自动启动；升级时保留 `data` |
| 便携包 `whale-companion-v*-win-x64.zip` | 想自己决定位置 | 解压到可写目录，运行 `win-unpacked\Whale Companion Preview.exe` |

需要 Windows 10/11 x64 和能访问 DeepSeek API 的网络。运行时已经内置，不需要 Node.js、DSH 或 Claude Code。程序没有代码签名，首次运行可能被 Windows 的 SmartScreen 拦住，点「更多信息 → 仍要运行」。

## 快速开始

1. 下载安装器或便携包并启动。
2. 按首次启动向导填写 DeepSeek API Key，选择工作目录，测试连接。
3. 左键点击角色开始对话；点面板右上角可以收起，点角色再回来。

Key 用 Windows 本机密钥保护加密，只发送给你选择的模型端点。

全新电脑上默认用不了的部分：

- **桌面控制工具（`win_*`）**：名字以 `win_` 开头的那些工具，负责截屏、点击、输入，依赖 `%APPDATA%\uv\tools\windows-mcp` 里的 Python 后端。没装时聊天、文件、命令都正常，只是这些工具会缺。要补：先装 [uv](https://docs.astral.sh/uv/)，再 `uv tool install windows-mcp`。
- **本地语音模型**：包内只有引擎，模型在设置里按需下载。
- **手机互通**：需要手机 DSH Go 打开局域网访问，并和电脑在同一 WiFi。

## 数据与更新

数据在便携版的 `win-unpacked\data`、安装版的安装目录 `data`，包括会话、附件、记忆、人设、模型配置和工作目录。

- **更新检查**：启动 15 秒后自动查一次 GitHub Release，也可以在设置里手动查；只提示，不自动下载。
- **换版**：退出程序后覆盖安装，安装器会把 `data` 挪到 `%APPDATA%\WhaleCompanionDataBackup` 再搬回来，记录不丢。
- **换电脑**：复制整个 `win-unpacked`；要保留记录就连 `data` 一起复制。
- **API Key**：不能跨机器解密，换电脑后向导会让你重填，其余配置和会话保留。

## 开发

需要 Windows 和 Node.js 24：

```powershell
npm.cmd install
npm.cmd run dev
```

打包用 `npm.cmd run pack:release`。逐版变化见 [CHANGELOG.md](./CHANGELOG.md)，设计文档在 [docs](./docs)。

## 已知边界

- 自动更新只做到「检查 + 提示 + 打开 Release」，不会静默下载或替换自身。
- 偷窥模式的读屏分析依赖模型的图片输入能力；接口不支持时不会更新卡片，只会保持本地吐槽。
- 超大会话（约 1.6 万条消息）手动压缩可能因空摘要失败，需要重试；确定性降级还没做完。
- 手机端要求电脑和手机在同一 WiFi，并在手机 DSH Go 里打开局域网访问；换网络后要重连。
- DeepSeek Harness 仍是开发者预览版，升级运行时前需要重新验证 ACP 补丁与会话兼容性。
- 角色立绘来自公开角色页，仅作个人桌面使用；公开分发前需要确认权利或替换为原创素材。
- 语音质量取决于本机中文语音包和网络。

## 致谢与许可

桌面操作（截屏、点击、输入、窗口与界面自动化）来自 [CursorTouch/Windows-MCP](https://github.com/CursorTouch/Windows-MCP)。小鲸把它收敛成宿主内置的 `win_*` 工具，蓝色截屏标注框、键鼠横幅和方向动画是本项目的本地补丁。

完整第三方组件与许可见 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)。
