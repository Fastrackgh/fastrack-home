import { meetsRule, type AccessRule, type AccessSubject } from './policy';
import { audienceOf, type Role } from './roles';

export const LOGIN_PATH = '/school-admin/login';

/** The parent portal (an installable PWA) lives outside the staff app. */
export const PARENT_BASE_PATH = '/parent';
export const PARENT_LOGIN_PATH = '/parent/login';

export interface AppRoute {
  path: string;
  label: string;
  rule: AccessRule;
}

/**
 * Every authenticated page and the rule that guards it. A page under the
 * guarded app layout that is missing here is denied to everyone, so new
 * pages must be registered before they can be reached.
 */
export const APP_ROUTES = {
  dashboard: {
    path: '/school-admin/dashboard',
    label: 'Overview',
    rule: { audiences: ['staff'] },
  },
  students: {
    path: '/school-admin/students',
    label: 'Students',
    rule: { audiences: ['staff'], permission: 'students:read', module: 'students' },
  },
  promotions: {
    path: '/school-admin/students/promote',
    label: 'Move classes up',
    rule: { audiences: ['staff'], permission: 'enrollment:manage', module: 'students' },
  },
  attendance: {
    path: '/school-admin/attendance',
    label: 'Attendance',
    rule: { audiences: ['staff'], permission: 'attendance:read', module: 'attendance' },
  },
  fees: {
    path: '/school-admin/fees',
    label: 'Fees & Billing',
    rule: { audiences: ['staff'], permission: 'invoices:read', module: 'fees' },
  },
  optionalFeeRequests: {
    path: '/school-admin/fees/requests',
    label: 'Service requests',
    rule: {
      audiences: ['staff'],
      permission: 'student_fee_preferences:manage',
      module: 'fees',
    },
  },
  staff: {
    path: '/school-admin/staff',
    label: 'Staff',
    rule: { audiences: ['staff'], permission: 'staff:read' },
  },
  setup: {
    path: '/school-admin/setup',
    label: 'School setup',
    rule: { audiences: ['staff'], permission: 'classes:manage' },
  },
  resultsSetup: {
    path: '/school-admin/results/setup',
    label: 'Grading setup',
    rule: { audiences: ['staff'], permission: 'grading:manage', module: 'results' },
  },
  account: {
    path: '/school-admin/account',
    label: 'My account',
    rule: { audiences: ['staff'] },
  },
  templates: {
    path: '/school-admin/templates',
    label: 'Bill & report designs',
    rule: { audiences: ['staff'], permission: 'document_templates:read' },
  },
  calendar: {
    path: '/school-admin/calendar',
    label: 'School calendar',
    rule: { audiences: ['staff'], permission: 'calendar:read' },
  },
  admissions: {
    path: '/school-admin/admissions',
    label: 'Online admissions',
    rule: { audiences: ['staff'], permission: 'enrollment:manage', module: 'students' },
  },
  platform: {
    path: '/school-admin/platform',
    label: 'Platform Console',
    rule: { audiences: ['platform'], permission: 'schools:manage' },
  },
  parentHome: {
    path: PARENT_BASE_PATH,
    label: 'Home',
    rule: { audiences: ['parent'] },
  },
  parentWards: {
    path: '/parent/wards',
    label: 'My children',
    rule: { audiences: ['parent'], permission: 'students:read' },
  },
  parentFees: {
    path: '/parent/fees',
    label: 'Fees',
    rule: { audiences: ['parent'], permission: 'invoices:read' },
  },
  parentReceipts: {
    path: '/parent/receipts',
    label: 'Receipts',
    rule: { audiences: ['parent'], permission: 'payments:read' },
  },
  parentReports: {
    path: '/parent/reports',
    label: 'Reports',
    rule: { audiences: ['parent'], permission: 'marks:read' },
  },
  parentAttendance: {
    path: '/parent/attendance',
    label: 'Attendance',
    rule: { audiences: ['parent'], permission: 'attendance:read' },
  },
  parentMore: {
    path: '/parent/more',
    label: 'More',
    rule: { audiences: ['parent'] },
  },
} as const satisfies Record<string, AppRoute>;

export type AppRouteKey = keyof typeof APP_ROUTES;

const routesBySpecificity: AppRoute[] = Object.values(APP_ROUTES).sort(
  (a, b) => b.path.length - a.path.length,
);

/** The registered route that owns `pathname`, matching nested paths by prefix. */
export function findRoute(pathname: string): AppRoute | undefined {
  return routesBySpecificity.find(
    (route) => pathname === route.path || pathname.startsWith(`${route.path}/`),
  );
}

export function canAccessPath(subject: AccessSubject | null, pathname: string): boolean {
  const route = findRoute(pathname);
  return route !== undefined && meetsRule(subject, route.rule);
}

export function canAccessRoute(subject: AccessSubject | null, key: AppRouteKey): boolean {
  return meetsRule(subject, APP_ROUTES[key].rule);
}

export function landingPathFor(role: Role): string {
  const audience = audienceOf(role);
  if (audience === 'platform') return APP_ROUTES.platform.path;
  if (audience === 'parent') return APP_ROUTES.parentHome.path;
  return APP_ROUTES.dashboard.path;
}

export function isParentPath(pathname: string): boolean {
  return pathname === PARENT_BASE_PATH || pathname.startsWith(`${PARENT_BASE_PATH}/`);
}

/** The sign-in page for the app that owns `pathname`: the parent portal or the staff app. */
export function loginPathFor(pathname: string): string {
  return isParentPath(pathname) ? PARENT_LOGIN_PATH : LOGIN_PATH;
}

/**
 * Validates a post-login `next` target: only an in-app path the subject may
 * open is accepted, so the parameter can't redirect off-site or into a page
 * belonging to another role.
 */
export function safeRedirectTarget(next: string | null, subject: AccessSubject): string | null {
  if (!next) return null;
  const [pathname] = next.split(/[?#]/);
  if (!pathname.startsWith('/school-admin/') && !isParentPath(pathname)) return null;
  return canAccessPath(subject, pathname) ? next : null;
}
