import { useState } from 'preact/hooks';
import {
  CalDavClient,
  CalDavError,
  type CalDavErrorKind,
  type Credentials,
  normalizeLogin,
} from '../../caldav/client';
import type { Account } from '../../storage/store';

const APP_PASSWORDS_URL = 'https://id.yandex.ru/security/app-passwords';

const ERROR_TEXT: Record<CalDavErrorKind, string> = {
  auth: 'Яндекс не принял почту или пароль приложения. Проверьте, что почта указана целиком, а пароль создан для «Календаря».',
  'not-found': 'Календари для этой почты не найдены. Нужна рабочая почта целиком, например name@company.ru.',
  network: 'Не удалось связаться с caldav.yandex.ru. Проверьте интернет и попробуйте ещё раз.',
  server: 'Сервер календаря ответил ошибкой. Попробуйте чуть позже.',
};

type CheckState = { status: 'idle' } | { status: 'checking' } | { status: 'error'; message: string };

interface Props {
  account: Account | null;
  onConnected: (account: Account) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function ConnectionSection({ account, onConnected, onDisconnect }: Props) {
  const [editing, setEditing] = useState(account === null);
  const [login, setLogin] = useState(account?.login ?? '');
  const [password, setPassword] = useState('');
  const [check, setCheck] = useState<CheckState>({ status: 'idle' });

  async function connect(credentials: Credentials) {
    setCheck({ status: 'checking' });
    try {
      const calendars = await new CalDavClient(credentials).listCalendars();
      await onConnected({
        login: normalizeLogin(credentials.login),
        appPassword: credentials.appPassword.trim(),
        calendars,
        verifiedAt: Date.now(),
      });
      setCheck({ status: 'idle' });
      setEditing(false);
      setPassword('');
    } catch (error) {
      setCheck({ status: 'error', message: describeError(error) });
    }
  }

  function submit(event: Event) {
    event.preventDefault();
    if (!login.includes('@')) {
      setCheck({ status: 'error', message: 'Укажите почту целиком, например name@company.ru.' });
      return;
    }
    void connect({ login, appPassword: password });
  }

  async function disconnect() {
    await onDisconnect();
    setEditing(true);
    setPassword('');
    setCheck({ status: 'idle' });
  }

  const checking = check.status === 'checking';

  return (
    <section class="card">
      <h2>Подключение</h2>

      {account && !editing ? (
        <div class="connected">
          <p class="connected-title">
            <span class="ok-mark" aria-hidden="true">✓</span> Подключено: <b>{account.login}</b>
          </p>
          <p class="muted">
            Проверено {formatDateTime(account.verifiedAt)} · календарей со встречами:{' '}
            {account.calendars.filter((calendar) => calendar.kind === 'events').length}
          </p>
          <div class="actions">
            <button class="button" disabled={checking} onClick={() => void connect(account)}>
              {checking ? 'Проверяю…' : 'Проверить снова'}
            </button>
            <button class="button" disabled={checking} onClick={() => setEditing(true)}>
              Сменить почту или пароль
            </button>
            <button class="button link danger" disabled={checking} onClick={() => void disconnect()}>
              Отключить
            </button>
          </div>
        </div>
      ) : (
        <form class="connect-form" onSubmit={submit}>
          <label class="field">
            <span class="field-label">Рабочая почта</span>
            <input
              type="email"
              autoComplete="username"
              placeholder="name@company.ru"
              value={login}
              onInput={(event) => setLogin(event.currentTarget.value)}
              required
            />
          </label>
          <label class="field">
            <span class="field-label">Пароль приложения</span>
            <input
              type="password"
              autoComplete="off"
              value={password}
              onInput={(event) => setPassword(event.currentTarget.value)}
              required
            />
            <span class="field-hint">
              Создаётся в Яндекс ID → «Пароли приложений» → «Календарь». Даёт доступ только к календарю, его
              можно отозвать в любой момент.{' '}
              <a href={APP_PASSWORDS_URL} target="_blank" rel="noreferrer">
                Открыть Яндекс ID ↗
              </a>
            </span>
          </label>
          <div class="actions">
            <button class="button primary" type="submit" disabled={checking || !login || !password}>
              {checking ? 'Проверяю…' : 'Проверить подключение'}
            </button>
            {account && (
              <button
                class="button"
                type="button"
                disabled={checking}
                onClick={() => {
                  setEditing(false);
                  setCheck({ status: 'idle' });
                }}
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      )}

      {check.status === 'error' && (
        <p class="alert error" role="alert">
          {check.message}
        </p>
      )}
    </section>
  );
}

function describeError(error: unknown): string {
  if (error instanceof CalDavError) return ERROR_TEXT[error.kind];
  return `Не получилось проверить подключение: ${error instanceof Error ? error.message : String(error)}`;
}

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}
