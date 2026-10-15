# Staff Engineer — quality-tooling

Решение — [ADR-003](../../adrs/003-quality-tooling.md).

## Стандарты
- Biome `recommended`; формат: ширина 120, 2 пробела, одинарные кавычки, точки с запятой, запятые в конце.
- Нарушения правил исправляем в коде; отключаем правило только с комментарием «почему» рядом (`biome-ignore`).
- Тесты компонентов — `tests/*.test.tsx`, окружение happy-dom только для них.

## План (Engineering Manager)
1. Node 22: `engines`, README, CONTRIBUTING, матрица CI — отдельный коммит.
2. Dependabot — отдельный коммит.
3. Biome: зависимость, `biome.json`, скрипты, шаг CI; исправления правил; переформатирование отдельным коммитом + `.git-blame-ignore-revs`.
4. Тесты UI: окно встреч, затем настройки.
5. CHANGELOG (раздел для разработчиков), CONTRIBUTING (`npm run lint`), состояние `.10x`.
