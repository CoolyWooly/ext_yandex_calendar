import { childNames, type DavResource, parseMultistatus, textOf } from './multistatus';

export const CALDAV_ORIGIN = 'https://caldav.yandex.ru';
const REQUEST_TIMEOUT_MS = 20_000;

export interface Credentials {
  /** Рабочая почта целиком: `name@company.ru`. */
  login: string;
  /** Пароль приложения «Календарь» из Яндекс ID. */
  appPassword: string;
}

export interface CalendarInfo {
  /** Путь коллекции, как его вернул сервер: `/calendars/name%40company.ru/events-123/`. */
  href: string;
  name: string;
  /** Метка версии календаря: меняется при любом изменении событий в нём. */
  ctag: string | null;
  color: string | null;
  kind: 'events' | 'tasks';
}

/** Один календарный объект (.ics) из коллекции. */
export interface CalendarObject {
  href: string;
  etag: string | null;
  ics: string;
}

export type CalDavErrorKind = 'auth' | 'not-found' | 'network' | 'server';

export class CalDavError extends Error {
  constructor(
    readonly kind: CalDavErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'CalDavError';
  }
}

type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

const PROPFIND_CALENDARS = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/" xmlns:a="http://apple.com/ns/ical/">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <cs:getctag/>
    <c:supported-calendar-component-set/>
    <a:calendar-color/>
  </d:prop>
</d:propfind>`;

export class CalDavClient {
  private readonly login: string;
  private readonly authorization: string;

  constructor(
    credentials: Credentials,
    private readonly fetchFn: FetchFn = (input, init) => fetch(input, init),
  ) {
    this.login = normalizeLogin(credentials.login);
    this.authorization = basicAuth(this.login, credentials.appPassword.trim());
  }

  /** Все календари пользователя (служебные inbox/outbox отброшены). */
  async listCalendars(): Promise<CalendarInfo[]> {
    const xml = await this.request('PROPFIND', calendarHomePath(this.login), PROPFIND_CALENDARS, {
      Depth: '1',
    });
    return parseCalendarList(xml);
  }

  /**
   * События календаря, у которых есть экземпляры в `range`. Повторяющаяся серия приходит
   * целиком (мастер + переопределения) — разворачивать её нужно самим.
   */
  async fetchEvents(calendarHref: string, range: { start: number; end: number }): Promise<CalendarObject[]> {
    const xml = await this.request('REPORT', calendarHref, calendarQuery(range), { Depth: '1' });
    return parseMultistatus(xml)
      .map((resource) => ({
        href: resource.href,
        etag: textOf(resource.props.getetag).trim() || null,
        ics: textOf(resource.props['calendar-data']),
      }))
      .filter((object) => object.ics.includes('BEGIN:VCALENDAR'));
  }

  private async request(
    method: string,
    path: string,
    body: string,
    headers: Record<string, string>,
  ): Promise<string> {
    let response: Response;
    try {
      response = await this.fetchFn(CALDAV_ORIGIN + path, {
        method,
        body,
        headers: {
          Authorization: this.authorization,
          'Content-Type': 'application/xml; charset=utf-8',
          ...headers,
        },
        // Авторизуемся только заголовком: без cookie Яндекса и без системного окна логина на 401.
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new CalDavError('network', `Нет связи с caldav.yandex.ru: ${errorMessage(error)}`);
    }

    if (response.status === 401 || response.status === 403) {
      throw new CalDavError('auth', 'Яндекс не принял логин или пароль приложения', response.status);
    }
    if (response.status === 404) {
      throw new CalDavError('not-found', `Не найдено: ${path}`, response.status);
    }
    if (!response.ok) {
      throw new CalDavError('server', `Сервер календаря ответил кодом ${response.status}`, response.status);
    }
    return response.text();
  }
}

export function parseCalendarList(xml: string): CalendarInfo[] {
  return parseMultistatus(xml)
    .filter((resource) => childNames(resource.props.resourcetype).includes('calendar'))
    .map((resource) => ({
      href: resource.href,
      name: textOf(resource.props.displayname).trim() || lastSegment(resource.href),
      ctag: textOf(resource.props.getctag).trim() || null,
      color: parseColor(textOf(resource.props['calendar-color'])),
      kind: calendarKind(resource),
    }));
}

function calendarQuery(range: { start: number; end: number }): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${toCalDavTime(range.start)}" end="${toCalDavTime(range.end)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

/** `2026-10-01T00:00:00.000Z` → `20261001T000000Z`. */
function toCalDavTime(timestamp: number): string {
  return new Date(timestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

/** Домашняя коллекция календарей. `@` оставляем как есть — в таком виде адрес проверен на сервере. */
function calendarHomePath(login: string): string {
  return `/calendars/${encodeURIComponent(login).replace(/%40/g, '@')}/`;
}

function calendarKind({ href, props }: DavResource): CalendarInfo['kind'] {
  const componentSet = props['supported-calendar-component-set'];
  const comps =
    componentSet && typeof componentSet === 'object' && 'comp' in componentSet
      ? (componentSet.comp as Array<Record<string, unknown>>)
      : [];
  const names = comps.map((comp) => String(comp['@_name'] ?? '').toUpperCase());
  if (names.includes('VEVENT')) return 'events';
  if (names.includes('VTODO')) return 'tasks';
  // Яндекс не всегда отдаёт набор компонентов, но называет списки задач `todos-…`.
  return lastSegment(href).startsWith('todos-') ? 'tasks' : 'events';
}

function parseColor(value: string): string | null {
  return /^#[0-9a-f]{6}/i.exec(value.trim())?.[0] ?? null;
}

function lastSegment(href: string): string {
  return decodeURIComponent(href.replace(/\/+$/, '').split('/').pop() ?? '');
}

function basicAuth(login: string, password: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(`${login}:${password}`)) {
    binary += String.fromCharCode(byte);
  }
  return `Basic ${btoa(binary)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
