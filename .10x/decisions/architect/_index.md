# Architect — индекс

## Принципы
- Чистая логика отдельно от браузерных API: `src/calendar/*` — чистые функции, время (`now`) передаётся параметром.
- Состояние — в `chrome.storage`, а не в памяти service worker: он может быть остановлен в любой момент.
- Один оркестратор — `src/entrypoints/background.ts`. Popup и options читают storage напрямую; данные фона (snapshot, history, inbox…) пишет только фон, окно просит его сообщениями `sync` и `take-inbox` (ADR-002).

## Неявные архитектурные решения (кандидаты в ADR)
1. CalDAV + пароль приложения, Basic auth, `credentials: 'omit'`.
2. Без бэкенда: всё хранится в `chrome.storage.local`.
3. Опрос + ctag-кэш на календарь + полная перезагрузка раз в 15 минут.
4. Изменения ищутся сравнением двух снимков на клиенте; «новая» = UID не встречался + LAST-MODIFIED свежий.
5. Напоминания — точные `alarms` на 24 часа вперёд плюс минутный tick как страховка; дедупликация через storage.

## Фичи
- [meetings-extension](meetings-extension.md)
- [auth-retry-pause](auth-retry-pause.md) — пауза после неверного пароля, ADR-001
- [inbox-single-writer](inbox-single-writer.md) — один писатель inbox, ADR-002
