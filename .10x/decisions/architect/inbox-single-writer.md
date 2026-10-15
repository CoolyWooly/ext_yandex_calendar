# Architect — inbox-single-writer

Решение — [ADR-002](../../adrs/002-inbox-single-writer.md).

## Компоненты, которые меняются
- `src/sync/changes.ts` — замок `withInbox` (цепочка промисов); `recordChanges` пишет inbox под ним; новая `takeInbox()`.
- `src/sync/messages.ts` — сообщение `{ type: 'take-inbox' }`, ответ `InboxEntry[]`.
- `src/entrypoints/background.ts` — обработчик `take-inbox`.
- `src/entrypoints/popup/Popup.tsx` — вместо `inboxItem.setValue([])` — сообщение; `watch` только как сигнал.
- `store/render/fake-browser.ts` — ответ на `take-inbox` для сцены «изменения».

## Владение данными (после изменения)
| Ключ | Пишет |
|---|---|
| `account`, `preferences` | страница настроек (+ фон обновляет список календарей) |
| `snapshot`, `history`, `inbox`, `firedReminders`, `notificationTargets` | только фон |
