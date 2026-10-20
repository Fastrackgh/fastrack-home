import React from 'react';
import { RouteGuard } from '@/lib/auth';
import { ActiveWardProvider, ParentShell } from '@/features/parent';

/** Every page in this group requires a parent session (rules in `APP_ROUTES`). */
export default function ParentAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <ActiveWardProvider>
        <ParentShell>{children}</ParentShell>
      </ActiveWardProvider>
    </RouteGuard>
  );
}
