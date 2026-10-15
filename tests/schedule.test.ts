import { describe, expect, it } from 'vitest';
import { buildSchedule } from '../src/calendar/schedule';
import { local, meeting } from './helpers';

const NOW = local(2026, 10, 1, 10, 0); // четверг, 1 октября, 10:00

describe('buildSchedule', () => {
  const ended = meeting({ uid: 'ended', start: local(2026, 10, 1, 8, 30), end: local(2026, 10, 1, 9, 0) });
  const ongoing = meeting({ uid: 'ongoing', start: local(2026, 10, 1, 9, 45), end: local(2026, 10, 1, 10, 30) });
  const later = meeting({ uid: 'later', start: local(2026, 10, 1, 14, 0), end: local(2026, 10, 1, 15, 0) });
  const tomorrow = meeting({ uid: 'tomorrow', start: local(2026, 10, 2, 11, 0), end: local(2026, 10, 2, 12, 0) });
  const monday = meeting({ uid: 'monday', start: local(2026, 10, 5, 8, 30), end: local(2026, 10, 5, 9, 0) });

  it('drops finished meetings and groups the rest by day, keeping ongoing ones under today', () => {
    const days = buildSchedule([monday, later, ended, tomorrow, ongoing], NOW, { hideDeclined: true });

    expect(days.map((day) => [day.title, day.date, day.meetings.map((m) => m.uid)])).toEqual([
      ['Сегодня', '1 октября', ['ongoing', 'later']],
      ['Завтра', '2 октября', ['tomorrow']],
      ['Понедельник', '5 октября', ['monday']],
    ]);
  });

  it('hides declined meetings only when asked to', () => {
    const declined = meeting({ ...later, uid: 'declined', myStatus: 'declined' });
    expect(buildSchedule([declined], NOW, { hideDeclined: true })).toEqual([]);
    expect(buildSchedule([declined], NOW, { hideDeclined: false })).toHaveLength(1);
  });

  it('puts all-day events first and shows a multi-day event once, starting today', () => {
    const vacation = meeting({ uid: 'vacation', allDay: true, start: local(2026, 9, 30), end: local(2026, 10, 3) });
    const days = buildSchedule([later, vacation, ongoing], NOW, { hideDeclined: true });

    expect(days.map((day) => day.meetings.map((m) => m.uid))).toEqual([['vacation', 'ongoing', 'later']]);
  });
});
