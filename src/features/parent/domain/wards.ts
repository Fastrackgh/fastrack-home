import type { Ward } from '../types';

type Named = Pick<Ward, 'firstName' | 'surname'>;

export const wardName = (ward: Named) => `${ward.firstName} ${ward.surname}`.trim();

export const wardInitials = (ward: Named) =>
  `${ward.firstName.charAt(0)}${ward.surname.charAt(0)}`.toUpperCase();

/** The signed-in parent's initials, for their avatar. */
export const userInitials = (user: { firstName: string; lastName: string }) =>
  `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

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

/** A school module a portal area depends on. */
export type SchoolModule = 'fees' | 'results' | 'attendance';

/**
 * Whether the ward's school offers an area. Unknown (an older response)
 * counts as offered; the page then says "Not offered by this school" if the
 * school refuses (QA-262).
 */
export const schoolOffers = (ward: Pick<Ward, 'school'> | null | undefined, module: SchoolModule) =>
  !ward?.school.enabledModules || ward.school.enabledModules.includes(module);
