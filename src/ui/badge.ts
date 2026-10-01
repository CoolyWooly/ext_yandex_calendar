import { browser } from 'wxt/browser';
import { isOnMyAgenda } from '../calendar/schedule';
import type { Meeting } from '../calendar/types';
import type { Snapshot } from '../storage/store';
import { formatTime, formatWhen } from './format';

export interface BadgeState {
  text: string;
  color: string;
  title: string;
}

const MINUTE = 60_000;
const COUNTDOWN_FROM = 60 * MINUTE;
const IMMINENT = 10 * MINUTE;
const JUST_STARTED = 5 * MINUTE;

const COLOR_SOON = '#4b5bf6';
const COLOR_IMMINENT = '#e8590c';
const COLOR_ALERT = '#d9342b';

const APP_NAME = 'Мои встречи';

/**
 * Значок на иконке, по убыванию важности: «!» при ошибке пароля, «идёт» первые 5 минут
 * встречи, отсчёт последних 10 минут, красный счётчик непросмотренных изменений,
 * отсчёт за час до начала.
 */
export function computeBadge(connected: boolean, snapshot: Snapshot, unseen: number, now: number): BadgeState {
  if (!connected) {
    return { text: '', color: COLOR_SOON, title: `${APP_NAME}\nКалендарь не подключён — откройте настройки` };
  }
  if (snapshot.error?.kind === 'auth') {
    return {
      text: '!',
      color: COLOR_ALERT,
      title: `${APP_NAME}\nЯндекс не принимает пароль приложения — обновите его в настройках`,
    };
  }

  const relevant = snapshot.meetings.filter((meeting) => !meeting.allDay && isOnMyAgenda(meeting));
  const justStarted = relevant.find(
    (meeting) => meeting.start <= now && now < meeting.start + JUST_STARTED && now < meeting.end,
  );
  const next = relevant.find((meeting) => meeting.start > now);
  const title = [
    APP_NAME,
    describeNext(justStarted, next, now),
    unseen > 0 && `Новые изменения: ${unseen} — откройте список`,
    describeError(snapshot),
  ]
    .filter(Boolean)
    .join('\n');

  const untilNext = next ? next.start - now : Infinity;
  const countdown = { text: `${Math.ceil(untilNext / MINUTE)}м`, title };

  if (justStarted) return { text: 'идёт', color: COLOR_ALERT, title };
  if (untilNext <= IMMINENT) return { ...countdown, color: COLOR_IMMINENT };
  if (unseen > 0) return { text: String(unseen), color: COLOR_ALERT, title };
  if (untilNext <= COUNTDOWN_FROM) return { ...countdown, color: COLOR_SOON };
  return { text: '', color: COLOR_SOON, title };
}

export async function applyBadge(state: BadgeState): Promise<void> {
  await Promise.all([
    browser.action.setBadgeText({ text: state.text }),
    browser.action.setBadgeBackgroundColor({ color: state.color }),
    browser.action.setBadgeTextColor({ color: '#ffffff' }),
    browser.action.setTitle({ title: state.title }),
  ]);
}

function describeNext(justStarted: Meeting | undefined, next: Meeting | undefined, now: number): string {
  if (justStarted) return `Началась в ${formatTime(justStarted.start)}: ${justStarted.title}`;
  if (next) return `Следующая ${formatWhen(next.start, now)}: ${next.title}`;
  return 'Ближайших встреч нет';
}

function describeError(snapshot: Snapshot): string | null {
  if (!snapshot.error) return null;
  return snapshot.syncedAt
    ? `Нет связи с календарём, данные на ${formatTime(snapshot.syncedAt)}`
    : 'Нет связи с календарём';
}
