import { describe, expect, it, vi } from 'vitest';
import { CalDavClient, CalDavError, parseCalendarList } from '../src/caldav/client';
import propfindCalendars from './fixtures/propfind-calendars.xml?raw';
import reportWeek from './fixtures/report-week.xml?raw';

describe('parseCalendarList', () => {
  it('keeps only calendar collections from the real Yandex response', () => {
    expect(parseCalendarList(propfindCalendars)).toEqual([
      {
        href: '/calendars/user%40example.com/events-36215597/',
        name: 'Мои события',
        ctag: '1790751946000',
        color: null,
        kind: 'events',
      },
      {
        href: '/calendars/user%40example.com/todos-7707282/',
        name: 'Не забыть',
        ctag: '1790833700889',
        color: null,
        kind: 'tasks',
      },
      {
        href: '/calendars/user%40example.com/events-36168105/',
        name: 'Переговорка. Большой зал',
        ctag: '1790584497000',
        color: null,
        kind: 'events',
      },
    ]);
  });

  it('reads the component set and color when the server provides them', () => {
    const xml = `<?xml version="1.0"?>
      <d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/">
        <d:response>
          <d:href>/calendars/u/work/</d:href>
          <d:propstat>
            <d:prop>
              <d:displayname>Работа</d:displayname>
              <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
              <c:supported-calendar-component-set><c:comp name="VTODO"/></c:supported-calendar-component-set>
              <a:calendar-color>#FF7700FF</a:calendar-color>
            </d:prop>
            <d:status>HTTP/1.1 200 OK</d:status>
          </d:propstat>
        </d:response>
      </d:multistatus>`;
    expect(parseCalendarList(xml)).toEqual([
      { href: '/calendars/u/work/', name: 'Работа', ctag: null, color: '#FF7700', kind: 'tasks' },
    ]);
  });
});

describe('CalDavClient', () => {
  function clientReturning(result: Response | Error) {
    const fetchFn = vi.fn(async (_input: string, _init: RequestInit) => {
      if (result instanceof Error) throw result;
      return result;
    });
    const client = new CalDavClient({ login: ' User@Example.com ', appPassword: ' secret ' }, fetchFn);
    return { client, fetchFn };
  }

  it('sends PROPFIND to the calendar home with Basic auth and without cookies', async () => {
    const { client, fetchFn } = clientReturning(
      new Response(propfindCalendars, { status: 207 }),
    );

    const calendars = await client.listCalendars();

    expect(calendars).toHaveLength(3);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://caldav.yandex.ru/calendars/user@example.com/');
    expect(init.method).toBe('PROPFIND');
    expect(init.credentials).toBe('omit');
    expect(init.headers).toMatchObject({
      Depth: '1',
      Authorization: `Basic ${btoa('user@example.com:secret')}`,
    });
  });

  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [404, 'not-found'],
    [500, 'server'],
  ])('turns HTTP %i into a "%s" error', async (status, kind) => {
    const { client } = clientReturning(new Response('', { status }));
    await expect(client.listCalendars()).rejects.toMatchObject({ kind, status });
  });

  it('reports a network failure as a "network" error', async () => {
    const { client } = clientReturning(new TypeError('Failed to fetch'));
    const error = await client.listCalendars().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CalDavError);
    expect(error).toMatchObject({ kind: 'network' });
  });
});

describe('CalDavClient.fetchEvents', () => {
  it('sends a time-range REPORT to the calendar and returns its ICS objects', async () => {
    const fetchFn = vi.fn(async (_input: string, _init: RequestInit) => new Response(reportWeek, { status: 207 }));
    const client = new CalDavClient({ login: 'user@example.com', appPassword: 'secret' }, fetchFn);

    const objects = await client.fetchEvents('/calendars/user%40example.com/events-36215597/', {
      start: Date.parse('2026-09-30T19:00:00Z'),
      end: Date.parse('2026-10-07T19:00:00Z'),
    });

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://caldav.yandex.ru/calendars/user%40example.com/events-36215597/');
    expect(init.method).toBe('REPORT');
    expect(init.body).toContain('<c:time-range start="20260930T190000Z" end="20261007T190000Z"/>');
    expect(objects).toHaveLength(1);
    expect(objects[0]).toMatchObject({
      href: '/calendars/user%40example.com/events-default/standup0000000000000001yandex.ru.ics',
      etag: '1790571298315',
    });
    expect(objects[0]!.ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(objects[0]!.ics).toContain('SUMMARY:Стендап Web&App');
  });
});
