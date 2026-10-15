# SDE — quality-tooling

По [ADR-003](../../adrs/003-quality-tooling.md). Коммиты по шагам плана:

| Шаг | Что |
|---|---|
| Node 22 | `engines.node: ">=22.12"`, README и CONTRIBUTING — «22.12», CI: job `check` на Node 22 и 24, job `package` на 24 после него |
| Dependabot | `.github/dependabot.yml`: npm (dev minor/patch одной группой) и GitHub Actions, раз в неделю |
| Biome | `@biomejs/biome@2.5.15` (точная версия — форматтер меняется между версиями), `biome.jsonc`, `npm run lint` / `npm run format`, шаг в CI |
| Замечания линтера | `type="button"` у 10 кнопок; `title` у iframe и `aria-hidden` у svg в `store/render`; лишние импорт и константа; `forEach` → `for…of`; `biome-ignore` для `role="switch"` на нативном checkbox с причиной |
| Форматирование | Отдельный коммит `577932d` (28 файлов, только переносы, запятые, порядок импортов), он в `.git-blame-ignore-revs` |
| Тесты UI | `@testing-library/preact`, `happy-dom@^20.14.6`; `tests/popup.test.tsx` (8), `tests/options.test.tsx` (6) |
| CI | `permissions: contents: read` по умолчанию, `write` только у `package` |

## Отклонения от плана
- Отключены правила Biome: `noNonNullAssertion` (конфликт с принятым `!` при `noUncheckedIndexedAccess`), `noDescendingSpecificity` и `noImportantStyles` (ложные срабатывания на разных элементах и осознанные перекрытия) — причины в `biome.jsonc`.
- `design/` исключена из Biome, как `store/assets` и `public`: это исходники иконок, не код.
- CSS: Biome по умолчанию ставит двойные кавычки — настроены одинарные, как в проекте.
- CHANGELOG не трогали: по CONTRIBUTING туда идут заметные пользователю правки, а это инструменты разработки.

## Технический долг
- happy-dom 21 вышел 2026-10-11 — обновление придёт от Dependabot.
- Предупреждение npm про install-scripts касается `fsevents`, было и до этих изменений.
