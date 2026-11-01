import { apiClient, type SavedRead } from '@/lib/api-client';
import { startConnectivity } from './connectivity';
import { deleteUserDb, OfflineDb, offlineStorageAvailable } from './db';
import { OfflineReadCache } from './readCache';
import { startSync, stopSync } from './syncEngine';

/**
 * Which user's offline store this tab is using. Only school staff get one
 * (never platform or parent sessions, docs/offline/sync-contract.md §7 Scope).
 */
let active: { userId: string; db: Promise<OfflineDb> } | null = null;

/** Opens `userId`'s offline store and serves saved reads from it. */
export function activateOffline(userId: string) {
  if (!offlineStorageAvailable() || active?.userId === userId) return;
  deactivateOffline();
  const db = OfflineDb.open(userId);
  // A store that can't open (private mode, blocked) leaves reads online-only.
  db.then(
    (opened) => {
      if (active?.db === db) startSync(opened, userId);
    },
    () => {
      if (active?.db === db) deactivateOffline();
    },
  );
  active = { userId, db };
  apiClient.setReadCache(new OfflineReadCache(db));
  startConnectivity();
  // Ask the browser not to evict the store under storage pressure.
  navigator.storage?.persist?.().catch(() => undefined);
}

/** Stops using the offline store; its data (queued writes included) stays for this user's next session. */
export function deactivateOffline() {
  if (!active) return;
  const { db } = active;
  active = null;
  stopSync();
  apiClient.setReadCache(null);
  db.then((opened) => opened.close()).catch(() => undefined);
}

/** Explicit sign-out: the user's offline data is deleted from this device. */
export async function discardOfflineData(userId: string) {
  if (active?.userId === userId) deactivateOffline();
  if (offlineStorageAvailable()) await deleteUserDb(userId);
}

/**
 * Saved reads whose endpoint starts with `prefix`, newest first, e.g. every
 * saved register of one class. Empty without an offline store.
 */
export async function savedReadsLike(
  prefix: string,
): Promise<{ endpoint: string; read: SavedRead }[]> {
  if (!active) return [];
  try {
    const rows = await (await active.db).entries<SavedRead>('reads', prefix);
    return rows
      .map(({ key, value }) => ({ endpoint: key, read: value }))
      .sort((a, b) => b.read.savedAt - a.read.savedAt);
  } catch {
    return [];
  }
}
