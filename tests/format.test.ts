import { describe, expect, it } from 'vitest';
import { describeTimeColumn, formatDay } from '../src/ui/format';
import { local, meeting } from './helpers';

describe('describeTimeColumn', () => {
  it('показывает начало и конец обычной встречи', () => {
    const item = meeting({ start: local(2026, 10, 1, 8, 30), end: local(2026, 10, 1, 9) });
    expect(describeTimeColumn(item)).toEqual({ start: '08:30', end: '09:00', until: null });
  });

  it('событие на весь день — без времени', () => {
    const item = meeting({ start: local(2026, 10, 1), end: local(2026, 10, 2), allDay: true });
    expect(describeTimeColumn(item)).toEqual({ start: 'весь день', end: null, until: null });
  });

  it('многодневное событие на весь день — с последним днём', () => {
    const item = meeting({ start: local(2026, 10, 1), end: local(2026, 10, 4), allDay: true });
    expect(describeTimeColumn(item)).toMatchObject({ start: 'весь день', until: 'до 3 окт.' });
  });

  it('встреча через полночь — с днём окончания', () => {
    const item = meeting({ start: local(2026, 10, 1, 22), end: local(2026, 10, 2, 2) });
    expect(describeTimeColumn(item)).toEqual({ start: '22:00', end: '02:00', until: 'до 2 окт.' });
  });

  it('встреча до полуночи остаётся в своём дне', () => {
    const item = meeting({ start: local(2026, 10, 1, 23), end: local(2026, 10, 2) });
    expect(describeTimeColumn(item).until).toBeNull();
  });
});

describe('formatDay', () => {
  const now = local(2026, 10, 1, 18);

  it('сегодня и завтра — словами', () => {
    expect(formatDay(local(2026, 10, 1, 9), now)).toBe('Сегодня');
    expect(formatDay(local(2026, 10, 2, 0, 30), now)).toBe('Завтра');
  });

  it('дальше — день недели и дата', () => {
    expect(formatDay(local(2026, 10, 5, 10), now)).toBe('Пн, 5 окт.');
  });
});
