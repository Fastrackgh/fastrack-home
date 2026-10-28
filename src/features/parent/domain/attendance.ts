import { addDays, addMonths } from '@/features/calendar/dates';
import type { AttendanceDay, AttendanceMark, AttendanceRecord } from '../types';
import { percent, type StatusStyle } from './format';

export const MARKS: Record<AttendanceMark, StatusStyle> = {
  present: { label: 'Present', color: 'green' },
  late: { label: 'Late', color: 'orange' },
  half_day: { label: 'Half day', color: 'yellow' },
  absent: { label: 'Absent', color: 'red' },
  excused: { label: 'Excused', color: 'blue' },
};

/** Column headings of a Monday-first month grid. */
export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** First and last day of the month starting `monthIso`. */
export const monthRange = (monthIso: string) => ({
  from: monthIso,
  to: addDays(addMonths(monthIso, 1), -1),
});

/**
 * Share of marked school days a child was in school; late arrivals and half
 * days count as attended, and days not yet marked or excused are left out.
 */
export const attendanceRate = ({ summary }: AttendanceRecord) =>
  percent(
    summary.present + summary.late + summary.halfDay,
    summary.schoolDays - summary.excused - summary.unmarked,
  );

/** `Late · arrived 08:10 · Traffic`, for a marked day's tooltip. */
export const dayDescription = (day: AttendanceDay | undefined) =>
  day?.status
    ? [MARKS[day.status].label, day.arrivalTime && `arrived ${day.arrivalTime}`, day.note]
        .filter(Boolean)
        .join(' · ')
    : undefined;
