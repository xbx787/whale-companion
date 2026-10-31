import type { AvatarSize } from '../shared/contracts'

/** 人物脚底到窗口底的透明余量，拖动时用来算底部允许量。 */
export const AVATAR_BOTTOM_SLACK: Record<AvatarSize, number> = { small: 60, medium: 48.5, large: 36 }
/** 人物右缘到头像窗口右缘的透明余量（88px 锚点 − 可见宽度/2，再加 2px
 *  动画缓冲）。允许窗口向右伸出这么多，人物才能拖到屏幕最右边。 */
export const AVATAR_RIGHT_SLACK: Record<AvatarSize, number> = { small: 37, medium: 32, large: 27 }
/** 人物可见区域在头像窗口里的位置：与 .avatar-portrait 的 top 6px 对齐，
 *  长边缩放到 AVATAR_CONTENT_SIZES，宽度按原图 1016/1218 的比例。 */
export const AVATAR_VISIBLE_BOX: Record<AvatarSize, { width: number; height: number; top: number }> = {
  small: { width: 106.7, height: 128, top: 6 },
  medium: { width: 116.4, height: 140, top: 6 },
  large: { width: 126.8, height: 152, top: 6 }
}
/** 头像窗口只包住角色和状态点；不再跟随整个舞台矩形。 */
export const AVATAR_WINDOW_WIDTH = 200
export const AVATAR_WINDOW_HEIGHT = 220
/** 余额卡宽度；窗口再向右留 8px 给指向人物的小三角。 */
export const BALANCE_CARD_WIDTH = 240
export const BALANCE_POINTER = 8
/** 卡片比人物可见高度再矮一截，上下各留 8px，避免看过去比人物长。 */
export const BALANCE_INSET_Y = 16
/** Medium card (124) plus the requested 10px lower edge. All avatar sizes
 *  share this height so the type and buttons stay identical. */
export const BALANCE_WINDOW_HEIGHT = 124
/** 人物图片的视觉重心比几何中心偏上，卡片跟着上提一点才看着齐。 */
export const BALANCE_LIFT = 6
/** 三角尖到角色左缘的呼吸间距。 */
export const BALANCE_GAP = 4
