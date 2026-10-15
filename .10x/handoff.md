# Handoff

**От:** QA + Security · **Кому:** пользователю (пуш и выпуск)
**Дата:** 2026-10-15

## Готово и запушено в `master` (2026-10-15), не выпущено
Все четыре замечания ревью закрыты:
- `auth-retry-pause` ([ADR-001](adrs/001-auth-retry-pause.md)) — пауза после неверного пароля.
- `inbox-single-writer` ([ADR-002](adrs/002-inbox-single-writer.md)) — inbox пишет только фон.
- `occurrence-limit` — предел перебора повторений 100 000 + предупреждение.
- `quality-tooling` ([ADR-003](adrs/003-quality-tooling.md)) — Biome, тесты UI, CI на Node 22 и 24, Dependabot, токен CI только на чтение.

Lint чисто, 163/163 теста (Node 26 и 22.12), сборка ок. Первые три — в CHANGELOG `[Unreleased]`.

## Что проверить
- CI: первый прогон с новым workflow — https://github.com/CoolyWooly/ext_yandex_calendar/actions/runs/38711158754; оба job `check` (Node 22, 24) и `package` должны быть зелёными; Dependabot появился во вкладке Insights → Dependency graph.
- GitHub учитывает `.git-blame-ignore-revs` сам; локально — `git config blame.ignoreRevsFile .git-blame-ignore-revs`.

## Выпуск
`npm version X.Y.Z --no-git-tag-version`, переименовать `[Unreleased]` в CHANGELOG, тег `vX.Y.Z`, пуш —
CI создаст релиз; затем Chrome Web Store (`decisions/devops/meetings-extension.md`). Ручная проверка в Chrome
перед выпуском не проводилась.

## Решено
`.10x/` хранится в публичном репозитории.
