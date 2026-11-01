import { ApiError, apiClient } from '@/lib/api-client';
import { connectivity } from './connectivity';
import type { OfflineDb } from './db';
import { deviceId, outbox, type EnqueueInput, type OutboxOp, type ReviewItem } from './outbox';
import { PULLED_AT_KEY, pull, recordsOf, type SyncedRecord } from './pull';
import { backoffMs, classify, type SyncOutcome, type SyncResponse } from './syncOutcome';

/**
 * Sends the outbox (docs/offline/sync-contract.md §1–§6, plan F1 `syncEngine`).
 *   - One tab sends at a time (a Web Lock per user); the others only count.
 *   - Ops go one at a time, oldest first. An op waits while an older op on the
 *     same entity, or one it depends on, is still queued.
 *   - Each response is mapped by `classify` (syncOutcome.ts): applied ops
 *     leave the queue, conflicts and rejections go to the review tray, 403s
 *     are forwarded to the school, 401 pauses the queue, and failures back off.
 *   - Runs when an op is queued, the API answers again, the window gets focus,
 *     and every 30 s while ops wait. A send is also how the engine finds out
 *     the API is back: no separate probe.
 */

export interface SyncStatus {
  /** Ops waiting to be sent. */
  pending: number;
  /** Review tray items the user has to act on. */
  review: number;
  /** Ops handed to a head or admin (§6.2): information only. */
  forwarded: number;
  /** This tab is sending right now. */
  syncing: boolean;
  /** The session was refused (401): nothing sends until the user signs in again. */
  paused: boolean;
  /** When an op last landed (any tab), or null. */
  lastSyncedAt: number | null;
  /** When this device last brought its records up to date from the server (§7), or null. */
  lastPulledAt: number | null;
}

const IDLE: SyncStatus = {
  pending: 0,
  review: 0,
  forwarded: 0,
  syncing: false,
  paused: false,
  lastSyncedAt: null,
  lastPulledAt: null,
};

const LOCK_PREFIX = 'fastrack-sync-';
const CHANNEL_PREFIX = 'fastrack-sync-';
const POLL_MS = 30_000;
/** Older ops go to review instead of being sent (§4: the server keeps keys for 30 days). */
export const MAX_OP_AGE_MS = 25 * 24 * 60 * 60_000;
const LAST_SYNCED_KEY = 'lastSyncedAt';
/** How often the records are brought up to date while the app is open. */
const PULL_EVERY_MS = 5 * 60_000;

/** Told when a pull changed this user's records, so a screen can refresh. */
const pulledListeners = new Set<() => void>();

export function onRecordsPulled(listener: () => void) {
  pulledListeners.add(listener);
  return () => {
    pulledListeners.delete(listener);
  };
}

/** A collection's synced records (none without an offline store). */
export const syncedRecords = <T>(collection: string): Promise<SyncedRecord<T>[]> =>
  engine?.records<T>(collection) ?? Promise.resolve([]);

/** One synced record, tombstones included (they say a mark was removed). */
export const syncedRecord = <T>(collection: string, id: string) =>
  engine?.record<T>(collection, id) ?? Promise.resolve(undefined);

let status: SyncStatus = IDLE;
const statusListeners = new Set<() => void>();

function setStatus(next: Partial<SyncStatus>) {
  const merged = { ...status, ...next };
  if ((Object.keys(merged) as (keyof SyncStatus)[]).every((k) => merged[k] === status[k])) return;
  status = merged;
  statusListeners.forEach((listener) => listener());
}

/** The outbox's state, for the header chip and the sign-out guard (`useSyncStatus`). */
export const syncStatus = {
  get: () => status,
  getIdle: () => IDLE,
  subscribe(listener: () => void) {
    statusListeners.add(listener);
    return () => {
      statusListeners.delete(listener);
    };
  },
};

/** Told when an op lands, with the server's body, so a feature can refresh its saved reads. */
export type AppliedListener = (op: OutboxOp, body: unknown) => void;
const appliedListeners = new Set<AppliedListener>();

export function onSyncApplied(listener: AppliedListener) {
  appliedListeners.add(listener);
  return () => {
    appliedListeners.delete(listener);
  };
}

/**
 * Builds the op that sends the device's value again for a review item, e.g.
 * one attendance cell with `from` set to the server's current value. Each
 * feature that queues writes registers one for its collection; items of a
 * collection without one can only be dismissed.
 */
export type ReviewResolver = (item: ReviewItem) => EnqueueInput | null;
const reviewResolvers = new Map<string, ReviewResolver>();

export function registerReviewResolver(collection: string, resolver: ReviewResolver) {
  reviewResolvers.set(collection, resolver);
}

/**
 * Plain words for a feature's review items: why it wasn't applied (in place
 * of the server's message, which may name ids), and the resend button's label.
 * Either may return null to keep the default.
 */
