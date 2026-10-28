import type { SchoolEvent } from '@/features/calendar/api';

/** The next events on the ward's calendar that haven't finished or been cancelled. */
export const upcomingEvents = (events: SchoolEvent[], today: string, limit = 3) =>
  events
    .filter((event) => event.endDate >= today && event.status !== 'CANCELLED')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, limit);
