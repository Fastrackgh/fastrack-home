import type { Ward } from './types';

export const wardName = (ward: Pick<Ward, 'firstName' | 'surname'>) =>
  `${ward.firstName} ${ward.surname}`.trim();

export const wardInitials = (ward: Pick<Ward, 'firstName' | 'surname'>) =>
  `${ward.firstName.charAt(0)}${ward.surname.charAt(0)}`.toUpperCase();

/** `Primary 2 - Gold · Lifecycle Academy` */
export const wardPlacement = (ward: Ward) =>
  [ward.currentClass?.name, ward.school.name].filter(Boolean).join(' · ');

const STATUS_LABELS: Record<string, string> = {
  Pending_Admission: 'Pending admission',
  Active: 'Active',
  Inactive: 'Inactive',
  Stopped: 'Stopped',
  Transferred_Out: 'Transferred out',
  Graduated: 'Graduated',
};

export const wardStatusLabel = (status: string) => STATUS_LABELS[status] ?? status;
export const wardStatusColor = (status: string) => (status === 'Active' ? 'green' : 'gray');

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

const INVOICE_STATUSES: Record<string, { label: string; color: string }> = {
  UNPAID: { label: 'Unpaid', color: 'red' },
  PARTIAL: { label: 'Part paid', color: 'orange' },
  PAID: { label: 'Paid', color: 'green' },
  OVERPAID: { label: 'In credit', color: 'cyan' },
  // The unpaid balance moved onto the next term's bill as arrears; this bill shows 0.
  CARRIED_FORWARD: { label: 'Moved to next bill', color: 'gray' },
};

export const invoiceStatus = (status: string) =>
  INVOICE_STATUSES[status] ?? { label: status, color: 'gray' };

export const percent = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : null;
