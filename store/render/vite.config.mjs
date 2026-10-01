import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Страницы для картинок магазина: настоящие окно встреч и настройки на демо-данных.
 * Вместо API расширения — fake-browser из WXT с хранилищем в памяти.
 */
export default defineConfig({
  root: here('.'),
  plugins: [preact()],
  resolve: {
    alias: {
      'wxt/browser': here('./fake-browser.ts'),
      '@wxt-dev/browser': here('./fake-browser.ts'),
    },
  },
  // Хранилище WXT не пребандлим: иначе Vite вклеит в бандл копию fake-browser.ts и закэширует её.
  optimizeDeps: {
    exclude: ['wxt', '@wxt-dev/storage'],
    include: ['wxt > @wxt-dev/storage > superlock', 'wxt > @webext-core/fake-browser > lodash.merge'],
  },
  server: { port: 5199, strictPort: true, fs: { allow: [here('../..')] } },
});
