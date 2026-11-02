import { apiClient } from '@/lib/api-client';
import type { OfflineDb } from './db';
import type { CellConflict, SyncError } from './syncOutcome';

/**
 * Writes queued on this device, waiting to be sent (docs/offline/sync-contract.md
 * §1–§6). Each op is one request to an existing REST endpoint, sent later by the
 * sync engine with the same key and body on every retry, so the server applies
 * it once however many times it arrives.
 */
export interface OutboxOp {
  /** The `Idempotency-Key`: a lowercase UUIDv4. */
  opId: string;
  /** Order of enqueueing on this device (shared across tabs). Ops send in this order. */
  seq: number;
  /** What the op writes, e.g. `attendance` / `<schoolStudentId>:<date>`. Ops on one entity send one at a time. */
  collection: string;
  entityId: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** API path, e.g. `/schools/me/attendance/register`. */
  path: string;
  /** The JSON body, serialised once at enqueue so every retry sends the same bytes. */
  body?: string;
  /** `X-Base-Version`: the rowVersion the device last saw. */
  baseVersion?: number;
  /** `X-Client-Recorded-At`: the raw device clock when the user acted (the server corrects skew). */
  recordedAt: string;
  /** Ops that must land first (e.g. an admission before its attendance). */
  dependsOn: string[];
  /** Shown in the review tray and the sign-out guard, e.g. "Attendance for JHS 1A, 28 Oct". */
  label: string;
  /** Kept on the device only, never sent: display names for ids in the body (e.g. pupils), for the review tray. */
  names?: Record<string, string>;
  /** Kept on the device only, never sent: what a screen shows for the op before it lands (e.g. a provisional receipt). */
  local?: Record<string, unknown>;
  /** When it was queued, on the server's clock as last known (the device clock before any). */
  createdAt: number;
  /** Failed sends so far, for the backoff. */
  attempts: number;
  /** Not sent before this time (backoff or `Retry-After`). */
  nextAttemptAt: number;
  /** The last failure, for support. */
  lastError?: string;
}

export interface EnqueueInput {
  collection: string;
  entityId: string;
  method: OutboxOp['method'];
  path: string;
  body?: unknown;
  baseVersion?: number;
  dependsOn?: string[];
  label: string;
  names?: Record<string, string>;
  local?: Record<string, unknown>;
}

/**
 * An item in the Needs review tray (`conflicts` store):
 *   - conflict: the server copy changed (`error.current` beside the device value)
 *   - rejected: the server refused the op, or it was too old to send
 *   - cell:     one cell of an applied batch write clashed (attendance, marks)
 *   - forwarded: a 403, handed to a head or admin on the server (§6.2); shown
 *     to the user as information only
 *   - notice:   the op applied, but with something the user must see (e.g. a
 *     payment that may have been taken twice, §9.1); only acknowledged
 */
export interface ReviewItem {
  id: string;
  kind: 'conflict' | 'rejected' | 'cell' | 'forwarded' | 'notice';
  op: OutboxOp;
  error?: SyncError;
  cell?: CellConflict;
  createdAt: number;
}

const SEQ_KEY = 'outboxSeq';
/** Where an op that was replaced (renumbered) went, so waiting for it follows. */
export const aliasKey = (opId: string) => `opAlias:${opId}`;
const DEVICE_KEY = 'deviceId';

/** The device's id for this user (`X-Device-Id`), created on first use. */
export async function deviceId(db: OfflineDb): Promise<string> {
  const saved = await db.get<string>('meta', DEVICE_KEY);
  if (saved) return saved;
  const id = crypto.randomUUID();
  await db.put('meta', id, DEVICE_KEY);
  return id;
}

function newOp(input: EnqueueInput, seq: number): OutboxOp {
  const now = Date.now();
  // Its age is measured on the server's clock, so a slow device clock can't make it look old (OFF-16).
  const created = apiClient.serverNow().getTime();
  return {
    opId: crypto.randomUUID(),
    seq,
    collection: input.collection,
    entityId: input.entityId,
    method: input.method,
    path: input.path,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    baseVersion: input.baseVersion,
    recordedAt: new Date(now).toISOString(),
    dependsOn: input.dependsOn ?? [],
    label: input.label,
    names: input.names,
    local: input.local,
    createdAt: created,
    attempts: 0,
    nextAttemptAt: 0,
  };
}

