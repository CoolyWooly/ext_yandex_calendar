// Снимает иконки расширения и картинки для Chrome Web Store: npm run store:assets.
// Страницы из store/render открываются в headless Chrome по DevTools Protocol, без лишних зависимостей.
// Путь к Chrome можно задать переменной CHROME_PATH.
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const icon = (src, size, out) => ({ out, url: `?scene=icon&src=${src}&size=${size}`, width: size, height: size, transparent: true });
const shot = (scene, out, width = 1280, height = 800) => ({ out, url: `?scene=${scene}`, width, height });

const SHOTS = [
  icon('small', 16, 'public/icon/16.png'),
  icon('small', 32, 'public/icon/32.png'),
  icon('large', 48, 'public/icon/48.png'),
  icon('large', 128, 'public/icon/128.png'),
  icon('large', 128, 'store/assets/icon-128.png'),
  shot('meetings', 'store/assets/screenshot-1-meetings.png'),
  shot('notifications', 'store/assets/screenshot-2-notifications.png'),
  shot('changes', 'store/assets/screenshot-3-changes.png'),
  shot('settings', 'store/assets/screenshot-4-setup.png'),
  shot('promo-small', 'store/assets/promo-small-440x280.png', 440, 280),
  shot('marquee', 'store/assets/promo-marquee-1400x560.png', 1400, 560),
];

const only = process.argv.slice(2);
const server = await createServer({ configFile: join(ROOT, 'store/render/vite.config.mjs'), logLevel: 'warn' });
await server.listen();
const base = server.resolvedUrls.local[0];
const profile = await mkdtemp(join(tmpdir(), 'store-capture-'));
const chrome = spawn(
  CHROME,
  ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

try {
  const cdp = await connect(await devtoolsUrl(chrome));
  for (const item of SHOTS.filter((shot) => only.length === 0 || only.some((name) => shot.out.includes(name)))) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (method, params) => cdp.send(method, params, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width: item.width, height: item.height, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    if (item.transparent) await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await send('Page.navigate', { url: base + item.url });
    await waitFor(send, 'window.__ready === true');
    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: item.width, height: item.height, scale: 1 },
    });
    const out = join(ROOT, item.out);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(data, 'base64'));
    await cdp.send('Target.closeTarget', { targetId });
    console.log(`✓ ${item.out}`);
  }
  cdp.close();
} finally {
  // Профиль удаляем, только когда Chrome закрылся и перестал в него писать.
  await new Promise((resolve) => {
    chrome.once('exit', resolve);
    chrome.kill();
  });
  await server.close();
  await rm(profile, { recursive: true, force: true });
}

function devtoolsUrl(process) {
  return new Promise((resolve, reject) => {
    let output = '';
    process.stderr.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
    process.on('exit', () => reject(new Error(`Chrome завершился:\n${output}`)));
  });
}

function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let lastId = 0;
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`));
    else request.resolve(message.result);
  });
  return new Promise((resolve, reject) => {
    socket.addEventListener('error', reject);
    socket.addEventListener('open', () =>
      resolve({
        send(method, params = {}, sessionId) {
          const id = ++lastId;
          socket.send(JSON.stringify({ id, method, params, sessionId }));
          return new Promise((resolve, reject) => pending.set(id, { method, resolve, reject }));
        },
        close: () => socket.close(),
      }),
    );
  });
}

async function waitFor(send, expression, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const { result } = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.value === true) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Страница не дождалась готовности: ${expression}`);
}
