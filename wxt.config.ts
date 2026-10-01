import preact from '@preact/preset-vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  imports: false,
  manifest: {
    // Название и описание — те же, что в карточке Chrome Web Store (store/listing.md).
    name: 'Встречи для Яндекс Календаря',
    short_name: 'Встречи',
    description:
      'Ближайшие встречи из Яндекс Календаря в один клик: вход в созвон, напоминания и уведомления о переносах и приглашениях.',
    homepage_url: 'https://github.com/CoolyWooly/ext_yandex_calendar',
    action: { default_title: 'Мои встречи' },
    permissions: ['storage', 'alarms', 'notifications'],
    host_permissions: ['https://caldav.yandex.ru/*'],
  },
  // Расширение ставим в свой Chrome через «Загрузить распакованное», отдельный браузер не нужен.
  webExt: { disabled: true },
  vite: () => ({ plugins: [preact()] }),
});
