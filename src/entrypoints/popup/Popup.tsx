import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { buildHighlights, type Highlights } from '../../calendar/highlights';
import { CALENDAR_URL } from '../../calendar/links';
import { buildSchedule } from '../../calendar/schedule';
import {
  type Account,
  accountItem,
  EMPTY_SNAPSHOT,
  getPreferences,
  type InboxEntry,
  inboxItem,
  type Preferences,
  type Snapshot,
  snapshotItem,
} from '../../storage/store';
import type { BackgroundMessage } from '../../sync/messages';
import { formatAgo, plural } from '../../ui/format';
import { RefreshIcon, SettingsIcon } from '../../ui/icons';
import { MeetingItem } from './MeetingItem';

const HORIZON_TEXT: Record<number, string> = {
  1: 'на сегодня',
  3: 'на ближайшие 3 дня',
  7: 'на ближайшую неделю',
  14: 'на ближайшие 2 недели',
};

export function Popup() {
  const [account, setAccount] = useState<Account | null>();
  const [prefs, setPrefs] = useState<Preferences>();
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [syncing, setSyncing] = useState(false);
  const [now, setNow] = useState(Date.now());
  // Изменения, которые показываем метками в этот раз; в хранилище они считаются просмотренными.
  const [seen, setSeen] = useState<InboxEntry[]>([]);

  useEffect(() => {
    void Promise.all([accountItem.getValue(), getPreferences(), snapshotItem.getValue()]).then(
      ([storedAccount, storedPrefs, storedSnapshot]) => {
        setAccount(storedAccount);
        setPrefs(storedPrefs);
        setSnapshot(storedSnapshot);
        if (storedAccount) void sync();
      },
    );
    const takeInbox = (entries: InboxEntry[]) => {
      if (entries.length === 0) return;
      setSeen((earlier) => [...earlier, ...entries]);
      void inboxItem.setValue([]);
    };
    void inboxItem.getValue().then(takeInbox);
    const unwatchInbox = inboxItem.watch(takeInbox);
    const unwatchSnapshot = snapshotItem.watch(setSnapshot);
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      unwatchInbox();
      unwatchSnapshot();
      clearInterval(timer);
    };
  }, []);

  async function sync() {
    setSyncing(true);
    try {
      await browser.runtime.sendMessage({ type: 'sync' } satisfies BackgroundMessage);
    } finally {
      setSyncing(false);
      setNow(Date.now());
    }
  }

  function open(url: string) {
    void browser.tabs.create({ url });
    window.close();
  }

  function openOptions() {
    void browser.runtime.openOptionsPage();
    window.close();
  }

  if (account === undefined || !prefs) return null;

  const status = syncing ? 'обновляю…' : snapshot.syncedAt ? `обновлено ${formatAgo(snapshot.syncedAt, now)}` : '';

  return (
    <div class="popup">
      <header class="popup-header">
        <h1>Мои встречи</h1>
        {account && <span class="sync-status">{status}</span>}
        {account && (
          <button
            class={`icon-button${syncing ? ' spinning' : ''}`}
            title="Обновить"
            aria-label="Обновить"
            disabled={syncing}
            onClick={() => void sync()}
          >
            <RefreshIcon />
          </button>
        )}
        <button class="icon-button" title="Настройки" aria-label="Настройки" onClick={openOptions}>
          <SettingsIcon />
        </button>
      </header>

      {account ? (
        <Content
          account={account}
          prefs={prefs}
          snapshot={snapshot}
          highlights={buildHighlights(seen, snapshot.meetings)}
          now={now}
          onOpen={open}
          onOpenOptions={openOptions}
        />
      ) : (
        <div class="empty">
          <p>Календарь не подключён</p>
          <button class="button primary" onClick={openOptions}>
            Подключить
          </button>
        </div>
      )}

      <footer class="popup-footer">
        <a
          href={CALENDAR_URL}
          onClick={(event) => {
            event.preventDefault();
            open(CALENDAR_URL);
          }}
        >
          Открыть Яндекс Календарь ↗
        </a>
      </footer>
    </div>
  );
}

function Content(props: {
  account: Account;
  prefs: Preferences;
  snapshot: Snapshot;
  highlights: Highlights;
  now: number;
  onOpen: (url: string) => void;
  onOpenOptions: () => void;
}) {
  const { account, prefs, snapshot, highlights, now, onOpen, onOpenOptions } = props;
  const schedule = buildSchedule([...snapshot.meetings, ...highlights.ghosts], now, {
    hideDeclined: prefs.hideDeclined,
  });
  const colors = new Map(account.calendars.map((calendar) => [calendar.href, calendar.color ?? 'var(--accent)']));
  const colorOf = (href: string) => colors.get(href) ?? 'var(--accent)';
  const isEmpty = schedule.now.length === 0 && schedule.days.length === 0;

  return (
    <>
      {snapshot.error && <ErrorBanner snapshot={snapshot} now={now} onOpenOptions={onOpenOptions} />}

      {schedule.needsResponse > 0 && (
        <div class="banner warning">
          {schedule.needsResponse}{' '}
          {plural(schedule.needsResponse, ['приглашение ждёт', 'приглашения ждут', 'приглашений ждут'])} ответа
        </div>
      )}

      <main class="list">
        {prefs.selectedCalendars?.length === 0 ? (
          <div class="empty">
            <p>Не выбран ни один календарь</p>
            <button class="button" onClick={onOpenOptions}>
              Выбрать в настройках
            </button>
          </div>
        ) : isEmpty ? (
          <div class="empty">
            <p class="muted">
              {snapshot.syncedAt
                ? `Встреч ${HORIZON_TEXT[prefs.horizonDays] ?? 'в ближайшие дни'} нет`
                : snapshot.error
                  ? 'Встречи пока не загружены'
                  : 'Загружаю встречи…'}
            </p>
          </div>
        ) : (
          <>
            {schedule.now.length > 0 && (
              <section>
                <h2 class="section-title now">Сейчас</h2>
                {schedule.now.map((meeting) => (
                  <MeetingItem
                    key={meeting.key}
                    meeting={meeting}
                    highlight={highlights.byKey.get(meeting.key)}
                    color={colorOf(meeting.calendarHref)}
                    now={now}
                    onOpen={onOpen}
                  />
                ))}
              </section>
            )}
            {schedule.days.map((day) => (
              <section key={day.key}>
                <h2 class="section-title">{day.label}</h2>
                {day.meetings.map((meeting) => (
                  <MeetingItem
                    key={meeting.key}
                    meeting={meeting}
                    highlight={highlights.byKey.get(meeting.key)}
                    color={colorOf(meeting.calendarHref)}
                    now={now}
                    onOpen={onOpen}
                  />
                ))}
              </section>
            ))}
          </>
        )}
      </main>
    </>
  );
}

function ErrorBanner({ snapshot, now, onOpenOptions }: { snapshot: Snapshot; now: number; onOpenOptions: () => void }) {
  if (snapshot.error?.kind === 'auth') {
    return (
      <div class="banner danger">
        Яндекс не принимает пароль приложения.{' '}
        <button class="button link" onClick={onOpenOptions}>
          Обновить пароль
        </button>
      </div>
    );
  }
  return (
    <div class="banner danger">
      {snapshot.syncedAt
        ? `Нет связи с календарём — показаны данные, полученные ${formatAgo(snapshot.syncedAt, now)}`
        : 'Не удалось загрузить встречи — нет связи с календарём'}
    </div>
  );
}
