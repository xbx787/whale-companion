import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { localImageUrl, MessageMarkdown } from '../src/renderer/message-markdown'

describe('MessageMarkdown breaks', () => {
  it('keeps single newlines as hard breaks when asked — the user typed them', () => {
    const html = renderToStaticMarkup(<MessageMarkdown text={'第一行\n第二行'} breaks />)
    expect(html).toContain('<br')
  })

  it('keeps plain soft wrapping for the model’s own words', () => {
    const html = renderToStaticMarkup(<MessageMarkdown text={'第一行\n第二行'} />)
    expect(html).not.toContain('<br')
  })
})

describe('MessageMarkdown local images', () => {
  it('turns a Windows path into a file URL', () => {
    expect(localImageUrl('D:/a/b.png')).toBe('file:///D:/a/b.png')
    expect(localImageUrl('D:\\a\\b.png')).toBe('file:///D:/a/b.png')
    expect(localImageUrl('file:///D:/a/b.png')).toBe('file:///D:/a/b.png')
    expect(localImageUrl('https://example.com/a.png')).toBe('')
  })

  it('renders a local image with a click target instead of the fallback label', () => {
    const html = renderToStaticMarkup(<MessageMarkdown text={'![smile](D:/a/b.png)'} />)
    expect(html).toContain('src="file:///D:/a/b.png"')
    expect(html).toContain('role="button"')
    expect(html).toContain('点击用默认程序打开原图')
    expect(html).not.toContain('[图片：smile]')
  })
})

