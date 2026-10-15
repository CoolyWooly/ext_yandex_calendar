// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { parseCalendarList } from '../src/caldav/client';
import { Options } from '../src/entrypoints/options/Options';
import { accountItem, EMPTY_SNAPSHOT, getPreferences, snapshotItem, updatePreferences } from '../src/storage/store';
import propfindCalendars from './fixtures/propfind-calendars.xml?raw';

/** Страница настроек на тестовом браузере WXT и подставном сервере Яндекса. */

const CALENDARS = parseCalendarList(propfindCalendars);
const PRIMARY = CALENDARS.find((calendar) => calendar.name === 'Мои события')!.href;
const ROOM = CALENDARS.find((calendar) => calendar.name === 'Переговорка. Большой зал')!.href;
const ACCOUNT = { login: 'user@example.com', appPassword: 'secret', calendars: CALENDARS, verifiedAt: 0 };

let server: 'ok' | 'wrong-password';

async function fakeYandex(): Promise<Response> {
  return server === 'ok' ? new Response(propfindCalendars, { status: 207 }) : new Response('', { status: 401 });
}

/** Страница рисуется после чтения хранилища — ждём форму. */
async function fillConnectForm(login: string, password: string) {
  fireEvent.input(await screen.findByLabelText('Рабочая почта'), { target: { value: login } });
  fireEvent.input(screen.getByLabelText(/Пароль приложения/), { target: { value: password } });
  fireEvent.submit(screen.getByRole('button', { name: 'Проверить подключение' }).closest('form')!);
}

describe('Options', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    server = 'ok';
    vi.stubGlobal('fetch', vi.fn(fakeYandex));
    vi.spyOn(fakeBrowser.runtime, 'getManifest').mockReturnValue({
      manifest_version: 3,
      name: 'test',
      version: '1.1.0',
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('checks the connection, saves the account and picks the primary calendar', async () => {
    render(<Options />);
    await fillConnectForm('  User@Example.com ', ' secret ');

    expect(await screen.findByText('user@example.com')).toBeTruthy();
    expect(await accountItem.getValue()).toMatchObject({ login: 'user@example.com', appPassword: 'secret' });
    await waitFor(async () => expect((await getPreferences()).selectedCalendars).toEqual([PRIMARY]));
    expect((screen.getByRole('switch', { name: 'Мои события' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('switch', { name: 'Переговорка. Большой зал' }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText('Списки задач («Не забыть») расширение не показывает.')).toBeTruthy();
    expect(screen.getByText('Подключено')).toBeTruthy();
  });

  it('explains a rejected app password and keeps the form', async () => {
    server = 'wrong-password';
    render(<Options />);
    await fillConnectForm('user@example.com', 'wrong');

    expect(await screen.findByText(/Яндекс не принял почту или пароль приложения/)).toBeTruthy();
    expect(await accountItem.getValue()).toBeNull();
  });

  it('asks for the full work email before going to Yandex', async () => {
    render(<Options />);
    await fillConnectForm('user', 'secret');

    expect(await screen.findByText('Укажите почту целиком, например name@company.ru.')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('saves the calendar choice and reminder minutes', async () => {
    await accountItem.setValue(ACCOUNT);
    await updatePreferences({ selectedCalendars: [PRIMARY] });
    render(<Options />);

    fireEvent.click(await screen.findByRole('switch', { name: 'Переговорка. Большой зал' }));
    await waitFor(async () => expect((await getPreferences()).selectedCalendars).toEqual([PRIMARY, ROOM]));
    expect(await screen.findByText('✓ Сохранено')).toBeTruthy();

    const minutes = screen.getByLabelText('За сколько минут:') as HTMLInputElement;
    fireEvent.input(minutes, { target: { value: 'через десять' } });
    fireEvent.blur(minutes);
    expect(await screen.findByText('Укажите минуты через запятую, например: 10, 1')).toBeTruthy();

    fireEvent.input(minutes, { target: { value: '5; 15 5' } });
    fireEvent.blur(minutes);
    await waitFor(async () => expect((await getPreferences()).reminderMinutes).toEqual([15, 5]));
    expect(minutes.value).toBe('15, 5');
  });

  it('asks for a new password when Yandex stopped accepting the saved one', async () => {
    await accountItem.setValue(ACCOUNT);
    await snapshotItem.setValue({ ...EMPTY_SNAPSHOT, error: { kind: 'auth', message: '', at: 0, failures: 1 } });
    render(<Options />);

    expect(await screen.findByText(/Яндекс не принимает сохранённый пароль приложения/)).toBeTruthy();
    expect(screen.getByText('Нужен новый пароль')).toBeTruthy();
    expect(screen.getByLabelText(/Пароль приложения/)).toBeTruthy();
  });

  it('disconnects and forgets the account', async () => {
    await accountItem.setValue(ACCOUNT);
    render(<Options />);

    fireEvent.click(await screen.findByRole('button', { name: 'Отключить' }));
    await waitFor(async () => expect(await accountItem.getValue()).toBeNull());
    expect(await screen.findByText('Не подключено')).toBeTruthy();
    expect(screen.getByLabelText('Рабочая почта')).toBeTruthy();
  });
});
