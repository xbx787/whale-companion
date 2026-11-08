/** Strips the decoration models love to add (wrapping quotes, a 「标题：」 prefix,
 *  trailing punctuation) and keeps the title to one short line. Returns null
 *  when nothing readable survives. */
export function cleanTitle(raw: string): string | null {
  const clean = raw
    .trim()
    .replace(/^["'“”‘’「『《]+|["'“”‘’」』》]+$/gu, '')
    .trim()
    .replace(/^(?:标题|题目)[：:]\s*/u, '')
    .replace(/^["'“”‘’「『《]+|["'“”‘’」』》]+$/gu, '')
    .replace(/[。.!！?？,，;；、：:]+$/u, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 32)
    .trim()
  return clean || null
}

/** 承接摘要：比标题长，供“在新对话中继续”把上一段对话的要点带到新会话。
 *  与标题一样，失败返回 null，调用方降级为只带最近几轮原文。 */
export async function generateCarriedSummary(apiKey: string, source: string, signal?: AbortSignal,
  model = 'deepseek-flash'): Promise<string | null> {
  const prompt = source.trim().slice(0, 24_000)
  if (!prompt) return null
  const instructions = '你为一段对话写上下文摘要：保留用户目标、已经做出的决定、关键结论、未完成事项和重要文件路径。不要寒暄，不要编造，不要超过 600 字，只输出摘要正文。'
  try {
    const response = await fetch('https://api.deepseek.com/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions,
        reasoning: { effort: 'none' },
        input: [{ role: 'user', content: `为下面的对话写上下文摘要：\n${prompt}` }],
        max_output_tokens: 900
      }),
      signal
    })
    if (!response.ok) return null
    const data = (await response.json()) as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }
    const text = (data.output ?? [])
      .filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('\n')
      .trim()
    return text ? text.slice(0, 4_000) : null
  } catch {
    return null
  }
}

/** One-shot conversation titles: a single DeepSeek request with thinking off,
 *  based on the first user message only. A title is a nicety — every failure
 *  path returns null so the caller keeps its fallback, never an error. */
export async function generateConversationTitle(apiKey: string, source: string, signal?: AbortSignal,
  locale: 'auto' | 'zh' | 'en' = 'auto', model = 'deepseek-flash'): Promise<string | null> {
  const prompt = source.trim().slice(0, 500)
  if (!prompt) return null
  const language = locale === 'auto'
    ? (/[㐀-鿿]/u.test(prompt) ? 'zh' : 'en')
    : locale
  const instructions = language === 'en'
    ? 'Write a short English title for the conversation: at most 8 words, no quotes or book-title marks, no trailing punctuation, no "Title:" prefix, output only the title.'
    : '你为一段对话起一个简短的中文标题：不超过 16 个字，不加引号或书名号，不以标点结尾，不写「标题：」这类前缀，只输出标题本身。'
  try {
    const response = await fetch('https://api.deepseek.com/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions,
        reasoning: { effort: 'none' },
        input: [{ role: 'user', content: `为下面这条消息起标题：\n${prompt}` }],
        max_output_tokens: 60
      }),
      signal
    })
    if (!response.ok) return null
    const data = (await response.json()) as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }
    const text = (data.output ?? [])
      .filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join(' ')
    return cleanTitle(text)
  } catch {
    return null
  }
}
