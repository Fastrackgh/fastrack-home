'use client';
import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { isSchoolRole } from '@/lib/rbac';
import type { Viewer } from '@/features/dashboard/model';

/** The signed-in user as a school workspace viewer, or null for anyone else. */
export function useViewer(): Viewer | null {
  const { user } = useAuth();
  return useMemo(
    () => (user && isSchoolRole(user.role) ? { ...user, role: user.role } : null),
    [user],
  );
}
