import { meetsRule, type AccessRule, type AccessSubject } from './policy';
import { audienceOf, type Role } from './roles';

export const LOGIN_PATH = '/school-admin/login';

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
    rule: { audiences: ['staff', 'parent'] },
  },
  students: {
    path: '/school-admin/students',
    label: 'Students',
    rule: { audiences: ['staff'], permission: 'students:read', module: 'students' },
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
  staff: {
    path: '/school-admin/staff',
    label: 'Staff',
    rule: { audiences: ['staff'], permission: 'staff:read' },
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
  return audienceOf(role) === 'platform' ? APP_ROUTES.platform.path : APP_ROUTES.dashboard.path;
}

/**
 * Validates a post-login `next` target: only an in-app path the subject may
 * open is accepted, so the parameter can't redirect off-site or into a page
 * belonging to another role.
 */
export function safeRedirectTarget(next: string | null, subject: AccessSubject): string | null {
  if (!next || !next.startsWith('/school-admin/')) return null;
  const [pathname] = next.split(/[?#]/);
  return canAccessPath(subject, pathname) ? next : null;
}
