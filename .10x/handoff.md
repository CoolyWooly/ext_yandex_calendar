# Handoff

**От:** QA + Security · **Кому:** пользователю (пуш и выпуск)
**Дата:** 2026-10-15

## Готово локально, не запушено: `meeting-list-redesign`
Список встреч только по дням, без карточки «Следующая встреча», раздела «Сейчас» и плашки приглашений;
вход в созвон — иконка ([спека](specs/2026-10-15-meeting-list-redesign-design.md),
[ADR-004](adrs/004-meeting-list-by-days.md)). Коммиты `7ea7afb`, `ab3a8c5`, `07b3f3e` и коммит состояния;
до них не запушен `c618f70`. Lint чисто, 162/162 теста, сборка ок.

Пересняты картинки магазина с окном встреч, обновлён текст карточки (`store/listing.md`, блок «Все встречи
в один клик») — при следующей отправке в Chrome Web Store загрузить их вместо прежних.

## Что проверить
- Окно в настоящем Chrome: `npm run build`, «Загрузить распакованное» `.output/chrome-mv3`.
- CI: первый прогон нового workflow не проверен — https://github.com/CoolyWooly/ext_yandex_calendar/actions/runs/38711158754

## Выпуск
`npm version X.Y.Z --no-git-tag-version`, переименовать `[Unreleased]` в CHANGELOG, тег `vX.Y.Z`, пуш —
CI создаст релиз; затем Chrome Web Store (`decisions/devops/meetings-extension.md`).

## Решено
`.10x/` хранится в публичном репозитории.
