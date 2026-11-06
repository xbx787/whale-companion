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

小鲸把一条完整的智能体对话放在桌面角落：角色常驻，点开是对话气泡，收起就回到桌面。内核是裁剪后的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，通过 ACP 驱动，默认使用 DeepSeek API。

## 下载

从 [Releases](https://github.com/xbx787/whale-companion/releases/latest) 选择一种：

| 方式 | 适合 | 说明 |
| --- | --- | --- |
| 安装器 `小鲸 Setup *.exe` | 大多数情况 | 按用户安装，装完自动启动；升级时保留 `data` |
| 便携包 `whale-companion-v*-win-x64.zip` | 想自己决定位置 | 解压到可写目录，运行 `win-unpacked\Whale Companion Preview.exe` |

需要 Windows 10/11 x64 和能访问 DeepSeek API 的网络。运行时已经内置，不需要 Node.js、DSH 或 Claude Code。程序没有代码签名，首次运行可能触发 SmartScreen，点「更多信息 → 仍要运行」。

## 特性

- **桌面角色**：点击回弹、呼吸、状态表情和姿势切换；拖动命中框保持稳定，空闲后自动暂停。
- **对话工作台**：消息、思考链、工具活动共用一条时间线；长回复分段折叠，工具调用可展开看参数和结果。
- **@ 引用**：文件、目录、历史会话，也能引用手机端对话；拖入图片或粘贴附件。
- **临时会话**：在当前气泡里开一条独立对话，收起后继续主线，不进入会话库。
- **手机端互通**：同一 WiFi 下连接 DSH Go，在桌面引用手机上的对话；两边会话库各存各的。
- **多模型与语音**：DeepSeek、Kimi、智谱 GLM 或自定义端点；语音输入、Markdown 与公式渲染。
- **五套人设**：小鲸、远坂凛、雷姆、平泽唯、雪之下雪乃，人设文字、头像和桌面角色一起切换。
- **自包含**：裁剪后的 DSH 运行时随包提供，解压即用。

## 快速开始

1. 下载安装器或便携包并启动。
2. 按首次启动向导填写 DeepSeek API Key，选择工作目录。
3. 左键点击角色开始对话。

Key 用 Windows 本机密钥保护加密，只发送给你选择的模型端点。

## 数据与更新

数据在便携版的 `win-unpacked\data`、安装版的安装目录 `data`，包括会话、附件、记忆、人设、模型配置和工作目录。

- **更新**：退出程序，把旧版 `data` 复制到新版本目录，再启动新版。
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

- 暂无自动更新，换版要手动下载覆盖。
- 超大会话（约 1.6 万条消息）手动压缩可能因空摘要失败，需要重试；确定性降级还没做完。
- 手机端要求电脑和手机在同一 WiFi，并在手机 DSH Go 里打开局域网访问；换网络后要重连。
- DeepSeek Harness 仍是 developer preview，升级运行时前需要重新验证 ACP 补丁与会话兼容性。
- 角色立绘来自公开角色页，仅作个人桌面使用；公开分发前需要确认权利或替换为原创素材。
- 语音质量取决于本机中文语音包和网络。

## 致谢与许可

桌面操作（截屏、点击、输入、窗口与 UIA）来自 [CursorTouch/Windows-MCP](https://github.com/CursorTouch/Windows-MCP)。小鲸把它收敛成宿主内置的 `win_*` 工具，蓝色截屏标注框、键鼠横幅和方向动画是本项目的本地补丁。

完整第三方组件与许可见 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)。
