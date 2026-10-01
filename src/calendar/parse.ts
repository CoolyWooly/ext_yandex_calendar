import ICAL from 'ical.js';
import { findJoinLink } from './links';
import type { Meeting, MyStatus, TimeRange } from './types';

export interface ParseContext {
  calendarHref: string;
  myEmail: string;
  /**
   * Считать «нужно ответить» приглашения через рассылку: Яндекс не добавляет меня в ATTENDEE,
   * пока я не отвечу. Только для основного календаря — в календаре переговорки чужие брони
   * выглядят так же.
   */
  inferGroupInvites: boolean;
  range: TimeRange;
}

// Защита от бесконечных серий: ежедневная встреча за 20 лет — около 7300 повторений.
const MAX_OCCURRENCES = 10_000;

const PARTSTAT_STATUS: Record<string, MyStatus> = {
  ACCEPTED: 'accepted',
  TENTATIVE: 'tentative',
  DECLINED: 'declined',
  'NEEDS-ACTION': 'needs-action',
};

/** Разбирает один календарный объект (ICS) в экземпляры встреч, попадающие в `range`. */
export function parseCalendarObject(ics: string, ctx: ParseContext): Meeting[] {
  const root = new ICAL.Component(ICAL.parse(ics));
  // Часовые пояса регистрируем до чтения дат, иначе время с TZID считается «плавающим».
  for (const timezone of root.getAllSubcomponents('vtimezone')) {
    ICAL.TimezoneService.register(timezone);
  }

  const events = root.getAllSubcomponents('vevent').map((component) => new ICAL.Event(component));
  const exceptions = events.filter((event) => event.isRecurrenceException());
  const meetings: Meeting[] = [];

  for (const event of events) {
    if (event.isRecurrenceException()) continue;
    if (!event.isRecurring()) {
      pushIfInRange(meetings, event, event.startDate, event.endDate, null, ctx);
      continue;
    }

    // Перенесённые экземпляры берём из их собственных VEVENT ниже, здесь пропускаем.
    const overridden = new Set(
      exceptions.filter((exception) => exception.uid === event.uid).map((exception) => exception.recurrenceId.toUnixTime()),
    );
    const iterator = event.iterator();
    for (let count = 0, next = iterator.next(); next && count < MAX_OCCURRENCES; next = iterator.next(), count++) {
      if (toMillis(next) >= ctx.range.end) break;
      if (overridden.has(next.toUnixTime())) continue;
      const details = event.getOccurrenceDetails(next);
      pushIfInRange(meetings, event, details.startDate, details.endDate, details.recurrenceId, ctx);
    }
  }

  for (const exception of exceptions) {
    pushIfInRange(meetings, exception, exception.startDate, exception.endDate, exception.recurrenceId, ctx);
  }

  return meetings.sort((a, b) => a.start - b.start);
}

export function resolveMyStatus(
  organizerEmail: string | null,
  attendees: Array<{ email: string; partstat: string }>,
  myEmail: string,
  inferGroupInvites: boolean,
): MyStatus {
  const me = myEmail.trim().toLowerCase();
  if (organizerEmail === me) return 'organizer';
  const mine = attendees.find((attendee) => attendee.email === me);
  if (mine) return PARTSTAT_STATUS[mine.partstat.toUpperCase()] ?? 'none';
  // Без организатора — личное событие. С чужим организатором и без меня в списке —
  // приглашение через рассылку, на которое я ещё не ответил.
  if (!organizerEmail) return 'none';
  return inferGroupInvites ? 'needs-action' : 'none';
}

function pushIfInRange(
  meetings: Meeting[],
  event: ICAL.Event,
  start: ICAL.Time,
  end: ICAL.Time,
  recurrenceId: ICAL.Time | null,
  ctx: ParseContext,
) {
  const startMs = toMillis(start);
  // Событие без длительности (DTEND = DTSTART) всё равно показываем.
  const endMs = Math.max(toMillis(end), startMs);
  if (startMs >= ctx.range.end || (endMs <= ctx.range.start && startMs < ctx.range.start)) return;
  meetings.push(toMeeting(event, startMs, endMs, start.isDate, recurrenceId, ctx));
}

function toMeeting(
  event: ICAL.Event,
  start: number,
  end: number,
  allDay: boolean,
  recurrenceId: ICAL.Time | null,
  ctx: ParseContext,
): Meeting {
  const component = event.component;
  const organizerProperty = component.getFirstProperty('organizer');
  const organizerEmail = organizerProperty ? emailOf(organizerProperty.getFirstValue()) : null;
  const attendees = component.getAllProperties('attendee').map((property) => ({
    email: emailOf(property.getFirstValue()),
    partstat: String(property.getParameter('partstat') ?? 'NEEDS-ACTION'),
  }));
  const url = stringValue(component.getFirstPropertyValue('url'));
  const location = event.location?.trim() || null;

  return {
    key: `${event.uid}|${recurrenceId ? recurrenceId.toUnixTime() : ''}`,
    uid: event.uid,
    calendarHref: ctx.calendarHref,
    title: event.summary?.trim() || 'Без названия',
    start,
    end,
    allDay,
    location,
    join: findJoinLink([
      location,
      event.description,
      url,
      ...component.getAllProperties('conference').map((property) => stringValue(property.getFirstValue())),
    ]),
    eventUrl: url && /^https:\/\/calendar\.yandex\.[a-z]+\//i.test(url) ? url : null,
    organizer: organizerEmail
      ? { name: stringValue(organizerProperty?.getParameter('cn')) || null, email: organizerEmail }
      : null,
    attendeeCount: attendees.length,
    myStatus: resolveMyStatus(organizerEmail, attendees, ctx.myEmail, ctx.inferGroupInvites),
    cancelled: String(component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED',
    recurring: recurrenceId !== null,
    modifiedAt: timeValue(component.getFirstPropertyValue('last-modified')),
  };
}

function timeValue(value: unknown): number | null {
  return value instanceof ICAL.Time ? toMillis(value) : null;
}

function toMillis(time: ICAL.Time): number {
  return time.toJSDate().getTime();
}

function emailOf(value: unknown): string {
  return stringValue(value).replace(/^mailto:/i, '').trim().toLowerCase();
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}
