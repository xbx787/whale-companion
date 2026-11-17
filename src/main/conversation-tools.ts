/** 对话之间的消息通道。
 *
 *  以进程内 MCP server 的形式交给模型：它可以列出本应用里的其他对话，并把
 *  一条消息转给其中一个。目标对话收到的是普通的用户消息（带来源标记），
 *  会照常触发它的模型回复——所以工具描述要求只在用户明确要求转达时使用。
 */
export interface ConversationTarget {
  id: string
  title: string
  running: boolean
  archived: boolean
}

export interface ConversationBridge {
  list: () => ConversationTarget[]
  send: (target: string, text: string) => Promise<{ id: string; title: string }>
  /** 和面板顶栏的「+」同一个动作：新建一个空会话并切过去。 */
  create: () => Promise<{ id: string; title: string }>
  /** 重命名；target 可以是 id 或唯一标题。 */
  rename: (target: string, title: string) => Promise<{ id: string; title: string }>
  /** 置顶/取消置顶；影响左栏列表顺序，不改顶栏标签顺序。 */
  setPinned: (target: string, pinned: boolean) => Promise<{ id: string; title: string; pinned: boolean }>
  /** 调整顶栏标签顺序；before/after 需要 anchor 指定参照对话。 */
  move: (target: string, position: 'first' | 'last' | 'before' | 'after', anchor?: string) =>
    Promise<{ id: string; title: string; order: string[] }>
  /** 归档：从标签栏收进未归档之外，记录保留。 */
  archive: (target: string) => Promise<{ id: string; title: string }>
  /** 从归档里恢复。 */
  restore: (target: string) => Promise<{ id: string; title: string }>
  /** 永久删除对话。 */
  remove: (target: string) => Promise<{ id: string; title: string }>
}

