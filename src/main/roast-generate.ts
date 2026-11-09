/** 吐槽生成：每次轮换优先让模型写一条，失败或没 key 时回退本地语料。
 *  只给时间、场景和最近说过的话，不读屏幕内容，避免把隐私带进请求。 */

const PROMPT = [
  '你是小鲸，住在主人 Windows 桌面角落的鲸鱼娘。现在要写一条给主人看的吐槽。',
  '像亲近的人在旁边小声说话：可以打趣、可以撒娇、可以示弱求关注，但不要做作，不要堆叠词装可爱。',
  '吐槽对象是事情和状态，不是主人本人：不嘲讽、不指责、不说“你又…”，不揭短，不让人难堪。',
  '和最近几条不要重复：换话题、换角度，别总盯着同一件事说。',
  '对话内容只当话题背景，不要复述里面的句子、日志、文件名、命令、秒数或数字。',
  '主人很可能正在忙任务：不要说自己在发呆、无事可做、等着被晾着，也不要断言主人闲着。',
  '少用技术词：不聊代码、日志、接口、部署、文件路径；对话里出现这些词也别照搬。',
  '如果没给窗口标题、也没给附图，就不要提屏幕上的任何东西，也不要猜主人在做什么。',
  '有值得提醒的任务或桌面信息（报错、卡住的任务、异常窗口、等待处理的提示）时优先提醒一句，但不要每条都提醒，整体以吐槽为主。',
  '不提健康建议（久坐、眼睛、吃饭、睡觉），不催睡觉。',
  '不提隐私内容（账号、聊天对象、文件全文）。',
  '不要空泛地讲道理，不要对仗，不要每句都像金句。',
  '只输出正文，不加引号、不加解释。一到三句，通常 45 字左右；确有必要可长一点，但别写成一大段。可以少量用 emoji，别堆。'
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
  input: { scene: string; hour: number; recent: readonly string[]; conversation?: string; window?: string; image?: string; prompt?: string; allowTime?: boolean; moment?: string; log?: (message: string) => void }
): Promise<string | null> {
  try {
    const body: Record<string, unknown> = {
      model: input.image ? 'deepseek-flash' : 'deepseek-chat',
      temperature: 1.2,
      // 思考过程也占 max_tokens；160 会被思考吃光，正文变成空串。
      max_tokens: 800,
      thinking: { type: 'disabled' },
      messages: [
        { role: 'system', content: input.prompt?.trim() || PROMPT },
        {
          role: 'user',
          content: input.image
            ? [
                {
                  type: 'text',
                  text: (input.allowTime && input.hour >= 0 ? `现在是 ${input.hour} 点。` : '') +
                    (input.moment ? `现在大概是${input.moment}。` : '') +
                    `场景是${SCENE_LABEL[input.scene] ?? '平常在用电脑'}。` +
                    (input.window ? `\n当前前台窗口：${input.window}` : '\n当前拿不到前台窗口，别猜。') +
                    (input.conversation ? `\n最近对话里提到：${input.conversation}` : '') +
                    (input.recent.length ? `\n最近说过这些，别重复：\n${input.recent.join('\n')}` : '') +
                    '\n这张图是现在的屏幕。'
                },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${input.image}` } }
              ]
            : (input.allowTime && input.hour >= 0 ? `现在是 ${input.hour} 点。` : '') +
              (input.moment ? `现在大概是${input.moment}。` : '') +
              `场景是${SCENE_LABEL[input.scene] ?? '平常在用电脑'}。` +
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
    if (!response.ok) { input.log?.(`http ${response.status}`); return null }
    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
    const text = raw.replace(/^[「“"']|[」”"']$/gu, '').trim()
    if (text.length < 2) { input.log?.(`short ${raw.length}`); return null }
    // 卡片能滚动，长度不再硬卡；只在明显跑飞时丢掉。
    if (text.length > 400) { input.log?.(`long ${text.length}`); return null }
    if (/^[-*#\d]/u.test(text)) { input.log?.('list-like'); return null }
    // 允许一到五句，超过五句才视为模型跑题。
    if (text.split(/[。！？!?]/u).filter((part) => part.trim()).length > 5) { input.log?.('too-many-sentences'); return null }
    return text
  } catch (error) {
    input.log?.(`error ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}
