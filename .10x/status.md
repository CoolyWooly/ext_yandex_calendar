# Статус проекта

**Проект:** Встречи для Яндекс Календаря — расширение Chrome (Manifest V3)
**Фаза:** все 4 замечания ревью закрыты, Verification Complete; не выпущено и не запушено
**Обновлено:** 2026-10-15
**Версия:** 1.1.0 (тег `v1.1.0`), ветка `master`

## Последние проверки (2026-10-15, после quality-tooling; Node 26 и 22.12)
- `npm run lint` — чисто
- `npm run typecheck` — без ошибок
- `npm test` — 16 файлов, 163 теста, все проходят
- `npm run build` — ок

## Фичи
| Slug | Что | Фаза |
|---|---|---|
| `meetings-extension` | Расширение целиком: синхронизация, список, напоминания, уведомления, настройки | Delivered v1.1.0 |
| `auth-retry-pause` | Пауза после неверного пароля для всех автоматических синхронизаций | Verification Complete — [ADR-001](adrs/001-auth-retry-pause.md), [QA](reviews/2026-10-15-qa-report.md), [Security](reviews/2026-10-15-security-review.md); в CHANGELOG `[Unreleased]` |
| `inbox-single-writer` | Один писатель списка непросмотренных изменений — фон | Verification Complete — [ADR-002](adrs/002-inbox-single-writer.md); в CHANGELOG `[Unreleased]` |
| `occurrence-limit` | Предел перебора повторений серии 100 000 + предупреждение | Verification Complete; в CHANGELOG `[Unreleased]` |
| `quality-tooling` | Biome, тесты UI, Node 22 и 24 в CI, Dependabot | Verification Complete — [ADR-003](adrs/003-quality-tooling.md); CI на GitHub ещё не запускался |
| `chrome-web-store` | Публикация в Chrome Web Store | В процессе: первая заявка отклонена (Yellow Argon), карточка исправлена в `aecfde4`; повторная отправка не подтверждена |

## Решено
- 2026-10-15: находки discovery подтверждены; разбираем замечания ревью, первым — паузу после неверного пароля.
- 2026-10-15: «Обновить» и новый пароль идут в Яндекс сразу, остальное ждёт паузу (ADR-001).
- 2026-10-15: inbox пишет только фон; окно забирает изменения сообщением `take-inbox` (ADR-002).
- 2026-10-15: предел перебора повторений — 100 000, при достижении — предупреждение в консоли.
- 2026-10-15: линтер и форматтер — Biome; тесты UI — Testing Library + happy-dom; CI на Node 22 и 24; Dependabot (ADR-003).

## Замечания ревью
| # | Замечание | Статус |
|---|---|---|
| 1 | Пауза после неверного пароля обходится | ✅ исправлено (`auth-retry-pause`) |
| 2 | Гонка вокруг inbox | ✅ исправлено (`inbox-single-writer`) |
| 3 | Предел повторений серии от DTSTART | ✅ исправлено (`occurrence-limit`) |
| 4 | Нет тестов UI, линтера, Dependabot | ✅ исправлено (`quality-tooling`) |

## Открытые вопросы к пользователю
1. Хранить ли `.10x/` в публичном репозитории или добавить в `.gitignore`?

## Блокеры
Нет.
