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
}

