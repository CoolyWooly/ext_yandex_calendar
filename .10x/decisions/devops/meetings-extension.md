# DevOps — meetings-extension

## CI (`.github/workflows/ci.yml`)
- Триггеры: пуш в `master`, теги `v*`, pull request.
- Node 24, `npm ci` → `typecheck` → `test` → `zip` → артефакт `chrome-extension` (`include-hidden-files`, т.к. `.output` скрытая).
- На тег `vX.Y.Z`: проверка совпадения с версией в `package.json`, `gh release create` с архивом и разделом версии из CHANGELOG.md.

## Выпуск (CONTRIBUTING.md)
1. `npm version X.Y.Z --no-git-tag-version`, раздел в CHANGELOG.md.
2. Коммит, тег `vX.Y.Z`, пуш — CI создаёт релиз.
3. Архив из релиза вручную загружается в панель Chrome Web Store; тексты карточки — `store/listing.md`.

## Chrome Web Store
- Первая заявка отклонена: «Yellow Argon» (злоупотребление ключевыми словами — перечень сервисов видеосвязи).
- `aecfde4` убрал перечень из карточки; README перечень сохраняет — к магазину он не относится.
- Статус повторной отправки неизвестен — вопрос к пользователю.

## Откат
Расширение из архива: поставить архив прошлого релиза. В CWS: загрузить прошлую версию с большим номером (CWS не принимает версию ниже опубликованной).

## Пробелы
- Нет Dependabot/Renovate.
- Нет шага линтера.
- Загрузка в CWS не автоматизирована.
- README требует Node 22+, CI собирает на Node 24 — сборка на 22 не проверяется.
