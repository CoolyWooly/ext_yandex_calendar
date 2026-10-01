import { useState } from 'preact/hooks';
import {
  CalDavClient,
  CalDavError,
  type CalDavErrorKind,
  type Credentials,
  normalizeLogin,
} from '../../caldav/client';
import type { Account } from '../../storage/store';
import { ExternalIcon, LinkIcon } from '../../ui/icons';

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
  /** Яндекс перестал принимать сохранённый пароль: когда это обнаружилось. */
  authErrorAt: number | null;
  onConnected: (account: Account) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function ConnectionSection({ account, authErrorAt, onConnected, onDisconnect }: Props) {
  const [editing, setEditing] = useState(account === null || authErrorAt !== null);
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
  const errorAlert = check.status === 'error' && (
    <p class="alert error" role="alert">
      {check.message}
    </p>
  );

  return (
    <section class="card">
      <h2 class="card-title">
        <span class="card-icon">
          <LinkIcon />
        </span>
        Подключение
      </h2>

      {account && authErrorAt !== null && check.status !== 'checking' && (
        <p class="alert error" role="alert">
          С {formatDateTime(authErrorAt)} Яндекс не принимает сохранённый пароль приложения — встречи не
          обновляются. Скорее всего, пароль отозвали. Создайте новый пароль приложения и введите его ниже.
        </p>
      )}

      {account && !editing ? (
        <div class="connected">
          <div class="account">
            <span class="avatar" aria-hidden="true">
              {account.login.charAt(0).toUpperCase()}
            </span>
            <div class="account-info">
              <div class="account-login">{account.login}</div>
              <div class="muted small">
                Проверено {formatDateTime(account.verifiedAt)} · календарей со встречами:{' '}
                {account.calendars.filter((calendar) => calendar.kind === 'events').length}
              </div>
            </div>
          </div>
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
          {errorAlert}
        </div>
      ) : (
        <ol class="steps">
          <li class="step">
            <span class="step-number">1</span>
            <div class="step-body">
              <div class="step-title">Создайте пароль приложения</div>
              <p class="field-hint">
                Яндекс ID → «Безопасность» → «Пароли приложений» → «Календарь». Пароль даёт доступ только к
                календарю, его можно отозвать в любой момент.
              </p>
              <a class="button" href={APP_PASSWORDS_URL} target="_blank" rel="noreferrer">
                Открыть Яндекс ID
                <ExternalIcon />
              </a>
            </div>
          </li>
          <li class="step">
            <span class="step-number">2</span>
            <div class="step-body">
              <div class="step-title">Введите рабочую почту и пароль</div>
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
                  <span class="field-hint">Не основной пароль от почты, а созданный на шаге 1.</span>
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
              {errorAlert}
            </div>
          </li>
          <li class="step">
            <span class="step-number">3</span>
            <div class="step-body">
              <div class="step-title">Отметьте календари</div>
              <p class="field-hint">Список появится после проверки подключения.</p>
            </div>
          </li>
        </ol>
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
