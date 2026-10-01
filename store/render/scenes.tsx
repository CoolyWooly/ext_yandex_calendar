import './clock';
import type { ComponentChildren } from 'preact';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import iconUrl from '../../design/icon.svg';
import iconSmallUrl from '../../design/icon-small.svg';
import { computeBadge } from '../../src/ui/badge';
import { LogoMark } from '../../src/ui/icons';
import { describeChange, describeReminder, type NotificationSpec } from '../../src/ui/notifications';
import { INBOX, NOW, ONE_ON_ONE, RETRO, SNAPSHOT, STANDUP } from './demo';
import './scenes.css';

declare global {
  interface Window {
    __ready?: boolean;
  }
}

const params = new URLSearchParams(location.search);
const scene = params.get('scene') ?? 'meetings';

// Слушаем с самого начала: iframe может отрисоваться раньше, чем сцена подпишется.
const frameHeights: Record<string, number> = {};
const frameListeners = new Set<() => void>();
window.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.type !== 'ready') return;
  frameHeights[event.data.name] = event.data.height;
  frameListeners.forEach((listener) => listener());
});

/** Высоты iframe сцены; сцена готова к снимку, когда все они отрисовались. */
function useFrames(names: string[]) {
  const [heights, setHeights] = useState({ ...frameHeights });
  useEffect(() => {
    const update = () => setHeights({ ...frameHeights });
    frameListeners.add(update);
    update();
    return () => void frameListeners.delete(update);
  }, []);
  useEffect(() => {
    if (names.every((name) => name in heights)) markReady();
  }, [heights]);
  return heights;
}

function markReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => (window.__ready = true)));
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function Copy(props: { title: ComponentChildren; text: string; bullets: string[] }) {
  return (
    <div class="copy">
      <div class="eyebrow">
        <LogoMark size={26} />
        Встречи для Яндекс Календаря
      </div>
      <h1>{props.title}</h1>
      <p class="lead">{props.text}</p>
      <ul class="bullets">
        {props.bullets.map((bullet) => (
          <li key={bullet}>
            <span class="tick">
              <Check />
            </span>
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Окно браузера с иконкой расширения и выпавшим окном встреч. */
function BrowserWithPopup(props: { demo: string; unseen: number; scale?: number }) {
  const heights = useFrames(['popup']);
  const badge = computeBadge(true, SNAPSHOT, props.unseen, NOW);
  const scale = props.scale ?? 1.06;
  return (
    <div class="browser">
      <Toolbar badge={badge} />
      <FakePage />
      <iframe
        name="popup"
        class="popup-frame"
        src={`popup.html?demo=${props.demo}`}
        style={{ height: `${heights.popup ?? 600}px`, transform: `scale(${scale})` }}
      />
    </div>
  );
}

function Toolbar({ badge }: { badge?: { text: string; color: string } }) {
  return (
    <div class="toolbar">
      <span class="lights">
        <i />
        <i />
        <i />
      </span>
      <span class="nav">‹ ›</span>
      <span class="address">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        tracker.company.ru/sprint
      </span>
      <span class="ext">
        <img src={iconSmallUrl} width="20" height="20" alt="" />
        {badge?.text && (
          <span class="badge" style={{ background: badge.color }}>
            {badge.text}
          </span>
        )}
      </span>
      <span class="menu">⋮</span>
    </div>
  );
}

/** Размытая «чужая» страница под окном расширения. */
function FakePage() {
  return (
    <div class="fake-page" aria-hidden="true">
      <div class="fake-side">
        {Array.from({ length: 7 }, (_, index) => (
          <i key={index} style={{ width: `${55 + ((index * 23) % 40)}%` }} />
        ))}
      </div>
      <div class="fake-main">
        <b />
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} class="fake-card">
            <i style={{ width: '40%' }} />
            <i style={{ width: '85%' }} />
            <i style={{ width: '65%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Shot({ children, class: className = '' }: { children: ComponentChildren; class?: string }) {
  return <div class={`shot ${className}`}>{children}</div>;
}

function Gradient({ children }: { children: ComponentChildren }) {
  return <span class="grad">{children}</span>;
}

function MeetingsScene() {
  return (
    <Shot>
      <Copy
        title={
          <>
            Все встречи —<br />
            <Gradient>в один клик</Gradient>
          </>
        }
        text="Ближайшие встречи из Яндекс Календаря прямо в браузере. Не нужно держать открытыми календарь и почту."
        bullets={['Отсчёт до начала прямо на иконке', 'Вход в Телемост, Zoom и Meet одной кнопкой', 'Работает с Яндекс 360 для бизнеса']}
      />
      <BrowserWithPopup demo="list" unseen={0} />
    </Shot>
  );
}

function ChangesScene() {
  return (
    <Shot>
      <Copy
        title={
          <>
            Все изменения
            <br />
            <Gradient>на виду</Gradient>
          </>
        }
        text="Что изменилось с прошлого раза, отмечено в списке. Красный счётчик на иконке подскажет, что пора заглянуть."
        bullets={['Метки «новая», «перенесена», «отменена»', 'Приглашения, которые ждут ответа', 'В том числе приглашения через рассылки']}
      />
      <BrowserWithPopup demo="changes" unseen={INBOX.length} />
    </Shot>
  );
}

function NotificationsScene() {
  useEffect(markReady, []);
  const reminderAt = NOW + 2 * 60_000;
  const notifications: NotificationSpec[] = [
    describeReminder(STANDUP, reminderAt),
    describeChange(INBOX[1]!, NOW),
    describeChange({ kind: 'new', uid: RETRO.uid, instances: [{ meeting: RETRO, previous: null }] }, NOW),
  ];
  return (
    <Shot>
      <Copy
        title={
          <>
            Напомнит
            <br />
            <Gradient>за 10 минут</Gradient>
          </>
        }
        text="И ещё раз за минуту до начала. Напоминание не исчезает, пока его не закроете, и сразу ведёт в созвон."
        bullets={['Новые встречи и приглашения', 'Переносы и отмены', 'Утренняя сводка приглашений без ответа']}
      />
      <div class="desktop">
        <div class="menubar">
          <span>Вт 6 окт. 10:50</span>
        </div>
        <div class="notifications">
          {notifications.map((spec, index) => (
            <Notification key={spec.id} spec={spec} when={index === 0 ? 'сейчас' : `${index * 7} мин назад`} />
          ))}
        </div>
      </div>
    </Shot>
  );
}

function Notification({ spec, when }: { spec: NotificationSpec; when: string }) {
  return (
    <div class="notification">
      <img src={iconUrl} width="44" height="44" alt="" class="notification-icon" />
      <div class="notification-body">
        <div class="notification-top">
          <b>{spec.title}</b>
          <span>{when}</span>
        </div>
        <div>{spec.message}</div>
        {spec.contextMessage && <div class="notification-context">{spec.contextMessage}</div>}
        {spec.buttons.length > 0 && (
          <div class="notification-buttons">
            {spec.buttons.map((button) => (
              <span key={button.title}>{button.title}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsScene() {
  useFrames(['options']);
  return (
    <Shot>
      <Copy
        title={
          <>
            Подключение
            <br />
            <Gradient>за минуту</Gradient>
          </>
        }
        text="Нужен только пароль приложения Яндекса: он открывает доступ лишь к календарю и отзывается в один клик."
        bullets={['Данные хранятся только в вашем браузере', 'Без своих серверов, рекламы и аналитики', 'Исходный код открыт на GitHub']}
      />
      <div class="browser wide">
        <Toolbar />
        <iframe name="options" class="options-frame" src="options.html?demo=onboarding" />
      </div>
    </Shot>
  );
}

function PromoSmall() {
  useEffect(markReady, []);
  return (
    <div class="promo small">
      <div class="promo-glow" />
      <img src={iconUrl} width="120" height="120" alt="" />
      <div>
        <div class="promo-name">Встречи</div>
        <div class="promo-sub">для Яндекс Календаря</div>
        <div class="promo-tag">Напоминания и вход в созвон</div>
      </div>
    </div>
  );
}

function Marquee() {
  const heights = useFrames(['popup']);
  return (
    <div class="promo marquee">
      <div class="promo-glow" />
      <div class="marquee-copy">
        <img src={iconUrl} width="112" height="112" alt="" />
        <h1>
          Все встречи —
          <br />в один клик
        </h1>
        <p>Список встреч, напоминания и вход в созвон для Яндекс&nbsp;Календаря</p>
      </div>
      <iframe
        name="popup"
        class="popup-frame floating"
        src="popup.html?demo=list"
        style={{ height: `${heights.popup ?? 600}px` }}
      />
    </div>
  );
}

function IconScene() {
  useEffect(markReady, []);
  const size = Number(params.get('size') ?? 128);
  return <img class="icon-only" src={params.get('src') === 'small' ? iconSmallUrl : iconUrl} width={size} height={size} alt="" />;
}

const SCENES: Record<string, () => preact.JSX.Element> = {
  meetings: MeetingsScene,
  changes: ChangesScene,
  notifications: NotificationsScene,
  settings: SettingsScene,
  'promo-small': PromoSmall,
  marquee: Marquee,
  icon: IconScene,
};

const Scene = SCENES[scene] ?? MeetingsScene;
document.body.dataset.scene = scene;
render(<Scene />, document.getElementById('app')!);
