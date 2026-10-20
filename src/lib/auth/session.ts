import { isModuleKey, isPermission, isRole, type AccessSubject, type ModuleKey } from '@/lib/rbac';

/** The signed-in user, validated against the canonical role and permission lists. */
export interface AuthUser extends AccessSubject {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface SchoolProfile {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string | null;
}

export const UNRECOGNISED_ROLE_MESSAGE =
  'Your account has no recognised role. Please contact your school administrator.';

/**
 * Builds an AuthUser from the backend's AuthUserResponseDto (or a stored
 * copy of it). Returns null when the role is unknown, so an unexpected
 * account never falls through to some other role's pages.
 */
export function parseAuthUser(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (!isRole(value.role) || typeof value.id !== 'string') return null;

  return {
    id: value.id,
    email: String(value.email ?? ''),
    firstName: String(value.firstName ?? ''),
    lastName: String(value.lastName ?? ''),
    phone: typeof value.phone === 'string' ? value.phone : null,
    role: value.role,
    schoolId: typeof value.schoolId === 'string' ? value.schoolId : null,
    permissions: Array.isArray(value.permissions) ? value.permissions.filter(isPermission) : [],
  };
}

/**
 * The enabled module keys from `GET /schools/me/modules` (a paginated list, so
 * `data` is the array of modules), ignoring keys this app doesn't know.
 */
export function parseEnabledModules(raw: unknown): ModuleKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const { moduleKey, isEnabled } = (item ?? {}) as Record<string, unknown>;
    return isEnabled === true && isModuleKey(moduleKey) ? [moduleKey] : [];
  });
}
