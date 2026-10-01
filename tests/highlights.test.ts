import { describe, expect, it } from 'vitest';
import type { MeetingChange } from '../src/calendar/diff';
import { buildHighlights } from '../src/calendar/highlights';
import type { Meeting } from '../src/calendar/types';
import { local, meeting } from './helpers';

const m = (key: string, hour: number) =>
  meeting({ key, uid: key, start: local(2026, 10, 2, hour), end: local(2026, 10, 2, hour + 1) });

const change = (kind: MeetingChange['kind'], current: Meeting, previous: Meeting | null = null): MeetingChange => ({
  kind,
  uid: current.uid,
  instances: [{ meeting: current, previous }],
});

describe('buildHighlights', () => {
  it('labels new, moved and otherwise changed meetings', () => {
    const highlights = buildHighlights(
      [
        change('new', m('a', 9)),
        change('changed', m('b', 12), m('b', 10)),
        change('changed', { ...m('c', 14), title: 'Новое' }, m('c', 14)),
      ],
      [m('a', 9), m('b', 12), m('c', 14)],
    );
    expect(Object.fromEntries(highlights.byKey)).toEqual({
      a: { kind: 'new', previousStart: null },
      b: { kind: 'moved', previousStart: local(2026, 10, 2, 10) },
      c: { kind: 'changed', previousStart: null },
    });
  });

  it('keeps the original time when a meeting was moved twice, and "new" stays new', () => {
    const highlights = buildHighlights(
      [
        change('changed', m('b', 12), m('b', 10)),
        change('changed', m('b', 15), m('b', 12)),
        change('new', m('a', 9)),
        change('changed', m('a', 11), m('a', 9)),
      ],
      [m('a', 11), m('b', 15)],
    );
    expect(highlights.byKey.get('b')).toEqual({ kind: 'moved', previousStart: local(2026, 10, 2, 10) });
    expect(highlights.byKey.get('a')).toEqual({ kind: 'new', previousStart: null });
  });

  it('keeps removed meetings as cancelled ghosts, but not those still in the calendar', () => {
    const gone = m('gone', 10);
    const markedCancelled = m('marked', 11);
    const highlights = buildHighlights(
      [change('cancelled', { ...gone, cancelled: true }, gone), change('cancelled', { ...markedCancelled, cancelled: true }, markedCancelled)],
      [{ ...markedCancelled, cancelled: true }],
    );
    expect(highlights.ghosts).toEqual([{ ...gone, cancelled: true }]);
    expect(highlights.byKey.size).toBe(0);
  });
});
