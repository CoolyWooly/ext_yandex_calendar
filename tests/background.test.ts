import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { parseCalendarList } from '../src/caldav/client';
import background from '../src/entrypoints/background';
import { accountItem, inboxItem, updatePreferences } from '../src/storage/store';
import propfindCalendars from './fixtures/propfind-calendars.xml?raw';
import week from './fixtures/report-week.xml?raw';
import { icsOf, local, vcalendar } from './helpers';

/**
 * Фоновый скрипт целиком: настоящий CalDAV-клиент против подставного сервера Яндекса,
 * будильники и уведомления — из тестового браузера WXT.
 */

const PRIMARY = '/calendars/user%40example.com/events-36215597/';
const MINUTE = 60_000;

// Состояние подставного сервера.
let ctag = 1;
let objects: string[] = [];
let server: 'ok' | 'wrong-password' | 'offline' = 'ok';

function escapeXml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function reportXml(): string {
  const responses = objects.map(
    (ics, index) =>
      `<D:response><D:href>${PRIMARY}${index}.ics</D:href><D:propstat><D:prop><D:getetag>${index}</D:getetag>` +
      `<C:calendar-data xmlns:C="urn:ietf:params:xml:ns:caldav">${escapeXml(ics)}</C:calendar-data>` +
      `</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>`,
  );
  return `<?xml version="1.0"?><D:multistatus xmlns:D="DAV:">${responses.join('')}</D:multistatus>`;
}

async function fakeYandex(_url: string, init: RequestInit): Promise<Response> {
  if (server === 'offline') throw new TypeError('Failed to fetch');
  if (server === 'wrong-password') return new Response('', { status: 401 });
  if (init.method === 'PROPFIND') {
    return new Response(propfindCalendars.replace('1790751946000', String(ctag)), { status: 207 });
  }
  return new Response(reportXml(), { status: 207 });
}

/** Синхронизация так же, как её запускает окно расширения. */
const syncFromPopup = () => fakeBrowser.runtime.sendMessage({ type: 'sync' });
const badgeText = () => fakeBrowser.action.getBadgeText({});
const notifications = () => fakeBrowser.notifications.getAllCreateOptions();
const fireAlarm = (name: string) =>
  fakeBrowser.alarms.onAlarm.trigger({ name, scheduledTime: Date.now(), persistAcrossSessions: false });

