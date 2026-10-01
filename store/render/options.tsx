import './clock';
import { render } from 'preact';
import { browser } from 'wxt/browser';
import '../../src/ui/base.css';
import '../../src/entrypoints/options/style.css';
import { Options } from '../../src/entrypoints/options/Options';
import { ACCOUNT, PREFERENCES, SNAPSHOT } from './demo';
import { reportReady } from './frame';

// ?demo=onboarding | connected
const demo = new URLSearchParams(location.search).get('demo') ?? 'connected';

await browser.storage.local.set({
  account: demo === 'onboarding' ? null : ACCOUNT,
  preferences: PREFERENCES,
  snapshot: SNAPSHOT,
});
render(<Options />, document.getElementById('app')!);
if (demo === 'onboarding') await fillConnectForm();
void reportReady();

/** Форма подключения «в процессе заполнения»: так на картинке видна активная кнопка. */
async function fillConnectForm() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const values: Record<string, string> = { email: ACCOUNT.login, password: 'demo-app-password' };
  for (const input of document.querySelectorAll<HTMLInputElement>('.connect-form input')) {
    input.value = values[input.type] ?? '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
