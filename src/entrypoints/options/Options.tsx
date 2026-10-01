import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { CalendarInfo } from '../../caldav/client';
import {
  type Account,
  accountItem,
  defaultCalendarSelection,
  getPreferences,
  HORIZON_DAYS_OPTIONS,
  snapshotItem,
  type NotifyPreferences,
  parseReminderMinutes,
  POLL_MINUTES_OPTIONS,
  type Preferences,
  updatePreferences,
} from '../../storage/store';
import { describeTestNotification, showNotifications } from '../../ui/notifications';
import { ConnectionSection } from './ConnectionSection';

const POLL_LABELS: Record<number, string> = {
  1: 'каждую минуту',
  2: 'каждые 2 минуты',
  5: 'каждые 5 минут',
};

const HORIZON_LABELS: Record<number, string> = {
  1: 'только на сегодня',
  3: 'на 3 дня',
  7: 'на неделю',
  14: 'на 2 недели',
};

type SavePreferences = (patch: Partial<Preferences>) => Promise<void>;

export function Options() {
  const [account, setAccount] = useState<Account | null>();
  const [prefs, setPrefs] = useState<Preferences>();
  const [savedAt, setSavedAt] = useState(0);
  // Когда Яндекс перестал принимать пароль (по последней синхронизации); null — всё в порядке.
  const [authErrorAt, setAuthErrorAt] = useState<number | null>(null);

  useEffect(() => {
    void Promise.all([accountItem.getValue(), getPreferences(), snapshotItem.getValue()]).then(
      ([storedAccount, storedPrefs, snapshot]) => {
        setAccount(storedAccount);
        setPrefs(storedPrefs);
        setAuthErrorAt(snapshot.error?.kind === 'auth' ? snapshot.error.at : null);
      },
    );
  }, []);

  if (account === undefined || !prefs) return null;

  const savePrefs: SavePreferences = async (patch) => {
    setPrefs(await updatePreferences(patch));
    setSavedAt(Date.now());
  };

  async function handleConnected(next: Account) {
    await accountItem.setValue(next);
    setAccount(next);
    setAuthErrorAt(null);
    // Выбор сохраняем, но выкидываем календари, которых больше нет (например, сменили аккаунт).
    const known = new Set(next.calendars.map((calendar) => calendar.href));
    const kept = prefs!.selectedCalendars?.filter((href) => known.has(href)) ?? [];
    if (kept.length === 0) {
      await savePrefs({ selectedCalendars: defaultCalendarSelection(next.calendars) });
    } else if (kept.length !== prefs!.selectedCalendars!.length) {
      await savePrefs({ selectedCalendars: kept });
    }
  }

  async function handleDisconnect() {
    await accountItem.setValue(null);
    setAccount(null);
  }

  return (
    <main class="page">
      <header class="page-header">
        <h1>Встречи из Яндекс Календаря</h1>
        <p class="muted">
          Настройки сохраняются автоматически. <SavedBadge savedAt={savedAt} />
        </p>
      </header>

      <ConnectionSection
        account={account}
        authErrorAt={authErrorAt}
        onConnected={handleConnected}
        onDisconnect={handleDisconnect}
      />

      {account && (
        <CalendarsSection
          calendars={account.calendars}
          selected={prefs.selectedCalendars ?? []}
          onChange={(selectedCalendars) => savePrefs({ selectedCalendars })}
        />
      )}

      <NotificationsSection prefs={prefs} onChange={savePrefs} />
      <DisplaySection prefs={prefs} onChange={savePrefs} />
    </main>
  );
}

