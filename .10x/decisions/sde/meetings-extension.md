# SDE — meetings-extension: что построено [DISCOVERED]

Версия 1.1.0, ≈ 3 200 строк TS/TSX в `src/` (без CSS), ≈ 1 600 строк тестов, 6 коммитов с 2026-10-01.

| Папка | Строк | Что |
|---|---|---|
| `src/caldav` | ≈ 260 | Клиент CalDAV и разбор multistatus |
| `src/calendar` | ≈ 480 | Разбор ICS, diff, расписание, метки, ссылки |
| `src/sync` | ≈ 340 | Синхронизация, изменения, напоминания |
| `src/ui` | ≈ 650 | Значок, уведомления, форматирование, иконки, общие стили |
| `src/entrypoints` | ≈ 1 280 | Фоновый скрипт, popup, options |
| `store` | — | Карточка CWS: тексты, картинки, рендер на демо-данных (`npm run store:assets`, headless Chrome) |

Технический долг — см. `../senior-engineer/meetings-extension.md` и `../staff-engineer/_index.md`.
