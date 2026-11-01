import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { TimelineEntry } from '../src/shared/contracts'
import { EntryItem } from '../src/renderer/panel'

describe('conversation sender row', () => {
  it('turns the source prefix into a name and a first-character badge', () => {
    const entry: TimelineEntry = {
      id: '1', time: '2026-10-18T00:00:00.000Z', kind: 'user',
      text: '【来自对话「开发二」】\n全部改完，要求打包。'
    }
    const html = renderToStaticMarkup(<EntryItem entry={entry} running={false}
      display={{ showTimestamps: true, avatars: { user: null, assistant: null } }} />)
    expect(html).toContain('开发二')
    expect(html).toContain('>开<')
    expect(html).toContain('全部改完')
    expect(html).not.toContain('【来自对话')
  })

  it('honours an explicit sender field', () => {
    const entry: TimelineEntry = {
      id: '2', time: '2026-10-18T00:00:00.000Z', kind: 'user',
      text: '你好', sender: { name: '开发二', badge: '开' }
    }
    const html = renderToStaticMarkup(<EntryItem entry={entry} running={false}
      display={{ showTimestamps: true, avatars: { user: null, assistant: null } }} />)
    expect(html).toContain('开发二')
    expect(html).toContain('>开<')
  })

  it('keeps the normal user avatar for a scheduled-task label', () => {
    const entry: TimelineEntry = {
      id: '3', time: '2026-10-23T10:00:00.000Z', kind: 'user',
      text: '【定时任务】\n开始做 P2。'
    }
    const html = renderToStaticMarkup(<EntryItem entry={entry} running={false}
      display={{ showTimestamps: true, avatars: { user: 'me.png', assistant: null } }} />)
    expect(html).toContain('定时任务')
    expect(html).not.toContain('>时<')
    expect(html).not.toContain('【定时任务】')
  })

  it('renders a phone message as two coloured route boxes with an arrow', () => {
    const entry: TimelineEntry = {
      id: '4', time: '2026-11-01T08:54:46.000Z', kind: 'user',
      text: '[手机端·AI助手自检与功能介绍 → 电脑端·ADB调试]\n收到，链路正常。',
      sender: {
        name: '手机端·AI助手自检与功能介绍',
        badge: '手',
        target: '电脑端·ADB调试',
        side: 'phone'
      }
    }
    const html = renderToStaticMarkup(<EntryItem entry={entry} running={false}
      display={{ showTimestamps: true, avatars: { user: 'me.png', assistant: null } }} />)
    expect(html).toContain('panel-event-route')
    expect(html).toContain('route-box is-phone')
    expect(html).toContain('route-box is-pc')
    expect(html).toContain('手机端·AI助手自检与功能介绍')
    expect(html).toContain('电脑端·ADB调试')
    expect(html).toContain('route-arrow')
    expect(html).toContain('route-tip')
    // 正文不重复显示那一行头，只留双框。
    expect(html).not.toContain('[手机端·AI助手自检与功能介绍 → 电脑端·ADB调试]')
    expect(html).toContain('收到，链路正常。')
    // 来源是手机端，头像用「手」，不再用用户头像。
    expect(html).toContain('>手<')
  })

  it('renders an internal forward with pc and target tones', () => {
    const entry: TimelineEntry = {
      id: '5', time: '2026-11-01T08:00:00.000Z', kind: 'user',
      text: '这条给 ADB 调试。',
      sender: { name: '开发4', badge: '开', target: 'ADB调试', side: 'internal' }
    }
    const html = renderToStaticMarkup(<EntryItem entry={entry} running={false}
      display={{ showTimestamps: true, avatars: { user: null, assistant: null } }} />)
    expect(html).toContain('route-box is-pc')
    expect(html).toContain('route-box is-pc-target')
    expect(html).toContain('开发4')
    expect(html).toContain('ADB调试')
  })
})
