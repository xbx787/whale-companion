import type { PetAPI } from '../shared/contracts'
import type { UserAttachment } from '../shared/contracts'
import { pastedFileName } from './composer-drafts'

export const EDITOR_ONE_LINE = 23;
/** Fallback eight-line cap for the smallest type scale. */
export const EDITOR_MAX_HEIGHT = 155;

export interface EditorHeightBounds {
  min: number;
  max: number;
}

/** One and eight lines at the editor's actual line height, padding included.
 *  Falls back to the 13px metrics when a computed value is unavailable. */
export function editorHeightBounds(style: Pick<CSSStyleDeclaration, 'lineHeight' | 'paddingTop' | 'paddingBottom'>): EditorHeightBounds {
  const lineHeight = Number.parseFloat(style.lineHeight);
  const line = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 18.85;
  const padding = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
  const min = Math.ceil(line + padding);
  const max = Math.max(min, Math.ceil(line * 8 + padding));
  return { min, max };
}

/** Keeps a measured height sane: never a sliver (a zero-height pass squeezed
 *  the placeholder out and the box then stayed collapsed), never past eight
 *  lines at the current type scale. */
export function clampEditorHeight(measured: number, bounds: EditorHeightBounds = { min: EDITOR_ONE_LINE, max: EDITOR_MAX_HEIGHT }): number {
  return Math.min(bounds.max, Math.max(bounds.min, measured));
}

/** The editor's content height, or null when the measurement means nothing —
 *  a hidden panel or a zero-width pass reports 0, and writing that back froze
 *  the composer at a sliver until something else happened to re-measure it. */
export function fitEditorHeight(editor: HTMLElement): number | null {
  if (editor.clientWidth === 0) return null;
  const bounds = editorHeightBounds(getComputedStyle(editor));
  editor.style.height = 'auto';
  const nextHeight = clampEditorHeight(editor.scrollHeight, bounds);
  editor.style.height = `${nextHeight}px`;
  return nextHeight;
}

export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export async function prepareFileAttachment(bridge: PetAPI, file: File): Promise<UserAttachment> {
  let filePath = '';
  // 剪贴板里的图片没有磁盘路径，webUtils 有时会直接抛错；抛错时走下面的
  // base64 暂存，不能让它把整个粘贴流程打断。
  try {
    filePath = bridge.getPathForFile(file);
  } catch {
    filePath = '';
  }
  if (filePath) return bridge.prepareDroppedFile(filePath);
  if (file.size > 5 * 1024 * 1024) throw new Error('粘贴的文件不能超过 5 MB。');
  return bridge.preparePastedFile({ name: pastedFileName(file), data: await fileToBase64(file) });
}
