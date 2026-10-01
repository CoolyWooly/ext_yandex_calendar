import { describe, expect, it } from 'vitest';
import { type DiffInput, diffMeetings } from '../src/calendar/diff';
import type { Meeting } from '../src/calendar/types';
import { local, meeting } from './helpers';

const NOW = local(2026, 10, 1, 7, 0);
const WEEK = { start: local(2026, 10, 1), end: local(2026, 10, 8) };
const HOUR = 60 * 60_000;

/** Встреча `uid` в день `day` октября; ключ — как у экземпляра серии. */
const m = (uid: string, day: number, hour = 10, extra: Partial<Meeting> = {}) =>
  meeting({
    uid,
    key: `${uid}|${day}`,
    title: uid,
    start: local(2026, 10, day, hour),
    end: local(2026, 10, day, hour + 1),
    modifiedAt: NOW - 30 * 24 * HOUR,
    ...extra,
  });

function diff(previous: Meeting[], current: Meeting[], overrides: Partial<DiffInput> = {}) {
  return diffMeetings({
    previous,
    current,
    previousRange: WEEK,
    currentRange: WEEK,
    calendars: new Set(['/cal/']),
    knownUids: new Set(previous.map((item) => item.uid)),
    previousSyncAt: NOW - 2 * 60_000,
    now: NOW,
    ...overrides,
  });
}

const summary = (changes: ReturnType<typeof diffMeetings>) =>
  changes.map((change) => [change.kind, change.uid, change.instances.length]);

describe('diffMeetings', () => {
  it('reports nothing when nothing changed', () => {
    expect(diff([m('a', 2)], [m('a', 2)])).toEqual([]);
  });

  it('ignores a change of only my own answer', () => {
    expect(diff([m('a', 2, 10, { myStatus: 'needs-action' })], [m('a', 2, 10, { myStatus: 'accepted' })])).toEqual([]);
  });

  it('finds a freshly created meeting', () => {
    const fresh = m('new', 3, 10, { modifiedAt: NOW - 60_000 });
    expect(diff([m('a', 2)], [m('a', 2), fresh])).toEqual([
      { kind: 'new', uid: 'new', instances: [{ meeting: fresh, previous: null }] },
    ]);
  });

  it('treats a meeting without LAST-MODIFIED as new', () => {
    expect(summary(diff([], [m('x', 3, 10, { modifiedAt: null })]))).toEqual([['new', 'x', 1]]);
  });

  it('does not call an old meeting new just because the next day entered the window', () => {
    const nextWeek = { start: local(2026, 10, 2), end: local(2026, 10, 9) };
    const old = m('old', 8);
    expect(diff([m('a', 2)], [m('a', 2), old], { currentRange: nextWeek, now: local(2026, 10, 2, 7) })).toEqual([]);
  });

  it('does not call new an instance of a series it already knows', () => {
    expect(diff([m('series', 2)], [m('series', 2), m('series', 6, 10, { modifiedAt: NOW })])).toEqual([]);
  });

  it('groups the instances of a new series into one change', () => {
    const recent = { modifiedAt: NOW - 60_000 };
    expect(summary(diff([], [m('weekly', 2, 10, recent), m('weekly', 6, 10, recent)]))).toEqual([['new', 'weekly', 2]]);
  });

  it('ignores meetings that are already over', () => {
    expect(diff([], [m('past', 1, 5, { modifiedAt: NOW })])).toEqual([]);
  });

  it('reports a moved meeting together with its previous version', () => {
    const before = m('a', 2, 10);
    const after = m('a', 2, 12);
    expect(diff([before], [after])).toEqual([{ kind: 'changed', uid: 'a', instances: [{ meeting: after, previous: before }] }]);
  });

  it.each([
    ['title', { title: 'Новое название' }],
    ['location', { location: 'Переговорка 3' }],
    ['call link', { join: { url: 'https://telemost.yandex.ru/j/1', provider: 'Телемост' } }],
  ])('reports a changed %s', (_field, extra) => {
    expect(summary(diff([m('a', 2)], [m('a', 2, 10, extra)]))).toEqual([['changed', 'a', 1]]);
  });

  it('reports a meeting marked as cancelled', () => {
    expect(summary(diff([m('a', 2)], [m('a', 2, 10, { cancelled: true })]))).toEqual([['cancelled', 'a', 1]]);
  });

  it('reports a meeting that disappeared from the calendar as cancelled', () => {
    const [change] = diff([m('a', 2), m('gone', 3)], [m('a', 2)]);
    expect(change).toMatchObject({ kind: 'cancelled', uid: 'gone' });
    expect(change!.instances[0]!.meeting.cancelled).toBe(true);
  });

  it('reports a single instance removed from a series as cancelled', () => {
    expect(summary(diff([m('s', 2), m('s', 5)], [m('s', 2)]))).toEqual([['cancelled', 's', 1]]);
  });

  it('does not report disappearances in the past, outside the shared range or in other calendars', () => {
    const shorterHorizon = { start: local(2026, 10, 1), end: local(2026, 10, 4) };
    expect(diff([m('past', 1, 5)], [])).toEqual([]);
    expect(diff([m('far', 6)], [], { currentRange: shorterHorizon })).toEqual([]);
    expect(diff([m('other', 3, 10, { calendarHref: '/room/' })], [])).toEqual([]);
  });

  it('pairs old and new instances when a series gets a new schedule', () => {
    const changes = diff([m('s', 2, 10), m('s', 5, 10)], [m('s', 3, 11), m('s', 6, 11)]);
    expect(summary(changes)).toEqual([['changed', 's', 2]]);
    expect(changes[0]!.instances.map(({ meeting, previous }) => [meeting.key, previous?.key])).toEqual([
      ['s|3', 's|2'],
      ['s|6', 's|5'],
    ]);
  });
});
