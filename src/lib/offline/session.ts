import { apiClient } from '@/lib/api-client';
import { startConnectivity } from './connectivity';
import { deleteUserDb, OfflineDb, offlineStorageAvailable } from './db';
import { OfflineReadCache } from './readCache';

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
  db.catch(() => {
    if (active?.db === db) deactivateOffline();
  });
  active = { userId, db };
  apiClient.setReadCache(new OfflineReadCache(db));
  startConnectivity();
  // Ask the browser not to evict the store under storage pressure.
  navigator.storage?.persist?.().catch(() => undefined);
}

/** Stops using the offline store; its data stays for this user's next session. */
export function deactivateOffline() {
  if (!active) return;
  const { db } = active;
  active = null;
  apiClient.setReadCache(null);
  db.then((opened) => opened.close()).catch(() => undefined);
}

/** Explicit sign-out: the user's offline data is deleted from this device. */
export async function discardOfflineData(userId: string) {
  if (active?.userId === userId) deactivateOffline();
  if (offlineStorageAvailable()) await deleteUserDb(userId);
}
