import type { ReactNode } from 'react'
import type { TaskMetrics, TimelineEntry } from '../shared/contracts'
import { AvatarGlyph } from './panel-atoms'
import { kindLabels } from './panel-utils'
import { RunParagraph, timeText } from './panel-message'
import { TimelineItem, type RowDisplay } from './panel-timeline-item'
import { TurnStats } from './turn-stats'
import { TurnProcess, WorkCluster } from './work-cluster'
import type { TurnSegment } from './timeline-groups'

type AsideSegment = Extract<TurnSegment, { kind: 'user' }>

/** 一轮对话：用户消息、插话、助手回复块和统计。 */
export function TurnBlock({ user, asides, head, tail, runAnchor, firstReplyId, live, display, showAsides, onOpenImage, onKill, onAvatarMenu, renderEntry, renderNote, stats }: {
  user: TimelineEntry
  asides: AsideSegment[]
  head: TurnSegment[]
  tail: TurnSegment[]
  runAnchor?: TimelineEntry
  firstReplyId?: string
  live: boolean
  display: RowDisplay
  showAsides: boolean
  onOpenImage: (name: string, url: string) => void
  onKill: () => void
  onAvatarMenu: (event: React.MouseEvent<HTMLElement>) => void
  renderEntry: (entry: TimelineEntry, running: boolean) => ReactNode
  renderNote: (entry: TimelineEntry) => ReactNode
  stats: { entries: TimelineEntry[]; metrics?: TaskMetrics; running: boolean; showMissingUsage: boolean }
}) {
  return <div className="panel-turn">
    {user.divider
      ? <div className="panel-timeline-divider"><span>{user.text.split('\n')[0]}</span></div>
      : <TimelineItem entry={user} display={display} onOpenImage={onOpenImage} onKill={onKill}
          onAvatarMenu={showAsides ? onAvatarMenu : undefined} />}
    {runAnchor && <article className="panel-event panel-event-assistant is-run" data-entry-id={firstReplyId ?? runAnchor.id}
      aria-label={`${kindLabels.assistant}，${timeText(runAnchor.time)}`}>
      <div className="panel-event-avatar" aria-hidden="true" onContextMenu={showAsides ? onAvatarMenu : undefined}>
        <AvatarGlyph kind="assistant" fallback="鲸" name={display.avatars.assistant} presetSrc={display.personaAvatar} />
        {display.showTimestamps && <time className="panel-event-time" dateTime={runAnchor.time}>{timeText(runAnchor.time)}</time>}
        <span className="panel-event-line" />
      </div>
      <div className="panel-event-body">
        {head.length > 0 && <TurnProcess segments={head} renderEntry={renderEntry} renderNote={renderNote}
          renderUser={(entry) => <TimelineItem entry={entry} display={display} onKill={onKill} onOpenImage={onOpenImage} />} />}
        {tail.map((segment, segmentIndex) => segment.kind === 'note'
          ? <RunParagraph key={segment.entry.id} entry={segment.entry} onOpenImage={onOpenImage} />
          : segment.kind === 'work'
            ? <WorkCluster key={segment.id} items={segment.items} running={live && segmentIndex === tail.length - 1} renderEntry={renderEntry} />
            : segment.kind === 'user'
              ? <TimelineItem key={segment.entry.id} entry={segment.entry} display={display} onKill={onKill} onOpenImage={onOpenImage} />
              : null)}
      </div>
    </article>}
    <TurnStats entries={stats.entries} metrics={stats.metrics} running={stats.running} showMissingUsage={stats.showMissingUsage} />
  </div>
}
