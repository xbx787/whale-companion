import type { MouseEvent } from 'react'
import type { DroppedAttachment } from './panel-utils'
import { fileBadge } from './attachment-note'

/** 编辑器上方的附件列表，每个附件可预览、可移除。 */
export function AttachmentChips({ attachments, onHover, onLeave, onOpen, onRemove }: {
  attachments: DroppedAttachment[]
  onHover: (attachment: DroppedAttachment, element: HTMLElement) => void
  onLeave: () => void
  onOpen: (attachment: DroppedAttachment) => void
  onRemove: (id: string) => void
}) {
  if (attachments.length === 0) return null
  return <div className="panel-attachments" aria-label="已添加附件" onMouseLeave={onLeave} onBlur={onLeave}>
    {attachments.map((attachment) => {
      const badge = fileBadge(attachment.name)
      return <span key={attachment.id} className="panel-attachment-chip" title={attachment.name}
        onMouseEnter={(event: MouseEvent<HTMLElement>) => onHover(attachment, event.currentTarget)}
        onFocus={(event: React.FocusEvent<HTMLElement>) => onHover(attachment, event.currentTarget)}
        onClick={(event) => { if (!(event.target as HTMLElement).closest('button')) onOpen(attachment) }}>
        <i aria-hidden="true">{badge.kind}</i>
        <span>{badge.stem}</span>
        <button type="button" aria-label={`移除 ${attachment.name}`} onClick={() => onRemove(attachment.id)}>×</button>
      </span>
    })}
  </div>
}
