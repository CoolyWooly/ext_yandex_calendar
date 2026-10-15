# Handoff

**От:** Architect + Staff Engineer · **Кому:** SDE
**Дата:** 2026-10-15
**Фича:** `inbox-single-writer` — [ADR-002](adrs/002-inbox-single-writer.md)

## Задача
Убрать гонку двух писателей `local:inbox`: писать может только фон, окно забирает изменения сообщением.

## План
1. `changes.ts`: замок `withInbox`; `recordChanges` пишет inbox под ним; `takeInbox()` — забрать и очистить под замком.
2. `messages.ts`: `{ type: 'take-inbox' }`; `background.ts`: ответ забранными записями.
3. `Popup.tsx`: забирать сообщением при открытии и когда `watch` видит непустой inbox; не писать inbox.
4. `store/render/fake-browser.ts`: отвечать на `take-inbox` демо-изменениями.
5. Тесты: `takeInbox` отдаёт и очищает; гонка `recordChanges` и `takeInbox` не теряет и не повторяет записи; фоновый тест «счётчик гаснет» через сообщение.
6. CHANGELOG `[Unreleased]`.

## Ранее
`auth-retry-pause` (ADR-001) — готово, не выпущено.
