import { canAccessRoute, type AccessSubject, type AppRouteKey } from '@/lib/rbac';
import { parentAreaReady } from '../config';
import type { Ward } from '../types';
import { schoolOffers, type SchoolModule } from './wards';

/** The portal areas that depend on a school module. */
export type ParentArea = 'fees' | 'reports' | 'attendance';

interface AreaRule {
  route: AppRouteKey;
  module: SchoolModule;
  /** False while the backend doesn't serve the area yet (see `parentAreaReady`). */
  ready: boolean;
}

export const PARENT_AREAS: Record<ParentArea, AreaRule> = {
  fees: { route: 'parentFees', module: 'fees', ready: true },
  reports: { route: 'parentReports', module: 'results', ready: parentAreaReady.reports },
  attendance: {
    route: 'parentAttendance',
    module: 'attendance',
    ready: parentAreaReady.attendance,
  },
};

/**
 * Whether the parent may open an area for this ward: their role allows the
 * page and the ward's school has the module turned on (QA-262).
 */
export const canOpenArea = (user: AccessSubject | null, ward: Ward | null, area: ParentArea) =>
  canAccessRoute(user, PARENT_AREAS[area].route) && schoolOffers(ward, PARENT_AREAS[area].module);

/** As `canOpenArea`, and the area has data to show, so it is worth reading. */
export const hasAreaData = (user: AccessSubject | null, ward: Ward | null, area: ParentArea) =>
  PARENT_AREAS[area].ready && canOpenArea(user, ward, area);
