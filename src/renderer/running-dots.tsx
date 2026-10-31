/** 运行中的三点：用三个等大的圆点元素画，不依赖字体省略号的字形，
 *  避免同一处点大小不一。颜色跟随 currentColor。 */
export function RunningDots() {
  return <span className="panel-tool-dots" aria-hidden="true"><i /><i /><i /></span>
}
