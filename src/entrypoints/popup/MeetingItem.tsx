import type { Highlight, HighlightKind } from '../../calendar/highlights';
import { calendarUrlFor } from '../../calendar/links';
import type { Meeting, MyStatus } from '../../calendar/types';
import { formatDuration, formatPreviousTime, formatTimeRange, plural } from '../../ui/format';

const STATUS_CHIPS: Partial<Record<MyStatus, { label: string; tone: string }>> = {
  'needs-action': { label: 'нужно ответить', tone: 'warning' },
  tentative: { label: 'под вопросом', tone: 'muted' },
  declined: { label: 'отклонена', tone: 'muted' },
};

const HIGHLIGHT_LABELS: Record<HighlightKind, string> = {
  new: 'новая',
  moved: 'перенесена',
  changed: 'изменена',
};

const SOON = 15 * 60_000;
const SHOW_COUNTDOWN = 3 * 60 * 60_000;

interface Props {
  meeting: Meeting;
  /** Непросмотренное изменение этой встречи. */
  highlight?: Highlight;
  color: string;
  now: number;
  onOpen: (url: string) => void;
}

export function MeetingItem({ meeting, highlight, color, now, onOpen }: Props) {
  const inProgress = !meeting.allDay && meeting.start <= now;
  const startsIn = meeting.start - now;
  const chip = meeting.cancelled ? { label: 'отменена', tone: 'danger' } : STATUS_CHIPS[meeting.myStatus];
  const calendarUrl = calendarUrlFor(meeting);

  const meta = [
    highlight?.previousStart != null && `было ${formatPreviousTime(highlight.previousStart, meeting.start)}`,
    inProgress && `идёт ещё ${formatDuration(meeting.end - now)}`,
    !inProgress && !meeting.allDay && startsIn > 0 && startsIn <= SHOW_COUNTDOWN && `через ${formatDuration(startsIn)}`,
    meeting.location && !/^https?:\/\//i.test(meeting.location) && meeting.location,
    meeting.myStatus === 'organizer'
      ? 'вы организатор'
      : meeting.organizer && (meeting.organizer.name ?? meeting.organizer.email),
    meeting.attendeeCount > 1 &&
      `${meeting.attendeeCount} ${plural(meeting.attendeeCount, ['участник', 'участника', 'участников'])}`,
  ].filter((part): part is string => Boolean(part));

  const classes = [
    'meeting',
    meeting.cancelled && 'cancelled',
    meeting.myStatus === 'declined' && 'declined',
    highlight && !meeting.cancelled && 'highlighted',
    !inProgress && startsIn > 0 && startsIn <= SOON && 'soon',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      class={classes}
      tabIndex={0}
      title="Открыть в Яндекс Календаре"
      onClick={() => onOpen(calendarUrl)}
      onKeyDown={(event) => event.key === 'Enter' && onOpen(calendarUrl)}
    >
      <span class="meeting-bar" style={{ background: color }} aria-hidden="true" />
      <div class="meeting-body">
        <div class="meeting-top">
          <span class="meeting-time">{formatTimeRange(meeting)}</span>
          {highlight && !meeting.cancelled && <span class="chip accent">{HIGHLIGHT_LABELS[highlight.kind]}</span>}
          {chip && <span class={`chip ${chip.tone}`}>{chip.label}</span>}
        </div>
        <div class="meeting-title">{meeting.title}</div>
        {meta.length > 0 && <div class="meeting-meta">{meta.join(' · ')}</div>}
        {meeting.join && !meeting.cancelled && (
          <button
            class={`button small${inProgress || startsIn <= SOON ? ' primary' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(meeting.join!.url);
            }}
          >
            Войти · {meeting.join.provider}
          </button>
        )}
      </div>
    </article>
  );
}
