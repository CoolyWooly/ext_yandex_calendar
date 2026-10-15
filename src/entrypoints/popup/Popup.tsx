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
import {
  AlertIcon,
  BellIcon,
  CalendarIcon,
  ExternalIcon,
  FreeTimeIllustration,
  LogoMark,
  RefreshIcon,
  SettingsIcon,
  VideoIcon,
} from '../../ui/icons';
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
        if (storedAccount) void sync({ manual: false });
      },
    );
    // Непросмотренные изменения забирает фон — inbox пишет только он. Окно лишь следит, не появилось ли новое.
    const takeInbox = async () => {
      const entries: InboxEntry[] = await browser.runtime.sendMessage({
        type: 'take-inbox',
      } satisfies BackgroundMessage);
      if (entries.length > 0) setSeen((earlier) => [...earlier, ...entries]);
    };
    void takeInbox();
    const unwatchInbox = inboxItem.watch((entries) => {
      if (entries.length > 0) void takeInbox();
    });
    const unwatchSnapshot = snapshotItem.watch(setSnapshot);
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      unwatchInbox();
      unwatchSnapshot();
      clearInterval(timer);
    };
  }, []);

  /** `manual` — нажали «Обновить»: проверяем даже пароль, который Яндекс недавно не принял. */
  async function sync({ manual }: { manual: boolean }) {
    setSyncing(true);
    try {
      await browser.runtime.sendMessage({ type: 'sync', manual } satisfies BackgroundMessage);
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
        <LogoMark size={30} />
        <div class="popup-heading">
          <h1>Мои встречи</h1>
          {account && status && <span class="sync-status">{status}</span>}
        </div>
        {account && (
          <button
            type="button"
            class={`icon-button${syncing ? ' spinning' : ''}`}
            title="Обновить"
            aria-label="Обновить"
            disabled={syncing}
            onClick={() => void sync({ manual: true })}
          >
            <RefreshIcon />
          </button>
        )}
        <button type="button" class="icon-button" title="Настройки" aria-label="Настройки" onClick={openOptions}>
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
        <Welcome onConnect={openOptions} />
      )}

      <footer class="popup-footer">
        <a
          href={CALENDAR_URL}
          onClick={(event) => {
            event.preventDefault();
            open(CALENDAR_URL);
          }}
        >
          <CalendarIcon size={15} />
          Открыть Яндекс Календарь
          <ExternalIcon />
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
  const days = buildSchedule([...snapshot.meetings, ...highlights.ghosts], now, { hideDeclined: prefs.hideDeclined });
  const colors = new Map(account.calendars.map((calendar) => [calendar.href, calendar.color ?? 'var(--accent)']));
  const colorOf = (href: string) => colors.get(href) ?? 'var(--accent)';

  return (
    <>
      {snapshot.error && <ErrorBanner snapshot={snapshot} now={now} onOpenOptions={onOpenOptions} />}

      <main class="list">
        {prefs.selectedCalendars?.length === 0 ? (
          <div class="empty">
            <p>Не выбран ни один календарь</p>
            <button type="button" class="button" onClick={onOpenOptions}>
              Выбрать в настройках
            </button>
          </div>
        ) : days.length === 0 ? (
          snapshot.syncedAt ? (
            <div class="empty">
              <FreeTimeIllustration />
              <p class="empty-title">Свободное время</p>
              <p class="muted">Встреч {HORIZON_TEXT[prefs.horizonDays] ?? 'в ближайшие дни'} нет</p>
            </div>
          ) : (
            <div class="empty">
              <p class="muted">{snapshot.error ? 'Встречи пока не загружены' : 'Загружаю встречи…'}</p>
            </div>
          )
        ) : (
          days.map((day) => (
            <section key={day.key}>
              <SectionTitle title={day.title} date={day.date} count={day.meetings.length} />
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
          ))
        )}
      </main>
    </>
  );
}

function ErrorBanner({ snapshot, now, onOpenOptions }: { snapshot: Snapshot; now: number; onOpenOptions: () => void }) {
  if (snapshot.error?.kind === 'auth') {
    return (
      <div class="banner danger">
        <AlertIcon />
        <span>
          Яндекс не принимает пароль приложения.{' '}
          <button type="button" class="button link" onClick={onOpenOptions}>
            Обновить пароль
          </button>
        </span>
      </div>
    );
  }
  return (
    <div class="banner danger">
      <AlertIcon />
      <span>
        {snapshot.syncedAt
          ? `Нет связи с календарём — показаны данные, полученные ${formatAgo(snapshot.syncedAt, now)}`
          : 'Не удалось загрузить встречи — нет связи с календарём'}
      </span>
    </div>
  );
}

/** Крупно «Сегодня», «Завтра» или день недели, мельче дата, справа число встреч. */
function SectionTitle({ title, date, count }: { title: string; date: string; count: number }) {
  return (
    <h2 class="section-title">
      <span class="section-head">{title}</span>
      <span class="section-date">{date}</span>
      <span class="section-count">
        {count} {plural(count, ['встреча', 'встречи', 'встреч'])}
      </span>
    </h2>
  );
}

const WELCOME_FEATURES = [
  { icon: <CalendarIcon />, text: 'Встречи на сегодня и неделю' },
  { icon: <BellIcon />, text: 'Напоминания и уведомления о переносах' },
  { icon: <VideoIcon />, text: 'Вход в созвон одной кнопкой' },
];

function Welcome({ onConnect }: { onConnect: () => void }) {
  return (
    <div class="welcome">
      <LogoMark size={56} />
      <h2>Не пропускайте встречи</h2>
      <p class="muted">Ближайшие встречи из Яндекс Календаря — прямо в браузере</p>
      <ul class="welcome-features">
        {WELCOME_FEATURES.map((feature) => (
          <li key={feature.text}>
            <span class="feature-icon">{feature.icon}</span>
            {feature.text}
          </li>
        ))}
      </ul>
      <button type="button" class="button primary wide" onClick={onConnect}>
        Подключить календарь
      </button>
      <p class="welcome-note muted">Понадобится только пароль приложения Яндекса</p>
    </div>
  );
}
