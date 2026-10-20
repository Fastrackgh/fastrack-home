import React from 'react';
import { RouteGuard } from '@/lib/auth';

/** Every page in this group requires a session and a role allowed by `APP_ROUTES`. */
export default function GuardedAppLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard>{children}</RouteGuard>;
}
