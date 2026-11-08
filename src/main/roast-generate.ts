/** 吐槽生成：每次轮换优先让模型写一条，失败或没 key 时回退本地语料。
 *  只给时间、场景和最近说过的话，不读屏幕内容，避免把隐私带进请求。 */

const PROMPT = [
  '你是小鲸，住在主人 Windows 桌面角落的鲸鱼娘。现在要写一条给主人看的吐槽。',
  '要求：像人随口说的，可以是一句、两句或三句，也可以反问；可以生活化地打趣，但不攻击主人本人。',
  '具体一点：提到时间、状态、手边的事，不要空泛地讲道理，不要对仗，不要每句都像金句。',
  '不要提屏幕内容、账号、聊天对象，也不要编造没发生的事。',
  '只输出吐槽正文，不加引号、不加解释、不用 emoji。'
].join('\n')

const SCENE_LABEL: Record<string, string> = {
  general: '平常在用电脑',
  idle: '人离开了一会儿',
  failed: '刚有一步没做成',
  late: '已经很晚了',
  long: '有一件事等了很久'
}

export async function generateRoast(
  apiKey: string,
  input: { scene: string; hour: number; recent: readonly string[] }
): Promise<string | null> {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 1.2,
        max_tokens: 120,
        messages: [
          { role: 'system', content: PROMPT },
          {
            role: 'user',
            content: `现在是 ${input.hour} 点，场景是${SCENE_LABEL[input.scene] ?? '平常在用电脑'}。` +
              (input.recent.length ? `\n最近说过这些，别重复：\n${input.recent.join('\n')}` : '')
          }
        ]
      })
    })
    if (!response.ok) return null
    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
    const text = raw.replace(/^[「“"']|[」”"']$/gu, '').trim()
    if (text.length < 2 || text.length > 80) return null
    // 超过三句或带列表符号的，宁可回退本地语料，别把模型的自言自语贴上去。
    if (/^[-*#\d]/u.test(text) || text.split(/[。！？!?]/u).filter((part) => part.trim()).length > 3) return null
    return text
  } catch {
    return null
  }
}
