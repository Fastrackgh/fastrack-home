const shortDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** `14 Mar 2026` from an ISO date or timestamp; empty for a missing value. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : shortDate.format(date);
}

/** "1st", "2nd", "3rd", "4th", "11th", "21st". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;
}

/** A position, with "=" when another pupil shares it, as printed reports show: "2nd=". */
export const place = (n: number, tied?: boolean) => `${ordinal(n)}${tied ? '=' : ''}`;

const timeAgo = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** `5 minutes ago`, `yesterday`, … for how old a saved or synced copy is. */
export function formatAge(at: number, now = Date.now()): string {
  const minutes = Math.round((now - at) / 60000);
  if (minutes < 60) return timeAgo.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return timeAgo.format(-hours, 'hour');
  return timeAgo.format(-Math.round(hours / 24), 'day');
}
