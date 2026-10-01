import { diffMeetings, type MeetingChange } from '../calendar/diff';
import { dayKey } from '../calendar/schedule';
import type { Meeting } from '../calendar/types';
import { historyItem, type InboxEntry, inboxItem, type Snapshot } from '../storage/store';

/** Сколько помнить UID встречи, которая больше не попадается. */
const KNOWN_UID_TTL_MS = 60 * 24 * 60 * 60_000;
const MAX_INBOX_ENTRIES = 50;
/** Сводку по приглашениям без ответа показываем не раньше этого часа. */
const DIGEST_HOUR = 9;

/**
 * Сравнивает снимки до и после синхронизации, запоминает увиденные встречи и складывает
 * изменения в список непросмотренных. Первая синхронизация (после установки, смены аккаунта
 * или обновления расширения) «тихая» — она только запоминает, что уже есть.
 */
export async function recordChanges(previous: Snapshot, current: Snapshot, now: number): Promise<MeetingChange[]> {
  if (current.error || !current.range || current.syncedAt === null) return [];

  const history = await historyItem.getValue();
  const comparable =
    history.baselineAt !== null &&
    previous.syncedAt !== null &&
    previous.range != null &&
    previous.login === current.login;

  const changes = comparable
    ? diffMeetings({
        previous: previous.meetings,
        current: current.meetings,
        previousRange: previous.range!,
        currentRange: current.range,
        calendars: new Set(Object.keys(current.calendars).filter((href) => href in previous.calendars)),
        knownUids: new Set(Object.keys(history.knownUids)),
        previousSyncAt: previous.syncedAt!,
        now,
      })
    : [];

  const knownUids = Object.fromEntries(
    Object.entries(history.knownUids).filter(([, seenAt]) => now - seenAt < KNOWN_UID_TTL_MS),
  );
  for (const meeting of current.meetings) knownUids[meeting.uid] = now;
  await historyItem.setValue({ ...history, knownUids, baselineAt: history.baselineAt ?? now });

  if (changes.length > 0) {
    const inbox = await inboxItem.getValue();
    await inboxItem.setValue(pruneInbox([...inbox, ...changes.map((change) => ({ ...change, at: now }))], now));
  }
  return changes;
}

/** Сколько встреч с непросмотренными изменениями ещё не прошли. */
export function unseenCount(inbox: InboxEntry[], now: number): number {
  const active = pruneInbox(inbox, now);
  return new Set(active.map((entry) => entry.uid)).size;
}

/**
 * Приглашения без ответа для ежедневной сводки: раз в день, после 9:00. Возвращает пустой
 * список, если сводка сегодня уже была или ждать ответа нечему.
 */
export async function takeDueDigest(snapshot: Snapshot, now: number): Promise<Meeting[]> {
  const today = dayKey(now);
  const history = await historyItem.getValue();
  if (history.baselineAt === null || history.digestDay === today || new Date(now).getHours() < DIGEST_HOUR) {
    return [];
  }

  const pending = new Map<string, Meeting>();
  for (const meeting of snapshot.meetings) {
    if (meeting.myStatus !== 'needs-action' || meeting.cancelled || meeting.end <= now) continue;
    if (!pending.has(meeting.uid)) pending.set(meeting.uid, meeting);
  }
  if (pending.size === 0) return [];

  await historyItem.setValue({ ...history, digestDay: today });
  return [...pending.values()];
}

function pruneInbox(entries: InboxEntry[], now: number): InboxEntry[] {
  return entries
    .filter((entry) => entry.instances.some(({ meeting }) => meeting.end > now))
    .slice(-MAX_INBOX_ENTRIES);
}
