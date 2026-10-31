import type { UserAttachment } from '../shared/contracts'
import { isImageAttachmentName } from '../shared/image-preview'
import { previewPlacement, type PreviewPlacement } from './attachment-preview'
import { petBridge } from './pet-state'
import { AUTO_COMPACT_DEFAULT_PERCENT, AUTO_COMPACT_MAX_PERCENT, AUTO_COMPACT_MIN_PERCENT } from '../shared/contracts'

/** 附件悬停预览：只在输入区可见、且是图片时弹预览卡。 */
export function showAttachmentPreview({ attachment, chip, composerRef, requestPreview, setPreviewCard }: {
  attachment: UserAttachment
  chip: HTMLElement
  composerRef: { current: HTMLFormElement | null }
  requestPreview: (attachment: UserAttachment) => void
  setPreviewCard: (value: { path: string; name: string; placement: PreviewPlacement } | null) => void
}): void {
  const composer = composerRef.current?.getBoundingClientRect()
  if (!composer || !isImageAttachmentName(attachment.name)) return
  requestPreview(attachment)
  if (attachment.path) setPreviewCard({ path: attachment.path, name: attachment.name, placement: previewPlacement(composer, chip.getBoundingClientRect()) })
}

/** 附件点击打开全屏预览；之前没悬停过时按需读一次字节。 */
export async function openAttachmentImage({ attachment, previews, setPreviews, setPreviewCard, openViewer }: {
  attachment: UserAttachment
  previews: Record<string, string>
  setPreviews: (updater: (current: Record<string, string>) => Record<string, string>) => void
  setPreviewCard: (value: null) => void
  openViewer: (name: string, url: string) => void
}): Promise<void> {
  const target = attachment.path
  if (!target || !isImageAttachmentName(attachment.name)) return
  let url: string | undefined = previews[target]
  if (!url) {
    try { url = (await petBridge().readImagePreview(target)) ?? undefined } catch { url = undefined }
  }
  if (url) {
    const resolved = url
    setPreviews((current) => ({ ...current, [target]: resolved }))
    setPreviewCard(null)
    openViewer(attachment.name, resolved)
  }
}

/** 上下文弹窗里的阈值行：滚轮一格 5 个百分点，限制在 50–90。滚动时只更新
 *  本地预览，停下 220ms 才提交一次设置，避免每格都写库、刷新快照造成卡顿。 */
let compactNudgeTimer: number | undefined

export function nudgeAutoCompact({ delta, current, run, onPreview }: {
  delta: number
  current: number | undefined
  run: (action: (bridge: { setAutoCompactPercent: (value: number) => Promise<void> }) => Promise<void>) => Promise<unknown>
  onPreview: (value: number | null) => void
}): void {
  const value = current ?? AUTO_COMPACT_DEFAULT_PERCENT
  const next = Math.min(AUTO_COMPACT_MAX_PERCENT, Math.max(AUTO_COMPACT_MIN_PERCENT, value + delta * 5))
  if (next === value) return
  onPreview(next)
  if (compactNudgeTimer !== undefined) window.clearTimeout(compactNudgeTimer)
  compactNudgeTimer = window.setTimeout(() => {
    compactNudgeTimer = undefined
    void run((bridge) => bridge.setAutoCompactPercent(next))
  }, 220)
}
