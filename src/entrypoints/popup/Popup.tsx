import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { buildHighlights, type Highlights } from '../../calendar/highlights';
import { CALENDAR_URL } from '../../calendar/links';
import { buildSchedule, isOnMyAgenda } from '../../calendar/schedule';
import type { Meeting } from '../../calendar/types';
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
  InviteIcon,
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
        <LogoMark size={30} />
        <div class="popup-heading">
          <h1>Мои встречи</h1>
          {account && status && <span class="sync-status">{status}</span>}
        </div>
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
  const schedule = buildSchedule([...snapshot.meetings, ...highlights.ghosts], now, {
    hideDeclined: prefs.hideDeclined,
  });
  const colors = new Map(account.calendars.map((calendar) => [calendar.href, calendar.color ?? 'var(--accent)']));
  const colorOf = (href: string) => colors.get(href) ?? 'var(--accent)';
  // Текущая или ближайшая встреча — крупной карточкой наверху, в своём разделе её уже нет.
  const focus = [...schedule.now, ...schedule.days.flatMap((day) => day.meetings)].find(
    (meeting) => !meeting.allDay && isOnMyAgenda(meeting),
  );
  const happeningNow = schedule.now.filter((meeting) => meeting !== focus);
  const days = schedule.days
    .map((day) => ({ ...day, meetings: day.meetings.filter((meeting) => meeting !== focus) }))
    .filter((day) => day.meetings.length > 0);
  const isEmpty = !focus && happeningNow.length === 0 && days.length === 0;
  const item = (meeting: Meeting, featured = false) => (
    <MeetingItem
      key={meeting.key}
      meeting={meeting}
      highlight={highlights.byKey.get(meeting.key)}
      color={colorOf(meeting.calendarHref)}
      featured={featured}
      now={now}
      onOpen={onOpen}
    />
  );

  return (
    <>
      {snapshot.error && <ErrorBanner snapshot={snapshot} now={now} onOpenOptions={onOpenOptions} />}

      {schedule.needsResponse > 0 && (
        <div class="banner warning">
          <InviteIcon />
          <span>
            {schedule.needsResponse}{' '}
            {plural(schedule.needsResponse, ['приглашение ждёт', 'приглашения ждут', 'приглашений ждут'])} ответа
          </span>
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
          <>
            {focus && <div class="focus">{item(focus, true)}</div>}
            {happeningNow.length > 0 && (
              <section>
                <SectionTitle label="Сейчас" count={happeningNow.length} live />
                {happeningNow.map((meeting) => item(meeting))}
              </section>
            )}
            {days.map((day) => (
              <section key={day.key}>
                <SectionTitle label={day.label} count={day.meetings.length} />
                {day.meetings.map((meeting) => item(meeting))}
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
        <AlertIcon />
        <span>
          Яндекс не принимает пароль приложения.{' '}
          <button class="button link" onClick={onOpenOptions}>
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

/** «Сегодня · четверг, 1 октября» → крупно «Сегодня», мельче дата, справа число встреч. */
function SectionTitle({ label, count, live = false }: { label: string; count: number; live?: boolean }) {
  const [head, date] = label.split(' · ');
  return (
    <h2 class={`section-title${live ? ' now' : ''}`}>
      {live && <span class="live-dot" aria-hidden="true" />}
      <span class="section-head">{head}</span>
      {date && <span class="section-date">{date}</span>}
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
      <button class="button primary wide" onClick={onConnect}>
        Подключить календарь
      </button>
      <p class="welcome-note muted">Понадобится только пароль приложения Яндекса</p>
    </div>
  );
}
