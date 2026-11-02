import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { TimelineGroup } from './timeline-groups';

export interface NavMark {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

/** One mark per turn — the user's own line, which is what opened it. The
 *  model's replies and the steered mid-turn messages live inside their turn
 *  and are not landmarks a reader navigates by. */
export function navMarks(groups: readonly TimelineGroup[]): NavMark[] {
  const marks: NavMark[] = [];
  for (const group of groups) {
    if (group.kind === 'single') {
      if (group.entry.kind === 'user') marks.push({ id: group.entry.id, role: 'user', text: group.entry.text });
      continue;
    }
    marks.push({ id: group.user.id, role: 'user', text: group.user.text });
  }
  return marks;
}

/** How many marks the rail shows at once — the wheel slides this window
 *  across the whole conversation instead of stacking every mark. The
 *  expanded bubble has room for sixty; the compact one keeps twenty. */
export const NAV_WINDOW_WIDE = 60;
export const NAV_WINDOW_COMPACT = 20;
/** Row pitch of the rail: a 3.2 px mark plus a 2.4 px gap. Both are multiples
 *  of 0.8, so under 125% display scaling every row lands on a whole physical
 *  pixel — mixed rounding used to make the rows look unevenly spaced. */
export const NAV_STEP = 5.6;
/** Mark height and the rail's vertical padding — the pieces both the track
 *  height and the hover card's anchor are built from. */
const NAV_MARK = 3.2;
const NAV_PAD = 6;
/** The resting handle: the newest three marks. The render window keeps at
 *  least four turns, so its progress line always sits above this handle and
 *  disappears with it. */
export const NAV_RESTING = 3;

/** The expanded rail's height for a number of visible marks. A full window is
 *  the historical 345.6 px; fewer marks make a shorter rail — the grid used to
 *  stretch its rows to the full 60-row box, leaving a dozen marks adrift in a
 *  wide-spaced column. */
export function navTrackHeight(count: number): number {
  return NAV_PAD * 2 + Math.max(0, count - 1) * NAV_STEP + NAV_MARK;
}

/** The hover card's centre relative to the rail's centre, pinned to the
 *  hovered row: half a mark below the row's top edge, one step per row. At a
 *  full 60-row window this equals the old fixed offset; a short rail no longer
 *  throws the card far off the mark it describes. */
export function navCardOffset(count: number, active: number): number {
  return active * NAV_STEP + NAV_MARK / 2 + NAV_PAD - navTrackHeight(count) / 2;
}

/** The slice of marks the rail shows for a given window start and size. */
export function navWindow(count: number, start: number, size: number): { from: number; to: number } {
  const from = Math.max(0, Math.min(Math.max(0, count - size), start));
  return { from, to: Math.min(count, from + size) };
}

/** Where a wheel nudge lands: the window clamps at the conversation's ends,
 *  so a nudge pushed past the end returns the same start — the wheel handler
 *  reads that unchanged value as "the rail is already there" and stays
 *  quiet. */
export function navNextStart(count: number, size: number, current: number, delta: number): number {
  return Math.max(0, Math.min(Math.max(0, count - size), current + delta));
}

/** The hover card shows three lines' worth at most — anything longer is
 *  dropped rather than scrolled: the full text already lives in the timeline,
 *  and the popover should not hold a second copy of it. */
export function navPreview(text: string): string {
  const clean = text.trim();
  return clean.length > 120 ? `${clean.slice(0, 120)}…` : clean;
}

/** A five-row wave around the pointer: the hovered mark is longest, the two
 *  rows on each side fall off, everything past them stays flat. */
export function navBoost(distance: number): number {
  if (distance === 0) return 10;
  if (distance === 1) return 7;
  if (distance === 2) return 3;
  return 0;
}

/** How many marks one wheel event slides the window. A normal notch (pixel
 *  mode ~120, line mode ~3) moves three; an accelerated wheel sends large
 *  pixel deltas in a single event, so the step scales with the delta — a hard
 *  flick that used to move three marks now rolls to where it was aimed. */
export function navWheelStep(deltaY: number): number {
  return Math.max(3, Math.min(24, Math.round(Math.abs(deltaY) / 40)));
}

/** The classes one mark renders with. Every mark is the user's own line, so
 *  there is no speaker tone to split — only the pointer highlight, and that
 *  belongs to the opened rail alone. */
export function navMarkClass(expanded: boolean, isActive: boolean): string {
  return `panel-nav-mark${expanded && isActive ? ' is-active' : ''}`;
}

/** Which mark row the pointer sits in — the wheel re-anchors the hover with
 *  it. Rows have a constant 5.6 px pitch, so a still pointer keeps the same
 *  row number while the window slides; only what that row shows changes.
 *  Returns null over the rail's padding or past its end. */
export function navRowAt(clientY: number, trackTop: number, count: number): number | null {
  const row = Math.floor((clientY - trackTop - NAV_PAD) / NAV_STEP);
  return row >= 0 && row < count ? row : null;
}

/**
 * The message rail: a short handle of the newest marks at rest; hovering
 * opens a window of the newest sixty marks that the wheel slides up and down
 * the whole conversation, and clicking a mark jumps to that message. The list
 * itself is one track translated as a whole, so the marks, their numbers and
 * the progress line keep their relative positions and slide together.
 */
export function TimelineNav({ marks, onJump, windowSize = NAV_WINDOW_WIDE, baseWidth = 8.8, progressId }: { marks: NavMark[]; onJump: (id: string) => void; windowSize?: number; baseWidth?: number; progressId?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [start, setStart] = useState(() => Math.max(0, marks.length - windowSize));
  const startRef = useRef(start);
  startRef.current = start;
  // A window-size change re-anchors the rail to the newest marks: a start
  // that was legal for the old size can point far away for the new one.
  useEffect(() => {
    setStart(Math.max(0, marks.length - windowSize));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowSize]);
  const navRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<{ start: number; clientY: number } | null>(null);

  useEffect(() => {
    const node = navRef.current;
    if (!node || !expanded) return;
    const size = Math.min(windowSize, marks.length);
    const onWheel = (event: WheelEvent) => {
      // The wheel moves the rail's window, never the feed behind it.
      event.preventDefault();
      const direction = event.deltaY > 0 ? 1 : -1;
      const step = navWheelStep(event.deltaY);
      const next = navNextStart(marks.length, size, startRef.current, direction * step);
      if (next !== startRef.current) startRef.current = next;
      pendingRef.current = { start: startRef.current, clientY: event.clientY };
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const batch = pendingRef.current;
        pendingRef.current = null;
        if (!batch) return;
        setStart(batch.start);
        // 重新锚定鼠标下那一行：React 换窗口后浏览器不会可靠地重跑命中测试。
        const row = navRowAt(batch.clientY, node.getBoundingClientRect().top, size);
        if (row !== null) setActive(batch.start + row);
      });
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      pendingRef.current = null;
    };
  }, [expanded, marks.length, windowSize]);

