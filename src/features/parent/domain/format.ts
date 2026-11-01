/** Shared with the staff pages; kept here so parent screens import their formatting in one place. */
export { formatDate } from '@/lib/format';

const timeAgo = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** `5 minutes ago`, `yesterday`, … for an offline copy's age. */
export function formatAge(savedAt: number): string {
  const minutes = Math.round((Date.now() - savedAt) / 60000);
  if (minutes < 60) return timeAgo.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return timeAgo.format(-hours, 'hour');
  return timeAgo.format(-Math.round(hours / 24), 'day');
}

export const percent = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

/** `82%`, or a dash when there is nothing to divide by. */
export const formatPercent = (value: number | null) => (value === null ? '–' : `${value}%`);

/** Joins the parts that are present with ` · `. */
export const joinDetails = (...parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).join(' · ');

/** Badge text and colour for a status. */
export interface StatusStyle {
  label: string;
  color: string;
}

/** `Good morning` / `Good afternoon` / `Good evening` for the hour given. */
export const greeting = (hour = new Date().getHours()) =>
  hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
