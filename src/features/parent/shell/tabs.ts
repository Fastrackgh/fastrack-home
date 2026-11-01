import type React from 'react';
import { CalendarCheck, FileText, House, LayoutGrid, Wallet } from 'lucide-react';
import { APP_ROUTES, canAccessRoute, type AccessSubject, type AppRouteKey } from '@/lib/rbac';
import { canOpenArea, type ParentArea } from '../domain/areas';
import type { Ward } from '../types';

export interface ShellTab {
  key: AppRouteKey;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  /** The area behind the tab, left out when the child's school hasn't turned it on. */
  area?: ParentArea;
  /** Other sections that light this tab up. */
  also?: string[];
}

const TABS: ShellTab[] = [
  { key: 'parentHome', label: 'Home', icon: House },
  {
    key: 'parentFees',
    label: 'Fees',
    icon: Wallet,
    area: 'fees',
    also: [APP_ROUTES.parentReceipts.path],
  },
  { key: 'parentReports', label: 'Reports', icon: FileText, area: 'reports' },
  { key: 'parentAttendance', label: 'Attendance', icon: CalendarCheck, area: 'attendance' },
  { key: 'parentMore', label: 'More', icon: LayoutGrid, also: [APP_ROUTES.parentWards.path] },
];

/** The tabs this parent sees for this child (QA-262). */
export const visibleTabs = (user: AccessSubject | null, ward: Ward | null) =>
  TABS.filter((tab) =>
    tab.area ? canOpenArea(user, ward, tab.area) : canAccessRoute(user, tab.key),
  );

const within = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export function isTabActive(tab: ShellTab, pathname: string) {
  const path = APP_ROUTES[tab.key].path;
  // Home is the base of every parent path, so only an exact match counts.
  if (tab.key === 'parentHome') return pathname === path;
  return [path, ...(tab.also ?? [])].some((base) => within(pathname, base));
}
