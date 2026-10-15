# meeting-list-redesign — Architect

**Дата:** 2026-10-15 · [ADR-004](../../adrs/004-meeting-list-by-days.md)

## Компоненты
- `src/calendar/schedule.ts` — `buildSchedule(meetings, now, { hideDeclined }) → DaySection[]`.
  `DaySection = { key, title, date, meetings }`. Идущие встречи — в разделе сегодняшнего дня.
  `now` и `needsResponse` удалены (их читало только окно).
- `src/entrypoints/popup/MeetingItem.tsx` — одна карточка; `live`/`soon` только при `isOnMyAgenda`.
- `src/entrypoints/popup/Popup.tsx` — дни подряд; плашки ошибок без изменений.
- `src/entrypoints/popup/style.css` — `.join-icon`, `.meta-soon`, `.meta-live`, `.meeting.live`; стили
  главной карточки и `.button.join` удалены.

## Поток данных
Без изменений: snapshot + ghosts из меток → `buildSchedule` → разделы → `MeetingItem`. Хранилище и фон не
затрагиваются.

## Сбои
Нет новых: чистая функция и разметка. Риск — регрессия вида; закрывается тестами окна и пересъёмкой
демо-страниц.