describe('background', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  beforeEach(async () => {
    fakeBrowser.reset();
    vi.setSystemTime(local(2026, 10, 1, 7, 0));
    vi.stubGlobal('fetch', vi.fn(fakeYandex));
    ctag = 1;
    objects = [icsOf(week)];
    server = 'ok';

    const calendars = parseCalendarList(propfindCalendars.replace('1790751946000', '1'));
    await accountItem.setValue({ login: 'user@example.com', appPassword: 'secret', calendars, verifiedAt: 0 });
    await updatePreferences({ selectedCalendars: [PRIMARY] });
    background.main!();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('stays quiet on the first sync and plans reminders for the stand-up', async () => {
    await syncFromPopup();

    expect(notifications()).toEqual({});
    expect(await badgeText()).toBe('');
    const reminderAlarms = (await fakeBrowser.alarms.getAll()).filter((alarm) => alarm.name.startsWith('remind|'));
    expect(reminderAlarms.map((alarm) => alarm.scheduledTime).sort()).toEqual([
      local(2026, 10, 1, 8, 20),
      local(2026, 10, 1, 8, 29),
    ]);
  });

  it('announces a new invitation, counts it on the badge and clears the count once seen', async () => {
    await syncFromPopup();

    ctag = 2;
    objects.push(
      vcalendar(`UID:review
DTSTART:20261001T090000Z
DTEND:20261001T100000Z
LAST-MODIFIED:20261001T020000Z
SUMMARY:Ревью дизайна
DESCRIPTION:Ссылка: https://telemost.yandex.ru/j/42
ORGANIZER;CN="Анна Организатор":mailto:organizer@example.com
ATTENDEE;PARTSTAT=NEEDS-ACTION:mailto:user@example.com`),
    );
    vi.setSystemTime(local(2026, 10, 1, 7, 2));
    await syncFromPopup();

    const shown = Object.values(notifications());
    expect(shown).toEqual([
      expect.objectContaining({
        title: '❓ Вас пригласили: Ревью дизайна',
        message: 'Сегодня в 14:00 · Анна Организатор',
      }),
    ]);
    expect(await badgeText()).toBe('1');

    // Окно расширения забирает непросмотренные изменения — счётчик гаснет.
    await inboxItem.setValue([]);
    await vi.waitFor(async () => expect(await badgeText()).toBe(''));
  });

  it('reminds 10 minutes before the stand-up and joins the call from the notification', async () => {
    await syncFromPopup();

    vi.setSystemTime(local(2026, 10, 1, 8, 20));
    await fireAlarm(`remind|${local(2026, 10, 1, 8, 20)}`);

    await vi.waitFor(() => expect(Object.keys(notifications())).toHaveLength(1));
    const [id, reminder] = Object.entries(notifications())[0]!;
    expect(reminder).toMatchObject({
      title: '⏰ Через 10 мин: Стендап Web&App',
      message: '08:30–09:00 · Google Meet',
      contextMessage: 'Вы ещё не ответили на приглашение',
      requireInteraction: true,
      buttons: [{ title: 'Присоединиться · Google Meet' }, { title: 'Открыть в календаре' }],
    });

    await fakeBrowser.notifications.onButtonClicked.trigger(id, 0);
    await vi.waitFor(async () => {
      const tabs = await fakeBrowser.tabs.query({});
      expect(tabs.map((tab) => tab.url)).toContain('https://meet.google.com/abc-defg-hij');
    });
  });

  it('does not repeat a reminder when the safety tick runs right after the alarm', async () => {
    await syncFromPopup();

    // Компьютер проснулся в 08:29: оба порога пропущены, напомнить нужно один раз.
    vi.setSystemTime(local(2026, 10, 1, 8, 29) + 10_000);
    const created = vi.spyOn(fakeBrowser.notifications, 'create');
    await fireAlarm(`remind|${local(2026, 10, 1, 8, 20)}`);
    await fireAlarm(`remind|${local(2026, 10, 1, 8, 29)}`);
    await fireAlarm('tick');

    await vi.waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(created).toHaveBeenCalledTimes(1);
    expect(created.mock.calls[0]![1]).toMatchObject({ title: '⏰ Через 1 мин: Стендап Web&App' });
  });

  it('reports a rejected password once, backs off, and recovers with a new password', async () => {
    await syncFromPopup();
    const fetchMock = vi.mocked(fetch);

    server = 'wrong-password';
    vi.setSystemTime(local(2026, 10, 1, 7, 2));
    await syncFromPopup();
    expect(Object.keys(notifications())).toEqual(['auth-error']);
    expect(notifications()['auth-error']).toMatchObject({ title: '🔑 Яндекс не принимает пароль приложения' });
    expect(await badgeText()).toBe('!');

    // Повторная неудача не дублирует уведомление.
    const created = vi.spyOn(fakeBrowser.notifications, 'create');
    await syncFromPopup();
    expect(created).not.toHaveBeenCalled();

    // По расписанию в Яндекс не ходим полчаса.
    const calls = fetchMock.mock.calls.length;
    vi.setSystemTime(local(2026, 10, 1, 7, 20));
    await fireAlarm('sync');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock.mock.calls.length).toBe(calls);

    // Новый пароль в настройках — сразу проверяем, уведомление и «!» уходят.
    server = 'ok';
    const account = await accountItem.getValue();
    await accountItem.setValue({ ...account!, appPassword: 'new-secret' });
    await vi.waitFor(() => expect(notifications()).toEqual({}));
    await vi.waitFor(async () => expect(await badgeText()).not.toBe('!'));
  });

  it('waits longer between scheduled attempts while the network is down', async () => {
    await syncFromPopup();
    const fetchMock = vi.mocked(fetch);

    server = 'offline';
    vi.setSystemTime(local(2026, 10, 1, 7, 2));
    await fireAlarm('sync');
    await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(2));
    const afterFirstFailure = fetchMock.mock.calls.length;

    vi.setSystemTime(local(2026, 10, 1, 7, 3));
    await fireAlarm('sync');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock.mock.calls.length).toBe(afterFirstFailure);

    vi.setSystemTime(local(2026, 10, 1, 7, 4));
    await fireAlarm('sync');
    await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBe(afterFirstFailure + 1));
  });
});
