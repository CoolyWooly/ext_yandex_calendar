# Статус проекта

**Проект:** Встречи для Яндекс Календаря — расширение Chrome (Manifest V3)
**Фаза:** `meeting-list-redesign` — Verification Complete, запушено в `master` 2026-10-15 (`47b6b3d..f40218a`); ничего не выпущено
**Обновлено:** 2026-10-15
**Версия:** 1.1.0 (тег `v1.1.0`), ветка `master`

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
| `meeting-list-redesign` | Список встреч по дням, без карточки «Следующая встреча» и плашки приглашений, вход в созвон иконкой | Verification Complete — [спека](specs/2026-10-15-meeting-list-redesign-design.md), [ADR-004](adrs/004-meeting-list-by-days.md), QA и Security в `reviews/`; в CHANGELOG `[Unreleased]`, картинки магазина пересняты; запушено, CI [38714808439](https://github.com/CoolyWooly/ext_yandex_calendar/actions/runs/38714808439) не проверен |
| `chrome-web-store` | Публикация в Chrome Web Store | В процессе: первая заявка отклонена (Yellow Argon), карточка исправлена в `aecfde4`; повторная отправка не подтверждена |

## Решено
- 2026-10-15: находки discovery подтверждены; разбираем замечания ревью, первым — паузу после неверного пароля.
- 2026-10-15: «Обновить» и новый пароль идут в Яндекс сразу, остальное ждёт паузу (ADR-001).
- 2026-10-15: inbox пишет только фон; окно забирает изменения сообщением `take-inbox` (ADR-002).
- 2026-10-15: предел перебора повторений — 100 000, при достижении — предупреждение в консоли.
- 2026-10-15: линтер и форматтер — Biome; тесты UI — Testing Library + happy-dom; CI на Node 22 и 24; Dependabot (ADR-003).
- 2026-10-15: `.10x/` хранится в публичном репозитории; 18 коммитов отправлены в `origin/master`.
- 2026-10-15: список встреч — только по дням; без карточки «Следующая встреча», раздела «Сейчас» и плашки приглашений; вход в созвон иконкой (макет одобрен, ADR-004).

## Замечания ревью
| # | Замечание | Статус |
|---|---|---|
| 1 | Пауза после неверного пароля обходится | ✅ исправлено (`auth-retry-pause`) |
| 2 | Гонка вокруг inbox | ✅ исправлено (`inbox-single-writer`) |
| 3 | Предел повторений серии от DTSTART | ✅ исправлено (`occurrence-limit`) |
| 4 | Нет тестов UI, линтера, Dependabot | ✅ исправлено (`quality-tooling`) |

## Открытые вопросы к пользователю
- Dependabot открыл 5 PR (#1–#5), CI в них зелёный: `actions/checkout` 5→7, `actions/setup-node` 5→7, `actions/upload-artifact` 4→7, `happy-dom` 20→21, `preact` 10→11. Мажорные версии — разбирать по одному; `preact` 11 затрагивает всё UI.

## Блокеры
Нет.
