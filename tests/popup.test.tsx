// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { ChangeKind } from '../src/calendar/diff';
import type { Meeting } from '../src/calendar/types';
import { Popup } from '../src/entrypoints/popup/Popup';
import {
  type Account,
  accountItem,
  EMPTY_SNAPSHOT,
  type InboxEntry,
  inboxItem,
  type Snapshot,
  snapshotItem,
  updatePreferences,
} from '../src/storage/store';
import type { BackgroundMessage } from '../src/sync/messages';
import { local, meeting } from './helpers';

/**
 * Окно встреч на тестовом браузере WXT. Фоновый скрипт подменён: запоминаем, что окно у него
 * просит, и отдаём заготовленные непросмотренные изменения.
 */

const NOW = local(2026, 10, 1, 9, 0);
const CALENDAR = '/calendars/user%40example.com/events-1/';
const ACCOUNT: Account = {
  login: 'user@example.com',
  appPassword: 'secret',
  calendars: [{ href: CALENDAR, name: 'Мои события', ctag: '1', color: '#4b5bf6', kind: 'events' }],
  verifiedAt: 0,
};

const at = (day: number, hour: number, minute = 0) => local(2026, 10, day, hour, minute);
const standup = meeting({
  uid: 'standup',
  key: 'standup|1',
  calendarHref: CALENDAR,
  title: 'Стендап',
  start: at(1, 10),
  end: at(1, 10, 15),
  join: { url: 'https://telemost.yandex.ru/j/1', provider: 'Телемост' },
});
const review = meeting({
  uid: 'review',
  calendarHref: CALENDAR,
  title: 'Ревью дизайна',
  start: at(1, 14),
  end: at(1, 15),
});
const retro = meeting({
  uid: 'retro',
  calendarHref: CALENDAR,
  title: 'Ретро',
  start: at(2, 11),
  end: at(2, 12),
  myStatus: 'needs-action',
  organizer: { name: 'Анна', email: 'anna@example.com' },
});

function synced(meetings: Meeting[], extra: Partial<Snapshot> = {}): Snapshot {
  return {
    ...EMPTY_SNAPSHOT,
    login: ACCOUNT.login,
    meetings,
    range: { start: local(2026, 10, 1), end: local(2026, 10, 8) },
    syncedAt: NOW - 60_000,
    ...extra,
  };
}

const change = (kind: ChangeKind, current: Meeting, previous: Meeting | null = null): InboxEntry => ({
  kind,
  uid: current.uid,
  instances: [{ meeting: current, previous }],
  at: NOW,
});

let messages: BackgroundMessage[];
let inbox: InboxEntry[];

const syncRequests = () => messages.filter((message) => message.type === 'sync');

/** Разделы окна: заголовок дня и названия встреч в нём. */
const sections = () =>
  [...document.querySelectorAll('section')].map((section) => [
    section.querySelector('.section-head')?.textContent,
    [...section.querySelectorAll('.meeting-title')].map((title) => title.textContent),
  ]);

async function open(snapshot: Snapshot, account: Account | null = ACCOUNT) {
  await accountItem.setValue(account);
  await snapshotItem.setValue(snapshot);
  render(<Popup />);
}

