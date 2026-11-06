# 第三方组件与许可 / Third-party components and licenses

## DeepSeek Harness（DSH）

© DeepSeek，按 MIT 许可证使用，项目地址 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)。发布包携带裁剪后的 DSH 运行时；小鲸通过配置和可复现补丁接入 ACP，不包含 DSH Web 界面。

© DeepSeek, used under the MIT License. The release contains a trimmed DSH runtime; Whale Companion connects it through configuration and reproducible ACP patches and does not bundle the DSH Web UI.

## Windows-MCP

© CursorTouch，项目地址 [CursorTouch/Windows-MCP](https://github.com/CursorTouch/Windows-MCP)，按项目自带许可使用。小鲸把它作为宿主内置 `win_*` 工具转发，桌面控制的后端实现归原项目所有。

© CursorTouch, used under the project's own license. Whale Companion forwards it as host-built-in `win_*` tools; the desktop-control backend belongs to the original project.

## 模型端点

默认使用用户自行配置的 DeepSeek API，也可配置应用支持的其他端点。每位使用者需使用自己的密钥；本项目不代付、不转售或中介模型用量。本项目与 DeepSeek 无隶属或背书关系。

The default is a user-configured DeepSeek API endpoint, with other supported endpoints available in Settings. Each user supplies their own credentials; this project does not pay for, resell, or intermediate model usage. This project is not affiliated with or endorsed by DeepSeek.

## 旧版兼容代码

仓库及构建产物仍保留部分历史 Claude Agent SDK 适配器和成长实验兼容代码，用于迁移与回归；当前对话内核不加载 Claude Code，发布包不携带或启动 `claude.exe`。旧会话记录里的 `claude_code` 模式名会在加载时自动迁移为 `dsh`，新记录只写 `dsh`。

The repository and build still retain parts of the historical Claude Agent SDK adapter and growth-experiment compatibility code for migration and regression coverage. The current conversation kernel does not load Claude Code, and release packages do not carry or launch `claude.exe`. Legacy `claude_code` mode values in old records are migrated to `dsh` on load; new records always use `dsh`.

## 角色素材

角色立绘来自公开角色页，权利归原作者或权利方所有，仅作个人桌面使用；公开分发前请确认授权或替换为原创素材。

Character artwork comes from public character pages; rights remain with the original owners. It is intended for personal desktop use; confirm permission or replace it with original artwork before redistributing.

## Live2D Cubism Core

© Live2D Inc.，按 [Live2D Proprietary Software License Agreement](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html) 作为 Redistributable Code 随应用分发。原始版权声明不得修改或移除；来源、获取日期和 SHA-256 见 `resources/live2d/NOTICE.md`。正式公开发布前请复核当前 Live2D 的分发条款。

© Live2D Inc. Distributed as Redistributable Code under the [Live2D Proprietary Software License Agreement](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html). Do not alter or remove its copyright notice; source, retrieval date and SHA-256 are recorded in `resources/live2d/NOTICE.md`. Review the current Live2D distribution terms before a public release.

## Arch-chan 模型

CC0 1.0 Universal，来源 [Speykious/arch-chan](https://github.com/Speykious/arch-chan)，仅作 Live2D 技术预览，不是小鲸的默认形象或人设素材。

CC0 1.0 Universal, from [Speykious/arch-chan](https://github.com/Speykious/arch-chan). It is a technical Live2D preview only, not a XiaoJing default portrait or persona asset.

## 其他依赖

pixi.js、pixi-live2d-display 为 MIT 许可；其余见 `package.json` 及各依赖自带的许可证文件。

pixi.js and pixi-live2d-display are MIT licensed; see `package.json` and the license files shipped with each dependency for the rest.
