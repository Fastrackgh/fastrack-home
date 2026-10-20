import React from 'react';
import { AppShell } from '@/features/workspace';

/** Every school page (staff and parents) shares one workspace skeleton. */
export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
