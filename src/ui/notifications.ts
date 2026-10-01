import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import type { MeetingChange } from '../calendar/diff';
import { CALENDAR_URL, calendarUrlFor } from '../calendar/links';
import type { Meeting } from '../calendar/types';
import type { NotifyPreferences, Snapshot } from '../storage/store';
import { capitalize, formatDuration, formatTime, formatTimeRange, formatWhen, plural } from './format';

export interface NotificationSpec {
  id: string;
  title: string;
  message: string;
  contextMessage?: string;
  /** Что открыть по клику на уведомление; `null` — окно со списком встреч. */
  url: string | null;
  /** До двух кнопок (ограничение Chrome). */
  buttons: Array<{ title: string; url: string }>;
  requireInteraction: boolean;
}

/** Больше стольких изменений за раз — одно общее уведомление вместо пачки. */
const MAX_SEPARATE = 3;
/** Кнопку «Войти» показываем, если встреча начнётся в ближайший час. */
const JOIN_BUTTON_WINDOW = 60 * 60_000;

const CHANGE_LABELS = {
  new: 'Новая',
  invite: 'Приглашение',
  moved: 'Перенесена',
  changed: 'Изменена',
  cancelled: 'Отменена',
} as const;

/** Уведомления об изменениях с учётом настроек; много изменений сворачиваются в одно. */
export function describeChanges(changes: MeetingChange[], notify: NotifyPreferences, now: number): NotificationSpec[] {
  const wanted = changes.filter((change) => {
    if (change.kind !== 'new') return notify.changes;
    return notify.newMeetings || (notify.needsResponse && needsAnswer(change));
  });
  if (wanted.length > MAX_SEPARATE) return [describeSummary(wanted, now)];
  return wanted.map((change) => describeChange(change, now));
}

export function describeChange(change: MeetingChange, now: number): NotificationSpec {
  const { meeting, previous } = change.instances[0]!;
  // Регулярность новой встречи видна по ней самой; перенос или отмена «серии» — по числу экземпляров.
  const recurring = meeting.recurring;
  const many = change.instances.length > 1;
  const when = capitalize(formatWhen(meeting.start, now));
  const organizer = meeting.myStatus !== 'organizer' ? (meeting.organizer?.name ?? meeting.organizer?.email) : null;
  let title: string;
  let message: string;
  let contextMessage: string | undefined;

  switch (labelOf(change)) {
    case 'invite':
      title = `❓ ${recurring ? 'Приглашение на регулярную встречу' : 'Вас пригласили'}: ${meeting.title}`;
      message = join(when, organizer);
      contextMessage = 'Нужно ответить в календаре';
      break;
    case 'new':
      title = `📅 ${recurring ? 'Новая регулярная встреча' : 'Новая встреча'}: ${meeting.title}`;
      message = join(when, organizer);
      break;
    case 'moved':
      title = `✏️ ${many ? 'Изменилось расписание' : 'Встреча перенесена'}: ${meeting.title}`;
      message =
        previous!.start === meeting.start
          ? `${when} · теперь до ${formatTime(meeting.end)}`
          : `было ${formatWhen(previous!.start, now)} → стало ${formatWhen(meeting.start, now)}`;
      break;
    case 'changed':
      title = `✏️ Встреча изменена: ${meeting.title}`;
      message = join(describeFieldChanges(previous!, meeting), when);
      break;
    case 'cancelled':
      title = `❌ ${many ? 'Отменена регулярная встреча' : 'Встреча отменена'}: ${meeting.title}`;
      message = many ? `${when} и ещё ${describeMore(change.instances.length - 1)}` : when;
      break;
  }

  const buttons: NotificationSpec['buttons'] = [];
  if (meeting.join && change.kind !== 'cancelled' && meeting.start - now <= JOIN_BUTTON_WINDOW) {
    buttons.push({ title: `Присоединиться · ${meeting.join.provider}`, url: meeting.join.url });
  }
  buttons.push({ title: 'Открыть в календаре', url: calendarUrlFor(meeting) });

  return {
    id: `${change.kind}:${change.uid}:${now}`,
    title,
    message,
    contextMessage,
    url: calendarUrlFor(meeting),
    buttons,
    requireInteraction: false,
  };
}

