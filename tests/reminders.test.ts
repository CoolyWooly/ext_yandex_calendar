import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Meeting } from '../src/calendar/types';
import { DEFAULT_PREFERENCES, EMPTY_SNAPSHOT, type Preferences, type Snapshot } from '../src/storage/store';
import {
  dueReminders,
  isReminderAlarm,
  reminderTimes,
  scheduleReminderAlarms,
  takeDueReminders,
} from '../src/sync/reminders';
import { local, meeting } from './helpers';

const MINUTE = 60_000;
const START = local(2026, 10, 1, 11, 0);
const OFFSETS = [10, 1];

const standup = meeting({ uid: 's', key: 's|1', title: 'Стендап', start: START, end: START + 30 * MINUTE });
const at = (minutesBeforeStart: number) => START - minutesBeforeStart * MINUTE;
const snapshot = (meetings: Meeting[]): Snapshot => ({ ...EMPTY_SNAPSHOT, meetings, syncedAt: at(60) });
const prefs = (patch: Partial<Preferences> = {}): Preferences => ({ ...DEFAULT_PREFERENCES, reminderMinutes: OFFSETS, ...patch });

describe('reminderTimes', () => {
  it('lists upcoming reminder moments for the next 24 hours', () => {
    const tonight = { ...standup, key: 's|2', start: START + 20 * 60 * MINUTE };
    const tomorrow = { ...standup, key: 's|3', start: START + 24 * 60 * MINUTE };
    expect(reminderTimes([standup, tonight, tomorrow], OFFSETS, at(30))).toEqual([
      at(10),
      at(1),
      tonight.start - 10 * MINUTE,
      tonight.start - MINUTE,
    ]);
  });

  it('skips moments that have passed and meetings that are not mine to attend', () => {
    const skipped = [
      { ...standup, key: 'declined', myStatus: 'declined' as const },
      { ...standup, key: 'cancelled', cancelled: true },
      { ...standup, key: 'all-day', allDay: true },
      { ...standup, key: 'room', myStatus: 'none' as const, organizer: { name: null, email: 'boss@example.com' } },
    ];
    expect(reminderTimes([standup, ...skipped], OFFSETS, at(5))).toEqual([at(1)]);
  });

  it('keeps reminders for personal events without an organizer', () => {
    const personal = { ...standup, myStatus: 'none' as const, organizer: null };
    expect(reminderTimes([personal], [10], at(30))).toEqual([at(10)]);
  });
});

describe('dueReminders', () => {
  it('fires each threshold once, when it comes', () => {
    expect(dueReminders([standup], OFFSETS, {}, at(11))).toEqual([]);
    expect(dueReminders([standup], OFFSETS, {}, at(10))).toEqual([{ meeting: standup, offsets: [10] }]);
    const fired = { [`s|1|${START}|10`]: at(10) };
    expect(dueReminders([standup], OFFSETS, fired, at(5))).toEqual([]);
    expect(dueReminders([standup], OFFSETS, fired, at(1))).toEqual([{ meeting: standup, offsets: [1] }]);
  });

  it('closes several missed thresholds with one reminder', () => {
    expect(dueReminders([standup], OFFSETS, {}, at(0.5))).toEqual([{ meeting: standup, offsets: [10, 1] }]);
  });

  it('still reminds during the first 5 minutes of a meeting, but not later', () => {
    expect(dueReminders([standup], OFFSETS, {}, at(-4))).toHaveLength(1);
    expect(dueReminders([standup], OFFSETS, {}, at(-5))).toEqual([]);
  });

  it('reminds again about a meeting that was moved', () => {
    const fired = { [`s|1|${START}|10`]: at(10) };
    const moved = { ...standup, start: START + 30 * MINUTE, end: START + 60 * MINUTE };
    expect(dueReminders([moved], OFFSETS, fired, moved.start - 10 * MINUTE)).toHaveLength(1);
  });
});

describe('takeDueReminders', () => {
  beforeEach(() => fakeBrowser.reset());

  it('shows a reminder only once', async () => {
    expect(await takeDueReminders(snapshot([standup]), prefs(), at(10))).toHaveLength(1);
    expect(await takeDueReminders(snapshot([standup]), prefs(), at(9))).toEqual([]);
    expect(await takeDueReminders(snapshot([standup]), prefs(), at(1))).toHaveLength(1);
  });

  it('stays quiet when reminders are turned off', async () => {
    const off = prefs({ notify: { ...DEFAULT_PREFERENCES.notify, reminders: false } });
    expect(await takeDueReminders(snapshot([standup]), off, at(10))).toEqual([]);
  });
});

describe('scheduleReminderAlarms', () => {
  beforeEach(() => fakeBrowser.reset());

  const reminderAlarms = async () =>
    (await fakeBrowser.alarms.getAll())
      .filter((alarm) => isReminderAlarm(alarm.name))
      .map((alarm) => alarm.scheduledTime)
      .sort();

  it('sets an alarm for every reminder moment and removes outdated ones', async () => {
    await fakeBrowser.alarms.create('sync', { periodInMinutes: 2 });
    await scheduleReminderAlarms(snapshot([standup]), prefs(), at(30));
    expect(await reminderAlarms()).toEqual([at(10), at(1)]);

    const moved = { ...standup, start: START + 60 * MINUTE, end: START + 90 * MINUTE };
    await scheduleReminderAlarms(snapshot([moved]), prefs(), at(30));
    expect(await reminderAlarms()).toEqual([moved.start - 10 * MINUTE, moved.start - MINUTE]);
    expect(await fakeBrowser.alarms.get('sync')).toBeDefined();
  });

  it('removes all reminder alarms when reminders are turned off', async () => {
    await scheduleReminderAlarms(snapshot([standup]), prefs(), at(30));
    await scheduleReminderAlarms(
      snapshot([standup]),
      prefs({ notify: { ...DEFAULT_PREFERENCES.notify, reminders: false } }),
      at(30),
    );
    expect(await reminderAlarms()).toEqual([]);
  });
});
