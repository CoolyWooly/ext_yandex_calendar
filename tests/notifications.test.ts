import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { MeetingChange } from '../src/calendar/diff';
import type { Meeting } from '../src/calendar/types';
import { DEFAULT_PREFERENCES, EMPTY_SNAPSHOT } from '../src/storage/store';
import {
  clearFinishedReminders,
  describeChange,
  describeChanges,
  describeDigest,
  describeReminder,
  handleNotificationClick,
  showNotifications,
} from '../src/ui/notifications';
import { local, meeting } from './helpers';

const NOW = local(2026, 10, 1, 9, 0);
const TOMORROW_10 = local(2026, 10, 2, 10, 0);
const HOUR = 60 * 60_000;

const base = meeting({
  uid: 'review',
  key: 'review|1',
  title: 'Ревью дизайна',
  start: TOMORROW_10,
  end: TOMORROW_10 + HOUR,
  eventUrl: 'https://calendar.yandex.ru/event?event_id=1',
  organizer: { name: 'Анна Организатор', email: 'anna@example.com' },
});

const change = (kind: MeetingChange['kind'], ...pairs: Array<[Meeting, Meeting | null]>): MeetingChange => ({
  kind,
  uid: pairs[0]![0].uid,
  instances: pairs.map(([current, previous]) => ({ meeting: current, previous })),
});

describe('describeChange', () => {
  it('announces an invitation that needs an answer', () => {
    const invite = { ...base, myStatus: 'needs-action' as const };
    expect(describeChange(change('new', [invite, null]), NOW)).toEqual({
      id: `new:review:${NOW}`,
      title: '❓ Вас пригласили: Ревью дизайна',
      message: 'Завтра в 10:00 · Анна Организатор',
      contextMessage: 'Нужно ответить в календаре',
      url: 'https://calendar.yandex.ru/event?event_id=1',
      buttons: [{ title: 'Открыть в календаре', url: 'https://calendar.yandex.ru/event?event_id=1' }],
      requireInteraction: false,
    });
  });

  it('announces a new recurring meeting I organise without naming myself', () => {
    const mine = { ...base, recurring: true, myStatus: 'organizer' as const };
    expect(describeChange(change('new', [mine, null]), NOW)).toMatchObject({
      title: '📅 Новая регулярная встреча: Ревью дизайна',
      message: 'Завтра в 10:00',
    });
  });

  it('shows the old and new time of a moved meeting', () => {
    const moved = { ...base, start: TOMORROW_10 + 1.5 * HOUR, end: TOMORROW_10 + 2.5 * HOUR };
    expect(describeChange(change('changed', [moved, base]), NOW)).toMatchObject({
      title: '✏️ Встреча перенесена: Ревью дизайна',
      message: 'было завтра в 10:00 → стало завтра в 11:30',
    });
  });

  it('mentions a new end time when only the end moved', () => {
    const longer = { ...base, end: TOMORROW_10 + 1.5 * HOUR };
    expect(describeChange(change('changed', [longer, base]), NOW).message).toBe('Завтра в 10:00 · теперь до 11:30');
  });

  it('lists changed details', () => {
    const relocated = { ...base, location: 'Переговорка 3', title: 'Ревью дизайна v2' };
    expect(describeChange(change('changed', [relocated, base]), NOW)).toMatchObject({
      title: '✏️ Встреча изменена: Ревью дизайна v2',
      message: 'было «Ревью дизайна» · место: Переговорка 3 · Завтра в 10:00',
    });
  });

  it('summarises a cancelled series', () => {
    const instances = [0, 7, 14].map((days): [Meeting, Meeting] => {
      const item = { ...base, key: `review|${days}`, start: TOMORROW_10 + days * 24 * HOUR };
      return [{ ...item, cancelled: true }, item];
    });
    expect(describeChange(change('cancelled', ...instances), NOW)).toMatchObject({
      title: '❌ Отменена регулярная встреча: Ревью дизайна',
      message: 'Завтра в 10:00 и ещё 2 повторения',
    });
  });

  it('offers to join a call that starts within the hour', () => {
    const soon = {
      ...base,
      start: NOW + 20 * 60_000,
      end: NOW + HOUR,
      join: { url: 'https://telemost.yandex.ru/j/1', provider: 'Телемост' },
    };
    expect(describeChange(change('new', [soon, null]), NOW).buttons).toEqual([
      { title: 'Присоединиться · Телемост', url: 'https://telemost.yandex.ru/j/1' },
      { title: 'Открыть в календаре', url: 'https://calendar.yandex.ru/event?event_id=1' },
    ]);
  });
});

