/** Stable conversation references keep the visible title readable while the
 * UUID, rather than a renameable title, identifies the source at submission.
 * 手机 DSH Go 的会话用同一套语法，scheme 换成 `xiaojing-phone:`；本机结果不带
 * `kind`，保持旧调用方的形状不变。 */
export interface SessionMention {
  id: string
  title: string
  /** 只有手机引用才带；缺省就是本机会话。 */
  kind?: 'phone'
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
/** 手机会话 id 由 DSH Go 生成，不保证是 UUID；只做保守的字符与长度校验。 */
const PHONE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u
const LOCAL_SCHEME = '](xiaojing-session:'
const PHONE_SCHEME = '](xiaojing-phone:'

function escapeLabel(title: string): string {
  const label = title.replace(/\s+/gu, ' ').trim().slice(0, 60) || '会话'
  return label.replace(/[\\\]]/gu, '\\$&')
}

export function sessionMentionToken(title: string, id: string): string {
  if (!UUID.test(id)) throw new Error('会话编号无效。')
  return `@[${escapeLabel(title)}](${LOCAL_SCHEME.slice(2)}${id})`
}

/** 手机对话的引用 token。id 是手机侧的 sessionId，不并进本机库。 */
export function phoneMentionToken(title: string, id: string): string {
  if (!PHONE_ID.test(id)) throw new Error('手机会话编号无效。')
  return `@[${escapeLabel(title)}](${PHONE_SCHEME.slice(2)}${id})`
}

/** Tokens in Markdown code stay literal. A malformed Xiaojing token in prose
 * is an error, so a typo cannot silently turn a requested reference into text. */
export function parseSessionMentions(input: string): SessionMention[] {
  const mentions: SessionMention[] = []
  let fence: { marker: string; size: number } | null = null
  for (const line of input.split(/\r?\n/u)) {
    const fenceLine = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line)
    if (fence) {
      // A closing fence uses the same character, is at least as long, and
      // permits only spaces or tabs after it. ```js is code, not a close.
      if (fenceLine && fenceLine[1][0] === fence.marker && fenceLine[1].length >= fence.size &&
          /^[ \t]*$/u.test(fenceLine[2])) fence = null
      continue
    }
    // CommonMark forbids backticks in the info string of a backtick fence.
    if (fenceLine && (fenceLine[1][0] === '~' || !fenceLine[2].includes('`'))) {
      fence = { marker: fenceLine[1][0], size: fenceLine[1].length }
      continue
    }
    let inlineTicks = 0
    for (let i = 0; i < line.length;) {
      if (line[i] === '`') {
        let end = i + 1
        while (line[end] === '`') end += 1
        const size = end - i
        if (inlineTicks === 0) inlineTicks = size
        else if (inlineTicks === size) inlineTicks = 0
        i = end
        continue
      }
      if (inlineTicks || line[i] !== '@' || line[i + 1] !== '[' || line[i - 1] === '\\' ||
          (i > 0 && /[\p{L}\p{N}_@]/u.test(line[i - 1]))) { i += 1; continue }
      let labelEnd = i + 2
      while (labelEnd < line.length) {
        if (line[labelEnd] === '\\') { labelEnd += 2; continue }
        if (line[labelEnd] === ']') break
        labelEnd += 1
      }
      const phone = line.startsWith(PHONE_SCHEME, labelEnd)
      if (!phone && !line.startsWith(LOCAL_SCHEME, labelEnd)) { i += 2; continue }
      const scheme = phone ? PHONE_SCHEME : LOCAL_SCHEME
      const idStart = labelEnd + scheme.length
      const close = line.indexOf(')', idStart)
      if (close < 0) throw new Error(phone ? '手机会话引用格式无效，请重新从手机对话列表选择。' : '会话引用格式无效，请重新从 @ 候选中选择。')
      const id = line.slice(idStart, close)
      if (phone ? !PHONE_ID.test(id) : !UUID.test(id)) {
        throw new Error(phone ? '手机会话引用编号无效，请重新从手机对话列表选择。' : '会话引用编号无效，请重新从 @ 候选中选择。')
      }
      const title = line.slice(i + 2, labelEnd).replace(/\\([\\\]])/gu, '$1')
      mentions.push(phone ? { id, title, kind: 'phone' } : { id, title })
      i = close + 1
    }
  }
  return mentions
}
