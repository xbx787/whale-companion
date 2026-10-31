import { AttachmentPreview, type PreviewPlacement } from './attachment-preview'

/** 附件悬停预览与错误提示，挂在编辑器上方。 */
export function AttachmentPreviewStrip({ preview, previews, names, error }: {
  preview: { path: string; name: string; placement: PreviewPlacement } | null
  previews: Record<string, string>
  names: Array<string | undefined>
  error: string | null
}) {
  return <>
    {preview && previews[preview.path] && names.includes(preview.path) &&
      <AttachmentPreview placement={preview.placement} name={preview.name} src={previews[preview.path]} />}
    {error && <div className="panel-attachment-error" role="status">{error}</div>}
  </>
}
