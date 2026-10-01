/**
 * Демо-данные для картинок магазина. Все имена, адреса и ссылки вымышленные.
 * Время локальное: вторник, 6 октября 2026, 10:48 — до планёрки 12 минут.
 */
import type { CalendarInfo } from '../../src/caldav/client';
import type { Meeting } from '../../src/calendar/types';
import {
  type Account,
  DEFAULT_PREFERENCES,
  EMPTY_SNAPSHOT,
  type InboxEntry,
  type Preferences,
  type Snapshot,
} from '../../src/storage/store';

export const NOW = new Date(2026, 9, 6, 10, 48).getTime();

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();

const MY = '/calendars/demo%40company.ru/events-1/';
const TEAM = '/calendars/demo%40company.ru/events-2/';

export const CALENDARS: CalendarInfo[] = [
  { href: MY, name: 'Мои события', ctag: '1', color: '#5b6cff', kind: 'events' },
  { href: TEAM, name: 'Команда продукта', ctag: '1', color: '#12b886', kind: 'events' },
  { href: '/calendars/demo%40company.ru/events-3/', name: 'Переговорка «Байконур»', ctag: '1', color: '#f59f00', kind: 'events' },
  { href: '/calendars/demo%40company.ru/todo-1/', name: 'Не забыть', ctag: '1', color: null, kind: 'tasks' },
];

export const ACCOUNT: Account = {
  login: 'ivan.petrov@company.ru',
  appPassword: 'demo',
  calendars: CALENDARS,
  verifiedAt: at(5, 9, 12),
};

export const PREFERENCES: Preferences = { ...DEFAULT_PREFERENCES, selectedCalendars: [MY, TEAM] };

const telemost = { url: 'https://telemost.yandex.ru/j/00000000000000', provider: 'Телемост' };

function meeting(uid: string, fields: Partial<Meeting> & Pick<Meeting, 'title' | 'start' | 'end'>): Meeting {
  return {
    key: uid,
    uid,
    calendarHref: TEAM,
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
    ...fields,
  };
}

export const STANDUP = meeting('standup', {
  title: 'Планёрка команды продукта',
  start: at(6, 11),
  end: at(6, 11, 30),
  join: telemost,
  organizer: { name: 'Анна Смирнова', email: 'anna@company.ru' },
  attendeeCount: 8,
  recurring: true,
});

const LUNCH = meeting('lunch', {
  title: 'Обед с партнёрами',
  calendarHref: MY,
  start: at(6, 13),
  end: at(6, 14),
  location: 'Кафе «Огни»',
  myStatus: 'organizer',
  organizer: { name: 'Иван Петров', email: 'ivan.petrov@company.ru' },
  attendeeCount: 4,
});

export const REVIEW = meeting('review', {
  title: 'Дизайн-ревью: новый онбординг',
  start: at(6, 15, 30),
  end: at(6, 16, 15),
  join: { url: 'https://meet.google.com/abc-defg-hij', provider: 'Google Meet' },
  organizer: { name: 'Мария Волкова', email: 'maria@company.ru' },
  attendeeCount: 6,
});

export const ONE_ON_ONE = meeting('one-on-one', {
  title: '1:1 с руководителем',
  calendarHref: MY,
  start: at(6, 12),
  end: at(6, 12, 30),
  join: telemost,
  organizer: { name: 'Сергей Орлов', email: 'sergey@company.ru' },
  attendeeCount: 2,
});

const CONFERENCE = meeting('conference', {
  title: 'Product Camp 2026',
  calendarHref: MY,
  start: at(7, 0),
  end: at(8, 0),
  allDay: true,
  myStatus: 'none',
});

export const RETRO = meeting('retro', {
  title: 'Ретроспектива спринта',
  start: at(7, 10),
  end: at(7, 11),
  join: telemost,
  organizer: { name: 'Ольга Кузнецова', email: 'olga@company.ru' },
  attendeeCount: 12,
  myStatus: 'needs-action',
});

const CLIENT_CALL = meeting('client', {
  title: 'Созвон с клиентом: итоги пилота',
  calendarHref: MY,
  start: at(7, 12, 30),
  end: at(7, 13, 15),
  join: { url: 'https://us02web.zoom.us/j/0000000000', provider: 'Zoom' },
  myStatus: 'organizer',
  organizer: { name: 'Иван Петров', email: 'ivan.petrov@company.ru' },
  attendeeCount: 5,
});

const DEMO_DAY = meeting('demo-day', {
  title: 'Демо спринта для заказчика',
  start: at(8, 14),
  end: at(8, 15),
  join: telemost,
  organizer: { name: 'Анна Смирнова', email: 'anna@company.ru' },
  attendeeCount: 15,
});

export const MEETINGS = [STANDUP, ONE_ON_ONE, LUNCH, REVIEW, CONFERENCE, RETRO, CLIENT_CALL, DEMO_DAY];

export const SNAPSHOT: Snapshot = {
  ...EMPTY_SNAPSHOT,
  login: ACCOUNT.login,
  meetings: MEETINGS,
  range: { start: at(6, 0), end: at(13, 0) },
  syncedAt: NOW,
};

/** Встреча, которую отменили: в списке она зачёркнута, пока его не открыли. */
const CANCELLED = meeting('marketing', {
  title: 'Синк по маркетингу',
  start: at(6, 14, 30),
  end: at(6, 15),
  organizer: { name: 'Дмитрий Лебедев', email: 'dmitry@company.ru' },
  attendeeCount: 5,
});

/** Непросмотренные изменения: новая встреча, перенос и отмена. */
export const INBOX: InboxEntry[] = [
  { kind: 'new', uid: REVIEW.uid, instances: [{ meeting: REVIEW, previous: null }], at: NOW - 20 * 60_000 },
  {
    kind: 'changed',
    uid: ONE_ON_ONE.uid,
    instances: [{ meeting: ONE_ON_ONE, previous: { ...ONE_ON_ONE, start: at(6, 16), end: at(6, 16, 30) } }],
    at: NOW - 15 * 60_000,
  },
  {
    kind: 'cancelled',
    uid: CANCELLED.uid,
    instances: [{ meeting: CANCELLED, previous: CANCELLED }],
    at: NOW - 5 * 60_000,
  },
];
