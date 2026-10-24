/**
 * Modules a school subscribes to, keyed as the backend's `modules.module_key`.
 * A disabled module hides its pages and areas for everyone in that school;
 * the backend's ModuleGuard refuses its endpoints regardless.
 */
export const MODULES = [
  'students',
  'attendance',
  'timetable',
  'fees',
  'discounts',
  'other_income',
  'expenses',
  'payroll',
  /** Marks, grading and term reports (docs/api/results.md). */
  'results',
] as const;

export type ModuleKey = (typeof MODULES)[number];

export function isModuleKey(value: unknown): value is ModuleKey {
  return typeof value === 'string' && (MODULES as readonly string[]).includes(value);
}
