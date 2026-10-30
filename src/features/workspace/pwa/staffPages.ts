import { areaLabels } from '@/features/dashboard/model';
import { APP_ROUTES, LOGIN_PATH } from '@/lib/rbac';

/** Pages under a route in `APP_ROUTES` that aren't routes of their own. */
const SUB_PAGES = ['/school-admin/results/marks/sheet', '/school-admin/results/reports/class'];

const PLATFORM = '/school-admin/platform';

/**
 * Every staff page the service worker saves for offline use: each route,
 * its sub-pages, every dashboard area, and sign-in. Platform pages are left
 * out (no offline use for super admin).
 */
export function staffPagePaths(): string[] {
  const routes = Object.values(APP_ROUTES)
    .map((route) => route.path)
    .filter((path) => path.startsWith('/school-admin/') && !path.startsWith(PLATFORM));
  const areas = Object.keys(areaLabels).map((area) => `${APP_ROUTES.dashboard.path}/${area}`);
  return [...new Set([LOGIN_PATH, ...routes, ...SUB_PAGES, ...areas])];
}
