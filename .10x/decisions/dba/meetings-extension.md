# DBA — meetings-extension: схема хранилища

Описано в `src/storage/store.ts`, `src/sync/reminders.ts`, `src/ui/notifications.ts`.

| Ключ | Тип | Что | Рост |
|---|---|---|---|
| `local:account` | `Account \| null` | Логин, пароль приложения (открытым текстом), найденные календари, `verifiedAt` | константа |
| `local:preferences` | `Partial<Preferences>` | Настройки; читаются с подстановкой `DEFAULT_PREFERENCES` | константа |
| `local:snapshot` | `Snapshot` | Встречи за диапазон, ctag и время загрузки по календарям, последняя ошибка | ∝ встречам за 1–14 дней |
| `local:history` | `ChangeHistory` | `knownUids` → когда видели (TTL 60 дней), `baselineAt`, `digestDay` | ∝ UID за 60 дней |
| `local:inbox` | `InboxEntry[]` | Непросмотренные изменения, ≤ 50, прошедшие отбрасываются. Пишет только фон, под замком (ADR-002) | ограничен |
| `local:firedReminders` | `Record<string, number>` | Показанные напоминания, TTL 2 дня | ограничен |
| `session:notificationTargets` | `Record<id, {url, buttons}>` | Куда вести по клику на уведомление | ограничен |

## Миграции
Версии схемы нет. Совместимость: `withDefaults` для настроек, `snapshot.login` (снимок старой версии без `login` не сравнивается, первая синхронизация «тихая»). Квота `storage.local` — 10 МБ без `unlimitedStorage`, текущим объёмам хватает с запасом.
