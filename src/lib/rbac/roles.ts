/**
 * Canonical role identifiers. Values match the backend `Roles` enum
 * (fastrack-backend/src/enum/roles.enum.ts) and the `role` field of the
 * authenticated user. Never compare against any other spelling.
 */
export const ROLES = [
  'SUPER_ADMIN',
  'PRINCIPAL',
  'ACADEMIC_HEAD',
  'TEACHER',
  'ACCOUNT_OFFICER',
  'SECRETARY',
  'PARENT',
] as const;

export type Role = (typeof ROLES)[number];

/** Roles that work inside a school (everyone except the platform operator). */
export type SchoolRole = Exclude<Role, 'SUPER_ADMIN'>;

/**
 * Who a role works for. `platform` operates across every school, `staff`
 * works inside one school, and `parent` sees only their linked children.
 */
export type Audience = 'platform' | 'staff' | 'parent';

const ROLE_AUDIENCE: Record<Role, Audience> = {
  SUPER_ADMIN: 'platform',
  PRINCIPAL: 'staff',
  ACADEMIC_HEAD: 'staff',
  TEACHER: 'staff',
  ACCOUNT_OFFICER: 'staff',
  SECRETARY: 'staff',
  PARENT: 'parent',
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  PRINCIPAL: 'Principal',
  ACADEMIC_HEAD: 'Academic Head',
  TEACHER: 'Teacher',
  ACCOUNT_OFFICER: 'Account Officer',
  SECRETARY: 'Administrative Secretary',
  PARENT: 'Parent',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function audienceOf(role: Role): Audience {
  return ROLE_AUDIENCE[role];
}

export function isSchoolRole(role: Role): role is SchoolRole {
  return audienceOf(role) !== 'platform';
}

/**
 * Which records a role may see within what its permissions allow:
 * the whole school, only the classes assigned to them, only their
 * linked children, or platform-level data across schools.
 */
export type DataScope = 'platform' | 'school' | 'assigned_classes' | 'own_children';

const ROLE_SCOPE: Record<Role, DataScope> = {
  SUPER_ADMIN: 'platform',
  PRINCIPAL: 'school',
  ACADEMIC_HEAD: 'school',
  TEACHER: 'assigned_classes',
  ACCOUNT_OFFICER: 'school',
  SECRETARY: 'school',
  PARENT: 'own_children',
};

export function dataScopeOf(role: Role): DataScope {
  return ROLE_SCOPE[role];
}
