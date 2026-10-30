/**
 * One IndexedDB database per signed-in user (`fastrack-<userId>`), so a shared
 * device never mixes two users' data. Stores (docs/offline/sync-contract.md):
 *   - reads:     saved copies of API reads, by endpoint (phase 1 offline reads)
 *   - records:   synced records, by [collection, id]
 *   - outbox:    queued writes, by opId
 *   - conflicts: items for the Needs review tray
 *   - meta:      cursors, deviceId, provisional counters
 *   - blobs:     queued photo and logo uploads
 * A user's database outlives an expired session (its queued writes must
 * survive), and is deleted only by an explicit sign-out (`deleteUserDb`).
 */

const DB_PREFIX = 'fastrack-';
const DB_VERSION = 1;

/** Users with a database on this device, for when `indexedDB.databases()` is missing. */
const REGISTRY_KEY = 'fastrack_offline_users';

export const STORES = ['reads', 'records', 'outbox', 'conflicts', 'meta', 'blobs'] as const;
export type StoreName = (typeof STORES)[number];

const KEY_PATHS: Record<StoreName, string | string[] | null> = {
  reads: null,
  records: ['collection', 'id'],
  outbox: 'opId',
  conflicts: 'id',
  meta: null,
  blobs: null,
};

const dbName = (userId: string) => `${DB_PREFIX}${userId}`;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readRegistry(): string[] {
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function writeRegistry(userIds: string[]) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify([...new Set(userIds)]));
  } catch {
    // Without the registry, `indexedDB.databases()` still finds the databases.
  }
}

/** A user's offline database. Every method resolves; storage errors reject. */
export class OfflineDb {
  private constructor(
    readonly userId: string,
    private readonly db: IDBDatabase,
  ) {}

  static async open(userId: string): Promise<OfflineDb> {
    const open = indexedDB.open(dbName(userId), DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      for (const store of STORES) {
        if (db.objectStoreNames.contains(store)) continue;
        const keyPath = KEY_PATHS[store];
        db.createObjectStore(store, keyPath ? { keyPath } : undefined);
      }
    };
    const db = await request(open);
    writeRegistry([...readRegistry(), userId]);
    const offlineDb = new OfflineDb(userId, db);
    // Another tab deleting this database (sign-out) closes it here too.
    db.onversionchange = () => db.close();
    return offlineDb;
  }

  private store(name: StoreName, mode: IDBTransactionMode) {
    return this.db.transaction(name, mode).objectStore(name);
  }

  get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
    return request(this.store(store, 'readonly').get(key)) as Promise<T | undefined>;
  }

  getAll<T>(store: StoreName): Promise<T[]> {
    return request(this.store(store, 'readonly').getAll()) as Promise<T[]>;
  }

  count(store: StoreName): Promise<number> {
    return request(this.store(store, 'readonly').count());
  }

  /** Stores `value`; `key` only for stores without a key path (reads, meta, blobs). */
  async put<T>(store: StoreName, value: T, key?: IDBValidKey): Promise<void> {
    await request(this.store(store, 'readwrite').put(value, key));
  }

  async delete(store: StoreName, key: IDBValidKey): Promise<void> {
    await request(this.store(store, 'readwrite').delete(key));
  }

  close() {
    this.db.close();
  }
}

/** Deletes a user's offline database (explicit sign-out or "Discard changes"). */
export async function deleteUserDb(userId: string): Promise<void> {
  writeRegistry(readRegistry().filter((id) => id !== userId));
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(dbName(userId));
    // Blocked means another tab still has it open; it closes on versionchange.
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

/** Users with an offline database on this device. */
export async function offlineUserIds(): Promise<string[]> {
  if (typeof indexedDB.databases !== 'function') return readRegistry();
  try {
    const dbs = await indexedDB.databases();
    return dbs
      .map((db) => db.name ?? '')
      .filter((name) => name.startsWith(DB_PREFIX))
      .map((name) => name.slice(DB_PREFIX.length));
  } catch {
    return readRegistry();
  }
}

/** True when IndexedDB is usable here (not SSR, not blocked by the browser). */
export const offlineStorageAvailable = () =>
  typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
