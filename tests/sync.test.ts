import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { CalDavError, parseCalendarList } from '../src/caldav/client';
import { accountItem, EMPTY_SNAPSHOT, type Snapshot, snapshotItem, updatePreferences } from '../src/storage/store';
import { nextScheduledAttempt, syncNow } from '../src/sync/sync';
import propfindCalendars from './fixtures/propfind-calendars.xml?raw';
import week from './fixtures/report-week.xml?raw';
import { icsOf, local } from './helpers';

const NOW = local(2026, 10, 1, 7, 0);
const PRIMARY = '/calendars/user%40example.com/events-36215597/';
const ROOM = '/calendars/user%40example.com/events-36168105/';

function stubClient(primaryCtag = '100') {
  const calendars = parseCalendarList(propfindCalendars).map((calendar) =>
    calendar.href === PRIMARY ? { ...calendar, ctag: primaryCtag } : calendar,
  );
  return {
    listCalendars: vi.fn(async () => calendars),
    fetchEvents: vi.fn(async (_href: string, _range: { start: number; end: number }) => [
      { href: `${PRIMARY}standup.ics`, etag: '1', ics: icsOf(week) },
    ]),
  };
}

describe('syncNow', () => {
  beforeEach(async () => {
    fakeBrowser.reset();
    const calendars = parseCalendarList(propfindCalendars);
    await accountItem.setValue({ login: 'user@example.com', appPassword: 'x', calendars, verifiedAt: 0 });
    await updatePreferences({ selectedCalendars: [PRIMARY] });
  });

  it('loads meetings of the selected calendars for the coming week', async () => {
    const client = stubClient();
    const { snapshot } = await syncNow({ now: NOW, createClient: () => client });

    expect(client.fetchEvents).toHaveBeenCalledTimes(1);
    expect(client.fetchEvents).toHaveBeenCalledWith(PRIMARY, { start: local(2026, 10, 1), end: local(2026, 10, 8) });
    expect(snapshot.meetings.map((meeting) => [meeting.title, meeting.myStatus])).toEqual([
      ['Стендап Web&App', 'needs-action'],
      ['Стендап Web&App', 'needs-action'],
    ]);
    expect(snapshot).toMatchObject({
      login: 'user@example.com',
      range: { start: local(2026, 10, 1), end: local(2026, 10, 8) },
      syncedAt: NOW,
      error: null,
    });
    expect(await snapshotItem.getValue()).toEqual(snapshot);
  });

  it('reuses cached meetings while the calendar ctag is unchanged', async () => {
    const client = stubClient('100');
    await syncNow({ now: NOW, createClient: () => client });
    const { snapshot: second } = await syncNow({ now: NOW + 2 * 60_000, createClient: () => client });

    expect(client.listCalendars).toHaveBeenCalledTimes(2);
    expect(client.fetchEvents).toHaveBeenCalledTimes(1);
    expect(second.meetings).toHaveLength(2);
  });

  it('reloads when the ctag changes, 15 minutes pass or the day changes', async () => {
    await syncNow({ now: NOW, createClient: () => stubClient('100') });

    const changed = stubClient('101');
    await syncNow({ now: NOW + 60_000, createClient: () => changed });
    expect(changed.fetchEvents).toHaveBeenCalledTimes(1);

    const stale = stubClient('101');
    await syncNow({ now: NOW + 17 * 60_000, createClient: () => stale });
    expect(stale.fetchEvents).toHaveBeenCalledTimes(1);

    const nextDay = stubClient('101');
    await syncNow({ now: local(2026, 10, 2, 7, 0), createClient: () => nextDay });
    expect(nextDay.fetchEvents).toHaveBeenCalledWith(PRIMARY, { start: local(2026, 10, 2), end: local(2026, 10, 9) });
  });

  it('does not infer unanswered invitations in other calendars', async () => {
    await updatePreferences({ selectedCalendars: [ROOM] });
    const { snapshot } = await syncNow({ now: NOW, createClient: () => stubClient() });
    expect(snapshot.meetings.map((meeting) => meeting.myStatus)).toEqual(['none', 'none']);
  });

  it('keeps the previous meetings and records the error when the server fails', async () => {
    await syncNow({ now: NOW, createClient: () => stubClient() });
    const failing = stubClient();
    failing.listCalendars.mockRejectedValue(new CalDavError('auth', 'bad password', 401));

    const { snapshot } = await syncNow({ now: NOW + 60_000, createClient: () => failing });

    expect(snapshot.meetings).toHaveLength(2);
    expect(snapshot.syncedAt).toBe(NOW);
    expect(snapshot.error).toEqual({ kind: 'auth', message: 'bad password', at: NOW + 60_000, failures: 1 });
  });

  it('returns the snapshot it started from, ignoring one from another account', async () => {
    const first = await syncNow({ now: NOW, createClient: () => stubClient() });
    expect(first.previous.syncedAt).toBeNull();

    const second = await syncNow({ now: NOW + 60_000, createClient: () => stubClient() });
    expect(second.previous).toEqual(first.snapshot);

    await accountItem.setValue({ login: 'other@example.com', appPassword: 'x', calendars: [], verifiedAt: 0 });
    const third = await syncNow({ now: NOW + 120_000, createClient: () => stubClient() });
    expect(third.previous.syncedAt).toBeNull();
  });

  it('counts failures in a row and forgets them after a successful sync', async () => {
    const failing = stubClient();
    failing.listCalendars.mockRejectedValue(new TypeError('Failed to fetch'));

    await syncNow({ now: NOW, createClient: () => failing });
    const { snapshot: second } = await syncNow({ now: NOW + 60_000, createClient: () => failing });
    expect(second.error).toMatchObject({ kind: 'unknown', failures: 2 });

    const { snapshot: recovered } = await syncNow({ now: NOW + 120_000, createClient: () => stubClient() });
    expect(recovered.error).toBeNull();
  });

  it('clears everything after the account is disconnected', async () => {
    await syncNow({ now: NOW, createClient: () => stubClient() });
    await accountItem.setValue(null);

    const { snapshot } = await syncNow({ now: NOW, createClient: () => stubClient() });
    expect(snapshot.meetings).toEqual([]);
  });
});

describe('nextScheduledAttempt', () => {
  const MINUTE = 60_000;
  const failed = (kind: 'auth' | 'network', failures: number): Snapshot => ({
    ...EMPTY_SNAPSHOT,
    error: { kind, message: '', at: NOW, failures },
  });

  it('does not wait when the last sync succeeded', () => {
    expect(nextScheduledAttempt(EMPTY_SNAPSHOT, 2)).toBe(0);
  });

  it('doubles the pause after each failure, up to 30 minutes', () => {
    expect([1, 2, 3, 4, 5, 10].map((failures) => (nextScheduledAttempt(failed('network', failures), 2) - NOW) / MINUTE)).toEqual([
      2, 4, 8, 16, 30, 30,
    ]);
  });

  it('retries a rejected password only every 30 minutes', () => {
    expect(nextScheduledAttempt(failed('auth', 1), 1)).toBe(NOW + 30 * MINUTE);
  });
});
