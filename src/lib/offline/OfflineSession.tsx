'use client';

import { useEffect } from 'react';
import { SESSION_STORAGE_KEYS } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { parseAuthUser, type AuthUser } from '@/lib/auth/session';
import { audienceOf } from '@/lib/rbac';
import { activateOffline, deactivateOffline } from './session';

/** A school staff user's id: the only sessions that keep data offline. */
const staffId = (user: AuthUser | null) =>
  user?.schoolId && audienceOf(user.role) === 'staff' ? user.id : null;

/**
 * Keeps the staff portal's offline store in step with the signed-in user.
 * Rendered inside `AuthProvider`: as its child, the first effect here runs
 * before the session restore, so even the restore's own reads (school
 * profile, modules) get saved copies when the page loads offline.
 */
export function OfflineSession() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEYS.user);
      const id = staffId(stored ? parseAuthUser(JSON.parse(stored)) : null);
      if (id) activateOffline(id);
    } catch {
      // No stored session: the auth state below decides.
    }
  }, []);

  const id = staffId(user);
  useEffect(() => {
    if (id) activateOffline(id);
    else if (!isLoading) deactivateOffline();
  }, [id, isLoading]);

  return null;
}
