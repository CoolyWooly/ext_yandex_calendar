# Architect — meetings-extension [DISCOVERED]

## Компоненты
| Модуль | Ответственность | Браузерные API |
|---|---|---|
| `caldav/client.ts`, `caldav/multistatus.ts` | PROPFIND списка календарей (ctag, цвет, тип), REPORT `calendar-query` с time-range; типизированные ошибки `CalDavError(auth/not-found/network/server)`; таймаут 20 с | `fetch` |
| `calendar/parse.ts` | ICS → экземпляры `Meeting`: VTIMEZONE, развёртка повторений, исключения RECURRENCE-ID, `myStatus` (в т.ч. приглашение через рассылку — только в основном календаре) | нет |
| `calendar/diff.ts` | Снимок до/после → `new` / `changed` / `cancelled`, сгруппировано по UID; пропавший экземпляр + появившийся с тем же UID = перенос | нет |
| `calendar/schedule.ts`, `highlights.ts`, `links.ts` | Раскладка по дням, «в моих планах», метки в списке, ссылки на созвон и в календарь | нет |
| `sync/sync.ts` | `syncNow`: ctag-кэш, сохранение прежних встреч при ошибке, `nextScheduledAttempt` (пауза после ошибок) | storage |
| `sync/changes.ts` | `recordChanges`: «тихий» baseline, `knownUids` (TTL 60 дней), inbox (≤ 50), дайджест приглашений | storage |
| `sync/reminders.ts` | Будильники `remind|<ts>`, выбор напоминаний к показу, `firedReminders` (TTL 2 дня), grace 5 минут | alarms, storage |
| `ui/badge.ts` | Текст, цвет и подсказка значка по приоритету | action |
| `ui/notifications.ts` | Спецификации уведомлений, цели кликов в `session:` storage, очистка напоминаний | notifications, tabs, action |
| `entrypoints/background.ts` | Оркестрация: alarms `sync`/`tick`/`remind|*`, сообщение `sync`, watch на account/preferences/inbox; сериализация синхронизаций | все |
| `entrypoints/popup`, `entrypoints/options` | UI на Preact | storage, runtime, tabs |

## Поток данных
```
alarm sync / открыт popup / изменены account или preferences
  → runSync (одна за раз, остальные в очередь)
  → syncNow: CalDAV → parse → Snapshot в storage
  → recordChanges: diff → inbox + history
  → describeChanges (+ дайджест) → showNotifications
  → scheduleReminderAlarms → checkReminders → refreshBadge
alarm tick (раз в минуту): refreshBadge → checkReminders
alarm remind|<ts>: checkReminders
```

## Режимы отказа
- Сеть/сервер: прежние встречи остаются, `error.failures++`; по расписанию пауза 2 → 4 → … → 30 минут.
- 401/403: уведомление один раз за «поломку», «!» на значке, по расписанию — раз в 30 минут. Открытие окна и смена настроек синхронизируют сразу, без паузы.
- Битый ICS: событие пропускается, остальные показываются.
- Остановка service worker: очереди в памяти теряются; повторного показа напоминаний не будет благодаря `firedReminders` в storage.
- Сон компьютера: напоминание показывается, если проснулись не позже 5 минут после начала.
- Смена аккаунта: снимок другого логина не сравнивается, первая синхронизация снова «тихая».
