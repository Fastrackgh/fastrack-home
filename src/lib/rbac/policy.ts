import { audienceOf, type Audience, type Role } from './roles';
import type { Permission } from './permissions';
import { FEATURE_GRANTS, isFeaturePermission, type FeaturePermission } from './feature-permissions';
import type { ModuleKey } from './modules';

/** Any key `can()` understands: issued by the backend, or a frontend feature grant. */
export type AccessPermission = Permission | FeaturePermission;

/** The parts of a session that access decisions depend on. */
export interface AccessSubject {
  role: Role;
  /** Keys issued by the backend for this user. */
  permissions: readonly Permission[];
  /** Tenant the user belongs to; null for Super Admins and parents. */
  schoolId: string | null;
  /**
   * Modules enabled for the subject's school. Undefined when the school's
   * modules aren't known (platform users, parents); module rules then defer
   * to the backend.
   */
  modules?: readonly ModuleKey[];
  /** Acting in a closed period, such as an archived term: only reads are allowed. */
  readOnly?: boolean;
}

/**
 * A requirement a subject must meet. Every listed condition must hold:
 * the subject's audience is allowed, they hold the permission, and the
 * module is enabled for their school.
 */
export interface AccessRule {
  audiences: readonly Audience[];
  permission?: AccessPermission;
  module?: ModuleKey;
}

/** Actions that stay available in a read-only period. */
const READ_ACTIONS = new Set(['read', 'export']);

export function isReadPermission(permission: AccessPermission): boolean {
  return READ_ACTIONS.has(permission.slice(permission.indexOf(':') + 1));
}

export function can(subject: AccessSubject | null, permission: AccessPermission): boolean {
  if (!subject) return false;
  if (subject.readOnly && !isReadPermission(permission)) return false;
  return isFeaturePermission(permission)
    ? FEATURE_GRANTS[subject.role].includes(permission)
    : subject.permissions.includes(permission);
}

/** Whether `subject` may open a place. Opening depends on who they are, not on a read-only period. */
export function meetsRule(subject: AccessSubject | null, rule: AccessRule): boolean {
  if (!subject) return false;
  const audience = audienceOf(subject.role);
  if (!rule.audiences.includes(audience)) return false;
  // Staff always act inside one school; a staff session without a tenant is invalid.
  if (audience === 'staff' && !subject.schoolId) return false;
  if (rule.module !== undefined && !hasModule(subject, rule.module)) return false;
  return rule.permission === undefined || can({ ...subject, readOnly: false }, rule.permission);
}

/** Whether the subject's school has `key` enabled; unknown modules defer to the backend. */
export function hasModule(subject: AccessSubject, key: ModuleKey): boolean {
  return subject.modules === undefined || subject.modules.includes(key);
}
