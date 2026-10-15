import { fakeBrowser } from 'wxt/testing/fake-browser';
import pkg from '../../package.json';
import type { BackgroundMessage } from '../../src/sync/messages';

// Чего нет в fake-browser: версия для подвала настроек, открытие настроек и ответ фонового скрипта.
fakeBrowser.runtime.getManifest = () => ({ manifest_version: 3, name: pkg.name, version: pkg.version });
fakeBrowser.runtime.openOptionsPage = async () => {};
fakeBrowser.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
  // Окно встреч забирает непросмотренные изменения у фона — отдаём демо-изменения из хранилища.
  if (message?.type !== 'take-inbox') return;
  void fakeBrowser.storage.local.get('inbox').then(({ inbox }) => sendResponse(inbox ?? []));
  return true;
});

export const browser = fakeBrowser;
