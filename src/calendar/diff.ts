import type { Meeting, TimeRange } from './types';

export type ChangeKind = 'new' | 'changed' | 'cancelled';

export interface ChangedInstance {
  meeting: Meeting;
  /** Версия до изменения; у новых встреч её нет. */
  previous: Meeting | null;
}

/** Изменения одной встречи или серии: экземпляры сгруппированы по UID. */
export interface MeetingChange {
  kind: ChangeKind;
  uid: string;
  /** Затронутые экземпляры по времени начала. */
  instances: ChangedInstance[];
}

export interface DiffInput {
  previous: Meeting[];
  current: Meeting[];
  previousRange: TimeRange;
  currentRange: TimeRange;
  /** Календари, загруженные и в прошлый, и в этот раз: остальные не сравниваем. */
  calendars: ReadonlySet<string>;
  /** UID встреч, которые уже попадались раньше. */
  knownUids: ReadonlySet<string>;
  previousSyncAt: number;
  now: number;
}

/**
 * Запас на расхождение часов: встреча, изменённая чуть раньше прошлой синхронизации,
 * могла не успеть в неё попасть.
 */
const MODIFIED_GRACE_MS = 60 * 60_000;

export function diffMeetings(input: DiffInput): MeetingChange[] {
  const { now } = input;
  const comparable = (meeting: Meeting) => input.calendars.has(meeting.calendarHref);
  const previousByKey = new Map(input.previous.filter(comparable).map((meeting) => [meeting.key, meeting]));
  const currentByKey = new Map(input.current.filter(comparable).map((meeting) => [meeting.key, meeting]));
  const found: Array<{ kind: ChangeKind; meeting: Meeting; previous: Meeting | null }> = [];

  // Экземпляры, которых раньше не было, по UID: пригодятся, если у серии сменили расписание.
  const appearedByUid = new Map<string, Meeting[]>();

  for (const meeting of currentByKey.values()) {
    if (meeting.end <= now) continue;
    const before = previousByKey.get(meeting.key);
    if (!before) {
      const list = appearedByUid.get(meeting.uid) ?? [];
      list.push(meeting);
      appearedByUid.set(meeting.uid, list);
      // Новая — только если UID не встречался и событие недавно менялось. Иначе это давняя
      // встреча, которая просто попала в окно ближайших дней.
      if (!input.knownUids.has(meeting.uid) && isRecentlyModified(meeting, input.previousSyncAt)) {
        found.push({ kind: 'new', meeting, previous: null });
      }
      continue;
    }
    if (meeting.cancelled && !before.cancelled) {
      found.push({ kind: 'cancelled', meeting, previous: before });
    } else if (!meeting.cancelled && differs(before, meeting)) {
      found.push({ kind: 'changed', meeting, previous: before });
    }
  }

  // Пропавшие экземпляры ищем только там, где оба снимка покрывают одно и то же время.
  const overlapStart = Math.max(input.previousRange.start, input.currentRange.start, now);
  const overlapEnd = Math.min(input.previousRange.end, input.currentRange.end);
  const disappeared = [...previousByKey.values()]
    .filter((before) => !currentByKey.has(before.key) && !before.cancelled)
    .filter((before) => before.start > overlapStart && before.start < overlapEnd)
    .sort((a, b) => a.start - b.start);

  for (const before of disappeared) {
    const replacement = appearedByUid.get(before.uid)?.shift();
    if (replacement) {
      found.push({ kind: 'changed', meeting: replacement, previous: before });
    } else {
      found.push({ kind: 'cancelled', meeting: { ...before, cancelled: true }, previous: before });
    }
  }

  return groupByUid(found);
}

function differs(before: Meeting, after: Meeting): boolean {
  return (
    before.start !== after.start ||
    before.end !== after.end ||
    before.title !== after.title ||
    (before.location ?? '') !== (after.location ?? '') ||
    (before.join?.url ?? '') !== (after.join?.url ?? '')
  );
}

function isRecentlyModified(meeting: Meeting, previousSyncAt: number): boolean {
  return meeting.modifiedAt === null || meeting.modifiedAt >= previousSyncAt - MODIFIED_GRACE_MS;
}

function groupByUid(found: Array<{ kind: ChangeKind; meeting: Meeting; previous: Meeting | null }>): MeetingChange[] {
  const groups = new Map<string, MeetingChange>();
  for (const { kind, meeting, previous } of found) {
    const id = `${kind}|${meeting.uid}`;
    const group = groups.get(id) ?? { kind, uid: meeting.uid, instances: [] };
    group.instances.push({ meeting, previous });
    groups.set(id, group);
  }
  const changes = [...groups.values()];
  for (const change of changes) {
    change.instances.sort((a, b) => a.meeting.start - b.meeting.start);
  }
  return changes.sort((a, b) => a.instances[0]!.meeting.start - b.instances[0]!.meeting.start);
}
