# Staff Engineer — индекс

## Соглашения
- TypeScript `strict` + `noUncheckedIndexedAccess`; явный `!` там, где индекс гарантирован.
- Автоимпорты WXT выключены (`imports: false`) — всё импортируется явно, `browser` из `wxt/browser`.
- Комментарии и тексты интерфейса — на русском, JSDoc объясняет «почему». Названия тестов — на английском.
- Время передаётся параметром `now`, константы с единицами в имени (`*_MS`, `MINUTE`).
- Хранилище — через `storage.defineItem` WXT с `fallback`; настройки читаются через `getPreferences()` с подстановкой значений по умолчанию.
- Тестовые ответы сервера (`tests/fixtures`) — настоящие ответы Яндекса с заменёнными данными.
- Тесты идут в часовом поясе `Asia/Almaty` (UTC+5).
- Заметная правка — строка в CHANGELOG.md (Keep a Changelog, SemVer).

## Пробелы
- Нет линтера и форматтера (ESLint/Prettier/Biome) ни локально, ни в CI — стиль держится на дисциплине.
- Нет версии схемы хранилища: совместимость держится на `withDefaults` и проверке `snapshot.login`.

## Фичи
- [quality-tooling](quality-tooling.md) — Biome, тесты UI, Node 22/24, Dependabot (ADR-003)
