# Handoff

**От:** QA + Security · **Кому:** пользователю (выпуск) и Senior Engineer (следующее замечание)
**Дата:** 2026-10-15

## Готово, не выпущено
- `auth-retry-pause` ([ADR-001](adrs/001-auth-retry-pause.md)) — пауза после неверного пароля для всех автоматических синхронизаций.
- `inbox-single-writer` ([ADR-002](adrs/002-inbox-single-writer.md)) — inbox пишет только фон; окно забирает изменения сообщением `take-inbox`.
- `occurrence-limit` — предел перебора повторений серии 100 000 и предупреждение в консоли вместо молчаливого обрыва.

Тесты 149/149, сборка ок, все три правки в CHANGELOG `[Unreleased]`. Версия не поднята, тег не поставлен, в Chrome вручную не проверялось.

## Выпуск (когда решит пользователь)
`npm version X.Y.Z --no-git-tag-version`, переименовать `[Unreleased]` в CHANGELOG, тег `vX.Y.Z`, пуш —
CI создаст релиз; затем загрузка в Chrome Web Store (`decisions/devops/meetings-extension.md`).

## Следующее
Замечание 4 — нет тестов окна встреч и настроек, нет линтера/форматтера, нет Dependabot; README обещает
Node 22, CI проверяет только Node 24 (`decisions/staff-engineer/_index.md`, `decisions/devops/meetings-extension.md`).
Это несколько независимых кусков — стоит решить с пользователем, какие брать.
