# meeting-list-redesign — SDE

**Дата:** 2026-10-15 · Коммиты: `ab3a8c5` (код и тесты), `07b3f3e` (картинки и текст магазина) · [ADR-004](../../adrs/004-meeting-list-by-days.md)

## Что сделано
- `src/calendar/schedule.ts`: `buildSchedule` → `DaySection[]`; у дня `title` («Сегодня», «Завтра»,
  «Четверг») и `date` («8 октября»). Идущие встречи — в сегодняшнем дне. `Schedule`, `now`,
  `needsResponse`, `dayLabel` удалены.
- `src/entrypoints/popup/MeetingItem.tsx`: одна разметка карточки, без `featured`. `live`/`soon` только при
  `isOnMyAgenda`; `soon` ещё и не для событий на весь день (у них нет отсчёта). Отсчёт — первым в подписи,
  у срочной встречи в `<span class="meta-live|meta-soon">`. Вход — `<button class="join-icon">` с `title`
  и `aria-label` «Войти · {провайдер}», `primary` у `live`/`soon`.
- `src/entrypoints/popup/Popup.tsx`: дни подряд, `SectionTitle({ title, date, count })`; без `focus`,
  «Сейчас» и плашки приглашений.
- `style.css`: `.join-icon`, `.meta-soon`, `.meta-live`, `.meeting.live`, `.section-head` 14px, карточка
  выровнена по центру (колонка времени — сверху). Стили главной карточки, `.focus`, `.section-title.now`,
  `.button.join` удалены.
- Удалены ставшие ненужными `formatDay` (+ тесты) и `InviteIcon`.
- README, `store/listing.md`, CHANGELOG `[Unreleased]` → «Изменено»; пересняты `screenshot-1-meetings`,
  `screenshot-3-changes`, `promo-marquee-1400x560` (Brave через `CHROME_PATH` — Chrome в системе нет).

## Отклонения от плана
- `tabIndex` на `<article>` раньше передавался через spread и не попадал под Biome; теперь атрибуты
  записаны явно, правило `noNoninteractiveTabindex` отключено строкой `biome-ignore` с причиной: карточка
  открывает встречу по Enter, а `role="button"` нельзя — внутри кнопка входа.

## Техдолг
- Вложенная интерактивность (кнопка в фокусируемой карточке) — как и раньше; полноценная доступность
  потребовала бы ссылку-заголовок вместо кликабельной карточки.
- Сцена магазина «Все изменения на виду» обещает «Приглашения, которые ждут ответа», а метка «нужно
  ответить» в кадр не попадает (раньше было видно плашку).
