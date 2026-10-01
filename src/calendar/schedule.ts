import type { Meeting } from './types';

export interface DaySection {
  /** Локальная дата `YYYY-MM-DD`. */
  key: string;
  label: string;
  meetings: Meeting[];
}

export interface Schedule {
  /** Идут прямо сейчас. */
  now: Meeting[];
  days: DaySection[];
  /** Сколько разных встреч (серия считается один раз) ждут моего ответа. */
  needsResponse: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const dayFormat = new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long' });

/** Раскладывает встречи по «Сейчас» и дням. Закончившиеся отбрасываются. */
export function buildSchedule(meetings: Meeting[], now: number, options: { hideDeclined: boolean }): Schedule {
  const visible = meetings
    .filter((meeting) => meeting.end > now || meeting.start >= now)
    .filter((meeting) => !(options.hideDeclined && meeting.myStatus === 'declined'))
    .sort((a, b) => a.start - b.start);

  const today = startOfDay(now);
  const days = new Map<string, DaySection>();
  const happeningNow: Meeting[] = [];

  for (const meeting of visible) {
    if (!meeting.allDay && meeting.start <= now) {
      happeningNow.push(meeting);
      continue;
    }
    // Многодневное событие показываем один раз — в первый видимый день.
    const day = Math.max(startOfDay(meeting.start), today);
    const key = dayKey(day);
    let section = days.get(key);
    if (!section) {
      section = { key, label: dayLabel(day, today), meetings: [] };
      days.set(key, section);
    }
    section.meetings.push(meeting);
  }

  for (const section of days.values()) {
    // События на весь день — наверху дня.
    section.meetings.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start);
  }

  const pending = visible.filter((meeting) => meeting.myStatus === 'needs-action' && !meeting.cancelled);
  return {
    now: happeningNow,
    days: [...days.values()].sort((a, b) => a.key.localeCompare(b.key)),
    needsResponse: new Set(pending.map((meeting) => meeting.uid)).size,
  };
}

/**
 * Встреча в моих планах: не отменена, не отклонена и не чужая бронь переговорки
 * (чужой организатор, а меня среди участников нет). Личные события без организатора — мои.
 */
export function isOnMyAgenda(meeting: Meeting): boolean {
  if (meeting.cancelled || meeting.myStatus === 'declined') return false;
  return !(meeting.myStatus === 'none' && meeting.organizer !== null);
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function addDays(dayStart: number, days: number): number {
  const date = new Date(dayStart);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days).getTime();
}

export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayLabel(day: number, today: number): string {
  const text = dayFormat.format(day);
  // Сравниваем по календарным дням, а не по 24 часам: важно при переходе на летнее время.
  const offset = Math.round((day - today) / DAY_MS);
  if (offset === 0) return `Сегодня · ${text}`;
  if (offset === 1) return `Завтра · ${text}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
