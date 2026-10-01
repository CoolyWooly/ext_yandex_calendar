import type { MeetingChange } from './diff';
import type { Meeting } from './types';

export type HighlightKind = 'new' | 'moved' | 'changed';

export interface Highlight {
  kind: HighlightKind;
  /** Прежнее начало перенесённой встречи. */
  previousStart: number | null;
}

export interface Highlights {
  byKey: Map<string, Highlight>;
  /** Удалённые из календаря встречи: показываем зачёркнутыми, пока список не открыли. */
  ghosts: Meeting[];
}

/** Метки для списка встреч из ещё не просмотренных изменений (в порядке их появления). */
export function buildHighlights(changes: MeetingChange[], current: Meeting[]): Highlights {
  const currentKeys = new Set(current.map((meeting) => meeting.key));
  const byKey = new Map<string, Highlight>();
  const ghosts = new Map<string, Meeting>();

  for (const change of changes) {
    for (const { meeting, previous } of change.instances) {
      const earlier = byKey.get(meeting.key);
      if (change.kind === 'cancelled') {
        byKey.delete(meeting.key);
        if (!currentKeys.has(meeting.key)) ghosts.set(meeting.key, { ...meeting, cancelled: true });
        continue;
      }
      if (change.kind === 'new' || earlier?.kind === 'new') {
        byKey.set(meeting.key, { kind: 'new', previousStart: null });
        continue;
      }
      const moved = previous !== null && (previous.start !== meeting.start || previous.end !== meeting.end);
      if (moved) {
        // Перенесли дважды — показываем самое первое время.
        byKey.set(meeting.key, { kind: 'moved', previousStart: earlier?.previousStart ?? previous.start });
      } else if (!earlier) {
        byKey.set(meeting.key, { kind: 'changed', previousStart: null });
      }
    }
  }

  return { byKey, ghosts: [...ghosts.values()] };
}
