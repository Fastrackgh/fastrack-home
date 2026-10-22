import { apiClient } from '@/lib/api-client';

/** Values of the backend's `AttendanceStatus`, as the register sends and takes them. */
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Excused';

export const STATUSES: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'Present', label: 'Present', color: 'green' },
  { value: 'Late', label: 'Late', color: 'orange' },
  { value: 'Half Day', label: 'Half day', color: 'yellow' },
  { value: 'Absent', label: 'Absent', color: 'red' },
  { value: 'Excused', label: 'Excused', color: 'blue' },
];

export const statusInfo = (status: AttendanceStatus) =>
  STATUSES.find((s) => s.value === status) ?? STATUSES[0];

/** The backend refuses an arrival time on these. */
export const NO_ARRIVAL: readonly AttendanceStatus[] = ['Absent', 'Excused'];

export interface RegisterStudent {
  studentId: string;
  studentCode: string | null;
  /** "Surname, First Other". */
  name: string;
  status: AttendanceStatus | null;
  /** HH:MM. */
  arrivalTime: string | null;
  note: string | null;
  markedBy: string | null;
  markedAt: string | null;
}

export interface Counts {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  excused: number;
}

/** `GET /schools/me/attendance/register`: one class on one day. */
export interface Register {
  classId: string;
  className: string;
  date: string;
  schoolDay: {
    open: boolean;
    termId: string | null;
    reason: 'WEEKEND' | 'OUTSIDE_TERM' | 'CLOSURE' | null;
    closureTitle: string | null;
  };
  /** False when the day is closed, or the viewer may not mark this class. */
  canMark: boolean;
  students: RegisterStudent[];
  counts: Counts;
  unmarked: number;
}

export interface Mark {
  studentId: string;
  status: AttendanceStatus;
  arrivalTime?: string;
  note?: string;
}

/** `GET /schools/me/attendance/summary`: each pupil's totals over a term, up to today. */
export interface TermSummary {
  classId: string;
  termId: string;
  from: string;
  to: string;
  schoolDays: number;
  students: (Counts & {
    studentId: string;
    studentCode: string | null;
    name: string;
    unmarked: number;
  })[];
}

/** The register endpoint takes at most this many marks per call. */
const MAX_MARKS = 200;
const BASE = '/schools/me/attendance';

export const attendanceApi = {
  async register(classId: string, date: string) {
    const query = new URLSearchParams({ classId, date });
    return (await apiClient.get<Register>(`${BASE}/register?${query}`)).data;
  },
  /** Saves marks; students left out keep theirs. Returns the updated register. */
  async mark(classId: string, date: string, marks: Mark[]) {
    let register: Register | null = null;
    for (let i = 0; i < marks.length; i += MAX_MARKS) {
      const body = { classId, date, marks: marks.slice(i, i + MAX_MARKS) };
      register = (await apiClient.put<Register>(`${BASE}/register`, body)).data;
    }
    return register ?? attendanceApi.register(classId, date);
  },
  async summary(classId: string, termId: string | null) {
    const query = new URLSearchParams({ classId });
    if (termId) query.set('termId', termId);
    return (await apiClient.get<TermSummary>(`${BASE}/summary?${query}`)).data;
  },
};

/** Share of marked days a pupil attended; half days and late arrivals count as attended. */
export function attendedRate(counts: Counts): number | null {
  const marked = counts.present + counts.late + counts.halfDay + counts.absent;
  if (marked === 0) return null;
  return Math.round(((counts.present + counts.late + counts.halfDay) / marked) * 1000) / 10;
}