describe('describeChanges', () => {
  const invite = change('new', [{ ...base, uid: 'invite', myStatus: 'needs-action' }, null]);
  const plain = change('new', [{ ...base, uid: 'plain' }, null]);
  const cancelled = change('cancelled', [{ ...base, uid: 'gone', cancelled: true }, { ...base, uid: 'gone' }]);

  it('respects the notification settings', () => {
    const onlyInvites = { ...DEFAULT_PREFERENCES.notify, newMeetings: false, changes: false };
    expect(describeChanges([invite, plain, cancelled], onlyInvites, NOW).map((spec) => spec.id)).toEqual([
      `new:invite:${NOW}`,
    ]);
  });

  it('collapses more than three changes into one notification', () => {
    const moved = change('changed', [{ ...base, uid: 'moved', start: base.start + HOUR }, { ...base, uid: 'moved' }]);
    const [summary, ...rest] = describeChanges([invite, plain, cancelled, moved], DEFAULT_PREFERENCES.notify, NOW);
    expect(rest).toEqual([]);
    expect(summary).toMatchObject({
      title: '📅 В календаре 4 изменения',
      message: 'Приглашение: Ревью дизайна\nНовая: Ревью дизайна\nОтменена: Ревью дизайна',
      contextMessage: 'Ещё 1 — в списке встреч',
      url: null,
    });
  });
});

describe('describeDigest', () => {
  it('lists unanswered invitations', () => {
    const second = { ...base, uid: 'standup', title: 'Стендап', start: local(2026, 10, 5, 8, 30) };
    expect(describeDigest([base, second], NOW)).toMatchObject({
      title: '❓ 2 приглашения ждут ответа',
      message: 'Ревью дизайна — завтра в 10:00\nСтендап — пн, 5 окт. в 08:30',
      url: null,
    });
  });
});

describe('describeReminder', () => {
  const call = {
    ...base,
    key: 'review|1',
    start: NOW + 10 * 60_000,
    end: NOW + 70 * 60_000,
    join: { url: 'https://telemost.yandex.ru/j/1', provider: 'Телемост' },
  };

  it('counts down to the meeting and offers to join the call', () => {
    expect(describeReminder(call, NOW)).toEqual({
      id: 'remind:review|1',
      title: '⏰ Через 10 мин: Ревью дизайна',
      message: '09:10–10:10 · Телемост',
      contextMessage: undefined,
      url: 'https://telemost.yandex.ru/j/1',
      buttons: [
        { title: 'Присоединиться · Телемост', url: 'https://telemost.yandex.ru/j/1' },
        { title: 'Открыть в календаре', url: 'https://calendar.yandex.ru/event?event_id=1' },
      ],
      requireInteraction: true,
    });
  });

  it('says the meeting has started, shows the room and reminds to answer', () => {
    const started = { ...call, join: null, location: 'Переговорка 3', myStatus: 'needs-action' as const };
    expect(describeReminder(started, call.start + 60_000)).toMatchObject({
      title: '⏰ Началась: Ревью дизайна',
      message: '09:10–10:10 · Переговорка 3',
      contextMessage: 'Вы ещё не ответили на приглашение',
      url: 'https://calendar.yandex.ru/event?event_id=1',
    });
  });
});

describe('notification clicks and cleanup', () => {
  beforeEach(() => fakeBrowser.reset());

  const call = { ...base, key: 'review|1', start: NOW + 10 * 60_000, end: NOW + 70 * 60_000 };

  it('opens the right link for the notification and its buttons', async () => {
    const spec = describeReminder({ ...call, join: { url: 'https://meet.google.com/x', provider: 'Google Meet' } }, NOW);
    await showNotifications([spec]);
    await handleNotificationClick(spec.id, 1);

    const tabs = await fakeBrowser.tabs.query({});
    expect(tabs.map((tab) => tab.url)).toContain('https://calendar.yandex.ru/event?event_id=1');
    expect(fakeBrowser.notifications.getAllCreateOptions()).toEqual({});
  });

  it('removes reminders for meetings that are over or gone', async () => {
    const other = { ...call, key: 'other|1', start: NOW + 3 * 60 * 60_000, end: NOW + 4 * 60 * 60_000 };
    await showNotifications([describeReminder(call, NOW), describeReminder(other, NOW)]);

    await clearFinishedReminders({ ...EMPTY_SNAPSHOT, meetings: [call, other] }, call.end);

    expect(Object.keys(fakeBrowser.notifications.getAllCreateOptions())).toEqual(['remind:other|1']);
  });
});
