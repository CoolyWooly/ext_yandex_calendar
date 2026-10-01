# Политика конфиденциальности

**Расширение «Встречи для Яндекс Календаря»**
Последнее обновление: 1 октября 2026 года

Расширение показывает ваши ближайшие встречи из Яндекс Календаря и напоминает о них. У расширения нет своих серверов: всё, что оно получает, остаётся в вашем браузере.

## Какие данные обрабатываются

- **Почта и пароль приложения Яндекса**, которые вы вводите на странице настроек. Нужны, чтобы загружать ваш календарь.
- **Календари и встречи**: названия календарей, время, название, место и описание встреч, ссылки на созвоны, организатор, число участников и ваш ответ на приглашение.
- **Настройки расширения**: выбранные календари, частота проверки, время напоминаний и т. п.
- **Служебные данные**: какие изменения в календаре вы уже видели и какие напоминания уже показаны.

## Где хранятся данные

Все данные хранятся только в локальном хранилище браузера (`chrome.storage`) на вашем устройстве. Пароль приложения хранится без шифрования, поэтому расширение просит именно пароль приложения: он даёт доступ только к календарю и отзывается в Яндекс ID в один клик.

## Куда передаются данные

Расширение обращается только к серверу Яндекс Календаря `https://caldav.yandex.ru` по защищённому соединению: отправляет почту и пароль приложения для входа и получает список календарей и встреч. Других сетевых запросов расширение не делает.

Расширение **не** передаёт данные разработчику или третьим лицам, **не** продаёт их, **не** использует для рекламы, аналитики или оценки кредитоспособности и **не** читает содержимое открытых вкладок и историю браузера.

По вашему клику расширение открывает в новой вкладке Яндекс Календарь, Яндекс ID или ссылку на созвон из встречи — дальше действуют правила этих сайтов.

## Как удалить данные

- Нажмите «Отключить» на странице настроек — почта и пароль будут удалены.
- Удалите расширение — браузер удалит все его данные.
- Отзовите пароль приложения в [Яндекс ID → Безопасность → Пароли приложений](https://id.yandex.ru/security/app-passwords).

## Связь

Вопросы и сообщения об ошибках: [github.com/CoolyWooly/ext_yandex_calendar/issues](https://github.com/CoolyWooly/ext_yandex_calendar/issues).

Расширение неофициальное и не связано с ООО «Яндекс».

---

# Privacy Policy (English)

**“Встречи для Яндекс Календаря” (Meetings for Yandex Calendar)** shows your upcoming meetings from Yandex Calendar and reminds you about them. The extension has no servers of its own.

- **Data handled:** the Yandex email address and app password you enter in the settings; your calendars and events (time, title, location, description, call links, organizer, attendee count, your RSVP status); extension settings; which changes and reminders you have already seen.
- **Storage:** everything is kept only in the browser's local extension storage (`chrome.storage`) on your device. The app password is stored unencrypted, which is why the extension asks for a calendar-only app password that can be revoked at any time.
- **Transfer:** the extension talks only to Yandex Calendar's CalDAV server `https://caldav.yandex.ru` over HTTPS, to sign in and download your calendars and events. It makes no other network requests. Data is never sent to the developer or any third party, never sold, and never used for advertising, analytics or creditworthiness. The extension does not read your tabs or browsing history.
- **Deletion:** click “Отключить” (Disconnect) in the settings, or uninstall the extension; revoke the app password in Yandex ID.
- **Contact:** [github.com/CoolyWooly/ext_yandex_calendar/issues](https://github.com/CoolyWooly/ext_yandex_calendar/issues).

This is an unofficial extension, not affiliated with Yandex LLC.
