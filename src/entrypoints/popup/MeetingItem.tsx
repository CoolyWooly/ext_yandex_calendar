import type { Highlight, HighlightKind } from '../../calendar/highlights';
import { calendarUrlFor } from '../../calendar/links';
import type { Meeting, MyStatus } from '../../calendar/types';
import {
  describeTimeColumn,
  formatDay,
  formatDuration,
  formatPreviousTime,
  formatTimeRange,
  plural,
} from '../../ui/format';
import { VideoIcon } from '../../ui/icons';

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
/** До скольких часов вперёд у главной встречи показывается отсчёт. */
const FEATURED_COUNTDOWN = 24 * 60 * 60_000;

interface Props {
  meeting: Meeting;
  /** Непросмотренное изменение этой встречи. */
  highlight?: Highlight;
  color: string;
  /** Текущая или ближайшая встреча: крупная карточка наверху списка. */
  featured?: boolean;
  now: number;
  onOpen: (url: string) => void;
}

export function MeetingItem({ meeting, highlight, color, featured = false, now, onOpen }: Props) {
  const inProgress = !meeting.allDay && meeting.start <= now;
  const startsIn = meeting.start - now;
  const soon = !inProgress && startsIn > 0 && startsIn <= SOON;
  const calendarUrl = calendarUrlFor(meeting);
  const time = describeTimeColumn(meeting);

  const statusChip = meeting.cancelled ? { label: 'отменена', tone: 'danger' } : STATUS_CHIPS[meeting.myStatus];
  const chips = [
    highlight && !meeting.cancelled && { label: HIGHLIGHT_LABELS[highlight.kind], tone: 'accent' },
    statusChip,
  ].filter((chip): chip is { label: string; tone: string } => Boolean(chip));

  const details = [
    meeting.location && !/^https?:\/\//i.test(meeting.location) && meeting.location,
    meeting.myStatus === 'organizer'
      ? 'вы организатор'
      : meeting.organizer && (meeting.organizer.name ?? meeting.organizer.email),
    meeting.attendeeCount > 1 &&
      `${meeting.attendeeCount} ${plural(meeting.attendeeCount, ['участник', 'участника', 'участников'])}`,
  ];
  const previously = highlight?.previousStart != null && `было ${formatPreviousTime(highlight.previousStart, meeting.start)}`;

  const classes = [
    'meeting',
    featured && 'featured',
    featured && inProgress && 'live',
    meeting.cancelled && 'cancelled',
    meeting.myStatus === 'declined' && 'declined',
    highlight && !meeting.cancelled && 'highlighted',
    soon && 'soon',
  ]
    .filter(Boolean)
    .join(' ');

  const open = {
    tabIndex: 0,
    title: 'Открыть в Яндекс Календаре',
    onClick: () => onOpen(calendarUrl),
    onKeyDown: (event: KeyboardEvent) => event.key === 'Enter' && onOpen(calendarUrl),
  };

  const joinButton = meeting.join && !meeting.cancelled && (
    <button
      class={`button join${featured || inProgress || soon ? ' primary' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(meeting.join!.url);
      }}
    >
      <VideoIcon size={featured ? 16 : 14} />
      Войти · {meeting.join.provider}
    </button>
  );

  const chipList = chips.length > 0 && (
    <div class="chips">
      {chips.map((chip) => (
        <span key={chip.label} class={`chip ${chip.tone}`}>
          {chip.label}
        </span>
      ))}
    </div>
  );

  if (featured) {
    const countdown = inProgress
      ? `ещё ${formatDuration(meeting.end - now)}`
      : startsIn <= FEATURED_COUNTDOWN && `через ${formatDuration(startsIn)}`;
    const progress = inProgress ? Math.min(1, (now - meeting.start) / (meeting.end - meeting.start)) : 0;
    const meta = [previously, ...details].filter((part): part is string => Boolean(part));

    return (
      <article class={classes} {...open}>
        <div class="featured-head">
          <span class="featured-label">
            {inProgress && <span class="live-dot" aria-hidden="true" />}
            {inProgress ? 'Идёт сейчас' : 'Следующая встреча'}
          </span>
          {countdown && <span class="countdown">{countdown}</span>}
        </div>
        <div class="featured-title">{meeting.title}</div>
        <div class="featured-time">
          {inProgress ? formatTimeRange(meeting) : `${formatDay(meeting.start, now)}, ${formatTimeRange(meeting)}`}
        </div>
        {meta.length > 0 && <div class="meeting-meta">{meta.join(' · ')}</div>}
        {chipList}
        {inProgress && (
          <div class="progress" aria-hidden="true">
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        {joinButton}
      </article>
    );
  }

  const meta = [
    time.until,
    previously,
    inProgress && `идёт ещё ${formatDuration(meeting.end - now)}`,
    !inProgress && !meeting.allDay && startsIn > 0 && startsIn <= SHOW_COUNTDOWN && `через ${formatDuration(startsIn)}`,
    ...details,
  ].filter((part): part is string => Boolean(part));

  return (
    <article class={classes} {...open}>
      <span class="meeting-bar" style={{ background: color }} aria-hidden="true" />
      <div class={`meeting-when${meeting.allDay ? ' all-day' : ''}`}>
        <span class="when-start">{time.start}</span>
        {time.end && <span class="when-end">{time.end}</span>}
      </div>
      <div class="meeting-body">
        {chipList}
        <div class="meeting-title">{meeting.title}</div>
        {meta.length > 0 && <div class="meeting-meta">{meta.join(' · ')}</div>}
        {joinButton}
      </div>
    </article>
  );
}
