/** Calendar dates are plain YYYY-MM-DD strings, handled in UTC so no time zone shifts a day. */

const DAY_MS = 24 * 60 * 60 * 1000;

export const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const toIso = (date: Date) => date.toISOString().slice(0, 10);
export const addDays = (iso: string, days: number) =>
  toIso(new Date(toDate(iso).getTime() + days * DAY_MS));

/** The first day of the month `iso` falls in, e.g. 2027-02-01. */
export const monthOf = (iso: string) => `${iso.slice(0, 7)}-01`;

export function addMonths(monthIso: string, months: number) {
  const d = toDate(monthIso);
  return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)));
}

/** Every first-of-month from the term's start month to its end month. */
export function monthsBetween(startIso: string, endIso: string): string[] {
  const months: string[] = [];
  for (let m = monthOf(startIso); m <= monthOf(endIso); m = addMonths(m, 1)) months.push(m);
  return months;
}

/** The 5–6 Monday-first weeks covering a month, as YYYY-MM-DD strings. */
export function monthWeeks(monthIso: string): string[][] {
  const first = toDate(monthIso);
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  let day = addDays(monthIso, -mondayOffset);
  const next = addMonths(monthIso, 1);
  const weeks: string[][] = [];
  while (day < next) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export const isWeekend = (iso: string) => [0, 6].includes(toDate(iso).getUTCDay());

const longDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const monthTitle = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatDay = (iso: string) => longDate.format(toDate(iso));
export const formatMonth = (monthIso: string) => monthTitle.format(toDate(monthIso));

/** "Mon 15 Feb" or "Mon 15 Feb – Fri 19 Feb". */
export const formatSpan = (start: string, end: string) =>
  start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;

/** Today in Accra, which is UTC all year. */
export const todayIso = () => toIso(new Date());
