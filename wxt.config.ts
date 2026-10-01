import preact from '@preact/preset-vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  imports: false,
  manifest: {
    name: 'Встречи · Яндекс Календарь',
    description: 'Показывает встречи из Яндекс Календаря и напоминает о них',
    permissions: ['storage', 'alarms', 'notifications'],
    host_permissions: ['https://caldav.yandex.ru/*'],
  },
  // Расширение ставим в свой Chrome через «Загрузить распакованное», отдельный браузер не нужен.
  webExt: { disabled: true },
  vite: () => ({ plugins: [preact()] }),
});
