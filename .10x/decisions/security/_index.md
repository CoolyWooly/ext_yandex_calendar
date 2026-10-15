# Security — индекс

## Модель угроз
- **Секрет:** пароль приложения Яндекса в `chrome.storage.local` без шифрования. Принятый риск: даёт доступ только к календарю, отзывается в один клик (SECURITY.md, PRIVACY.md).
- **Сеть:** только `https://caldav.yandex.ru`, Basic auth в заголовке, `credentials: 'omit'` (без cookie Яндекса и без системного окна логина), `cache: 'no-store'`, таймаут 20 с.
- **Открытие ссылок из календаря:** только из allowlist — https-ссылки известных сервисов созвонов (`src/calendar/links.ts`), ссылка на событие только с `calendar.yandex.*`, иначе `https://calendar.yandex.ru/`. Произвольные URL из описания встречи не открываются.
- **Брутфорс:** неверный пароль автоматически проверяется не чаще раза в 30 минут — по расписанию, при открытии окна, смене настроек, запуске браузера. Сразу — только «Обновить» и ввод/перепроверка пароля ([ADR-001](../../adrs/001-auth-retry-pause.md)).
- **Данные в issue:** шаблоны и CONTRIBUTING просят не прикладывать пароли и настоящие названия встреч.
- **Сообщения об уязвимостях:** GitHub Security Advisories.

## Фичи
- [auth-retry-pause](auth-retry-pause.md)
- [inbox-single-writer](inbox-single-writer.md)
- [quality-tooling](quality-tooling.md)
