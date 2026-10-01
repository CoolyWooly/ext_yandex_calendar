import { parseMultistatus, textOf } from '../src/caldav/multistatus';
import type { Meeting } from '../src/calendar/types';

/** ICS первого объекта из ответа REPORT. */
export function icsOf(reportXml: string): string {
  return textOf(parseMultistatus(reportXml)[0]!.props['calendar-data']);
}

/** Минимальный VCALENDAR из VEVENT-ов. */
export function vcalendar(...events: string[]): string {
  const body = events.map((event) => `BEGIN:VEVENT\n${event.trim()}\nEND:VEVENT`).join('\n');
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:test\n${body}\nEND:VCALENDAR`;
}

/** Локальное время в часовом поясе тестов: local(2026, 10, 1, 8, 30). */
export function local(year: number, month: number, day: number, hour = 0, minute = 0): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

export function meeting(overrides: Partial<Meeting>): Meeting {
  return {
    key: overrides.uid ?? 'm',
    uid: 'm',
    calendarHref: '/cal/',
    title: 'Встреча',
    start: 0,
    end: 0,
    allDay: false,
    location: null,
    join: null,
    eventUrl: null,
    organizer: null,
    attendeeCount: 0,
    myStatus: 'accepted',
    cancelled: false,
    recurring: false,
    modifiedAt: null,
    ...overrides,
  };
}
