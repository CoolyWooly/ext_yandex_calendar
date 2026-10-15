# meeting-list-redesign — Engineering Manager

**Дата:** 2026-10-15 · Размер: средняя задача (часы).

## План
1. `schedule.ts`: только дни, `title` + `date`; тесты расписания.
2. `MeetingItem` + `style.css`: одна карточка, иконка входа, выделение «скоро»/«идёт» для своих встреч.
3. `Popup`: без главной карточки, «Сейчас» и плашки приглашений; удалить `formatDay`, `InviteIcon`.
4. Тесты окна: дни, отсутствие карточки и плашки, выделение, вход по иконке.
5. lint, typecheck, test, build; вид на демо-странице.
6. README, карточка CWS (`store/listing.md`), CHANGELOG; пересъёмка `screenshot-1`, `screenshot-3`,
   `promo-marquee`.
7. QA/SDE в `.10x`, коммиты.

## Риски
- Пересъёмка картинок идёт в Brave (Chrome в системе нет) — сравнить с прежними на глаз.