  if (marks.length < 4) return null;
  const visibleCount = expanded ? Math.min(windowSize, marks.length) : Math.min(NAV_RESTING, marks.length);
  const maxStart = Math.max(0, marks.length - visibleCount);
  const from = expanded ? Math.min(Math.max(0, start), maxStart) : 0;
  // 收起态只渲染最后三条：轨道里留着第四条会让遮罩边缘隐约多出一根。
  const rows = expanded ? marks : marks.slice(-Math.min(NAV_RESTING, marks.length));
  const rowOffset = expanded ? 0 : Math.max(0, marks.length - rows.length);
  const latestId = marks[marks.length - 1]?.id;
  const progressIndex = expanded && progressId ? marks.findIndex((mark) => mark.id === progressId) : -1;
  const activeMark = expanded && active !== null ? marks[active] : null;
  return <>
    <div
      className={`panel-nav${expanded ? ' is-expanded' : ''}`}
      ref={navRef}
      style={{ height: navTrackHeight(visibleCount) }}
      aria-label="消息导航：悬停展开，滚轮翻动，点击跳转"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { setExpanded(false); setActive(null); }}
      onClick={(event) => {
        const rect = navRef.current?.getBoundingClientRect();
        if (!rect) return;
        const row = Math.floor((event.clientY - rect.top - NAV_PAD) / NAV_STEP);
        const mark = rows[from + row];
        if (mark) onJump(mark.id);
      }}
    >
      <div className="panel-nav-track" style={{ transform: `translateY(${-from * NAV_STEP}px)` }}>
        {rows.map((mark, index) => {
          const absolute = rowOffset + index;
          const boost = expanded && active !== null ? navBoost(Math.abs(absolute - active)) : 0;
          const scale = boost ? (baseWidth + boost) / baseWidth : 1;
          const ordinal = absolute + 1;
          return <span key={mark.id} className="panel-nav-row" onClick={(event) => { event.stopPropagation(); onJump(mark.id); }}>
            <i
              aria-hidden="true"
              className={`${navMarkClass(expanded, absolute === active)}${mark.id === latestId ? ' is-latest' : ''}`}
              style={scale !== 1 ? ({ '--nav-scale': String(scale) } as CSSProperties) : undefined}
              onMouseEnter={expanded ? () => setActive(absolute) : undefined}
            />
            {/* 每十根横杠标一次序号：10、20、30……数字在横杠右边，绝对定位，
                不撑高行；整条轨道一起平移，数字和横杠的相对位置不变。 */}
            {expanded && ordinal % 10 === 0 && <em className="panel-nav-count" aria-hidden="true">{ordinal}</em>}
          </span>;
        })}
        {progressIndex >= 0 && <em className="panel-nav-progress" aria-hidden="true"
          style={{ top: progressIndex * NAV_STEP - 2 }} />}
      </div>
    </div>
    {activeMark && <div
      className="panel-nav-card"
      role="tooltip"
      style={{ top: `clamp(40px, calc(50% + ${navCardOffset(visibleCount, active! - from)}px), calc(100% - 40px))` }}
    >
      <span className={`panel-nav-role${activeMark.role === 'user' ? ' is-user' : ''}`}>{activeMark.role === 'user' ? '你' : '小鲸'}</span>
      <p className="panel-nav-text">{navPreview(activeMark.text) || '（图片消息）'}</p>
    </div>}
  </>;
}
