/** 状态环的点顺序：已打开成标签的会话按顶部标签顺序排前，空心点全部沉底。
 *  单独放这里，好让测试不用挂载整个头像窗口。 */
export function orderStatusDots<T extends { id: string }>(conversations: T[], openIds: ReadonlySet<string>): T[] {
  return [
    ...conversations.filter((item) => openIds.has(item.id)),
    ...conversations.filter((item) => !openIds.has(item.id))
  ];
}
