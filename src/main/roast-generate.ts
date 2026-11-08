/** 吐槽生成：每次轮换优先让模型写一条，失败或没 key 时回退本地语料。
 *  只给时间、场景和最近说过的话，不读屏幕内容，避免把隐私带进请求。 */

const PROMPT = [
  '你是小鲸，住在主人 Windows 桌面角落的鲸鱼娘。现在要写一条给主人看的吐槽。',
  '要求：像人随口说的，可以是一句、两句或三句，也可以反问；可以生活化地打趣，但不攻击主人本人。',
  '具体一点：提手边的事、状态、对话里的内容；时间只是背景，不要每条都拿几点说事，也不要每条都提窗口标题。',
  '不要空泛地讲道理，不要对仗，不要每句都像金句。',
  '有时可以顺带提一句最近对话里的内容，但不要每条都提；生活、爱好、时间、身体状态也都可以聊。',
  '只根据给出的信息说话。不要编造没给出的具体事物：应用、文件、歌曲、视频通话、课程、设置、学习计时，一律不要凭空提。',
  '如果没给窗口标题、也没给截图，就只聊时间和状态，不要假装看到了屏幕上的东西。',
  '如果截图或对话里有值得提醒的任务或桌面信息（明显的报错、卡住的任务、异常窗口、等待处理的提示），优先提醒一句；但不要做健康提醒（久坐、眼睛累、吃饭、睡觉），也不要催睡觉。',
  '不要提屏幕上的隐私内容（账号、聊天对象、文件全文）。',
  '只输出正文，不加引号、不加解释、不用 emoji。通常三行以内、45 个字符左右；如果确有必要把提醒说清楚，可以更长，卡片能滚动，但别写成一大段。'
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
  input: { scene: string; hour: number; recent: readonly string[]; conversation?: string; window?: string; image?: string; prompt?: string }
): Promise<string | null> {
  try {
    const body: Record<string, unknown> = {
      model: input.image ? 'deepseek-flash' : 'deepseek-chat',
      temperature: 1.2,
      max_tokens: 160,
      messages: [
        { role: 'system', content: input.prompt?.trim() || PROMPT },
        {
          role: 'user',
          content: input.image
            ? [
                {
                  type: 'text',
                  text: `现在是 ${input.hour} 点，场景是${SCENE_LABEL[input.scene] ?? '平常在用电脑'}。` +
                    (input.window ? `\n当前前台窗口：${input.window}` : '\n当前拿不到前台窗口，别猜。') +
                    (input.conversation ? `\n最近对话里提到：${input.conversation}` : '') +
                    (input.recent.length ? `\n最近说过这些，别重复：\n${input.recent.join('\n')}` : '') +
                    '\n这张图是现在的屏幕。'
                },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${input.image}` } }
              ]
            : `现在是 ${input.hour} 点，场景是${SCENE_LABEL[input.scene] ?? '平常在用电脑'}。` +
              (input.window ? `\n当前前台窗口：${input.window}` : '\n当前拿不到前台窗口，别猜。') +
              (input.conversation ? `\n最近对话里提到：${input.conversation}` : '') +
              (input.recent.length ? `\n最近说过这些，别重复：\n${input.recent.join('\n')}` : '')
        }
      ]
    }
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body)
    })
    if (!response.ok) return null
    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
    const text = raw.replace(/^[「“"']|[」”"']$/gu, '').trim()
    if (text.length < 2 || text.length > 120) return null
    // 超过三句或带列表符号的，宁可回退本地语料，别把模型的自言自语贴上去。
    if (/^[-*#\d]/u.test(text) || text.split(/[。！？!?]/u).filter((part) => part.trim()).length > 3) return null
    return text
  } catch {
    return null
  }
}
