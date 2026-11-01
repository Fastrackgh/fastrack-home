import { SESSION_CACHE_PREFIX } from '@/lib/api-client';

export interface CachedRead<T> {
  data: T;
  savedAt: number;
}

/**
 * One user's offline copies of portal reads, in localStorage, so the
 * installed app opens with the last data it saw when there is no network.
 * Keys share `SESSION_CACHE_PREFIX`, so `apiClient.clearSession()` removes
 * every copy on sign-out. Storage that is full or blocked only costs the
 * offline copy; reads still work.
 */
export class OfflineCache {
  constructor(private readonly userId: string) {}

  private storageKey(key: string) {
    return `${SESSION_CACHE_PREFIX}${this.userId}:${key}`;
  }

  read<T>(key: string): CachedRead<T> | null {
    try {
      const stored = localStorage.getItem(this.storageKey(key));
      return stored ? (JSON.parse(stored) as CachedRead<T>) : null;
    } catch {
      return null;
    }
  }

  write<T>(key: string, data: T) {
    const entry: CachedRead<T> = { data, savedAt: Date.now() };
    try {
      localStorage.setItem(this.storageKey(key), JSON.stringify(entry));
    } catch {
      // Storage full or blocked: the read still works, just not offline.
    }
  }
}
