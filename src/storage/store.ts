import { storage } from 'wxt/utils/storage';
import type { CalDavErrorKind, CalendarInfo } from '../caldav/client';
import type { MeetingChange } from '../calendar/diff';
import type { Meeting, TimeRange } from '../calendar/types';

export interface Account {
  login: string;
  appPassword: string;
  /** Календари, найденные при последней успешной проверке подключения. */
  calendars: CalendarInfo[];
  verifiedAt: number;
}

export interface NotifyPreferences {
  newMeetings: boolean;
  changes: boolean;
  needsResponse: boolean;
  reminders: boolean;
}

export interface Preferences {
  /** `null` — пользователь ещё не выбирал; при подключении подставляется основной календарь. */
  selectedCalendars: string[] | null;
  pollMinutes: number;
  /** За сколько минут до начала напоминать, по убыванию. */
  reminderMinutes: number[];
  notify: NotifyPreferences;
  horizonDays: number;
  hideDeclined: boolean;
}

export const POLL_MINUTES_OPTIONS = [1, 2, 5] as const;
export const HORIZON_DAYS_OPTIONS = [1, 3, 7, 14] as const;

export const DEFAULT_PREFERENCES: Preferences = {
  selectedCalendars: null,
  pollMinutes: 2,
  reminderMinutes: [10, 1],
  notify: { newMeetings: true, changes: true, needsResponse: true, reminders: true },
  horizonDays: 7,
  hideDeclined: true,
};

export interface SyncError {
  kind: CalDavErrorKind | 'unknown';
  message: string;
  at: number;
}

export interface CalendarSyncState {
  ctag: string | null;
  /** Период, за который загружены встречи: при смене дня или горизонта грузим заново. */
  rangeKey: string;
  fetchedAt: number;
}

/** Последний результат синхронизации: из него рисуются список и значок. */
export interface Snapshot {
  /** Чьи это встречи: при смене аккаунта старый снимок не сравниваем с новым. */
  login: string | null;
  meetings: Meeting[];
  /** Период, за который загружены встречи. */
  range: TimeRange | null;
  /** Время последней успешной синхронизации. */
  syncedAt: number | null;
  error: SyncError | null;
  calendars: Record<string, CalendarSyncState>;
}

export const EMPTY_SNAPSHOT: Snapshot = {
  login: null,
  meetings: [],
  range: null,
  syncedAt: null,
  error: null,
  calendars: {},
};

export interface ChangeHistory {
  /** UID встреч, которые уже попадались, → когда видели последний раз. */
  knownUids: Record<string, number>;
  /** Когда прошла первая, «тихая» синхронизация: до неё об изменениях не уведомляем. */
  baselineAt: number | null;
  /** День последней сводки по приглашениям без ответа, `YYYY-MM-DD`. */
  digestDay: string | null;
}

export const EMPTY_HISTORY: ChangeHistory = { knownUids: {}, baselineAt: null, digestDay: null };

/** Изменение, которое пользователь ещё не видел в списке встреч. */
export type InboxEntry = MeetingChange & { at: number };

export const accountItem = storage.defineItem<Account | null>('local:account', { fallback: null });

export const snapshotItem = storage.defineItem<Snapshot>('local:snapshot', { fallback: EMPTY_SNAPSHOT });

export const historyItem = storage.defineItem<ChangeHistory>('local:history', { fallback: EMPTY_HISTORY });

export const inboxItem = storage.defineItem<InboxEntry[]>('local:inbox', { fallback: [] });

const preferencesItem = storage.defineItem<Partial<Preferences>>('local:preferences', {
  fallback: {},
});

export async function getPreferences(): Promise<Preferences> {
  return withDefaults(await preferencesItem.getValue());
}

export async function updatePreferences(patch: Partial<Preferences>): Promise<Preferences> {
  const next = { ...(await getPreferences()), ...patch };
  await preferencesItem.setValue(next);
  return next;
}

export function watchPreferences(callback: (preferences: Preferences) => void): () => void {
  return preferencesItem.watch((stored) => callback(withDefaults(stored)));
}

/**
 * Календари по умолчанию — только основной («Мои события»), чтобы не получать
 * уведомления о каждой брони переговорок и чужих календарях.
 */
export function defaultCalendarSelection(calendars: CalendarInfo[]): string[] {
  const eventCalendars = calendars.filter((calendar) => calendar.kind === 'events');
  const primary = eventCalendars.find((calendar) => /^(мои события|my events)$/i.test(calendar.name));
  const fallback = primary ?? eventCalendars[0];
  return fallback ? [fallback.href] : [];
}

/** Разбирает ввод вида «10, 1» в список минут; `null`, если ввод некорректный. */
export function parseReminderMinutes(input: string): number[] | null {
  const parts = input.split(/[\s,;]+/).filter(Boolean);
  const minutes = parts.map(Number);
  if (minutes.some((value) => !Number.isInteger(value) || value < 0 || value > 24 * 60)) {
    return null;
  }
  return [...new Set(minutes)].sort((a, b) => b - a);
}

function withDefaults(stored: Partial<Preferences>): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    notify: { ...DEFAULT_PREFERENCES.notify, ...stored.notify },
  };
}
