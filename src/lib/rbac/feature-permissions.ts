import type { Role } from './roles';

/**
 * Permissions for features the backend does not issue yet. Until it does,
 * they are granted by role here, from the role review in the System & RBAC
 * Reference (open questions there are denied).
 *
 * When the backend starts issuing one of these keys: move it to
 * `PERMISSIONS` in ./permissions.ts and delete it from this file, so the
 * backend becomes its only source.
 */
export const FEATURE_PERMISSIONS = [
  'budgets:read',
  'budgets:manage',
  'payment_plans:read',
  'payment_plans:manage',
  'enquiries:read',
  'enquiries:manage',
  'marks:read',
  'marks:enter',
  'grading:manage',
  'reports:generate',
  'question_bank:read',
  'question_bank:manage',
  'meals:read',
  'meals:manage',
  'gallery:read',
  'gallery:manage',
  'documents:read',
  'documents:manage',
  'messages:read',
  'messages:send',
  'data:export',
] as const;

export type FeaturePermission = (typeof FEATURE_PERMISSIONS)[number];

export const FEATURE_GRANTS: Record<Role, readonly FeaturePermission[]> = {
  SUPER_ADMIN: ['data:export'],
  PRINCIPAL: [
    'budgets:read',
    'budgets:manage',
    'payment_plans:read',
    'payment_plans:manage',
    'enquiries:read',
    'enquiries:manage',
    'marks:read',
    'marks:enter',
    'reports:generate',
    'question_bank:read',
    'question_bank:manage',
    'meals:read',
    'meals:manage',
    'gallery:read',
    'gallery:manage',
    'documents:read',
    'documents:manage',
    'messages:read',
    'messages:send',
    'data:export',
  ],
  ACADEMIC_HEAD: [
    'marks:read',
    'marks:enter',
    'grading:manage',
    'reports:generate',
    'question_bank:read',
    'question_bank:manage',
    'gallery:read',
    'documents:read',
    'messages:read',
    'messages:send',
    'data:export',
  ],
  TEACHER: [
    'marks:read',
    'marks:enter',
    'question_bank:read',
    'question_bank:manage',
    'meals:read',
    'gallery:read',
    'documents:read',
    'documents:manage',
  ],
  ACCOUNT_OFFICER: [
    'budgets:read',
    'budgets:manage',
    'payment_plans:read',
    'payment_plans:manage',
    'documents:read',
    'data:export',
  ],
  SECRETARY: [
    'enquiries:read',
    'enquiries:manage',
    'marks:read',
    'reports:generate',
    'meals:read',
    'meals:manage',
    'gallery:read',
    'gallery:manage',
    'documents:read',
    'documents:manage',
    'data:export',
  ],
  PARENT: [
    'marks:read',
    'meals:read',
    'gallery:read',
    'documents:read',
    'messages:read',
    'messages:send',
  ],
};

export function isFeaturePermission(value: string): value is FeaturePermission {
  return (FEATURE_PERMISSIONS as readonly string[]).includes(value);
}