const REMINDER_PREFIX = 'remind:';

/**
 * Напоминание перед началом. Висит, пока его не закроют; у одной встречи одно уведомление —
 * напоминание за минуту заменяет напоминание за 10 минут.
 */
export function describeReminder(meeting: Meeting, now: number): NotificationSpec {
  const startsIn = meeting.start - now;
  const place = meeting.location && !/^https?:\/\//i.test(meeting.location) ? meeting.location : meeting.join?.provider;
  const buttons: NotificationSpec['buttons'] = [];
  if (meeting.join) buttons.push({ title: `Присоединиться · ${meeting.join.provider}`, url: meeting.join.url });
  buttons.push({ title: 'Открыть в календаре', url: calendarUrlFor(meeting) });

  return {
    id: `${REMINDER_PREFIX}${meeting.key}`,
    title: startsIn > 0 ? `⏰ Через ${formatDuration(startsIn)}: ${meeting.title}` : `⏰ Началась: ${meeting.title}`,
    message: join(formatTimeRange(meeting), place),
    contextMessage: meeting.myStatus === 'needs-action' ? 'Вы ещё не ответили на приглашение' : undefined,
    // Клик по напоминанию сразу ведёт в созвон, если он есть.
    url: meeting.join?.url ?? calendarUrlFor(meeting),
    buttons,
    requireInteraction: true,
  };
}

export const AUTH_ERROR_NOTIFICATION = 'auth-error';

/** Яндекс перестал принимать пароль приложения: показываем один раз за всю «поломку». */
export function describeAuthError(optionsUrl: string): NotificationSpec {
  return {
    id: AUTH_ERROR_NOTIFICATION,
    title: '🔑 Яндекс не принимает пароль приложения',
    message: 'Встречи и напоминания не обновляются. Создайте новый пароль приложения для «Календаря» и введите его в настройках.',
    url: optionsUrl,
    buttons: [{ title: 'Открыть настройки', url: optionsUrl }],
    requireInteraction: true,
  };
}

/** Пробное уведомление со страницы настроек — проверить, что система их показывает. */
export function describeTestNotification(): NotificationSpec {
  return {
    id: 'test',
    title: '⏰ Так будут выглядеть напоминания',
    message: 'Уведомления работают. Напоминания перед встречами не исчезают, пока их не закрыть.',
    url: CALENDAR_URL,
    buttons: [],
    requireInteraction: true,
  };
}

/** Ежедневная сводка по приглашениям без ответа. */
export function describeDigest(pending: Meeting[], now: number): NotificationSpec {
  const count = pending.length;
  const lines = pending.slice(0, MAX_SEPARATE).map((meeting) => `${meeting.title} — ${formatWhen(meeting.start, now)}`);
  if (count > MAX_SEPARATE) lines.push(`и ещё ${count - MAX_SEPARATE}`);
  return {
    id: `digest:${now}`,
    title: `❓ ${count} ${plural(count, ['приглашение ждёт', 'приглашения ждут', 'приглашений ждут'])} ответа`,
    message: lines.join('\n'),
    url: count === 1 ? calendarUrlFor(pending[0]!) : null,
    buttons: [{ title: 'Открыть Яндекс Календарь', url: CALENDAR_URL }],
    requireInteraction: false,
  };
}

function describeSummary(changes: MeetingChange[], now: number): NotificationSpec {
  const count = changes.length;
  const lines = changes
    .slice(0, MAX_SEPARATE)
    .map((change) => `${CHANGE_LABELS[labelOf(change)]}: ${change.instances[0]!.meeting.title}`);
  return {
    id: `summary:${now}`,
    title: `📅 В календаре ${count} ${plural(count, ['изменение', 'изменения', 'изменений'])}`,
    message: lines.join('\n'),
    contextMessage: `Ещё ${count - MAX_SEPARATE} — в списке встреч`,
    url: null,
    buttons: [{ title: 'Открыть Яндекс Календарь', url: CALENDAR_URL }],
    requireInteraction: false,
  };
}

