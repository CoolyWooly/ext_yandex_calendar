import './clock';
import { render } from 'preact';
import { browser } from 'wxt/browser';
import '../../src/ui/base.css';
import '../../src/entrypoints/popup/style.css';
import { Popup } from '../../src/entrypoints/popup/Popup';
import { ACCOUNT, INBOX, PREFERENCES, SNAPSHOT } from './demo';
import { reportReady } from './frame';

// ?demo=list | changes | welcome
const demo = new URLSearchParams(location.search).get('demo') ?? 'list';

await browser.storage.local.set({
  account: demo === 'welcome' ? null : ACCOUNT,
  preferences: PREFERENCES,
  snapshot: SNAPSHOT,
  inbox: demo === 'changes' ? INBOX : [],
});
render(<Popup />, document.getElementById('app')!);
void reportReady();
