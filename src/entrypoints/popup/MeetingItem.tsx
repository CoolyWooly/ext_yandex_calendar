import type { Highlight, HighlightKind } from '../../calendar/highlights';
import { calendarUrlFor } from '../../calendar/links';
import { isOnMyAgenda } from '../../calendar/schedule';
import type { Meeting, MyStatus } from '../../calendar/types';
import { describeTimeColumn, formatDuration, formatPreviousTime, plural } from '../../ui/format';
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
  // Цветом торопим только на свои встречи: отменённая, отклонённая и чужая бронь переговорки подождут.
  const mine = isOnMyAgenda(meeting);
  const live = mine && inProgress;
  const soon = mine && !meeting.allDay && !inProgress && startsIn > 0 && startsIn <= SOON;
  const calendarUrl = calendarUrlFor(meeting);
  const time = describeTimeColumn(meeting);

  const statusChip = meeting.cancelled ? { label: 'отменена', tone: 'danger' } : STATUS_CHIPS[meeting.myStatus];
  const chips = [
    highlight && !meeting.cancelled && { label: HIGHLIGHT_LABELS[highlight.kind], tone: 'accent' },
    statusChip,
  ].filter((chip): chip is { label: string; tone: string } => Boolean(chip));

  const countdown = inProgress
    ? `идёт ещё ${formatDuration(meeting.end - now)}`
    : !meeting.allDay && startsIn > 0 && startsIn <= SHOW_COUNTDOWN && `через ${formatDuration(startsIn)}`;
  const accent = live ? 'live' : soon ? 'soon' : null;
  const meta = [
    countdown,
    time.until,
    highlight?.previousStart != null && `было ${formatPreviousTime(highlight.previousStart, meeting.start)}`,
    meeting.location && !/^https?:\/\//i.test(meeting.location) && meeting.location,
    meeting.myStatus === 'organizer'
      ? 'вы организатор'
      : meeting.organizer && (meeting.organizer.name ?? meeting.organizer.email),
    meeting.attendeeCount > 1 &&
      `${meeting.attendeeCount} ${plural(meeting.attendeeCount, ['участник', 'участника', 'участников'])}`,
  ].filter((part): part is string => Boolean(part));
  // Отсчёт срочной встречи — первым и цветом, остальное — обычной серой строкой.
  const rest = (accent ? meta.slice(1) : meta).join(' · ');

  const classes = [
    'meeting',
    live && 'live',
    soon && 'soon',
    meeting.cancelled && 'cancelled',
    meeting.myStatus === 'declined' && 'declined',
    highlight && !meeting.cancelled && 'highlighted',
  ]
    .filter(Boolean)
    .join(' ');

  const joinLabel = meeting.join ? `Войти · ${meeting.join.provider}` : undefined;

  return (
    <article
      class={classes}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: карточка открывает встречу по Enter; role="button" не годится — внутри кнопка входа
      tabIndex={0}
      title="Открыть в Яндекс Календаре"
      onClick={() => onOpen(calendarUrl)}
      onKeyDown={(event: KeyboardEvent) => event.key === 'Enter' && onOpen(calendarUrl)}
    >
      <span class="meeting-bar" style={{ background: color }} aria-hidden="true" />
      <div class={`meeting-when${meeting.allDay ? ' all-day' : ''}`}>
        <span class="when-start">{time.start}</span>
        {time.end && <span class="when-end">{time.end}</span>}
      </div>
      <div class="meeting-body">
        {chips.length > 0 && (
          <div class="chips">
            {chips.map((chip) => (
              <span key={chip.label} class={`chip ${chip.tone}`}>
                {chip.label}
              </span>
            ))}
          </div>
        )}
        <div class="meeting-title">{meeting.title}</div>
        {meta.length > 0 && (
          <div class="meeting-meta">
            {accent && (
              <span class={`meta-${accent}`}>
                {live && <span class="live-dot" aria-hidden="true" />}
                {countdown}
              </span>
            )}
            {accent && rest && ' · '}
            {rest}
          </div>
        )}
      </div>
      {meeting.join && !meeting.cancelled && (
        <button
          type="button"
          class={`join-icon${live || soon ? ' primary' : ''}`}
          title={joinLabel}
          aria-label={joinLabel}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(meeting.join!.url);
          }}
        >
          <VideoIcon />
        </button>
      )}
    </article>
  );
}
