# Handoff

**От:** QA + Security · **Кому:** пользователю (выпуск)
**Дата:** 2026-10-15

## Запушено в `master`, не выпущено
- `meeting-list-redesign` (`47b6b3d..f40218a`): список встреч только по дням, без карточки «Следующая
  встреча», раздела «Сейчас» и плашки приглашений; вход в созвон — иконка
  ([спека](specs/2026-10-15-meeting-list-redesign-design.md), [ADR-004](adrs/004-meeting-list-by-days.md)).
  Lint чисто, 162/162 теста, сборка ок. CI: https://github.com/CoolyWooly/ext_yandex_calendar/actions/runs/38714808439
  — результат не проверен.
- Раньше (`aecfde4..47b6b3d`): четыре замечания ревью; их CI 38711158754 зелёный.
- Пересняты картинки магазина с окном встреч и обновлён текст карточки (`store/listing.md`) — при следующей
  отправке в Chrome Web Store загрузить их вместо прежних.

## Что проверить
- Окно в настоящем Chrome: `npm run build`, «Загрузить распакованное» `.output/chrome-mv3`.
- PR Dependabot #1–#5 (мажорные версии Actions, `happy-dom` 21, `preact` 11) — CI зелёный, не смёржены.

## Выпуск
`npm version X.Y.Z --no-git-tag-version`, переименовать `[Unreleased]` в CHANGELOG, тег `vX.Y.Z`, пуш —
CI создаст релиз; затем Chrome Web Store (`decisions/devops/meetings-extension.md`).

## Решено
`.10x/` хранится в публичном репозитории.
