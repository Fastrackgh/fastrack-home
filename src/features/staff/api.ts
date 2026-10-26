import { apiClient } from '@/lib/api-client';
import { fetchAll } from '@/lib/pagination';
import type { SchoolRole } from '@/lib/rbac';

/** A teaching staff record from `GET /schools/me/staff`. */
export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  staffCode: string | null;
  position: string | null;
  department: string | null;
  staffCategory?: StaffCategory | null;
  isActive: boolean;
  /** False until they accept their invitation and set a password. */
  accountSetUp?: boolean;
}

export type StaffCategory = 'Teaching' | 'Non-Teaching';

/** Fields `PATCH /schools/me/staff/:id` takes. */
export interface StaffUpdate {
  firstName: string;
  lastName: string;
  phone: string;
  staffCode: string;
  position: string;
  department: string;
  staffCategory: StaffCategory | null;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

/** An invitation from `GET /invitations`, scoped by the backend to the user's school. */
export interface Invitation {
  id: string;
  email: string;
  userName?: string;
  role: SchoolRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

/**
 * Who may edit, deactivate or reactivate a staff member: a Principal manages
 * every role below them, an Academic Head only teachers and secretaries, and
 * nobody manages themselves. The backend enforces the same ranks.
 */
export function canManageMember(
  viewer: { id: string; role: string } | null,
  member: StaffMember,
): boolean {
  if (!viewer || viewer.id === member.id) return false;
  if (viewer.role === 'PRINCIPAL')
    return ['ACADEMIC_HEAD', 'ACCOUNT_OFFICER', 'SECRETARY', 'TEACHER'].includes(member.role);
  if (viewer.role === 'ACADEMIC_HEAD') return ['TEACHER', 'SECRETARY'].includes(member.role);
  return false;
}

/** Roles a school user can invite. Principals are assigned by the platform. */
export const INVITABLE_ROLES = [
  'ACADEMIC_HEAD',
  'TEACHER',
  'ACCOUNT_OFFICER',
  'SECRETARY',
] as const satisfies readonly SchoolRole[];

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export interface InviteRequest {
  role: InvitableRole;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export const staffApi = {
  /** Every staff member, however many pages (QA-030). */
  async listStaff() {
    return fetchAll<StaffMember>('/schools/me/staff');
  },
  async listInvitations() {
    return fetchAll<Invitation>('/invitations');
  },
  /** Creates the account without a password, so the backend emails an invitation. */
  async invite(request: InviteRequest) {
    await apiClient.post('/users', request);
  },
  async resend(id: string) {
    await apiClient.post(`/invitations/${encodeURIComponent(id)}/resend`, {});
  },
  async update(id: string, change: Partial<StaffUpdate>) {
    await apiClient.patch(`/schools/me/staff/${encodeURIComponent(id)}`, change);
  },
  async setActive(id: string, active: boolean) {
    await apiClient.patch(
      `/schools/me/staff/${encodeURIComponent(id)}/${active ? 'activate' : 'deactivate'}`,
      {},
    );
  },
  async revoke(id: string) {
    await apiClient.patch(`/invitations/${encodeURIComponent(id)}/revoke`, {});
  },
};
