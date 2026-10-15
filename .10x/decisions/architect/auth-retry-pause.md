# Architect — auth-retry-pause

Решение — [ADR-001](../../adrs/001-auth-retry-pause.md).

## Компоненты, которые меняются
- `src/entrypoints/background.ts` — тип `SyncTrigger` (`schedule` / `auto` / `user`) вместо флага `scheduled`; слияние очереди по настойчивости; повод для каждого источника.
- `src/sync/sync.ts` — `nextAutomaticAttempt(snapshot)`: пауза только после неверного пароля; `nextScheduledAttempt` использует её для ветки `auth`.
- `src/sync/messages.ts` — `manual?: boolean` в сообщении `sync`.
- `src/entrypoints/popup/Popup.tsx` — открытие окна шлёт `manual: false`, кнопка «Обновить» — `manual: true`.

## Режимы отказа
- Пароль отозван: одна попытка в 30 минут + клики «Обновить»; новый пароль проверяется сразу.
- Отключение аккаунта во время паузы: снимок очищается сразу (повод `user`), напоминания снимаются.
- Сеть недоступна: как раньше — открытие окна и правка настроек идут сразу, расписание ждёт 2 → 30 минут.
