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

  it('drops finished meetings and splits the rest into "now" and days', () => {
    const schedule = buildSchedule([monday, later, ended, tomorrow, ongoing], NOW, { hideDeclined: true });

    expect(schedule.now.map((m) => m.uid)).toEqual(['ongoing']);
    expect(schedule.days.map((day) => [day.label, day.meetings.map((m) => m.uid)])).toEqual([
      ['Сегодня · четверг, 1 октября', ['later']],
      ['Завтра · пятница, 2 октября', ['tomorrow']],
      ['Понедельник, 5 октября', ['monday']],
    ]);
  });

  it('hides declined meetings only when asked to', () => {
    const declined = meeting({ ...later, uid: 'declined', myStatus: 'declined' });
    expect(buildSchedule([declined], NOW, { hideDeclined: true }).days).toEqual([]);
    expect(buildSchedule([declined], NOW, { hideDeclined: false }).days).toHaveLength(1);
  });

  it('puts all-day events first and shows a multi-day event once, starting today', () => {
    const vacation = meeting({ uid: 'vacation', allDay: true, start: local(2026, 9, 30), end: local(2026, 10, 3) });
    const schedule = buildSchedule([later, vacation], NOW, { hideDeclined: true });

    expect(schedule.now).toEqual([]);
    expect(schedule.days.map((day) => day.meetings.map((m) => m.uid))).toEqual([['vacation', 'later']]);
  });

  it('counts each unanswered series once and ignores cancelled invitations', () => {
    const invite = (uid: string, day: number, cancelled = false) =>
      meeting({
        uid,
        key: `${uid}|${day}`,
        myStatus: 'needs-action',
        cancelled,
        start: local(2026, 10, day, 12),
        end: local(2026, 10, day, 13),
      });
    const schedule = buildSchedule(
      [invite('standup', 1), invite('standup', 5), invite('review', 2), invite('retro', 3, true)],
      NOW,
      { hideDeclined: true },
    );
    expect(schedule.needsResponse).toBe(2);
  });
});
