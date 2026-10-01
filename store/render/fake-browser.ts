import { fakeBrowser } from 'wxt/testing/fake-browser';
import pkg from '../../package.json';

// Чего нет в fake-browser: версия для подвала настроек, открытие настроек и ответ фонового скрипта.
fakeBrowser.runtime.getManifest = () => ({ manifest_version: 3, name: pkg.name, version: pkg.version });
fakeBrowser.runtime.openOptionsPage = async () => {};
fakeBrowser.runtime.onMessage.addListener(() => {});

export const browser = fakeBrowser;
