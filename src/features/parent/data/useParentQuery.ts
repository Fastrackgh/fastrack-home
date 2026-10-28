'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { OfflineCache } from './OfflineCache';

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

type QueryState<T> = Omit<ParentQuery<T>, 'reload'>;

const idle = <T>(): QueryState<T> => ({
  data: undefined,
  error: null,
  loading: false,
  savedAt: null,
  stale: false,
});

/**
 * Loads `key` with `load`, showing the offline copy first and replacing it
 * once the fetch succeeds. A null key skips loading (e.g. no ward selected).
 * Screens use the named hooks in `queries.ts` rather than calling this.
 */
export function useParentQuery<T>(key: string | null, load: () => Promise<T>): ParentQuery<T> {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const loadRef = useRef(load);
  loadRef.current = load;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<QueryState<T>>(() => ({
    ...idle<T>(),
    loading: key !== null,
  }));

  useEffect(() => {
    if (!key || !userId) {
      setState(idle<T>());
      return;
    }
    let current = true;
    const cache = new OfflineCache(userId);
    const cached = cache.read<T>(key);
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
        cache.write(key, data);
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