export const outbox = {
  /** Queues a write. The caller shows it as pending until the engine reports it applied. */
  async enqueue(db: OfflineDb, input: EnqueueInput): Promise<OutboxOp> {
    const op = newOp(input, await db.increment(SEQ_KEY));
    await db.put('outbox', op);
    return op;
  },

  /**
   * "Keep mine" / "Send again": in one transaction, if the review item is
   * still there, queues the op `build` makes from it and removes the item.
   * IndexedDB runs such transactions one at a time across tabs, so when two
   * tabs press it together the second finds the item gone (OFF-4). Resolves
   * the new op, or null when the item was gone or `build` gave nothing.
   */
  takeFromReview(
    db: OfflineDb,
    id: string,
    build: (item: ReviewItem) => EnqueueInput | null,
  ): Promise<OutboxOp | null> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conflicts', 'outbox', 'meta'], 'readwrite');
      let op: OutboxOp | null = null;
      const read = tx.objectStore('conflicts').get(id);
      read.onsuccess = () => {
        const item = read.result as ReviewItem | undefined;
        const input = item ? build(item) : null;
        if (!input) return;
        const meta = tx.objectStore('meta');
        const counter = meta.get(SEQ_KEY);
        counter.onsuccess = () => {
          const seq = (typeof counter.result === 'number' ? counter.result : 0) + 1;
          meta.put(seq, SEQ_KEY);
          op = newOp(input, seq);
          const store = tx.objectStore('outbox');
          store.put(op);
          tx.objectStore('conflicts').delete(id);
          // Ops waiting on the refused one now wait on its resend.
          const all = store.getAll();
          all.onsuccess = () => {
            for (const other of all.result as OutboxOp[]) {
              if (op && other.dependsOn.includes(item!.op.opId)) {
                store.put({
                  ...other,
                  dependsOn: other.dependsOn.map((dep) => (dep === item!.op.opId ? op!.opId : dep)),
                });
              }
            }
          };
        };
      };
      tx.oncomplete = () => resolve(op);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  },

  /**
   * Puts `next` in `op`'s place in the queue (same position, a new key), and
   * points the ops that depend on it, and `aliasKey(op.opId)`, at the new one.
   */
  replace(db: OfflineDb, op: OutboxOp, next: OutboxOp): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['outbox', 'meta'], 'readwrite');
      const store = tx.objectStore('outbox');
      store.delete(op.opId);
      store.put(next);
      const all = store.getAll();
      all.onsuccess = () => {
        for (const other of all.result as OutboxOp[]) {
          if (other.dependsOn.includes(op.opId)) {
            store.put({
              ...other,
              dependsOn: other.dependsOn.map((id) => (id === op.opId ? next.opId : id)),
            });
          }
        }
      };
      tx.objectStore('meta').put(next.opId, aliasKey(op.opId));
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  },

  /**
   * Moves queued ops from one entity id to another (e.g. a pupil admitted
   * offline who turned out to be one already in the school): every mention
   * of `fromId` in their key, path and body becomes `toId`, and they stop
   * waiting on `droppedOpId`.
   */
  remap(db: OfflineDb, fromId: string, toId: string, droppedOpId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let moved = 0;
      const tx = db.transaction(['outbox'], 'readwrite');
      const store = tx.objectStore('outbox');
      const all = store.getAll();
      all.onsuccess = () => {
        for (const op of all.result as OutboxOp[]) {
          const mentions = [op.entityId, op.path, op.body ?? ''].some((s) => s.includes(fromId));
          if (!mentions && !op.dependsOn.includes(droppedOpId)) continue;
          const swap = (s: string) => s.split(fromId).join(toId);
          if (mentions) moved++;
          store.put({
            ...op,
            entityId: swap(op.entityId),
            path: swap(op.path),
            body: op.body === undefined ? undefined : swap(op.body),
            dependsOn: op.dependsOn.filter((dep) => dep !== droppedOpId),
          });
        }
      };
      tx.oncomplete = () => resolve(moved);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  },

  /** Every queued op, oldest first. */
  async all(db: OfflineDb): Promise<OutboxOp[]> {
    return (await db.getAll<OutboxOp>('outbox')).sort((a, b) => a.seq - b.seq);
  },

  update: (db: OfflineDb, op: OutboxOp) => db.put('outbox', op),
  remove: (db: OfflineDb, opId: string) => db.delete('outbox', opId),

  /** Takes an op out of the queue and into the review tray, in that order of safety: tray first. */
  async moveToReview(db: OfflineDb, items: ReviewItem[], opId: string) {
    for (const item of items) await db.put('conflicts', item);
    await db.delete('outbox', opId);
  },

  reviewItems: (db: OfflineDb) => db.getAll<ReviewItem>('conflicts'),
  removeReviewItem: (db: OfflineDb, id: string) => db.delete('conflicts', id),
};