export interface ReviewText {
  explain?: (item: ReviewItem) => string | null;
  resendLabel?: (item: ReviewItem) => string | null;
}
const reviewTexts = new Map<string, ReviewText>();

export function registerReviewText(collection: string, text: ReviewText) {
  reviewTexts.set(collection, text);
}

export const reviewExplanation = (item: ReviewItem) =>
  reviewTexts.get(item.op.collection)?.explain?.(item) ?? null;
export const resendLabel = (item: ReviewItem) =>
  reviewTexts.get(item.op.collection)?.resendLabel?.(item) ?? null;

/** True when "Send mine again" can be offered for this item. */
export const canResend = (item: ReviewItem) =>
  item.kind !== 'forwarded' && Boolean(reviewResolvers.get(item.op.collection)?.(item));

const headersOf = (op: OutboxOp, device: string): Record<string, string> => ({
  'Idempotency-Key': op.opId,
  'X-Client-Recorded-At': op.recordedAt,
  // The one header that changes per send: the server measures clock skew with it (§1).
  'X-Client-Sent-At': new Date().toISOString(),
  'X-Device-Id': device,
  ...(op.baseVersion === undefined ? {} : { 'X-Base-Version': String(op.baseVersion) }),
});

class SyncEngine {
  private stopped = false;
  private running: Promise<void> | null = null;
  private timer: number | undefined;
  private poll: number | undefined;
  private channel: BroadcastChannel | null = null;
  private pausedToken: string | null | undefined = undefined;
  private cleanups: (() => void)[] = [];

  constructor(
    private readonly db: OfflineDb,
    readonly userId: string,
  ) {}

