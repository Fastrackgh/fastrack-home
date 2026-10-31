import { ApiError, apiClient } from '@/lib/api-client';
import type { OfflineDb } from './db';

/**
 * Pull (docs/offline/sync-contract.md §7, backend B3): keeps this user's
 * `records` store in step with the server. The first pull pages through
 * `/sync/snapshot`, then every pull reads `/sync/changes` from the stored
 * cursor. Records are applied by version (an upsert only when newer, a
 * delete when at least as new) together with the cursor, in one
 * transaction per page, so a crash can't leave them out of step.
 */

/** A synced record; a delete is kept as a tombstone so an older upsert can't bring it back. */
export interface SyncedRecord<T = Record<string, unknown>> {
  collection: string;
  id: string;
  version: number;
  data?: T;
  /** `deleted`, or `out_of_scope` (the user can no longer see it). */
  deleted?: string;
}

interface Entry {
  collection: string;
  id: string;
  version: number;
  op?: 'upsert' | 'delete';
  data?: Record<string, unknown>;
  reason?: string;
}

const CURSOR_KEY = 'pullCursor';
/** A snapshot in progress: its fixed cursor and the next page, so it can resume. */
const SNAPSHOT_KEY = 'pullSnapshot';
export const PULLED_AT_KEY = 'pulledAt';
const PAGE_LIMIT = 1000;
/** A runaway feed (hasMore forever) stops after this many pages; the next pull continues. */
const MAX_PAGES = 200;

export interface PullResult {
  outcome: 'done' | 'offline' | 'paused' | 'failed';
  /** Records added, changed or removed, so screens know whether to refresh. */
  applied: number;
}

/** Applies a page of entries by version, plus meta values, in one transaction. Resolves how many applied. */
function applyPage(db: OfflineDb, entries: Entry[], meta: Record<string, unknown>) {
  return new Promise<number>((resolve, reject) => {
    let applied = 0;
    const tx = db.transaction(['records', 'meta'], 'readwrite');
    const records = tx.objectStore('records');
    for (const entry of entries) {
      const read = records.get([entry.collection, entry.id]);
      read.onsuccess = () => {
        const local = read.result as SyncedRecord | undefined;
        const remove = entry.op === 'delete';
        // Apply rule (§7): an upsert only when newer, a delete when at least as new.
        if (local && (remove ? entry.version < local.version : entry.version <= local.version)) {
          return;
        }
        const record: SyncedRecord = remove
          ? {
              collection: entry.collection,
              id: entry.id,
              version: entry.version,
              deleted: entry.reason ?? 'deleted',
            }
          : {
              collection: entry.collection,
              id: entry.id,
              version: entry.version,
              data: entry.data,
            };
        records.put(record);
        applied++;
      };
    }
    const store = tx.objectStore('meta');
    for (const [key, value] of Object.entries(meta)) {
      if (value === undefined) store.delete(key);
      else store.put(value, key);
    }
    tx.oncomplete = () => resolve(applied);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

/** Removes every synced record (before a full re-snapshot). */
function clearRecords(db: OfflineDb) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['records', 'meta'], 'readwrite');
    tx.objectStore('records').clear();
    tx.objectStore('meta').delete(CURSOR_KEY);
    tx.objectStore('meta').delete(SNAPSHOT_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

class Resync extends Error {}

/** One page from the API, without touching the saved reads. */
async function fetchPage<T>(path: string): Promise<T> {
  try {
    return (await apiClient.request<T>(path, { method: 'GET' })).data;
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 410) throw new Resync();
    throw err;
  }
}

async function snapshot(db: OfflineDb): Promise<number> {
  let applied = 0;
  let state = (await db.get<{ cursor: string; pageToken: string | null }>(
    'meta',
    SNAPSHOT_KEY,
  )) ?? {
    cursor: '',
    pageToken: null,
  };
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (state.pageToken) query.set('pageToken', state.pageToken);
    const body = await fetchPage<{
      cursor: string;
      items: Entry[];
      nextPageToken: string | null;
    }>(`/schools/me/sync/snapshot?${query}`);
    // The cursor is fixed before the first page is read: no gap, only harmless overlap.
    state = { cursor: state.cursor || body.cursor, pageToken: body.nextPageToken };
    const done = !body.nextPageToken;
    applied += await applyPage(db, body.items, {
      [SNAPSHOT_KEY]: done ? undefined : state,
      ...(done ? { [CURSOR_KEY]: state.cursor } : {}),
    });
    if (done) return applied;
  }
  return applied;
}

async function changes(db: OfflineDb): Promise<number> {
  let applied = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const since = await db.get<string>('meta', CURSOR_KEY);
    if (!since) throw new Resync();
    const query = new URLSearchParams({ since, limit: String(PAGE_LIMIT) });
    const body = await fetchPage<{ changes: Entry[]; nextSince: string; hasMore: boolean }>(
      `/schools/me/sync/changes?${query}`,
    );
    applied += await applyPage(db, body.changes, { [CURSOR_KEY]: body.nextSince });
    if (!body.hasMore) return applied;
  }
  return applied;
}

/**
 * Brings the records up to date: a snapshot first (or to finish one), then
 * the change feed. A 410 re-snapshots everything once: re-snapshotting only
 * some collections and moving the cursor could skip the others' changes.
 */
export async function pull(db: OfflineDb): Promise<PullResult> {
  let applied = 0;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (!(await db.get<string>('meta', CURSOR_KEY))) applied += await snapshot(db);
        applied += await changes(db);
        await db.put('meta', Date.now(), PULLED_AT_KEY);
        return { outcome: 'done', applied };
      } catch (err) {
        if (!(err instanceof Resync) || attempt > 0) throw err;
        await clearRecords(db);
        applied++;
      }
    }
    return { outcome: 'failed', applied };
  } catch (err) {
    const offline = err instanceof ApiError && (err.statusCode === 0 || err.statusCode >= 502);
    const paused = err instanceof ApiError && err.statusCode === 401;
    return { outcome: offline ? 'offline' : paused ? 'paused' : 'failed', applied };
  }
}

/** A collection's live records (tombstones left out). */
export async function recordsOf<T>(db: OfflineDb, collection: string): Promise<SyncedRecord<T>[]> {
  // Keys are [collection, id]: an array sorts after every string id, so this spans the collection.
  const rows = await db.getRange<SyncedRecord<T>>(
    'records',
    IDBKeyRange.bound([collection], [collection, []]),
  );
  return rows.filter((row) => !row.deleted);
}
