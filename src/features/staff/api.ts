import { apiClient } from '@/lib/api-client';
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
  isActive: boolean;
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
  async listStaff() {
    return (await apiClient.get<StaffMember[]>('/schools/me/staff?limit=100')).data ?? [];
  },
  async listInvitations() {
    return (await apiClient.get<Invitation[]>('/invitations?limit=100')).data ?? [];
  },
  /** Creates the account without a password, so the backend emails an invitation. */
  async invite(request: InviteRequest) {
    await apiClient.post('/users', request);
  },
  async resend(id: string) {
    await apiClient.post(`/invitations/${encodeURIComponent(id)}/resend`, {});
  },
  async revoke(id: string) {
    await apiClient.patch(`/invitations/${encodeURIComponent(id)}/revoke`, {});
  },
};
