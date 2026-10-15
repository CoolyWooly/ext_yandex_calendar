# ADR-003: Инструменты качества — Biome, тесты UI, Node 22 и 24 в CI, Dependabot

**Status:** Accepted
**Date:** 2026-10-15
**Feature:** quality-tooling
**Author:** 10x-Team (Staff Engineer + DevOps + QA)

## Context
Ревью при discovery (замечание 4): стиль держится на дисциплине — нет линтера и форматтера; окно встреч и
настройки (≈ 1 100 строк) не покрыты тестами; README обещает Node 22+, а CI собирает только на Node 24;
зависимости обновляются вручную. При этом Vitest 5 и Vite 8 требуют Node ≥ 22.12, а TypeScript 7 (нативный)
не содержит JS API компилятора (`createSourceFile`), на котором построен typescript-eslint.

## Decision
1. **Biome** — линтер и форматтер в одном инструменте, `biome.json` в корне. Формат под текущий стиль:
   ширина 120, пробелы по 2, одинарные кавычки, точки с запятой, запятые в конце. Правила — `recommended`.
   `npm run lint` (проверка, в CI) и `npm run format` (исправление). Массовое переформатирование — отдельным
   коммитом, его хеш — в `.git-blame-ignore-revs`.
2. **Тесты UI** — `@testing-library/preact` + `happy-dom`, окружение включается только в файлах
   `tests/*.test.tsx` комментарием `@vitest-environment happy-dom`; остальные тесты остаются в Node.
3. **CI** — job `check` на Node 22 и 24 (lint, typecheck, test); job `package` после него на Node 24 (zip,
   артефакт, релиз по тегу). `engines.node: ">=22.12"` в `package.json`, README и CONTRIBUTING — «22.12».
4. **Dependabot** — раз в неделю: npm (dev-зависимости одной группой для minor/patch) и GitHub Actions.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| ESLint + typescript-eslint + Prettier | Стандарт де-факто, больше правил | typescript-eslint требует JS API TypeScript, которого нет в TS 7 — нужна вторая копия TS; три инструмента | Несовместимо с TS 7 без обходов |
| Prettier + Oxlint | Prettier — эталон, код уже почти в его стиле | Два инструмента, два конфига | Пользователь выбрал Biome |
| jsdom вместо happy-dom | Ближе к браузеру | Тяжелее, требует Node ≥ 22.22 | Для Preact-компонентов happy-dom достаточно |
| Матрица CI на всех шагах, включая zip | Проще workflow | Два одинаковых артефакта, гонка за релиз | Сборка и релиз — один раз на Node 24 |

## Consequences

### Positive
- Стиль и типичные ошибки проверяются автоматически, в том числе в PR.
- Окно встреч и настройки покрыты тестами — регрессии UI ловятся до выпуска.
- Обещание README про версию Node проверяется в CI.

### Negative
- Новые dev-зависимости: `@biomejs/biome`, `@testing-library/preact`, `happy-dom`.
- Разовый коммит переформатирования портит `git blame` — смягчено `.git-blame-ignore-revs`.
- Dependabot будет открывать PR еженедельно.

### Risks
- Форматтер Biome совместим с Prettier не на 100% — разницу видно в коммите переформатирования.
- happy-dom отличается от Chrome — тесты UI проверяют логику и разметку, не вёрстку.

## Dependencies
- Workflow `.github/workflows/ci.yml` (релиз по тегу сохраняется без изменений поведения).
