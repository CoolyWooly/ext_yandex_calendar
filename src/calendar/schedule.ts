import type { Meeting } from './types';

export interface DaySection {
  /** Локальная дата `YYYY-MM-DD`. */
  key: string;
  /** «Сегодня», «Завтра» или день недели: «Четверг». */
  title: string;
  /** «8 октября». */
  date: string;
  meetings: Meeting[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const weekdayFormat = new Intl.DateTimeFormat('ru', { weekday: 'long' });
const dateFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' });

/**
 * Раскладывает встречи по дням. Закончившиеся отбрасываются, идущие остаются в сегодняшнем дне —
 * отдельного раздела «Сейчас» нет.
 */
export function buildSchedule(meetings: Meeting[], now: number, options: { hideDeclined: boolean }): DaySection[] {
  const visible = meetings
    .filter((meeting) => meeting.end > now || meeting.start >= now)
    .filter((meeting) => !(options.hideDeclined && meeting.myStatus === 'declined'))
    .sort((a, b) => a.start - b.start);

  const today = startOfDay(now);
  const days = new Map<string, DaySection>();

  for (const meeting of visible) {
    // Многодневное событие показываем один раз — в первый видимый день.
    const day = Math.max(startOfDay(meeting.start), today);
    const key = dayKey(day);
    let section = days.get(key);
    if (!section) {
      section = { key, title: dayTitle(day, today), date: dateFormat.format(day), meetings: [] };
      days.set(key, section);
    }
    section.meetings.push(meeting);
  }

  for (const section of days.values()) {
    // События на весь день — наверху дня.
    section.meetings.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start);
  }

  return [...days.values()].sort((a, b) => a.key.localeCompare(b.key));
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

function dayTitle(day: number, today: number): string {
  // Сравниваем по календарным дням, а не по 24 часам: важно при переходе на летнее время.
  const offset = Math.round((day - today) / DAY_MS);
  if (offset === 0) return 'Сегодня';
  if (offset === 1) return 'Завтра';
  const weekday = weekdayFormat.format(day);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}
