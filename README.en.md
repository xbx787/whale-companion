<div align="center">
  <img src="src/renderer/assets/whale-tray-icon.png" alt="Whale Companion" width="112">

  <h1>Whale Companion</h1>

  <p><em>A whale-girl desktop agent for Windows.<br>Open her to chat, or let her work on real files and commands.</em></p>

  <p>
    <a href="https://github.com/xbx787/whale-companion/releases/latest"><img src="https://img.shields.io/github/v/release/xbx787/whale-companion?display_name=tag&sort=semver" alt="Latest release"></a>
    <img src="https://img.shields.io/badge/platform-Windows%2010%2F11%20x64-0078D4" alt="Windows 10/11 x64">
    <img src="https://img.shields.io/badge/status-preview-orange" alt="Preview">
  </p>

  <p><a href="README.md">简体中文</a> | <strong>English</strong></p>
</div>

---

Whale Companion keeps a full agent conversation in the corner of your desktop: a character that stays out of the way, a chat bubble when you open her, and the desktop again when you close it. The kernel is a trimmed [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), driven over ACP, using the DeepSeek API by default.

## Download

Pick one from [Releases](https://github.com/xbx787/whale-companion/releases/latest):

| Build | Best for | Notes |
| --- | --- | --- |
| Installer `小鲸 Setup *.exe` | Most people | Per-user install, launches when finished; keeps `data` on upgrade |
| Portable `whale-companion-v*-win-x64.zip` | Choosing your own location | Unzip to a writable folder and run `win-unpacked\Whale Companion Preview.exe` |

Windows 10/11 x64 and network access to the DeepSeek API. The runtime is bundled: no Node.js, DSH, or Claude Code needed. The build is not code-signed; SmartScreen may appear on first launch (More info → Run anyway).

## Features

- **Desktop character**: click-to-bounce, breathing, state expressions and pose changes; the drag hitbox stays stable, and animation pauses when idle.
- **Conversation workbench**: messages, thinking and tool activity share one timeline; long replies fold into segments and tool rows expand.
- **@ references**: files, folders and past conversations, including phone conversations; drag in images or paste attachments.
- **Side chats**: an independent conversation inside the bubble that stays out of the library.
- **Phone link**: connect DSH Go on the same Wi-Fi and reference phone conversations; the two libraries stay separate.
- **Models and voice**: DeepSeek, Kimi, Zhipu GLM or a custom endpoint; voice input, Markdown and math rendering.
- **Five personas**: the default whale girl plus four presets; persona text, avatar and desktop character switch together.
- **Self-contained**: a trimmed DSH runtime ships inside the package.

## Quick start

1. Download the installer or portable build and launch it.
2. Follow the first-run wizard: DeepSeek API key, then a workspace.
3. Click the character to chat.

Keys are encrypted with Windows machine-bound protection and sent only to the endpoint you select.

## Data and updates

Data lives under `win-unpacked\data` (portable) or `data` in the install folder (installer): conversations, attachments, memory, personas, model profiles and workspace.

- **Update**: quit, copy the old `data` into the new build, then start it.
- **Move to another PC**: copy the whole `win-unpacked`; copy `data` too to keep history.
- **API keys** cannot be decrypted on another machine; the wizard asks again, profiles and conversations stay.

## Development

Windows and Node.js 24:

```powershell
npm.cmd install
npm.cmd run dev
```

Build with `npm.cmd run pack:release`. Per-version notes in [CHANGELOG.md](./CHANGELOG.md); design docs in [docs](./docs).

## Known limits

- No auto-updater yet; upgrading means downloading and replacing manually.
- Manual compaction of very large conversations (around 16k messages) can fail on an empty summary and needs a retry; the deterministic fallback is unfinished.
- The phone link needs both devices on the same Wi-Fi and LAN access enabled in DSH Go; switching networks requires reconnecting.
- DeepSeek Harness is still a developer preview; runtime upgrades need renewed ACP and session compatibility checks.
- Character artwork comes from public character pages and is for personal desktop use; confirm the rights or replace it before redistributing.
- Voice quality depends on the installed Chinese speech pack and the network.

## Credits and licenses

Desktop control (screenshots, clicks, typing, windows and UIA) comes from [CursorTouch/Windows-MCP](https://github.com/CursorTouch/Windows-MCP). Whale Companion exposes it as host-built-in `win_*` tools; the blue screenshot frame, input banner and direction art are local patches.

See [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md) for the full component and license list.
