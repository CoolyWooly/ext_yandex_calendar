import { describe, expect, it } from 'vitest';
import { type ParseContext, parseCalendarObject, resolveMyStatus } from '../src/calendar/parse';
import week from './fixtures/report-week.xml?raw';
import weekAccepted from './fixtures/report-week-accepted.xml?raw';
import { icsOf, local, vcalendar } from './helpers';

const WEEK = { start: local(2026, 10, 1), end: local(2026, 10, 8) };

function context(overrides: Partial<ParseContext> = {}): ParseContext {
  return { calendarHref: '/cal/', myEmail: 'User@Example.com', inferGroupInvites: true, range: WEEK, ...overrides };
}

describe('parseCalendarObject — real Yandex series', () => {
  it('expands the weekly stand-up into this week, converting from Tashkent time', () => {
    const meetings = parseCalendarObject(icsOf(week), context());

    expect(meetings.map((meeting) => new Date(meeting.start).toISOString())).toEqual([
      '2026-10-01T03:30:00.000Z',
      '2026-10-05T03:30:00.000Z',
    ]);
    expect(meetings[0]).toMatchObject({
      title: 'Стендап Web&App',
      end: Date.parse('2026-10-01T04:00:00Z'),
      allDay: false,
      join: { url: 'https://meet.google.com/abc-defg-hij', provider: 'Google Meet' },
      eventUrl: 'https://calendar.yandex.ru/event?event_id=100000000000001',
      organizer: { name: 'Анна Организатор', email: 'organizer@example.com' },
      attendeeCount: 2,
      recurring: true,
      cancelled: false,
    });
  });

  it('treats a mailing-list invitation without my answer as needing a response', () => {
    const meetings = parseCalendarObject(icsOf(week), context());
    expect(meetings.map((meeting) => meeting.myStatus)).toEqual(['needs-action', 'needs-action']);
  });

  it('does not ask for a response outside the primary calendar', () => {
    const meetings = parseCalendarObject(icsOf(week), context({ inferGroupInvites: false }));
    expect(meetings.map((meeting) => meeting.myStatus)).toEqual(['none', 'none']);
  });

  it('picks up my personal answer once I accepted', () => {
    const meetings = parseCalendarObject(icsOf(weekAccepted), context());
    expect(meetings.map((meeting) => [meeting.myStatus, meeting.attendeeCount])).toEqual([
      ['accepted', 3],
      ['accepted', 3],
    ]);
  });

  it('uses the moved instance instead of the regular slot and keeps its key', () => {
    const range = { start: local(2026, 9, 28), end: local(2026, 9, 29) };
    const [moved] = parseCalendarObject(icsOf(week), context({ range }));
    const regularSlot = Date.parse('2026-09-28T03:30:00Z') / 1000;

    expect(moved).toMatchObject({
      start: Date.parse('2026-09-28T06:00:00Z'),
      eventUrl: 'https://calendar.yandex.ru/event?event_id=100000000000003',
      key: `standup0000000000000001yandex.ru|${regularSlot}`,
    });
  });
});

describe('parseCalendarObject — recurrence edge cases', () => {
  const series = vcalendar(
    `UID:daily
DTSTART:20261001T050000Z
DTEND:20261001T053000Z
RRULE:FREQ=DAILY;COUNT=5
EXDATE:20261002T050000Z
SUMMARY:Ежедневная
ORGANIZER:mailto:user@example.com`,
    `UID:daily
RECURRENCE-ID:20261003T050000Z
DTSTART:20261009T050000Z
DTEND:20261009T053000Z
SUMMARY:Ежедневная (перенесена)
ORGANIZER:mailto:user@example.com`,
    `UID:daily
RECURRENCE-ID:20261004T050000Z
DTSTART:20261004T050000Z
DTEND:20261004T053000Z
STATUS:CANCELLED
SUMMARY:Ежедневная
ORGANIZER:mailto:user@example.com`,
  );

  it('skips excluded dates and instances moved out of the range, keeps cancelled ones', () => {
    const meetings = parseCalendarObject(series, context());

    expect(meetings.map((meeting) => [new Date(meeting.start).toISOString(), meeting.cancelled])).toEqual([
      ['2026-10-01T05:00:00.000Z', false],
      ['2026-10-04T05:00:00.000Z', true],
      ['2026-10-05T05:00:00.000Z', false],
    ]);
    expect(meetings.every((meeting) => meeting.myStatus === 'organizer')).toBe(true);
  });

  it('includes an instance moved into the range from outside it', () => {
    const ics = vcalendar(
      `UID:weekly
DTSTART:20260924T050000Z
DTEND:20260924T060000Z
RRULE:FREQ=WEEKLY;COUNT=2
SUMMARY:Еженедельная`,
      `UID:weekly
RECURRENCE-ID:20260924T050000Z
DTSTART:20261002T050000Z
DTEND:20261002T060000Z
SUMMARY:Еженедельная`,
    );
    const meetings = parseCalendarObject(ics, context());
    expect(meetings.map((meeting) => new Date(meeting.start).toISOString())).toEqual([
      '2026-10-01T05:00:00.000Z',
      '2026-10-02T05:00:00.000Z',
    ]);
  });

  it('reads all-day events as local days', () => {
    const ics = vcalendar(`UID:vacation
DTSTART;VALUE=DATE:20261002
DTEND;VALUE=DATE:20261005
SUMMARY:Отпуск`);
    expect(parseCalendarObject(ics, context())).toEqual([
      expect.objectContaining({
        allDay: true,
        start: local(2026, 10, 2),
        end: local(2026, 10, 5),
        myStatus: 'none',
        recurring: false,
      }),
    ]);
  });

  it('finds a Telemost link in the location and falls back to a default title', () => {
    const ics = vcalendar(`UID:call
DTSTART:20261002T050000Z
DTEND:20261002T060000Z
LOCATION:https://telemost.yandex.ru/j/12345678901234`);
    expect(parseCalendarObject(ics, context())[0]).toMatchObject({
      title: 'Без названия',
      join: { url: 'https://telemost.yandex.ru/j/12345678901234', provider: 'Телемост' },
    });
  });
});

describe('resolveMyStatus', () => {
  const me = 'user@example.com';

  it.each([
    ['organizer', me, [], 'organizer'],
    ['my accepted answer', 'boss@example.com', [{ email: me, partstat: 'ACCEPTED' }], 'accepted'],
    ['my declined answer', 'boss@example.com', [{ email: me, partstat: 'declined' }], 'declined'],
    ['my tentative answer', 'boss@example.com', [{ email: me, partstat: 'TENTATIVE' }], 'tentative'],
    ['not answered personally', 'boss@example.com', [{ email: me, partstat: 'NEEDS-ACTION' }], 'needs-action'],
    ['invited via a mailing list', 'boss@example.com', [{ email: 'team@example.com', partstat: 'NEEDS-ACTION' }], 'needs-action'],
    ['personal event', null, [], 'none'],
  ] as const)('%s', (_name, organizer, attendees, expected) => {
    expect(resolveMyStatus(organizer, [...attendees], ' User@Example.com ', true)).toBe(expected);
  });
});
