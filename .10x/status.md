# Статус проекта

**Проект:** Встречи для Яндекс Календаря — расширение Chrome (Manifest V3)
**Фаза:** v1.2.0 выпущена на GitHub 2026-10-15 ([релиз](https://github.com/CoolyWooly/ext_yandex_calendar/releases/tag/v1.2.0), CI 38715838266 зелёный); в Chrome Web Store не загружена
**Обновлено:** 2026-10-15
**Версия:** 1.2.0 (тег `v1.2.0`), ветка `master`

## Последние проверки (2026-10-15, после meeting-list-redesign; Node 26)
- `npm run lint` — чисто
- `npm run typecheck` — без ошибок
- `npm test` — 16 файлов, 162 теста, все проходят
- `npm run build` — ок

## Фичи
| Slug | Что | Фаза |
|---|---|---|
| `meetings-extension` | Расширение целиком: синхронизация, список, напоминания, уведомления, настройки | Delivered v1.1.0 |
| `auth-retry-pause` | Пауза после неверного пароля для всех автоматических синхронизаций | Verification Complete — [ADR-001](adrs/001-auth-retry-pause.md), [QA](reviews/2026-10-15-qa-report.md), [Security](reviews/2026-10-15-security-review.md); в CHANGELOG `[Unreleased]` |
| `inbox-single-writer` | Один писатель списка непросмотренных изменений — фон | Verification Complete — [ADR-002](adrs/002-inbox-single-writer.md); в CHANGELOG `[Unreleased]` |
| `occurrence-limit` | Предел перебора повторений серии 100 000 + предупреждение | Verification Complete; в CHANGELOG `[Unreleased]` |
| `quality-tooling` | Biome, тесты UI, Node 22 и 24 в CI, Dependabot | Verification Complete — [ADR-003](adrs/003-quality-tooling.md); первый прогон CI на GitHub [38711158754](https://github.com/CoolyWooly/ext_yandex_calendar/actions/runs/38711158754) — зелёный (check 22, check 24, package) |
| `meeting-list-redesign` | Список встреч по дням, без карточки «Следующая встреча» и плашки приглашений, вход в созвон иконкой | Verification Complete — [спека](specs/2026-10-15-meeting-list-redesign-design.md), [ADR-004](adrs/004-meeting-list-by-days.md), QA и Security в `reviews/`; в CHANGELOG `[Unreleased]`, картинки магазина пересняты; запушено, CI [38714808439](https://github.com/CoolyWooly/ext_yandex_calendar/actions/runs/38714808439) зелёный; входит в 1.2.0 |
| `chrome-web-store` | Публикация в Chrome Web Store | В процессе: первая заявка отклонена (Yellow Argon), карточка исправлена в `aecfde4`; повторная отправка не подтверждена. 1.2.0 выпущена на GitHub, загрузка в CWS — за пользователем, чек-лист в `decisions/devops/meetings-extension.md` |

## Решено
- 2026-10-15: находки discovery подтверждены; разбираем замечания ревью, первым — паузу после неверного пароля.
- 2026-10-15: «Обновить» и новый пароль идут в Яндекс сразу, остальное ждёт паузу (ADR-001).
- 2026-10-15: inbox пишет только фон; окно забирает изменения сообщением `take-inbox` (ADR-002).
- 2026-10-15: предел перебора повторений — 100 000, при достижении — предупреждение в консоли.
- 2026-10-15: линтер и форматтер — Biome; тесты UI — Testing Library + happy-dom; CI на Node 22 и 24; Dependabot (ADR-003).
- 2026-10-15: `.10x/` хранится в публичном репозитории; 18 коммитов отправлены в `origin/master`.
- 2026-10-16: слиты все 6 PR Dependabot (#1–#6): `actions/checkout`, `actions/setup-node`, `actions/upload-artifact` → v7, `vitest` 5.0.4, `happy-dom` 21, `preact` 11. preact 11 проверен поверх `master`: тесты, сборка и все сцены магазина отрисовываются байт в байт как с preact 10. CI `master` 38844746042 зелёный. В выпущенной 1.2.0 ещё preact 10.
- 2026-10-15: список встреч — только по дням; без карточки «Следующая встреча», раздела «Сейчас» и плашки приглашений; вход в созвон иконкой (макет одобрен, ADR-004).

## Замечания ревью
| # | Замечание | Статус |
|---|---|---|
| 1 | Пауза после неверного пароля обходится | ✅ исправлено (`auth-retry-pause`) |
| 2 | Гонка вокруг inbox | ✅ исправлено (`inbox-single-writer`) |
| 3 | Предел повторений серии от DTSTART | ✅ исправлено (`occurrence-limit`) |
| 4 | Нет тестов UI, линтера, Dependabot | ✅ исправлено (`quality-tooling`) |

## Открытые вопросы к пользователю
Нет.

## Блокеры
Нет.
