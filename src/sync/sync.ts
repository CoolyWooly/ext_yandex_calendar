import { CalDavClient, CalDavError, type CalendarInfo, type Credentials } from '../caldav/client';
import { parseCalendarObject } from '../calendar/parse';
import { addDays, startOfDay } from '../calendar/schedule';
import type { Meeting, TimeRange } from '../calendar/types';
import {
  type Account,
  accountItem,
  type CalendarSyncState,
  defaultCalendarSelection,
  EMPTY_SNAPSHOT,
  getPreferences,
  type Snapshot,
  snapshotItem,
  type SyncError,
} from '../storage/store';

/** Даже если ctag не менялся, раз в 15 минут перезагружаем встречи — на случай, если сервер его не обновил. */
const FULL_REFRESH_MS = 15 * 60_000;

type CalendarClient = Pick<CalDavClient, 'listCalendars' | 'fetchEvents'>;

export interface SyncOptions {
  now?: number;
  createClient?: (credentials: Credentials) => CalendarClient;
}

export interface SyncResult {
  /** Снимок до синхронизации — с ним сравниваем, чтобы найти изменения. */
  previous: Snapshot;
  snapshot: Snapshot;
}

/** Период загрузки: с начала сегодняшнего дня на `horizonDays` дней вперёд. */
export function syncRange(now: number, horizonDays: number): TimeRange {
  const start = startOfDay(now);
  return { start, end: addDays(start, horizonDays) };
}

/**
 * Загружает встречи выбранных календарей и сохраняет снимок. Календарь, у которого
 * не изменился ctag, повторно не скачивается. При ошибке остаются прежние встречи.
 */
export async function syncNow(options: SyncOptions = {}): Promise<SyncResult> {
  const now = options.now ?? Date.now();
  const createClient = options.createClient ?? ((credentials) => new CalDavClient(credentials));
  const [account, preferences, stored] = await Promise.all([
    accountItem.getValue(),
    getPreferences(),
    snapshotItem.getValue(),
  ]);

  if (!account) {
    await snapshotItem.setValue(EMPTY_SNAPSHOT);
    return { previous: stored, snapshot: EMPTY_SNAPSHOT };
  }

  // Снимок другого аккаунта (или от старой версии расширения без поля login) не используем.
  const previous = stored.login === account.login ? stored : EMPTY_SNAPSHOT;

  const range = syncRange(now, preferences.horizonDays);
  const rangeKey = `${range.start}-${range.end}`;
  let snapshot: Snapshot;

  try {
    const client = createClient(account);
    const calendars = await client.listCalendars();
    await rememberCalendars(account, calendars);

    const selectedHrefs = preferences.selectedCalendars ?? defaultCalendarSelection(calendars);
    const selected = calendars.filter(
      (calendar) => calendar.kind === 'events' && selectedHrefs.includes(calendar.href),
    );
    const primaryHref = defaultCalendarSelection(calendars)[0];

    const meetings: Meeting[] = [];
    const states: Record<string, CalendarSyncState> = {};

    for (const calendar of selected) {
      const cached = previous.calendars[calendar.href];
      const upToDate =
        cached !== undefined &&
        calendar.ctag !== null &&
        cached.ctag === calendar.ctag &&
        cached.rangeKey === rangeKey &&
        now - cached.fetchedAt < FULL_REFRESH_MS;

      if (upToDate) {
        meetings.push(...previous.meetings.filter((meeting) => meeting.calendarHref === calendar.href));
        states[calendar.href] = cached;
        continue;
      }

      const objects = await client.fetchEvents(calendar.href, range);
      for (const object of objects) {
        try {
          meetings.push(
            ...parseCalendarObject(object.ics, {
              calendarHref: calendar.href,
              myEmail: account.login,
              inferGroupInvites: calendar.href === primaryHref,
              range,
            }),
          );
        } catch (error) {
          // Одна битая встреча не должна ломать весь список.
          console.warn('Не удалось разобрать событие', object.href, error);
        }
      }
      states[calendar.href] = { ctag: calendar.ctag, rangeKey, fetchedAt: now };
    }

    snapshot = {
      login: account.login,
      meetings: meetings.sort((a, b) => a.start - b.start),
      range,
      syncedAt: now,
      error: null,
      calendars: states,
    };
  } catch (error) {
    snapshot = { ...previous, error: toSyncError(error, now) };
  }

  await snapshotItem.setValue(snapshot);
  return { previous, snapshot };
}

/** Обновляет список календарей в аккаунте, если он изменился (новый календарь, переименование). */
async function rememberCalendars(account: Account, calendars: CalendarInfo[]): Promise<void> {
  const signature = (list: CalendarInfo[]) => list.map((calendar) => `${calendar.href}|${calendar.name}|${calendar.kind}`).join('\n');
  if (signature(account.calendars) !== signature(calendars)) {
    await accountItem.setValue({ ...account, calendars });
  }
}

function toSyncError(error: unknown, now: number): SyncError {
  if (error instanceof CalDavError) return { kind: error.kind, message: error.message, at: now };
  return { kind: 'unknown', message: error instanceof Error ? error.message : String(error), at: now };
}
