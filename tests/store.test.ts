import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { type CalendarInfo, parseCalendarList } from '../src/caldav/client';
import {
  DEFAULT_PREFERENCES,
  defaultCalendarSelection,
  getPreferences,
  parseReminderMinutes,
  updatePreferences,
} from '../src/storage/store';
import propfindCalendars from './fixtures/propfind-calendars.xml?raw';

const calendars = parseCalendarList(propfindCalendars);

const calendar = (name: string, kind: CalendarInfo['kind'] = 'events'): CalendarInfo => ({
  href: `/calendars/u/${name}/`,
  name,
  ctag: null,
  color: null,
  kind,
});

describe('defaultCalendarSelection', () => {
  it('picks the primary calendar and skips meeting rooms and task lists', () => {
    expect(defaultCalendarSelection(calendars)).toEqual([
      '/calendars/user%40example.com/events-36215597/',
    ]);
  });

  it('falls back to the first calendar with events', () => {
    expect(defaultCalendarSelection([calendar('todo', 'tasks'), calendar('work'), calendar('room')])).toEqual([
      '/calendars/u/work/',
    ]);
  });

  it('selects nothing when there are only task lists', () => {
    expect(defaultCalendarSelection([calendar('todo', 'tasks')])).toEqual([]);
  });
});

describe('parseReminderMinutes', () => {
  it.each([
    ['10, 1', [10, 1]],
    ['1 10 10', [10, 1]],
    ['15;5', [15, 5]],
    ['', []],
  ])('parses %j', (input, expected) => {
    expect(parseReminderMinutes(input)).toEqual(expected);
  });

  it.each(['abc', '-5', '2.5', '5000'])('rejects %j', (input) => {
    expect(parseReminderMinutes(input)).toBeNull();
  });
});

describe('preferences', () => {
  beforeEach(() => fakeBrowser.reset());

  it('returns defaults when nothing is saved', async () => {
    expect(await getPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('fills in defaults missing from older saved preferences', async () => {
    await fakeBrowser.storage.local.set({ preferences: { pollMinutes: 5, notify: { reminders: false } } });

    expect(await getPreferences()).toEqual({
      ...DEFAULT_PREFERENCES,
      pollMinutes: 5,
      notify: { ...DEFAULT_PREFERENCES.notify, reminders: false },
    });
  });

  it('merges updates into saved preferences', async () => {
    await updatePreferences({ horizonDays: 3 });
    await updatePreferences({ hideDeclined: false });

    expect(await getPreferences()).toMatchObject({ horizonDays: 3, hideDeclined: false, pollMinutes: 2 });
  });
});
