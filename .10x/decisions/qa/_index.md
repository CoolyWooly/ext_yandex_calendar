# QA — индекс

## Текущее покрытие
- Vitest 5 + `WxtVitest` (fake browser), 16 файлов, 162 теста — все проходят (2026-10-15, после `meeting-list-redesign`), в CI на Node 22 и 24.
- Модульные тесты на всю логику: CalDAV, разбор ICS, diff, расписание, метки, ссылки, форматирование, значок, уведомления, напоминания, изменения, хранилище, синхронизация.
- Интеграционные тесты фона (`tests/background.test.ts`) с подменённым `fetch`: тихая первая синхронизация, приглашение и счётчик, напоминание и вход в созвон, отсутствие дублей, неверный пароль и восстановление, пауза при отсутствии сети.
- Фикстуры — настоящие ответы Яндекса с заменёнными данными.

## Пробелы
- ~~Нет тестов popup и options~~ — `tests/popup.test.tsx`, `tests/options.test.tsx` (happy-dom).
- Нет проверки в настоящем Chrome (E2E) — только вручную.
- Покрытие не измеряется.

## Фичи
- [auth-retry-pause](auth-retry-pause.md)
- [inbox-single-writer](inbox-single-writer.md)
- [occurrence-limit](occurrence-limit.md)
- [quality-tooling](quality-tooling.md)
- [meeting-list-redesign](meeting-list-redesign.md)
