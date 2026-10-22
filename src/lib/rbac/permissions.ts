/**
 * Permission keys issued by the backend in the authenticated user's
 * `permissions` array (fastrack-backend/src/common/auth/permissions.enum.ts).
 * The backend decides who holds which key; the frontend only reads them.
 * Keep this list in sync when the backend adds a key.
 */
export const PERMISSIONS = [
  // Platform & school management
  'schools:read',
  'schools:manage',
  'modules:read',
  'modules:manage',
  'school_modules:read',
  'school_modules:manage',
  'school_profile:manage',

  // Academic calendar
  'academic_years:read',
  'academic_years:manage',
  'academic_terms:read',
  'academic_terms:manage',

  // School calendar (events, closures)
  'calendar:read',
  'calendar:manage',

  // Classes, classrooms & departments
  'classes:read',
  'classes:manage',
  'classrooms:read',
  'classrooms:manage',
  'departments:read',
  'departments:manage',

  // Parent-facing document templates (bills, terminal reports)
  'document_templates:read',
  'document_templates:manage',

  // Staff
  'staff:read',
  'staff:manage',

  // Students & enrollment
  'students:read',
  'students:create',
  'students:update',
  'students:delete',
  'students:exit',
  'student_fee_preferences:manage',
  'enrollment:read',
  'enrollment:manage',

  // Attendance
  'attendance:read',
  'attendance:mark',

  // Fees & billing
  'fee_types:read',
  'fee_types:manage',
  'fee_structures:read',
  'fee_structures:manage',
  'invoices:read',
  'invoices:generate',
  'payments:read',
  'payments:collect',
  'discounts:read',
  'discounts:manage',

  // Other income & expenses
  'other_income:read',
  'other_income:create',
  'expenses:read',
  'expenses:create',

  // Timetable & subjects
  'subjects:read',
  'subjects:manage',
  'timetable:read',
  'timetable:manage',

  // Analytics & audit
  'analytics:read',
  'audit_logs:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);
}
