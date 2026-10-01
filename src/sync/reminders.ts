import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { isOnMyAgenda } from '../calendar/schedule';
import type { Meeting } from '../calendar/types';
import type { Preferences, Snapshot } from '../storage/store';

const ALARM_PREFIX = 'remind|';
const MINUTE = 60_000;
/** Будильники ставим на сутки вперёд: дальше их всё равно пересчитает следующая синхронизация. */
const PLAN_AHEAD_MS = 24 * 60 * MINUTE;
/** Напоминание, опоздавшее из-за сна компьютера, ещё показываем первые 5 минут встречи. */
const LATE_GRACE_MS = 5 * MINUTE;
/** Сколько помнить показанные напоминания. */
const FIRED_TTL_MS = 2 * 24 * 60 * MINUTE;

export interface DueReminder {
  meeting: Meeting;
  /** Пороги (минуты до начала), которые этим напоминанием закрываются. */
  offsets: number[];
}

/** Показанные напоминания: `ключ встречи|начало|минуты` → когда показали. */
const firedItem = storage.defineItem<Record<string, number>>('local:firedReminders', { fallback: {} });

export function isReminderAlarm(name: string): boolean {
  return name.startsWith(ALARM_PREFIX);
}

/** Моменты напоминаний в ближайшие сутки, без повторов. */
export function reminderTimes(meetings: Meeting[], offsets: number[], now: number): number[] {
  const times = new Set<number>();
  for (const meeting of meetings.filter(wantsReminder)) {
    for (const minutes of offsets) {
      const at = meeting.start - minutes * MINUTE;
      if (at > now && at <= now + PLAN_AHEAD_MS) times.add(at);
    }
  }
  return [...times].sort((a, b) => a - b);
}

/**
 * Напоминания, которые пора показать: не больше одного на встречу. Если пропущено сразу
 * несколько порогов (встречу создали за 5 минут до начала, компьютер спал), показываем одно
 * и закрываем им все пропущенные.
 */
export function dueReminders(meetings: Meeting[], offsets: number[], fired: Record<string, number>, now: number): DueReminder[] {
  const due: DueReminder[] = [];
  for (const meeting of meetings.filter(wantsReminder)) {
    if (now >= meeting.start + LATE_GRACE_MS) continue;
    const passed = offsets.filter(
      (minutes) => meeting.start - minutes * MINUTE <= now && !(reminderId(meeting, minutes) in fired),
    );
    if (passed.length > 0) due.push({ meeting, offsets: passed });
  }
  return due;
}

/** Ставит будильники на моменты напоминаний и снимает лишние. */
export async function scheduleReminderAlarms(snapshot: Snapshot, preferences: Preferences, now: number): Promise<void> {
  const wanted = preferences.notify.reminders
    ? reminderTimes(snapshot.meetings, preferences.reminderMinutes, now).map((at) => ({ name: `${ALARM_PREFIX}${at}`, at }))
    : [];
  const wantedNames = new Set(wanted.map(({ name }) => name));
  const existing = (await browser.alarms.getAll()).filter((alarm) => isReminderAlarm(alarm.name));
  const existingNames = new Set(existing.map((alarm) => alarm.name));

  for (const alarm of existing) {
    if (!wantedNames.has(alarm.name)) await browser.alarms.clear(alarm.name);
  }
  for (const { name, at } of wanted) {
    if (!existingNames.has(name)) await browser.alarms.create(name, { when: at });
  }
}

/** Напоминания, которые пора показать; сразу помечает их показанными. */
export async function takeDueReminders(snapshot: Snapshot, preferences: Preferences, now: number): Promise<DueReminder[]> {
  if (!preferences.notify.reminders) return [];
  const fired = await firedItem.getValue();
  const due = dueReminders(snapshot.meetings, preferences.reminderMinutes, fired, now);

  const kept = Object.fromEntries(Object.entries(fired).filter(([, shownAt]) => now - shownAt < FIRED_TTL_MS));
  for (const { meeting, offsets } of due) {
    for (const minutes of offsets) kept[reminderId(meeting, minutes)] = now;
  }
  if (due.length > 0 || Object.keys(kept).length !== Object.keys(fired).length) {
    await firedItem.setValue(kept);
  }
  return due;
}

function wantsReminder(meeting: Meeting): boolean {
  return !meeting.allDay && isOnMyAgenda(meeting);
}

/** Начало входит в ключ: перенесённой встрече напоминаем заново. */
function reminderId(meeting: Meeting, minutes: number): string {
  return `${meeting.key}|${meeting.start}|${minutes}`;
}
