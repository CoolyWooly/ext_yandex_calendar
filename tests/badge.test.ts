import { describe, expect, it } from 'vitest';
import type { Meeting } from '../src/calendar/types';
import { EMPTY_SNAPSHOT, type Snapshot } from '../src/storage/store';
import { computeBadge } from '../src/ui/badge';
import { local, meeting } from './helpers';

const NOW = local(2026, 10, 1, 10, 0);
const MINUTE = 60_000;

const snapshot = (meetings: Meeting[], extra: Partial<Snapshot> = {}): Snapshot => ({
  ...EMPTY_SNAPSHOT,
  meetings,
  syncedAt: NOW,
  ...extra,
});

const at = (minutesFromNow: number, overrides: Partial<Meeting> = {}) =>
  meeting({
    title: 'Дейли',
    start: NOW + minutesFromNow * MINUTE,
    end: NOW + (minutesFromNow + 30) * MINUTE,
    ...overrides,
  });

const badge = (meetings: Meeting[], unseen = 0, extra: Partial<Snapshot> = {}) =>
  computeBadge(true, snapshot(meetings, extra), unseen, NOW);

describe('computeBadge', () => {
  it('stays empty until the calendar is connected', () => {
    expect(computeBadge(false, EMPTY_SNAPSHOT, 3, NOW)).toMatchObject({ text: '' });
  });

  it('shows "!" when Yandex rejects the app password', () => {
    const state = badge([at(5)], 2, { error: { kind: 'auth', message: '', at: NOW } });
    expect(state).toMatchObject({ text: '!', color: '#d9342b' });
    expect(state.title).toContain('пароль приложения');
  });

  it('counts down the last hour before a meeting, turning orange in the last 10 minutes', () => {
    expect(badge([at(45)])).toMatchObject({ text: '45м', color: '#3358d4' });
    expect(badge([at(8)])).toMatchObject({ text: '8м', color: '#e8590c' });
    expect(badge([at(0.5)])).toMatchObject({ text: '1м' });
  });

  it('says "идёт" during the first 5 minutes of a meeting', () => {
    expect(badge([at(-3)])).toMatchObject({ text: 'идёт' });
    expect(badge([at(-6)])).toMatchObject({ text: '' });
  });

  it('shows unseen changes in red, but not over the last 10 minutes before a meeting', () => {
    expect(badge([at(45)], 2)).toMatchObject({ text: '2', color: '#d9342b' });
    expect(badge([at(8)], 2)).toMatchObject({ text: '8м' });
    expect(badge([at(-2)], 2)).toMatchObject({ text: 'идёт' });
    expect(badge([], 1).title).toContain('Новые изменения: 1');
  });

  it('ignores declined, cancelled and all-day events', () => {
    const state = badge([
      at(5, { myStatus: 'declined' }),
      at(6, { cancelled: true }),
      at(7, { allDay: true }),
      at(90, { title: 'Ревью' }),
    ]);
    expect(state.text).toBe('');
    expect(state.title).toBe('Мои встречи\nСледующая через 1 ч 30 мин: Ревью');
  });

  it('ignores bookings in a meeting-room calendar, but counts personal events', () => {
    const booking = at(20, { myStatus: 'none', organizer: { name: null, email: 'boss@example.com' } });
    const personal = at(30, { myStatus: 'none', organizer: null });
    expect(badge([booking, personal])).toMatchObject({ text: '30м' });
  });

  it('mentions a lost connection in the tooltip but keeps counting down', () => {
    const state = badge([at(20)], 0, { error: { kind: 'network', message: '', at: NOW } });
    expect(state.text).toBe('20м');
    expect(state.title).toContain('Нет связи с календарём, данные на 10:00');
  });
});
