import { memo } from 'react'
import type { ModelMode, TimelineEntry } from '../shared/contracts'
import { EventImages } from './event-images'
import { splitAttachmentNote } from './attachment-note'
import { MessageMarkdown } from './message-markdown'

export const noopOpenImage = (): void => {};

export function timeText(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.valueOf()) ? iso : parsed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/** "10-13 12:30" — short, absolute, the way a row's info line reads it. */
export function stampText(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.valueOf())) return '—';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

export const modeLabels: Record<ModelMode, string> = { live: 'DeepSeek 直连', dsh: '小鲸引擎 + DeepSeek' };

/** First line of a user message, trimmed for the turn menu's title. */
export function turnMenuTitle(entry: TimelineEntry): string {
  const line = entry.text.replace(/\s+/g, ' ').trim();
  return line.length > 28 ? `${line.slice(0, 28)}…` : line || '这一轮对话';
}

/** Terminal colour codes (CSI/OSC escape sequences) leak into tool output
 *  verbatim — vitest paints its summary red and green. The row shows text,
 *  not a terminal, so strip them at display time. */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001b\\)?)/g, '');
}

/** One message's body: attachment pictures, else the text — markdown for the
 *  model's own words and for the user's (where single newlines stay hard
 *  breaks, line for line what was typed), plain paragraphs for the rest.
 *  Shared by the standalone rows and by the list-like pieces of a split
 *  reply. */
export function MessageBody({ entry, running = false, onOpenImage }: { entry: TimelineEntry; running?: boolean; onOpenImage?: (name: string, url: string) => void }) {
  const attachmentNote = entry.kind === 'user' ? splitAttachmentNote(entry.text) : null;
  return <>
    {attachmentNote
      ? <EventImages note={attachmentNote} prompt={attachmentNote.prompt} images={entry.images} onOpen={onOpenImage ?? noopOpenImage} />
      : entry.kind === 'assistant' ? <MessageMarkdown text={entry.text} streaming={running} />
      : entry.kind === 'user' ? <MessageMarkdown text={entry.text} breaks />
      : <p>{entry.text}</p>}
  </>;
}

/** One piece of a split reply: a list-like paragraph whose dot is its own
 *  pseudo-element, so the alignment can never drift again. */
export const RunParagraph = memo(function RunParagraph({ entry, onOpenImage }: { entry: TimelineEntry; onOpenImage?: (name: string, url: string) => void }) {
  return <div className="panel-run-item"><MessageBody entry={entry} onOpenImage={onOpenImage} /></div>;
});

/** 把工作区绝对路径缩成 `~/…`，工具行才看得见改的是哪个文件。 */
export function abbreviateWorkspace(text: string, root?: string): string {
  if (!root || !text) return text
  const variants = new Set([
    root,
    root.replace(/\\/gu, '/'),
    root.replace(/\\/gu, '\\\\'),
    root.replace(/\\/gu, '\\/')
  ])
  let next = text
  for (const variant of variants) {
    if (!variant) continue
    next = next.split(variant).join('~')
  }
  return next
}

/** 读图工具的原始文件路径：优先用结果里的 images，其次从参数里的
 *  file_path / path 或输出里的 <path> 取。只认图片扩展名，普通文件不挂按钮。 */
export function toolImagePath(tool?: { input?: unknown; output?: string; images?: Array<{ path: string }> }): string | null {
  const fromImages = tool?.images?.[0]?.path;
  if (fromImages) return fromImages;
  const candidates: string[] = [];
  let parsed: unknown = tool?.input;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = null; }
  }
  if (parsed && typeof parsed === 'object') {
    for (const key of ['file_path', 'filePath', 'path', 'file']) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === 'string') candidates.push(value);
    }
  }
  if (typeof tool?.output === 'string') {
    const inOutput = /<path>([^<]+)<\/path>/u.exec(tool.output)?.[1];
    if (inOutput) candidates.push(inOutput);
  }
  const isImage = (value: string): boolean => /\.(?:png|jpe?g|webp|gif|bmp)$/iu.test(value.trim());
  return candidates.map((value) => value.trim()).find(isImage) ?? null;
}
