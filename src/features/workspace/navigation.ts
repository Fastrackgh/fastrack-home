import {
  OVERVIEW_PATH,
  accessibleAreas,
  areaHref,
  areaLabel,
  type Area,
  type Viewer,
} from '@/features/dashboard/model';

export interface NavItem {
  id: Area | 'overview';
  label: string;
  href: string;
}

/**
 * The sidebar for a school user: the overview, then every area they may
 * open in their role's layout order. Areas served by the same live page
 * (fees and debts both open Fees & Billing) collapse into one entry.
 */
export function workspaceNavigation(viewer: Viewer): NavItem[] {
  const items: NavItem[] = [{ id: 'overview', label: 'Overview', href: OVERVIEW_PATH }];
  for (const area of accessibleAreas(viewer)) {
    const href = areaHref(viewer, area);
    if (!items.some((item) => item.href === href))
      items.push({ id: area, label: areaLabel(viewer, area), href });
  }
  return items;
}

/** The item `pathname` belongs to: the longest matching href wins. */
export function activeNavItem(items: NavItem[], pathname: string): NavItem | undefined {
  return items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
