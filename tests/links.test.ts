import { describe, expect, it } from 'vitest';
import { findJoinLink } from '../src/calendar/links';

describe('findJoinLink', () => {
  it.each([
    ['https://telemost.yandex.ru/j/123', 'Телемост'],
    ['https://telemost.360.yandex.ru/j/123', 'Телемост'],
    ['https://meet.google.com/abc-defg-hij', 'Google Meet'],
    ['https://us02web.zoom.us/j/123?pwd=x', 'Zoom'],
    ['https://teams.microsoft.com/l/meetup-join/abc', 'Teams'],
    ['https://jazz.sber.ru/abc', 'SberJazz'],
    ['https://company.ktalk.ru/room', 'Контур.Толк'],
  ])('recognises %s', (url, provider) => {
    expect(findJoinLink([`Ссылка на встречу: ${url}`])).toEqual({ url, provider });
  });

  it('strips trailing punctuation and skips unrelated links', () => {
    expect(
      findJoinLink(['Повестка: https://wiki.example.com/page', 'Подключайтесь: https://meet.google.com/abc-defg-hij.']),
    ).toEqual({ url: 'https://meet.google.com/abc-defg-hij', provider: 'Google Meet' });
  });

  it('returns null when there is no call link', () => {
    expect(findJoinLink([null, undefined, 'Переговорка 3'])).toBeNull();
  });
});
