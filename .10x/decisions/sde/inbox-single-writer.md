# SDE — inbox-single-writer

По [ADR-002](../../adrs/002-inbox-single-writer.md), без отклонений от плана.

## Что сделано
- `src/sync/changes.ts` — `withInbox` (очередь промисов в памяти фона); `recordChanges` дописывает inbox под ней; `takeInbox()` отдаёт записи и очищает список.
- `src/sync/messages.ts` — `BackgroundMessage` стал объединением: `sync` | `take-inbox`.
- `src/entrypoints/background.ts` — ответ на `take-inbox`.
- `src/entrypoints/popup/Popup.tsx` — забирает изменения сообщением при открытии и когда `watch` видит непустой inbox; inbox больше не пишет.
- `store/render/fake-browser.ts` — отвечает на `take-inbox` демо-изменениями; сцена «изменения» проверена в браузере: метки «перенесена», «отменена», «новая» на месте, ошибок в консоли нет. Картинки магазина не перегенерировались — интерфейс не менялся.
- CHANGELOG `[Unreleased]`.

## Хранилище
Схема и формат `InboxEntry` не менялись, миграция не нужна.

## Технический долг
Нет нового.
