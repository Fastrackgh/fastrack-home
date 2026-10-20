'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SESSION_CACHE_PREFIX } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';

/*
 * Reads for the parent portal are kept as an offline copy in localStorage,
 * per user, so the installed app opens with the last data it saw when there
 * is no network. `apiClient.clearSession()` removes every copy on sign-out.
 */

interface CachedRead<T> {
  data: T;
  savedAt: number;
}

function cacheKey(userId: string, key: string) {
  return `${SESSION_CACHE_PREFIX}${userId}:${key}`;
}

function readCache<T>(userId: string, key: string): CachedRead<T> | null {
  try {
    const stored = localStorage.getItem(cacheKey(userId, key));
    return stored ? (JSON.parse(stored) as CachedRead<T>) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(userId: string, key: string, data: T) {
  try {
    localStorage.setItem(cacheKey(userId, key), JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Storage full or blocked: the read still works, just not offline.
  }
}

export interface ParentQuery<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  /** When the shown data was fetched; older than the request when `stale`. */
  savedAt: number | null;
  /** True while showing the offline copy because the latest fetch hasn't succeeded. */
  stale: boolean;
  reload: () => void;
}

/**
 * Loads `key` with `load`, showing the offline copy first and replacing it
 * once the fetch succeeds. A null key skips loading (e.g. no ward selected).
 */
export function useParentQuery<T>(key: string | null, load: () => Promise<T>): ParentQuery<T> {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const loadRef = useRef(load);
  loadRef.current = load;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<Omit<ParentQuery<T>, 'reload'>>({
    data: undefined,
    error: null,
    loading: key !== null,
    savedAt: null,
    stale: false,
  });

  useEffect(() => {
    if (!key || !userId) {
      setState({ data: undefined, error: null, loading: false, savedAt: null, stale: false });
      return;
    }
    let current = true;
    const cached = readCache<T>(userId, key);
    setState((previous) => ({
      // Keep what's on screen during a reload of the same key.
      data: cached?.data ?? (version > 0 ? previous.data : undefined),
      savedAt: cached?.savedAt ?? null,
      error: null,
      loading: true,
      stale: cached !== null,
    }));
    loadRef.current().then(
      (data) => {
        if (!current) return;
        writeCache(userId, key, data);
        setState({ data, error: null, loading: false, savedAt: Date.now(), stale: false });
      },
      (error: unknown) => {
        if (!current) return;
        setState((previous) => ({ ...previous, error, loading: false }));
      },
    );
    return () => {
      current = false;
    };
  }, [key, userId, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
