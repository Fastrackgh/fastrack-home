'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, Menu, Text, UnstyledButton } from '@mantine/core';
import { useNetwork } from '@mantine/hooks';
import {
  CalendarCheck,
  Check,
  ChevronsUpDown,
  FileText,
  House,
  LayoutGrid,
  UserPlus,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { APP_ROUTES, canAccessRoute, type AppRouteKey } from '@/lib/rbac';
import { useActiveWard } from '../ActiveWardProvider';
import { schoolOffers } from '../types';
import { wardInitials, wardName } from '../format';
import classes from './ParentShell.module.css';

/** The school module behind each area tab. */
const MODULE_FOR: Partial<Record<AppRouteKey, string>> = {
  parentFees: 'fees',
  parentReports: 'results',
  parentAttendance: 'attendance',
};

interface Tab {
  key: AppRouteKey;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  /** Other sections that light this tab up. */
  also?: string[];
}

const TABS: Tab[] = [
  { key: 'parentHome', label: 'Home', icon: House },
  { key: 'parentFees', label: 'Fees', icon: Wallet, also: [APP_ROUTES.parentReceipts.path] },
  { key: 'parentReports', label: 'Reports', icon: FileText },
  { key: 'parentAttendance', label: 'Attendance', icon: CalendarCheck },
  { key: 'parentMore', label: 'More', icon: LayoutGrid, also: [APP_ROUTES.parentWards.path] },
];

const within = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

function isActive(tab: Tab, pathname: string) {
  const path = APP_ROUTES[tab.key].path;
  // Home is the base of every parent path, so only an exact match counts.
  if (tab.key === 'parentHome') return pathname === path;
  return [path, ...(tab.also ?? [])].some((base) => within(pathname, base));
}

function WardSwitcher() {
  const { wards, activeWard, selectWard } = useActiveWard();
  if (!activeWard) {
    return (
      <Text fw={800} style={{ fontFamily: 'var(--font-heading)' }}>
        Fastrack
      </Text>
    );
  }
  return (
    <Menu position="bottom-start" width={280} radius="md" shadow="md">
      <Menu.Target>
        <UnstyledButton className={classes.wardButton} aria-label="Switch child">
          <Avatar color="fastrackRed" radius="xl" size={36}>
            {wardInitials(activeWard)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text fw={700} size="sm" truncate>
              {wardName(activeWard)}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {activeWard.currentClass?.name ?? activeWard.school.name}
            </Text>
          </div>
          {wards.length > 1 && <ChevronsUpDown size={14} />}
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Your children</Menu.Label>
        {wards.map((ward) => (
          <Menu.Item
            key={ward.studentId}
            onClick={() => selectWard(ward.studentId)}
            leftSection={
              <Avatar color="fastrackRed" radius="xl" size={28}>
                {wardInitials(ward)}
              </Avatar>
            }
            rightSection={ward.studentId === activeWard.studentId ? <Check size={14} /> : null}
          >
            <Text size="sm" fw={600}>
              {wardName(ward)}
            </Text>
            <Text size="xs" c="dimmed">
              {ward.school.name}
            </Text>
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item component={Link} href="/parent/wards/link" leftSection={<UserPlus size={16} />}>
          Link another child
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

/** The parent portal's frame: child switcher on top, tabs at the bottom (a rail on wide screens). */
export function ParentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { online } = useNetwork();
  const { activeWard } = useActiveWard();
  // Tabs the child's school hasn't turned on are left out (QA-262).
  const tabs = TABS.filter(
    (tab) =>
      canAccessRoute(user, tab.key) &&
      (!MODULE_FOR[tab.key] || schoolOffers(activeWard, MODULE_FOR[tab.key]!)),
  );

  const nav = tabs.map((tab) => {
    const Icon = tab.icon;
    return (
      <Link
        key={tab.key}
        href={APP_ROUTES[tab.key].path}
        className={classes.tab}
        data-active={isActive(tab, pathname) || undefined}
        aria-current={isActive(tab, pathname) ? 'page' : undefined}
      >
        <Icon size={20} />
        {tab.label}
      </Link>
    );
  });

  return (
    <div className={classes.root}>
      <nav className={classes.rail} aria-label="Parent portal">
        <Text fw={800} size="lg" px="sm" mb="md" style={{ fontFamily: 'var(--font-heading)' }}>
          Fastrack{' '}
          <Text span c="fastrackRed" inherit>
            Parent
          </Text>
        </Text>
        {nav}
      </nav>
      <header className={classes.header}>
        <div className={classes.headerInner}>
          <WardSwitcher />
          {user && (
            <Avatar
              component={Link}
              href={APP_ROUTES.parentMore.path}
              radius="xl"
              size={34}
              variant="light"
              aria-label="Your account"
            >
              {`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()}
            </Avatar>
          )}
        </div>
      </header>
      {!online && (
        <div className={classes.offline} role="status">
          <WifiOff size={14} /> You are offline. Showing saved information.
        </div>
      )}
      <main className={classes.main}>{children}</main>
      <nav className={classes.tabBar} aria-label="Parent portal">
        {nav}
      </nav>
    </div>
  );
}
