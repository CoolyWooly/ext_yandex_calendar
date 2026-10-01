/** Мой ответ на встречу. `none` — ответ не нужен (личное событие, чужая бронь переговорки). */
export type MyStatus = 'organizer' | 'accepted' | 'tentative' | 'declined' | 'needs-action' | 'none';

export interface JoinLink {
  url: string;
  provider: string;
}

/** Один экземпляр встречи: у повторяющейся серии — каждое повторение отдельно. */
export interface Meeting {
  /** UID + время повторения: не меняется при переносе экземпляра. */
  key: string;
  uid: string;
  calendarHref: string;
  title: string;
  /** Начало и конец, мс с эпохи. У событий на весь день — локальная полночь, конец не включается. */
  start: number;
  end: number;
  allDay: boolean;
  location: string | null;
  join: JoinLink | null;
  /** Ссылка на встречу в веб-интерфейсе Яндекс Календаря. */
  eventUrl: string | null;
  organizer: { name: string | null; email: string } | null;
  attendeeCount: number;
  myStatus: MyStatus;
  cancelled: boolean;
  recurring: boolean;
  /**
   * LAST-MODIFIED события. Отличает действительно новую встречу от давно созданной,
   * которая просто попала в окно ближайших дней.
   */
  modifiedAt: number | null;
}

export interface TimeRange {
  start: number;
  end: number;
}