function labelOf(change: MeetingChange): keyof typeof CHANGE_LABELS {
  if (change.kind === 'new') return needsAnswer(change) ? 'invite' : 'new';
  if (change.kind === 'cancelled') return 'cancelled';
  const { meeting, previous } = change.instances[0]!;
  return previous && (previous.start !== meeting.start || previous.end !== meeting.end) ? 'moved' : 'changed';
}

function needsAnswer(change: MeetingChange): boolean {
  return change.instances[0]!.meeting.myStatus === 'needs-action';
}

function describeFieldChanges(before: Meeting, after: Meeting): string {
  const parts: string[] = [];
  if (before.title !== after.title) parts.push(`было «${before.title}»`);
  if ((before.location ?? '') !== (after.location ?? '')) parts.push(`место: ${after.location ?? 'не указано'}`);
  if ((before.join?.url ?? '') !== (after.join?.url ?? '')) {
    parts.push(after.join ? 'новая ссылка на созвон' : 'ссылку на созвон убрали');
  }
  return parts.join(' · ');
}

function describeMore(count: number): string {
  return `${count} ${plural(count, ['повторение', 'повторения', 'повторений'])}`;
}

function join(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

// Куда вести по клику: service worker может перезапуститься между показом и кликом.
const targetsItem = storage.defineItem<Record<string, { url: string | null; buttons: string[] }>>(
  'session:notificationTargets',
  { fallback: {} },
);

export async function showNotifications(specs: NotificationSpec[]): Promise<void> {
  if (specs.length === 0) return;
  const targets = await targetsItem.getValue();
  for (const spec of specs) {
    await browser.notifications.create(spec.id, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title: spec.title,
      message: spec.message,
      contextMessage: spec.contextMessage,
      buttons: spec.buttons.map(({ title }) => ({ title })),
      requireInteraction: spec.requireInteraction,
      priority: 2,
    });
    targets[spec.id] = { url: spec.url, buttons: spec.buttons.map(({ url }) => url) };
  }
  await targetsItem.setValue(targets);
}

/** Убирает с экрана напоминания о встречах, которые закончились, отменены или пропали. */
export async function clearFinishedReminders(snapshot: Snapshot, now: number): Promise<void> {
  const targets = await targetsItem.getValue();
  const stale = Object.keys(targets).filter((id) => {
    if (!id.startsWith(REMINDER_PREFIX)) return false;
    const meeting = snapshot.meetings.find((item) => item.key === id.slice(REMINDER_PREFIX.length));
    return !meeting || meeting.cancelled || meeting.end <= now;
  });
  if (stale.length === 0) return;
  for (const id of stale) {
    await browser.notifications.clear(id);
    delete targets[id];
  }
  await targetsItem.setValue(targets);
}

/** Уведомление закрыли — куда оно вело, больше не нужно. */
export async function forgetNotification(id: string): Promise<void> {
  const targets = await targetsItem.getValue();
  if (!(id in targets)) return;
  delete targets[id];
  await targetsItem.setValue(targets);
}

/** Убирает показанное расширением уведомление, если оно ещё на экране. */
export async function dismissNotification(id: string): Promise<void> {
  const targets = await targetsItem.getValue();
  if (!(id in targets)) return;
  await browser.notifications.clear(id);
  delete targets[id];
  await targetsItem.setValue(targets);
}

/** Клик по уведомлению (`buttonIndex` не задан) или по его кнопке. */
export async function handleNotificationClick(id: string, buttonIndex?: number): Promise<void> {
  const targets = await targetsItem.getValue();
  const target = targets[id];
  await browser.notifications.clear(id);
  if (!target) return;
  delete targets[id];
  await targetsItem.setValue(targets);

  const url = buttonIndex === undefined ? target.url : target.buttons[buttonIndex];
  if (url) {
    await browser.tabs.create({ url });
    return;
  }
  try {
    await browser.action.openPopup();
  } catch {
    // Окно расширения можно открыть, только когда есть активное окно браузера.
    await browser.tabs.create({ url: CALENDAR_URL });
  }
}
