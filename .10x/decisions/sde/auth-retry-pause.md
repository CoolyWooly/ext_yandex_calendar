# SDE — auth-retry-pause

По [ADR-001](../../adrs/001-auth-retry-pause.md), без отклонений от плана.

## Что сделано
- `src/sync/sync.ts` — `nextAutomaticAttempt(snapshot)`: 30 минут после ошибки `auth`, иначе 0. `nextScheduledAttempt` переиспользует её.
- `src/entrypoints/background.ts` — `SyncTrigger` `schedule` / `auto` / `user` вместо `SyncRequest { scheduled }`; очередь сливается по `URGENCY`; `credentialsChanged` сравнивает `login`, `appPassword`, `verifiedAt` (отключение тоже считается изменением).
- `src/sync/messages.ts` — `manual?: boolean`.
- `src/entrypoints/popup/Popup.tsx` — открытие окна шлёт `manual: false`, «Обновить» — `manual: true`.
- README (FAQ), SECURITY.md, CHANGELOG `[Unreleased]`.

## Хранилище
Схема не менялась, миграция не нужна.

## Технический долг
Нет нового.
