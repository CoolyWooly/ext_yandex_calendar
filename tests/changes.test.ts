import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Meeting } from '../src/calendar/types';
import { EMPTY_SNAPSHOT, historyItem, inboxItem, type Snapshot } from '../src/storage/store';
import { recordChanges, takeDueDigest, unseenCount } from '../src/sync/changes';
import { local, meeting } from './helpers';

const NOW = local(2026, 10, 1, 7, 0);
const WEEK = { start: local(2026, 10, 1), end: local(2026, 10, 8) };

const m = (uid: string, day: number, extra: Partial<Meeting> = {}) =>
  meeting({ uid, key: `${uid}|${day}`, title: uid, start: local(2026, 10, day, 10), end: local(2026, 10, day, 11), ...extra });

const snapshot = (meetings: Meeting[], syncedAt: number, extra: Partial<Snapshot> = {}): Snapshot => ({
  ...EMPTY_SNAPSHOT,
  login: 'user@example.com',
  meetings,
  range: WEEK,
  syncedAt,
  calendars: { '/cal/': { ctag: '1', rangeKey: 'w', fetchedAt: syncedAt } },
  ...extra,
});

describe('recordChanges', () => {
  beforeEach(() => fakeBrowser.reset());

  it('stays silent on the first sync and only remembers what is there', async () => {
    const changes = await recordChanges(EMPTY_SNAPSHOT, snapshot([m('a', 2)], NOW), NOW);

    expect(changes).toEqual([]);
    expect(await historyItem.getValue()).toMatchObject({ baselineAt: NOW, knownUids: { a: NOW } });
    expect(await inboxItem.getValue()).toEqual([]);
  });

  it('reports a new meeting after the first sync and keeps it as unseen', async () => {
    const first = snapshot([m('a', 2)], NOW);
    await recordChanges(EMPTY_SNAPSHOT, first, NOW);

    const later = NOW + 2 * 60_000;
    const changes = await recordChanges(first, snapshot([m('a', 2), m('b', 3, { modifiedAt: later })], later), later);

    expect(changes.map((change) => [change.kind, change.uid])).toEqual([['new', 'b']]);
    expect(await inboxItem.getValue()).toEqual([{ ...changes[0], at: later }]);
  });

  it('stays silent after an update from a version without ranges, or after switching accounts', async () => {
    await historyItem.setValue({ knownUids: {}, baselineAt: NOW - 60_000, digestDay: null });
    const current = snapshot([m('a', 2, { modifiedAt: NOW })], NOW);

    expect(await recordChanges(snapshot([], NOW - 60_000, { range: null }), current, NOW)).toEqual([]);
    expect(await recordChanges(snapshot([], NOW - 60_000, { login: 'old@example.com' }), current, NOW)).toEqual([]);
  });

  it('does nothing when the sync failed', async () => {
    const failed = snapshot([], NOW, { error: { kind: 'network', message: '', at: NOW } });
    expect(await recordChanges(EMPTY_SNAPSHOT, failed, NOW)).toEqual([]);
    expect(await historyItem.getValue()).toMatchObject({ baselineAt: null });
  });
});

describe('unseenCount', () => {
  it('counts meetings, not instances, and forgets those already over', () => {
    const entry = (uid: string, ...meetings: Meeting[]) => ({
      kind: 'new' as const,
      uid,
      at: NOW,
      instances: meetings.map((item) => ({ meeting: item, previous: null })),
    });
    const inbox = [entry('s', m('s', 2), m('s', 5)), entry('s', m('s', 6)), entry('b', m('b', 3)), entry('past', m('past', 1, { end: NOW - 1 }))];
    expect(unseenCount(inbox, NOW)).toBe(2);
  });
});

describe('takeDueDigest', () => {
  const pending = [m('invite', 2, { myStatus: 'needs-action' }), m('invite', 5, { myStatus: 'needs-action' }), m('ok', 3)];

  beforeEach(async () => {
    fakeBrowser.reset();
    await historyItem.setValue({ knownUids: {}, baselineAt: NOW - 60_000, digestDay: null });
  });

  it('waits until 9 in the morning', async () => {
    expect(await takeDueDigest(snapshot(pending, NOW), local(2026, 10, 1, 8, 59))).toEqual([]);
  });

  it('lists each unanswered meeting once, once per day', async () => {
    const nine = local(2026, 10, 1, 9, 0);
    expect((await takeDueDigest(snapshot(pending, nine), nine)).map((item) => item.key)).toEqual(['invite|2']);
    expect(await takeDueDigest(snapshot(pending, nine), local(2026, 10, 1, 15, 0))).toEqual([]);
    const nextDay = local(2026, 10, 2, 9, 30);
    expect(await takeDueDigest(snapshot(pending, nextDay), nextDay)).toHaveLength(1);
  });

  it('skips cancelled invitations and stays quiet when nothing is pending', async () => {
    const nine = local(2026, 10, 1, 9, 0);
    const cancelled = [m('invite', 2, { myStatus: 'needs-action', cancelled: true })];
    expect(await takeDueDigest(snapshot(cancelled, nine), nine)).toEqual([]);
    expect(await historyItem.getValue()).toMatchObject({ digestDay: null });
  });
});