  start() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`${CHANNEL_PREFIX}${this.userId}`);
      // Another tab queued or sent something: recount, and send if this tab can lead.
      this.channel.onmessage = (event) => {
        // Another tab's pull changed the records: this tab's screens refresh too.
        if (event.data === 'pulled') pulledListeners.forEach((listener) => listener());
        void this.refresh();
        this.kick();
      };
    }
    const kick = () => this.kick();
    window.addEventListener('online', kick);
    window.addEventListener('focus', kick);
    let wasOnline = connectivity.get().online;
    const unsubscribe = connectivity.subscribe(() => {
      const { online } = connectivity.get();
      if (online && !wasOnline) this.kick();
      wasOnline = online;
    });
    this.poll = window.setInterval(() => {
      if (status.pending > 0 || this.pullDue()) this.kick();
    }, POLL_MS);
    this.cleanups.push(
      () => window.removeEventListener('online', kick),
      () => window.removeEventListener('focus', kick),
      unsubscribe,
    );
    void this.refresh().then(() => this.kick());
  }

  stop() {
    this.stopped = true;
    window.clearTimeout(this.timer);
    window.clearInterval(this.poll);
    this.cleanups.forEach((cleanup) => cleanup());
    this.channel?.close();
    status = IDLE;
    statusListeners.forEach((listener) => listener());
  }

  async enqueue(input: EnqueueInput): Promise<OutboxOp> {
    const op = await outbox.enqueue(this.db, input);
    await this.changed();
    this.kick();
    return op;
  }

  /** The review tray, oldest first. */
  async reviewItems(): Promise<ReviewItem[]> {
    return (await outbox.reviewItems(this.db)).sort((a, b) => a.createdAt - b.createdAt);
  }

  /** "Keep theirs" / "Discard my change" / "OK": the item leaves the tray. */
  async dismiss(id: string) {
    await outbox.removeReviewItem(this.db, id);
    await this.changed();
  }

  /**
   * "Keep mine" / "Send again": queues the item's resolver op as a new op (a
   * new key, §4) and removes the item, atomically, so two tabs can't both
   * send it (OFF-4). False when the item was already taken or has no resolver.
   */
  async resend(id: string): Promise<boolean> {
    const op = await outbox.takeFromReview(
      this.db,
      id,
      (item) => reviewResolvers.get(item.op.collection)?.(item) ?? null,
    );
    await this.changed();
    if (op) this.kick();
    return op !== null;
  }

  pending(collection: string, entityId?: string): Promise<OutboxOp[]> {
    return outbox
      .all(this.db)
      .then((ops) =>
        ops.filter(
          (op) =>
            op.collection === collection && (entityId === undefined || op.entityId === entityId),
        ),
      );
  }

  /** Where an op stands: still queued (null), or what became of it. */
  async outcome(opId: string): Promise<OpOutcome | null> {
    if (await this.db.get<OutboxOp>('outbox', opId)) return null;
    const items = (await outbox.reviewItems(this.db)).filter((item) => item.op.opId === opId);
    const cells = items.filter((item) => item.kind === 'cell').length;
    const whole = items.find((item) => item.kind !== 'cell');
    if (whole?.kind === 'forwarded') return { state: 'forwarded', cellConflicts: 0 };
    if (whole) return { state: 'review', cellConflicts: 0 };
    return { state: 'applied', cellConflicts: cells };
  }

  syncNow() {
    this.pullWanted = true;
    this.kick();
  }

  /** Sends now if this tab can lead and nothing is already sending. */
  kick() {
    if (this.stopped || this.running) return;
    if (status.paused) {
      // A new token means the user signed in again: resume (§6, 401).
      if (apiClient.getAccessToken() === this.pausedToken) return;
      setStatus({ paused: false });
    }
    this.running = this.lead().finally(() => {
      this.running = null;
    });
  }

  private lead(): Promise<void> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    if (!locks?.request) return this.drain();
    return locks.request(`${LOCK_PREFIX}${this.userId}`, { ifAvailable: true }, (lock) =>
      lock ? this.drain() : undefined,
    ) as Promise<void>;
  }

  private async drain() {
    window.clearTimeout(this.timer);
    const device = await deviceId(this.db);
    try {
      while (!this.stopped) {
        const ops = await outbox.all(this.db);
        const next = this.nextReady(ops);
        if (!next) {
          // Queue sent (or waiting on a backoff): bring the records up to date (§6, §7).
          if (this.pullDue()) await this.pullNow();
          this.scheduleAt(ops);
          return;
        }
        if (Date.now() - next.createdAt > MAX_OP_AGE_MS) {
          await this.toReview(next, [this.tooOld(next)]);
          continue;
        }
        setStatus({ syncing: true });
        const queued = new Set(ops.filter((op) => op !== next).map((op) => op.entityId));
        const response = await this.send(next, device);
        const outcome = classify(response, (id) => queued.has(id));
        const body = 'body' in response ? response.body : undefined;
        if (!(await this.handle(next, outcome, body))) {
          // Unreachable: wake when the backoff ends rather than waiting for the poll (OFF-3).
          if (outcome.kind === 'retry') this.scheduleAt(await outbox.all(this.db));
          return;
        }
      }
    } finally {
      setStatus({ syncing: false });
    }
  }

  /** The oldest op that may go now: not backing off, and nothing older on its entity or in `dependsOn`. */
  private nextReady(ops: OutboxOp[]): OutboxOp | undefined {
    const ids = new Set(ops.map((op) => op.opId));
    const busy = new Set<string>();
    const now = Date.now();
    for (const op of ops) {
      const entity = `${op.collection}\u0000${op.entityId}`;
      if (busy.has(entity)) continue;
      busy.add(entity);
      if (op.dependsOn.some((id) => ids.has(id))) continue;
      if (op.nextAttemptAt > now) continue;
      return op;
    }
    return undefined;
  }

  /** Wakes up when the first backing-off op is due. */
  private scheduleAt(ops: OutboxOp[]) {
    const due = Math.min(...ops.map((op) => op.nextAttemptAt));
    if (!Number.isFinite(due)) return;
    this.timer = window.setTimeout(() => this.kick(), Math.max(0, due - Date.now()) + 50);
  }

  private async send(op: OutboxOp, device: string): Promise<SyncResponse> {
    try {
      const {
        body,
        status: code,
        headers,
      } = await apiClient.exchange(op.path, {
        method: op.method,
        body: op.body,
        headers: headersOf(op, device),
      });
      return { status: code, body, headers };
    } catch (err) {
      if (!(err instanceof ApiError) || err.statusCode === 0) return { status: 0 };
      return { status: err.statusCode, body: err.details, headers: err.headers ?? new Headers() };
    }
  }

  /** Applies one outcome. False stops this run (offline, or paused). */
  private async handle(op: OutboxOp, outcome: SyncOutcome, body: unknown): Promise<boolean> {
    const now = Date.now();
    switch (outcome.kind) {
      case 'applied': {
        const cells: ReviewItem[] = outcome.cellConflicts.map((cell, i) => ({
          id: `${op.opId}:${i}`,
          kind: 'cell',
          op,
          cell,
          createdAt: now,
        }));
        await outbox.moveToReview(this.db, cells, op.opId);
        await this.db.put('meta', now, LAST_SYNCED_KEY);
        this.pullWanted = true;
        await this.changed();
        appliedListeners.forEach((listener) => listener(op, body));
        return true;
      }
      case 'conflict':
      case 'rejected':
      case 'forwarded':
        await this.toReview(op, [
          { id: op.opId, kind: outcome.kind, op, error: outcome.error, createdAt: now },
        ]);
        return true;
      case 'paused':
        this.pausedToken = apiClient.getAccessToken();
        setStatus({ paused: true });
        return false;
      case 'retry': {
        const attempts = op.attempts + 1;
        await outbox.update(this.db, {
          ...op,
          attempts,
          nextAttemptAt: now + (outcome.afterMs ?? backoffMs(attempts)),
          lastError: outcome.offline ? 'unreachable' : 'retry',
        });
        return !outcome.offline;
      }
    }
  }

  private tooOld(op: OutboxOp): ReviewItem {
    return {
      id: op.opId,
      kind: 'rejected',
      op,
      error: {
        status: 0,
        code: 'OP_TOO_OLD',
        message:
          'This change waited more than 25 days and was not sent. Check it, then make it again if it is still right.',
      },
      createdAt: Date.now(),
    };
  }

  private async toReview(op: OutboxOp, items: ReviewItem[]) {
    await outbox.moveToReview(this.db, items, op.opId);
    await this.changed();
  }

  /** Recounts, and tells the other tabs. */
  /** Pull wanted: on start, after an op lands, and every 5 minutes. */
  private pullWanted = true;
  private pulledAt = 0;

  private pullDue() {
    return this.pullWanted || Date.now() - this.pulledAt > PULL_EVERY_MS;
  }

  private async pullNow() {
    this.pullWanted = false;
    const { outcome, applied } = await pull(this.db);
    if (outcome === 'done') this.pulledAt = Date.now();
    // Offline or refused: try again on the next run.
    else this.pullWanted = true;
    if (applied > 0) {
      pulledListeners.forEach((listener) => listener());
      this.channel?.postMessage('pulled');
    }
    await this.changed();
  }

  records<T>(collection: string) {
    return recordsOf<T>(this.db, collection);
  }

  record<T>(collection: string, id: string) {
    return this.db.get<SyncedRecord<T>>('records', [collection, id]);
  }

  private async changed() {
    await this.refresh();
    this.channel?.postMessage('changed');
  }

  private async refresh() {
    if (this.stopped) return;
    const [pending, items, lastSyncedAt, lastPulledAt] = await Promise.all([
      this.db.count('outbox'),
      outbox.reviewItems(this.db),
      this.db.get<number>('meta', LAST_SYNCED_KEY),
      this.db.get<number>('meta', PULLED_AT_KEY),
    ]);
    if (this.stopped) return;
    const forwarded = items.filter((item) => item.kind === 'forwarded').length;
    setStatus({
      pending,
      review: items.length - forwarded,
      forwarded,
      lastSyncedAt: lastSyncedAt ?? null,
      lastPulledAt: lastPulledAt ?? null,
    });
  }
}

