# DevOps — meetings-extension

## CI (`.github/workflows/ci.yml`)
- Триггеры: пуш в `master`, теги `v*`, pull request. Токен по умолчанию — только чтение.
- Job `check` на Node 22 и 24: `npm ci` → `lint` (Biome) → `typecheck` → `test`.
- Job `package` (после `check`, Node 24, `contents: write`): `zip` → артефакт `chrome-extension` (`include-hidden-files`, т.к. `.output` скрытая).
- На тег `vX.Y.Z`: проверка совпадения с версией в `package.json`, `gh release create` с архивом и разделом версии из CHANGELOG.md.
- Dependabot (`.github/dependabot.yml`): npm и GitHub Actions раз в неделю, dev minor/patch — одним PR.

## Выпуск (CONTRIBUTING.md)
1. `npm version X.Y.Z --no-git-tag-version`, раздел в CHANGELOG.md.
2. Коммит, тег `vX.Y.Z`, пуш — CI создаёт релиз.
3. Архив из релиза вручную загружается в панель Chrome Web Store; тексты карточки — `store/listing.md`.

## Chrome Web Store
- Первая заявка отклонена: «Yellow Argon» (злоупотребление ключевыми словами — перечень сервисов видеосвязи).
- `aecfde4` убрал перечень из карточки; README перечень сохраняет — к магазину он не относится.
- Статус повторной отправки неизвестен — вопрос к пользователю. Версия 1.2.0 подготовлена (чек-лист ниже).

## Выпуск 1.2.0 — чек-лист (подготовлено 2026-10-15)
Коммит «Версия 1.2.0»; CI `master` на `f40218a` зелёный (38714808439). Тег `v1.2.0` ещё не поставлен.

**Пакет:** `.output/yandex-calendar-meetings-1.2.0-chrome.zip` (115 КБ, 14 файлов) или тот же архив из
релиза `v1.2.0` после пуша тега. Манифест: версия 1.2.0, разрешения `storage`, `alarms`, `notifications`,
хост `https://caldav.yandex.ru/*` — как в 1.1.0, новых предупреждений у пользователей не будет. В архиве нет
`eval`, удалённых скриптов и source map.

**В панели CWS:**
1. Если прошлая заявка (после отказа Yellow Argon) ещё на проверке — дождаться решения или отменить её.
2. Package → Upload new package → архив 1.2.0.
3. Store listing → Description — заменить целиком текстом из `store/listing.md` (с v1.1.0 текст
   переписан: без перечня сервисов видеосвязи и без «крупной карточки»).
4. Store listing → заменить картинки, изменившиеся с v1.1.0: Screenshot 1 (`screenshot-1-meetings.png`),
   Screenshot 3 (`screenshot-3-changes.png`), Marquee (`promo-marquee-1400x560.png`). Остальные — без изменений.
5. Privacy practices, разрешения, краткое описание (из манифеста) — без изменений.
6. Submit for review.

## Откат
Расширение из архива: поставить архив прошлого релиза. В CWS: загрузить прошлую версию с большим номером (CWS не принимает версию ниже опубликованной).

## Пробелы
- Загрузка в CWS не автоматизирована.
- ~~Dependabot, линтер, проверка на Node 22~~ — закрыто 2026-10-15 (ADR-003).
