import type { ApiResponse, ReadCache, SavedRead } from '@/lib/api-client';
import { noteSavedCopyShown } from './connectivity';
import type { OfflineDb } from './db';

/**
 * Phase 1 offline reads: every successful GET is kept in the user's `reads`
 * store by endpoint, and served when the API can't be reached. Screens keep
 * calling their feature `api.ts` unchanged. Collections move to the synced
 * `records` store as the change feed covers them.
 *
 * Takes the database as a promise, so reads made while it is still opening
 * (the session restore on page load) are covered too.
 */
export class OfflineReadCache implements ReadCache {
  constructor(private readonly db: Promise<OfflineDb>) {}

  async read(endpoint: string): Promise<SavedRead | undefined> {
    const saved = await (await this.db).get<SavedRead>('reads', endpoint);
    if (saved) noteSavedCopyShown(saved.savedAt);
    return saved;
  }

  write(endpoint: string, response: ApiResponse<unknown, unknown>) {
    const saved: SavedRead = { response, savedAt: Date.now() };
    // Storage full or blocked only costs the offline copy.
    this.db.then((db) => db.put('reads', saved, endpoint)).catch(() => undefined);
  }
}
