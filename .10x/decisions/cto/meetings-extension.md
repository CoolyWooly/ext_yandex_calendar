# CTO — meetings-extension

## Стек
- WXT 0.21 (сборка расширений поверх Vite), Manifest V3, только Chrome
- TypeScript 7 (`strict`, `noUncheckedIndexedAccess`), Preact 10
- ical.js 2 (iCalendar, повторения), fast-xml-parser 5 (WebDAV multistatus)
- Vitest 5 + `WxtVitest` (fake browser)
- Node 24 в CI, README требует Node 22+

## Стратегические решения
- **CalDAV + пароль приложения** вместо OAuth/API Яндекса: единственный доступный сторонним клиентам способ читать календарь Яндекс 360.
- **Только чтение**: ответ на приглашения и задачи не поддерживаются.
- **Опрос (polling)** раз в 1/2/5 минут с проверкой ctag: push-уведомлений для CalDAV в браузере нет.

## Риски
- Зависимость от недокументированного поведения CalDAV Яндекса (смешанные XML-префиксы, приглашения через рассылку без ATTENDEE, `todos-` в путях).
- Модерация Chrome Web Store: первая заявка отклонена за перечень сервисов видеосвязи (Yellow Argon).
- Пароль приложения хранится без шифрования — принятый и задокументированный риск (SECURITY.md).
