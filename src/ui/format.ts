import type { Meeting } from '../calendar/types';

const MINUTE = 60_000;

const timeFormat = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });
const shortDayFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });
const weekdayFormat = new Intl.DateTimeFormat('ru', { weekday: 'short' });

export function formatTime(timestamp: number): string {
  return timeFormat.format(timestamp);
}

/** «08:30–09:00», «Весь день», «до 3 окт.». */
export function formatTimeRange(meeting: Meeting): string {
  if (meeting.allDay) {
    const lastDay = meeting.end - 1;
    return sameDay(meeting.start, lastDay) ? 'Весь день' : `Весь день, до ${shortDayFormat.format(lastDay)}`;
  }
  if (!sameDay(meeting.start, meeting.end - 1)) {
    return `${formatTime(meeting.start)} – ${shortDayFormat.format(meeting.end)}, ${formatTime(meeting.end)}`;
  }
  return `${formatTime(meeting.start)}–${formatTime(meeting.end)}`;
}

export interface TimeColumn {
  /** «08:30» или «весь день». */
  start: string;
  /** «09:00»; у событий на весь день нет. */
  end: string | null;
  /** Многодневное событие: «до 3 окт.». */
  until: string | null;
}

/** Время для колонки слева в списке встреч. */
export function describeTimeColumn(meeting: Meeting): TimeColumn {
  const lastMoment = meeting.end - 1;
  const until = sameDay(meeting.start, lastMoment) ? null : `до ${shortDayFormat.format(lastMoment)}`;
  if (meeting.allDay) return { start: 'весь день', end: null, until };
  return { start: formatTime(meeting.start), end: formatTime(meeting.end), until };
}

/** «12 мин», «1 ч», «1 ч 20 мин». */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / MINUTE));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  return minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`;
}

/** Когда встреча относительно `now`, для подсказки значка: «через 15 мин», «завтра в 10:00». */
export function formatWhen(start: number, now: number): string {
  if (sameDay(start, now)) {
    return start - now <= 3 * 60 * MINUTE ? `через ${formatDuration(start - now)}` : `сегодня в ${formatTime(start)}`;
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(start, tomorrow.getTime())) return `завтра в ${formatTime(start)}`;
  return `${weekdayFormat.format(start)}, ${shortDayFormat.format(start)} в ${formatTime(start)}`;
}

/** День относительно `now`: «Сегодня», «Завтра», «Пт, 9 окт.». */
export function formatDay(timestamp: number, now: number): string {
  if (sameDay(timestamp, now)) return 'Сегодня';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(timestamp, tomorrow.getTime())) return 'Завтра';
  return capitalize(`${weekdayFormat.format(timestamp)}, ${shortDayFormat.format(timestamp)}`);
}

/** Прежнее время перенесённой встречи: «08:30», если день тот же, иначе «пн, 5 окт., 08:30». */
export function formatPreviousTime(previous: number, current: number): string {
  if (sameDay(previous, current)) return formatTime(previous);
  return `${weekdayFormat.format(previous)}, ${shortDayFormat.format(previous)}, ${formatTime(previous)}`;
}

/** «только что», «5 мин назад», «в 10:42». */
export function formatAgo(timestamp: number, now: number): string {
  const elapsed = now - timestamp;
  if (elapsed < MINUTE) return 'только что';
  if (elapsed < 60 * MINUTE) return `${Math.floor(elapsed / MINUTE)} мин назад`;
  return sameDay(timestamp, now) ? `в ${formatTime(timestamp)}` : `${shortDayFormat.format(timestamp)} в ${formatTime(timestamp)}`;
}

/** Русское множественное число: plural(5, ['участник', 'участника', 'участников']). */
export function plural(count: number, forms: [one: string, few: string, many: string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sameDay(a: number, b: number): boolean {
  const left = new Date(a);
  const right = new Date(b);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
