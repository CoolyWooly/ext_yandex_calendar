# Handoff

**От:** Engineering Manager + Senior Engineer · **Кому:** SDE
**Дата:** 2026-10-15

## Текущая работа: `meeting-list-redesign`
Дизайн одобрен пользователем по макету: [спека](specs/2026-10-15-meeting-list-redesign-design.md),
[ADR-004](adrs/004-meeting-list-by-days.md). План — `decisions/engineering-manager/meeting-list-redesign.md`:
1. `schedule.ts` → `DaySection[]` с `title`/`date`, идущие встречи в «Сегодня».
2. `MeetingItem` + `style.css`: одна карточка, `.join-icon`, «скоро»/«идёт» только для `isOnMyAgenda`.
3. `Popup` без главной карточки, «Сейчас» и плашки приглашений; удалить `formatDay`, `InviteIcon`.
4. Тесты окна и расписания.
5. Проверки и вид на `store/render/popup.html`.
6. README, `store/listing.md`, CHANGELOG, пересъёмка картинок магазина с окном встреч.

## Не забыть из прошлой работы
- Первый прогон CI с новым workflow не проверен: https://github.com/CoolyWooly/ext_yandex_calendar/actions/runs/38711158754
- Выпуск: `npm version X.Y.Z --no-git-tag-version`, переименовать `[Unreleased]` в CHANGELOG, тег `vX.Y.Z`,
  пуш — CI создаст релиз; затем Chrome Web Store (`decisions/devops/meetings-extension.md`). Ручная проверка
  в Chrome перед выпуском не проводилась.
- `.10x/` хранится в публичном репозитории.