function CalendarsSection(props: {
  calendars: CalendarInfo[];
  selected: string[];
  onChange: (selected: string[]) => Promise<void>;
}) {
  const { calendars, selected, onChange } = props;
  const eventCalendars = calendars.filter((calendar) => calendar.kind === 'events');
  const taskLists = calendars.filter((calendar) => calendar.kind === 'tasks');

  const toggle = (href: string, checked: boolean) =>
    void onChange(checked ? [...selected, href] : selected.filter((item) => item !== href));

  return (
    <section class="card">
      <h2>Календари</h2>
      <p class="muted">
        Встречи из отмеченных календарей попадут в список и уведомления. Календари переговорок лучше не
        отмечать — иначе будут приходить уведомления о каждой брони.
      </p>

      {eventCalendars.length === 0 ? (
        <p class="alert error">В аккаунте не найдено календарей со встречами.</p>
      ) : (
        <ul class="option-list">
          {eventCalendars.map((calendar) => (
            <li key={calendar.href}>
              <label class="check">
                <input
                  type="checkbox"
                  checked={selected.includes(calendar.href)}
                  onChange={(event) => toggle(calendar.href, event.currentTarget.checked)}
                />
                <span class="dot" style={{ background: calendar.color ?? 'var(--accent)' }} />
                <span>{calendar.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {eventCalendars.length > 0 && selected.length === 0 && (
        <p class="alert error">Не выбран ни один календарь — встречи показываться не будут.</p>
      )}
      {taskLists.length > 0 && (
        <p class="muted small">
          Списки задач ({taskLists.map((list) => `«${list.name}»`).join(', ')}) расширение не показывает.
        </p>
      )}
    </section>
  );
}

function NotificationsSection({ prefs, onChange }: { prefs: Preferences; onChange: SavePreferences }) {
  const setNotify = (key: keyof NotifyPreferences, value: boolean) =>
    void onChange({ notify: { ...prefs.notify, [key]: value } });

  return (
    <section class="card">
      <h2>Уведомления</h2>
      <ul class="option-list">
        <Toggle
          checked={prefs.notify.newMeetings}
          onChange={(value) => setNotify('newMeetings', value)}
          title="Новые встречи"
          hint="В календаре появилась встреча. Если изменений сразу много — одно общее уведомление"
        />
        <Toggle
          checked={prefs.notify.changes}
          onChange={(value) => setNotify('changes', value)}
          title="Переносы и отмены"
          hint="Встречу перенесли, изменили место или отменили"
        />
        <Toggle
          checked={prefs.notify.needsResponse}
          onChange={(value) => setNotify('needsResponse', value)}
          title="Приглашения без ответа"
          hint="Сразу при новом приглашении и сводкой раз в день после 9:00 — лично или через рассылку"
        />
        <Toggle
          checked={prefs.notify.reminders}
          onChange={(value) => setNotify('reminders', value)}
          title="Напоминания перед началом"
          hint="Висит, пока его не закрыть. Если у встречи есть созвон — кнопка «Присоединиться»"
        >
          <ReminderMinutesInput
            value={prefs.reminderMinutes}
            disabled={!prefs.notify.reminders}
            onChange={(reminderMinutes) => void onChange({ reminderMinutes })}
          />
        </Toggle>
      </ul>
      <TestNotification />
    </section>
  );
}

function TestNotification() {
  const [shown, setShown] = useState(false);

  async function show() {
    await showNotifications([describeTestNotification()]);
    setShown(true);
  }

  return (
    <div class="test-notification">
      <button class="button" onClick={() => void show()}>
        Показать тестовое уведомление
      </button>
      {shown && (
        <p class="field-hint">
          Не появилось или сразу исчезло? В macOS откройте «Системные настройки → Уведомления → Google Chrome»,
          разрешите уведомления и выберите стиль «Постоянно». Проверьте также, что не включён режим «Не
          беспокоить».
        </p>
      )}
    </div>
  );
}

function DisplaySection({ prefs, onChange }: { prefs: Preferences; onChange: SavePreferences }) {
  return (
    <section class="card">
      <h2>Показ и проверка</h2>
      <div class="rows">
        <label class="row">
          <span>Проверять календарь</span>
          <select
            value={prefs.pollMinutes}
            onChange={(event) => void onChange({ pollMinutes: Number(event.currentTarget.value) })}
          >
            {POLL_MINUTES_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {POLL_LABELS[minutes]}
              </option>
            ))}
          </select>
        </label>
        <label class="row">
          <span>Показывать встречи</span>
          <select
            value={prefs.horizonDays}
            onChange={(event) => void onChange({ horizonDays: Number(event.currentTarget.value) })}
          >
            {HORIZON_DAYS_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {HORIZON_LABELS[days]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul class="option-list">
        <Toggle
          checked={prefs.hideDeclined}
          onChange={(hideDeclined) => void onChange({ hideDeclined })}
          title="Скрывать отклонённые встречи"
        />
      </ul>
    </section>
  );
}

function Toggle(props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  hint?: string;
  children?: ComponentChildren;
}) {
  return (
    <li>
      <label class="check">
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(event) => props.onChange(event.currentTarget.checked)}
        />
        <span>
          <span class="check-title">{props.title}</span>
          {props.hint && <span class="check-hint">{props.hint}</span>}
        </span>
      </label>
      {props.children}
    </li>
  );
}

function ReminderMinutesInput(props: {
  value: number[];
  disabled: boolean;
  onChange: (minutes: number[]) => void;
}) {
  const [text, setText] = useState(props.value.join(', '));
  const [invalid, setInvalid] = useState(false);

  function commit() {
    const minutes = parseReminderMinutes(text);
    setInvalid(minutes === null || minutes.length === 0);
    if (minutes && minutes.length > 0) {
      setText(minutes.join(', '));
      props.onChange(minutes);
    }
  }

  return (
    <div class="nested">
      <label class="inline-field">
        <span>За сколько минут:</span>
        <input
          type="text"
          inputMode="numeric"
          value={text}
          disabled={props.disabled}
          aria-invalid={invalid}
          onInput={(event) => setText(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === 'Enter' && commit()}
        />
      </label>
      {invalid && <span class="field-error">Укажите минуты через запятую, например: 10, 1</span>}
    </div>
  );
}

function SavedBadge({ savedAt }: { savedAt: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!savedAt) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(timer);
  }, [savedAt]);

  return (
    <span class={`saved-badge${visible ? ' visible' : ''}`} aria-live="polite">
      {visible ? '✓ Сохранено' : ''}
    </span>
  );
}
