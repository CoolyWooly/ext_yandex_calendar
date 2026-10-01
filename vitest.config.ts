import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    // Часовой пояс пользователя (UTC+5): группировка по дням зависит от локального времени.
    env: { TZ: 'Asia/Almaty' },
  },
});
