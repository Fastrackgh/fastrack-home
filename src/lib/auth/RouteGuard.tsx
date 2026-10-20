'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Center, Loader } from '@mantine/core';
import { canAccessPath, landingPathFor, loginPathFor } from '@/lib/rbac';
import { useAuth } from './auth-context';

/**
 * Renders a page only for a signed-in user whose role may open it.
 * Signed-out visitors go to login (returning here afterwards); signed-in
 * users without access go to their own landing page. Nothing from the
 * page renders while the decision is pending.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccessPath(user, pathname);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`${loginPathFor(pathname)}?next=${encodeURIComponent(pathname)}`);
    } else if (!allowed) {
      router.replace(landingPathFor(user.role));
    }
  }, [isLoading, user, allowed, pathname, router]);

  if (isLoading || !allowed) {
    return (
      <Center h="100vh">
        <Loader color="fastrackRed" />
      </Center>
    );
  }
  return <>{children}</>;
}
