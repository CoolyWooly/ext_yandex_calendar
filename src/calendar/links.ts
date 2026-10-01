import { dayKey } from './schedule';
import type { JoinLink, Meeting } from './types';

export const CALENDAR_URL = 'https://calendar.yandex.ru/';

const PROVIDERS: Array<{ provider: string; pattern: RegExp }> = [
  { provider: 'Телемост', pattern: /^https:\/\/telemost(\.360)?\.yandex\.[a-z]+\//i },
  { provider: 'Google Meet', pattern: /^https:\/\/meet\.google\.com\//i },
  { provider: 'Zoom', pattern: /^https:\/\/([\w-]+\.)?zoom\.(us|com)\/(j|my|w)\//i },
  { provider: 'Teams', pattern: /^https:\/\/teams\.(microsoft|live)\.com\//i },
  { provider: 'SberJazz', pattern: /^https:\/\/jazz\.sber\.ru\//i },
  { provider: 'Контур.Толк', pattern: /^https:\/\/[\w-]+\.ktalk\.ru\//i },
];

const URL_PATTERN = /https?:\/\/[^\s<>"'()]+/gi;

/** Первая ссылка на видеозвонок в тексте полей встречи (описание, место, URL). */
export function findJoinLink(texts: Array<string | null | undefined>): JoinLink | null {
  for (const text of texts) {
    for (const match of text?.matchAll(URL_PATTERN) ?? []) {
      const url = match[0].replace(/[.,;:!?]+$/, '');
      const known = PROVIDERS.find(({ pattern }) => pattern.test(url));
      if (known) return { url, provider: known.provider };
    }
  }
  return null;
}

/** Встреча в веб-интерфейсе Яндекс Календаря, а если ссылки нет — её день. */
export function calendarUrlFor(meeting: Meeting): string {
  return meeting.eventUrl ?? `${CALENDAR_URL}day?show_date=${dayKey(meeting.start)}`;
}
