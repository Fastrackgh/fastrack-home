'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, Text } from '@mantine/core';
import { useNetwork } from '@mantine/hooks';
import { WifiOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { APP_ROUTES } from '@/lib/rbac';
import { useActiveWard } from '../data/ActiveWardProvider';
import { userInitials } from '../domain/wards';
import { parentRoutes } from '../routes';
import classes from './ParentShell.module.css';
import { isTabActive, visibleTabs } from './tabs';
import { WardSwitcher } from './WardSwitcher';

function TabLinks() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { activeWard } = useActiveWard();
  return visibleTabs(user, activeWard).map((tab) => {
    const Icon = tab.icon;
    const active = isTabActive(tab, pathname);
    return (
      <Link
        key={tab.key}
        href={APP_ROUTES[tab.key].path}
        className={classes.tab}
        data-active={active || undefined}
        aria-current={active ? 'page' : undefined}
      >
        <Icon size={20} />
        {tab.label}
      </Link>
    );
  });
}

/** The parent portal's frame: child switcher on top, tabs at the bottom (a rail on wide screens). */
export function ParentShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { online } = useNetwork();

  return (
    <div className={classes.root}>
      <nav className={classes.rail} aria-label="Parent portal">
        <Text fw={800} size="lg" px="sm" mb="md" className="font-heading">
          Fastrack{' '}
          <Text span c="fastrackRed" inherit>
            Parent
          </Text>
        </Text>
        <TabLinks />
      </nav>
      <header className={classes.header}>
        <div className={classes.headerInner}>
          <WardSwitcher />
          {user && (
            <Avatar
              component={Link}
              href={parentRoutes.more}
              radius="xl"
              size={34}
              variant="light"
              aria-label="Your account"
            >
              {userInitials(user)}
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
        <TabLinks />
      </nav>
    </div>
  );
}