let engine: SyncEngine | null = null;

/** Starts sending `userId`'s outbox (offline session activation). */
export function startSync(db: OfflineDb, userId: string) {
  if (engine?.userId === userId) return;
  stopSync();
  engine = new SyncEngine(db, userId);
  engine.start();
  // Development only: lets QA queue ops from the console before a screen does.
  if (process.env.NODE_ENV !== 'production') {
    (window as unknown as Record<string, unknown>).__fastrackSync = {
      enqueueWrite,
      syncNow,
      syncStatus,
      registerReviewResolver,
    };
  }
}

export function stopSync() {
  engine?.stop();
  engine = null;
}

/** Queues a write for the signed-in staff user. Rejects when offline storage isn't available. */
export function enqueueWrite(input: EnqueueInput): Promise<OutboxOp> {
  if (!engine) return Promise.reject(new Error('Offline storage is not available on this device.'));
  return engine.enqueue(input);
}

/** "Sync now": sends the queue and brings the records up to date. */
export const syncNow = () => engine?.syncNow();

/** What became of a queued op: applied (with any batch cells that clashed), sent to review, or forwarded. */
export interface OpOutcome {
  state: 'applied' | 'review' | 'forwarded';
  cellConflicts: number;
}

/** The user's queued ops for one collection (and entity), oldest first. */
export const pendingWrites = (collection: string, entityId?: string) =>
  engine?.pending(collection, entityId) ?? Promise.resolve([]);

/**
 * Waits up to `timeoutMs` for a queued op to land. Resolves its outcome, or
 * null if it's still waiting (offline, or the server is slow): the screen
 * then says it was saved on the device.
 */
export function waitForOp(opId: string, timeoutMs: number): Promise<OpOutcome | null> {
  const current = engine;
  if (!current) return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    const finish = (result: OpOutcome | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      unsubscribe();
      resolve(result);
    };
    const check = () =>
      void current.outcome(opId).then(
        (result) => result && finish(result),
        () => undefined,
      );
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    const unsubscribe = syncStatus.subscribe(check);
    check();
  });
}

/** The review tray's items; empty with no offline store. */
export const listReviewItems = () => engine?.reviewItems() ?? Promise.resolve([]);
export const dismissReviewItem = (id: string) => engine?.dismiss(id) ?? Promise.resolve();
export const resendReviewItem = (id: string) => engine?.resend(id) ?? Promise.resolve(false);
