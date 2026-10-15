# Handoff

**От:** QA + Security · **Кому:** пользователю (выпуск) и Senior Engineer (следующее замечание)
**Дата:** 2026-10-15

## Готово
`auth-retry-pause` ([ADR-001](adrs/001-auth-retry-pause.md)): автоматические синхронизации (открытие окна,
настройки, запуск браузера, расписание) после неверного пароля ждут 30 минут; «Обновить» и
ввод/перепроверка пароля идут сразу. Тесты 145/145, сборка ок. Записано в CHANGELOG `[Unreleased]`.
Не выпущено: версия не поднята, тег не поставлен, в Chrome вручную не проверялось.

## Выпуск (когда решит пользователь)
`npm version X.Y.Z --no-git-tag-version`, переименовать `[Unreleased]` в CHANGELOG, тег `vX.Y.Z`, пуш —
CI создаст релиз; затем загрузка в Chrome Web Store (`decisions/devops/meetings-extension.md`).

## Следующее
Замечание 2 — гонка вокруг inbox (`decisions/senior-engineer/meetings-extension.md`): `recordChanges`
читает и пишет `inboxItem`, popup одновременно очищает его.
