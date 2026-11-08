/** 眼睛模式：定时截一张屏，交给视觉模型看一眼，给一句吐槽或建议。
 *  截图只在内存里走一次，不写文件；接口失败时返回 null，由调用方回退本地语料。 */
import { desktopCapturer } from 'electron'

export interface EyeResult {
  text: string
  /** 'model' 表示真的看了屏幕；'fallback' 表示只凭元信息或接口失败。 */
  source: 'model' | 'fallback'
}

const PROMPT = [
  '你在小鲸的偷窥模式里工作：看一眼主人此刻的屏幕，说一句像人说的话，可以吐槽，也可以给一条能马上用的建议，或者问一句。',
  '只输出正文，不解释、不加引号、不用 emoji。一到三句都行，总长 10 到 60 字。',
  '写成人话：具体到窗口标题、文件名、第几遍、几点、卡在哪一步；允许反问和生活化的比喻。',
  '不要对仗，不要每句都像金句，不要总结人生道理。',
  '只说行为和结果，不评价主人本人：不嘲笑、不贬低、不猜动机。',
  '不要复述屏幕上的隐私内容（账号、聊天对象、文件全文），不要编造没看到的东西。'
].join('\n')

/** 截主屏，返回 JPEG base64；失败返回 null。 */
export async function captureScreenBase64(): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 }
    })
    if (!sources.length) return null
    return sources[0].thumbnail.toJPEG(68).toString('base64')
  } catch {
    return null
  }
}

/** 走 OpenAI 兼容的 chat/completions 图片输入；接口不支持时返回 null。 */
export async function analyzeScreen(base64: string, apiKey: string, model = 'deepseek-flash'): Promise<string | null> {
  if (!apiKey) return null
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        temperature: 0.9,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
          ]
        }]
      }),
      signal: AbortSignal.timeout(45_000)
    })
    if (!response.ok) return null
    const body = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
    const content = body.choices?.[0]?.message?.content
    if (typeof content !== 'string') return null
    const text = content.trim().replace(/^["'“”]+|["'“”]+$/gu, '')
    return text.length >= 10 ? text.slice(0, 140) : null
  } catch {
    return null
  }
}

export async function lookAtScreen(apiKey: string | undefined): Promise<EyeResult | null> {
  if (!apiKey) return null
  const base64 = await captureScreenBase64()
  if (!base64) return null
  const text = await analyzeScreen(base64, apiKey)
  return text ? { text, source: 'model' } : null
}
