import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import {
  accountItem,
  getPreferences,
  inboxItem,
  type Snapshot,
  snapshotItem,
  watchPreferences,
} from '../storage/store';
import { recordChanges, takeDueDigest, unseenCount } from '../sync/changes';
import type { BackgroundMessage } from '../sync/messages';
import { isReminderAlarm, scheduleReminderAlarms, takeDueReminders } from '../sync/reminders';
import { nextScheduledAttempt, syncNow } from '../sync/sync';
import { applyBadge, computeBadge } from '../ui/badge';
import {
  AUTH_ERROR_NOTIFICATION,
  clearFinishedReminders,
  describeAuthError,
  describeChanges,
  describeDigest,
  describeReminder,
  dismissNotification,
  forgetNotification,
  handleNotificationClick,
  showNotifications,
} from '../ui/notifications';

const SYNC_ALARM = 'sync';
/**
 * Раз в минуту — без запросов к серверу: пересчитываем отсчёт на значке и на всякий случай
 * проверяем напоминания (основные срабатывают по своим точным будильникам).
 */
const TICK_ALARM = 'tick';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    // Сразу после установки ведём на подключение календаря.
    if (reason === 'install') void browser.runtime.openOptionsPage();
    void schedule();
  });
  browser.runtime.onStartup.addListener(() => void schedule());

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM) void runSync({ scheduled: true });
    if (alarm.name === TICK_ALARM) void refreshBadge().then(checkReminders);
    if (isReminderAlarm(alarm.name)) void checkReminders();
  });

  browser.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
    if (message?.type !== 'sync') return;
    void runSync().then(() => sendResponse(true));
    return true;
  });

  browser.notifications.onClicked.addListener((id) => void handleNotificationClick(id));
  browser.notifications.onButtonClicked.addListener((id, index) => void handleNotificationClick(id, index));
  // Только закрытые пользователем: при замене напоминания тем же id Chrome тоже закрывает старое.
  browser.notifications.onClosed.addListener((id, byUser) => {
    if (byUser) void forgetNotification(id);
  });

  // Подключили/отключили аккаунт или поменяли настройки — пересинхронизируемся сразу.
  accountItem.watch(() => void schedule());
  watchPreferences(() => void schedule());
  // Открыли список встреч — изменения просмотрены, счётчик на значке гаснет.
  inboxItem.watch(() => void refreshBadge());
});

async function schedule(): Promise<void> {
  const preferences = await getPreferences();
  await browser.alarms.create(SYNC_ALARM, { periodInMinutes: preferences.pollMinutes });
  await browser.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  await runSync();
}

interface SyncRequest {
  /** По расписанию — после ошибок выдерживаем паузу. Открытие окна и смена настроек — сразу. */
  scheduled: boolean;
}

let running: Promise<void> | null = null;
let queued: SyncRequest | null = null;

/** Одна синхронизация за раз; запрос во время работы выполняется сразу после неё. */
function runSync(request: SyncRequest = { scheduled: false }): Promise<void> {
  if (running) {
    queued = { scheduled: (queued?.scheduled ?? true) && request.scheduled };
    return running;
  }
  running = (async () => {
    try {
      let next: SyncRequest | null = request;
      while (next) {
        queued = null;
        await syncAndNotify(next);
        next = queued;
      }
    } finally {
      running = null;
    }
  })();
  return running;
}

async function syncAndNotify({ scheduled }: SyncRequest): Promise<void> {
  if (scheduled) {
    const [stored, { pollMinutes }] = await Promise.all([snapshotItem.getValue(), getPreferences()]);
    if (Date.now() < nextScheduledAttempt(stored, pollMinutes)) {
      await refreshBadge();
      return;
    }
  }

  const { previous, snapshot } = await syncNow();
  const now = Date.now();
  await reportAuthState(previous, snapshot);
  const changes = await recordChanges(previous, snapshot, now);
  const preferences = await getPreferences();

  const specs = describeChanges(changes, preferences.notify, now);
  if (preferences.notify.needsResponse) {
    const pending = await takeDueDigest(snapshot, now);
    if (pending.length > 0) specs.push(describeDigest(pending, now));
  }
  await showNotifications(specs);
  await scheduleReminderAlarms(snapshot, preferences, now);
  await checkReminders();
  await refreshBadge();
}

/** Об ошибке пароля сообщаем один раз, когда она появилась; после исправления убираем. */
async function reportAuthState(previous: Snapshot, snapshot: Snapshot): Promise<void> {
  if (snapshot.error?.kind !== 'auth') {
    await dismissNotification(AUTH_ERROR_NOTIFICATION);
  } else if (previous.error?.kind !== 'auth') {
    await showNotifications([describeAuthError(browser.runtime.getURL('/options.html'))]);
  }
}

let reminderQueue: Promise<void> = Promise.resolve();

/** Проверки напоминаний идут строго по очереди, чтобы будильник и тик не показали одно дважды. */
function checkReminders(): Promise<void> {
  reminderQueue = reminderQueue.then(remindDue, remindDue);
  return reminderQueue;
}

async function remindDue(): Promise<void> {
  const now = Date.now();
  const [snapshot, preferences] = await Promise.all([snapshotItem.getValue(), getPreferences()]);
  const due = await takeDueReminders(snapshot, preferences, now);
  await showNotifications(due.map(({ meeting }) => describeReminder(meeting, now)));
  await clearFinishedReminders(snapshot, now);
}

async function refreshBadge(): Promise<void> {
  const now = Date.now();
  const [account, snapshot, inbox] = await Promise.all([
    accountItem.getValue(),
    snapshotItem.getValue(),
    inboxItem.getValue(),
  ]);
  await applyBadge(computeBadge(account !== null, snapshot, unseenCount(inbox, now), now));
}