describe('Popup', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  beforeEach(async () => {
    fakeBrowser.reset();
    vi.setSystemTime(NOW);
    messages = [];
    inbox = [];
    fakeBrowser.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
      messages.push(message);
      sendResponse(message.type === 'take-inbox' ? inbox.splice(0) : true);
      return true;
    });
    vi.spyOn(fakeBrowser.runtime, 'openOptionsPage').mockResolvedValue();
    vi.spyOn(fakeBrowser.tabs, 'create').mockResolvedValue({} as never);
    vi.spyOn(window, 'close').mockImplementation(() => {});
    await updatePreferences({ selectedCalendars: [CALENDAR] });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('invites to connect the calendar and does not sync without an account', async () => {
    await open(EMPTY_SNAPSHOT, null);

    fireEvent.click(await screen.findByRole('button', { name: 'Подключить календарь' }));
    expect(fakeBrowser.runtime.openOptionsPage).toHaveBeenCalled();
    expect(syncRequests()).toEqual([]);
  });

  it('lists meetings by day without a next-meeting card or an invitations banner', async () => {
    await open(synced([standup, review, retro]));

    expect(await screen.findByText('Стендап')).toBeTruthy();
    expect(sections()).toEqual([
      ['Сегодня', ['Стендап', 'Ревью дизайна']],
      ['Завтра', ['Ретро']],
    ]);
    expect(screen.getByText('2 октября')).toBeTruthy();
    expect(screen.getByText('нужно ответить')).toBeTruthy();
    expect(screen.queryByText('Следующая встреча')).toBeNull();
    expect(screen.queryByText(/ждёт ответа/)).toBeNull();
  });

  it('keeps a meeting in progress under today and highlights its join button', async () => {
    vi.setSystemTime(at(1, 10, 5));
    await open(synced([standup, review]));

    const live = await screen.findByText('идёт ещё 10 мин');
    expect(live.className).toBe('meta-live');
    expect(sections()).toEqual([['Сегодня', ['Стендап', 'Ревью дизайна']]]);
    expect(screen.queryByText('Сейчас')).toBeNull();
    expect(screen.getByRole('button', { name: 'Войти · Телемост' }).classList.contains('primary')).toBe(true);
  });

  it('hurries only my meetings that start soon', async () => {
    const booking = meeting({
      ...review,
      uid: 'booking',
      title: 'Бронь переговорки',
      start: at(1, 9, 50),
      end: at(1, 10, 30),
      join: { url: 'https://meet.google.com/abc-defg-hij', provider: 'Google Meet' },
      myStatus: 'none',
      organizer: { name: 'Олег', email: 'oleg@example.com' },
    });
    vi.setSystemTime(at(1, 9, 48));
    await open(synced([booking, standup]));

    expect((await screen.findByText('через 12 мин')).className).toBe('meta-soon');
    expect(screen.getByRole('button', { name: 'Войти · Телемост' }).classList.contains('primary')).toBe(true);
    expect(screen.getByText(/через 2 мин/).className).toBe('meeting-meta');
    expect(screen.getByRole('button', { name: 'Войти · Google Meet' }).classList.contains('primary')).toBe(false);
  });

  it('syncs when opened and checks even a rejected password on Refresh', async () => {
    await open(synced([review]));

    await waitFor(() => expect(syncRequests()).toEqual([{ type: 'sync', manual: false }]));
    const refresh = screen.getByRole('button', { name: 'Обновить' }) as HTMLButtonElement;
    await waitFor(() => expect(refresh.disabled).toBe(false));

    fireEvent.click(refresh);
    await waitFor(() => expect(syncRequests()).toContainEqual({ type: 'sync', manual: true }));
  });

  it('marks changes taken from the background and takes new ones while open', async () => {
    inbox = [change('new', review)];
    await open(synced([standup, review, retro]));

    expect(await screen.findByText('новая')).toBeTruthy();
    expect(await inboxItem.getValue()).toEqual([]);

    // Фон записал новое изменение, пока окно открыто: окно просит его и показывает метку.
    const earlier = { ...retro, start: at(2, 9), end: at(2, 10) };
    inbox = [change('changed', retro, earlier)];
    await inboxItem.setValue(inbox);
    expect(await screen.findByText('перенесена')).toBeTruthy();
    expect(messages.filter((message) => message.type === 'take-inbox').length).toBeGreaterThanOrEqual(2);
  });

  it('leads to the settings when Yandex rejects the password', async () => {
    await open(synced([review], { error: { kind: 'auth', message: '', at: NOW, failures: 1 } }));

    fireEvent.click(await screen.findByRole('button', { name: 'Обновить пароль' }));
    expect(fakeBrowser.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it('keeps showing the last meetings while the calendar is unreachable', async () => {
    await open(synced([review], { error: { kind: 'network', message: '', at: NOW, failures: 1 } }));

    expect(await screen.findByText('Нет связи с календарём — показаны данные, полученные 1 мин назад')).toBeTruthy();
    expect(screen.getByText('Ревью дизайна')).toBeTruthy();
  });

  it('joins the call in a new tab and closes the window', async () => {
    await open(synced([standup]));

    fireEvent.click(await screen.findByRole('button', { name: 'Войти · Телемост' }));
    expect(fakeBrowser.tabs.create).toHaveBeenCalledWith({ url: 'https://telemost.yandex.ru/j/1' });
    expect(window.close).toHaveBeenCalled();
  });

  it('shows free time when there are no meetings', async () => {
    await open(synced([]));

    expect(await screen.findByText('Свободное время')).toBeTruthy();
    expect(screen.getByText('Встреч на ближайшую неделю нет')).toBeTruthy();
  });
});
