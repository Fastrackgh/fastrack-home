import { setupApi, type DatedTerm, type TermInYear } from '@/features/school-setup/api';
import { apiClient } from '@/lib/api-client';

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

/** The term the calendar shows; only a dated term has months to draw. */
export type Term = DatedTerm;

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
  /** Every term of every academic year, newest year first, undated ones included. */
  async listTerms(): Promise<TermInYear[]> {
    return setupApi.listTerms();
  },
  /** The school's current term id, or null when none is set up. */
  async currentTermId(): Promise<string | null> {
    return (await setupApi.currentTerm())?.termId ?? null;
  },
  /** Every class (the list endpoint pages, at most 100 a page). */
  async listClasses(): Promise<SchoolClass[]> {
    return setupApi.allClasses();
  },
};
