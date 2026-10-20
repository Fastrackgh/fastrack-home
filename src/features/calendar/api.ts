import { ApiError, apiClient } from '@/lib/api-client';

/** Values of the backend's `SchoolEventType` enum. */
export type EventType =
  | 'HOLIDAY'
  | 'MID_TERM_BREAK'
  | 'EXAMINATION'
  | 'PTA_MEETING'
  | 'SPORTS_DAY'
  | 'FIELD_TRIP'
  | 'OTHER';

export type EventAudience = 'WHOLE_SCHOOL' | 'CLASS' | 'STAFF' | 'PARENTS';
export type EventStatus = 'ACTIVE' | 'POSTPONED' | 'CANCELLED';

export const EVENT_TYPES: { value: EventType; label: string; color: string }[] = [
  { value: 'HOLIDAY', label: 'Holiday / closure', color: 'red' },
  { value: 'MID_TERM_BREAK', label: 'Mid-term break', color: 'orange' },
  { value: 'EXAMINATION', label: 'Examination', color: 'violet' },
  { value: 'PTA_MEETING', label: 'PTA meeting', color: 'blue' },
  { value: 'SPORTS_DAY', label: 'Sports day', color: 'teal' },
  { value: 'FIELD_TRIP', label: 'Field trip', color: 'cyan' },
  { value: 'OTHER', label: 'Other', color: 'gray' },
];

/** Closures shorten the term's school days; the backend refuses them for staff or parents only. */
export const CLOSURE_TYPES: readonly EventType[] = ['HOLIDAY', 'MID_TERM_BREAK'];

export const AUDIENCES: { value: EventAudience; label: string }[] = [
  { value: 'WHOLE_SCHOOL', label: 'Whole school' },
  { value: 'CLASS', label: 'One class' },
  { value: 'STAFF', label: 'Staff only' },
  { value: 'PARENTS', label: 'Parents (e.g. PTA)' },
];

export const STATUSES: { value: EventStatus; label: string; color: string }[] = [
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'POSTPONED', label: 'Postponed', color: 'yellow' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'gray' },
];

export const typeInfo = (type: EventType) =>
  EVENT_TYPES.find((t) => t.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];

export interface SchoolEvent {
  id: string;
  termId: string;
  termLabel?: string;
  yearLabel?: string;
  type: EventType;
  title: string;
  description: string | null;
  /** Inclusive dates, YYYY-MM-DD. */
  startDate: string;
  endDate: string;
  /** HH:MM, or null with `endTime` for an all-day event. */
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  audience: EventAudience;
  classId: string | null;
  className: string | null;
  status: EventStatus;
  createdByName?: string;
}

export interface SchoolDays {
  termId: string;
  startDate: string;
  endDate: string;
  weekdays: number;
  closedDays: number;
  schoolDays: number;
}

export interface Term {
  termId: string;
  termLabel: string;
  yearLabel: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface SchoolClass {
  id: string;
  classCode: string;
  className: string;
}

export interface EventInput {
  type: EventType;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  audience: EventAudience;
  classId: string | null;
  status: EventStatus;
}

const BASE = '/schools/me/calendar';

function params(values: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const calendarApi = {
  async listEvents(termId: string, classId?: string | null) {
    const res = await apiClient.get<SchoolEvent[]>(`${BASE}/events${params({ termId, classId })}`);
    return res.data ?? [];
  },
  async schoolDays(termId: string, classId?: string | null) {
    return (await apiClient.get<SchoolDays>(`${BASE}/school-days${params({ termId, classId })}`))
      .data;
  },
  async createEvent(termId: string, input: EventInput) {
    // Optional fields are omitted on create rather than sent as null.
    const body = Object.fromEntries(
      Object.entries({ termId, ...input }).filter(([, value]) => value !== null),
    );
    return (await apiClient.post<SchoolEvent>(`${BASE}/events`, body)).data;
  },
  async updateEvent(id: string, change: Partial<EventInput>) {
    return (await apiClient.patch<SchoolEvent>(`${BASE}/events/${encodeURIComponent(id)}`, change))
      .data;
  },
  async deleteEvent(id: string) {
    await apiClient.delete(`${BASE}/events/${encodeURIComponent(id)}`);
  },
  /** Every term of every academic year, newest year first. */
  async listTerms(): Promise<Term[]> {
    const years =
      (await apiClient.get<{ id: string; yearLabel: string }[]>('/schools/me/academic-years'))
        .data ?? [];
    const termsByYear = await Promise.all(
      years.map(async (year) => {
        const res = await apiClient.get<
          {
            id: string;
            termLabel: string;
            startDate: string;
            endDate: string;
            isCurrent: boolean;
          }[]
        >(`/schools/me/academic-years/${encodeURIComponent(year.id)}/terms`);
        return (res.data ?? []).map((term) => ({
          termId: term.id,
          termLabel: term.termLabel,
          yearLabel: year.yearLabel,
          startDate: term.startDate,
          endDate: term.endDate,
          isCurrent: term.isCurrent,
        }));
      }),
    );
    return termsByYear.flat();
  },
  /** The school's current term id, or null when none is set up. */
  async currentTermId(): Promise<string | null> {
    try {
      const res = await apiClient.get<{ id: string }>('/schools/me/academic-terms/current');
      return res.data?.id ?? null;
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) return null;
      throw err;
    }
  },
  async listClasses() {
    return (await apiClient.get<SchoolClass[]>('/schools/me/classes')).data ?? [];
  },
};

export const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;
