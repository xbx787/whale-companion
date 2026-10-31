import { useEffect } from 'react'
import type { PanelDirection, PanelPlacement } from '../shared/contracts'

/** 独立面板窗口的外观同步：展开方向、贴左贴右、尾巴指向人物的水平位置。
 *  三个 effect 各自只依赖一个 prop，抽在一起减少主组件的窗口操作噪音。 */
export function usePanelWindowChrome(direction: PanelDirection, placement: PanelPlacement): void {
  // 独立面板窗口里，body 决定面板贴窗口顶还是底、小三角朝上还是朝下。
  useEffect(() => {
    if (!document.body.classList.contains('panel-window')) return
    document.body.classList.toggle('panel-direction-down', direction === 'down')
    return () => { document.body.classList.remove('panel-direction-down') }
  }, [direction])

  // 贴左/贴右时，面板填满窗口高度，侧边用不同的对齐方式。
  useEffect(() => {
    if (!document.body.classList.contains('panel-window')) return
    document.body.classList.toggle('panel-placement-left', placement === 'left')
    document.body.classList.toggle('panel-placement-right', placement === 'right')
    return () => {
      document.body.classList.remove('panel-placement-left')
      document.body.classList.remove('panel-placement-right')
    }
  }, [placement])

  // 尾巴指向人物：主进程按人物中心算好相对面板窗口的左缘距离。
  useEffect(() => {
    if (!document.body.classList.contains('panel-window')) return
    const unsubscribe = window.pet.onPanelTailX((x) => {
      document.body.style.setProperty('--panel-tail-x', `${x}px`)
    })
    return unsubscribe
  }, [])
}
