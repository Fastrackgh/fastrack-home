/**
 * How the sync engine treats each response to a queued write
 * (docs/offline/sync-contract.md §6, "How the engine treats each response").
 * Pure: no storage or network, so every row of the table can be tested.
 */

export type SyncOutcome =
  /** 2xx: the op is done. `replayed` when the server had already applied it. */
  | { kind: 'applied'; replayed: boolean; cellConflicts: CellConflict[] }
  /** 409 CONFLICT / LIKELY_DUPLICATE: the review tray shows `current` beside the device value. */
  | { kind: 'conflict'; error: SyncError }
  /** Never retried: the review tray. */
  | { kind: 'rejected'; error: SyncError }
  /** 409 PROVISIONAL_REF_TAKEN: give the payment the next number and resend it as a new op (§9.1). */
  | { kind: 'renumber'; error: SyncError }
  /** 403 with `reason.forwardedTo`: stored on the server for a head or admin (§6.2); leaves this user's tray. */
  | { kind: 'forwarded'; error: SyncError }
  /** 401: pause the whole queue until the same user signs in again. */
  | { kind: 'paused' }
  /** Try again later. `afterMs` from `Retry-After`, else the engine's backoff. `offline` stops the run. */
  | { kind: 'retry'; afterMs: number | null; offline: boolean };

/** The §6 error envelope, as the review tray needs it. */
export interface SyncError {
  status: number;
  code: string | null;
  message: string;
  current?: unknown;
  conflictingFields?: string[];
  reason?: Record<string, unknown>;
  /** Validation detail, e.g. the refused cells of a mark sheet (`{cells: […]}`). */
  details?: unknown;
}

/** One cell of a batch-cell write (attendance register, marks) that clashed (§5). */
export interface CellConflict {
  cell: Record<string, unknown>;
  current: Record<string, unknown>;
  mine: Record<string, unknown>;
}

/** What came back for one send: an HTTP answer, or none at all. */
export type SyncResponse =
  { status: number; body: unknown; headers: { get(name: string): string | null } } | { status: 0 };

const CONFLICT_CODES = new Set(['CONFLICT', 'LIKELY_DUPLICATE']);
const RETRY_STATUSES = new Set([408, 429]);

/** `Retry-After` in ms (seconds or an HTTP date), or null. */
export function retryAfterMs(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

function syncError(status: number, body: unknown): SyncError {
  const b = asRecord(body) ?? {};
  return {
    status,
    code: typeof b.code === 'string' ? b.code : null,
    message:
      typeof b.message === 'string' && b.message ? b.message : `The server answered ${status}.`,
    current: b.current,
    conflictingFields: Array.isArray(b.conflictingFields)
      ? b.conflictingFields.filter((f): f is string => typeof f === 'string')
      : undefined,
    reason: asRecord(b.reason),
    details: b.details,
  };
}

/** `conflicts[]` of a batch-cell 200: in `data` (v2 body), or at the top level. */
function cellConflicts(body: unknown): CellConflict[] {
  const b = asRecord(body);
  const list = asRecord(b?.data)?.conflicts ?? b?.conflicts;
  return Array.isArray(list)
    ? list.filter((c): c is CellConflict => Boolean(asRecord(c)?.cell))
    : [];
}

/** Ids the server didn't know (`REFERENCE_NOT_FOUND`, §2). */
export function missingReferences(error: SyncError): string[] {
  const missing = error.reason?.missing;
  return Array.isArray(missing)
    ? missing.map((m) => asRecord(m)?.id).filter((id): id is string => typeof id === 'string')
    : [];
}

/**
 * Maps one response to its outcome. `isQueued(id)` says whether an entity is
 * still waiting in the outbox: a `REFERENCE_NOT_FOUND` for one of those is
 * retried once it lands instead of being rejected (§2).
 */
export function classify(
  response: SyncResponse,
  isQueued: (entityId: string) => boolean = () => false,
): SyncOutcome {
  if (!('headers' in response)) return { kind: 'retry', afterMs: null, offline: true };
  const { status, body, headers } = response;

  if (status >= 200 && status < 300) {
    return {
      kind: 'applied',
      replayed: headers.get('Idempotent-Replayed') === 'true',
      cellConflicts: cellConflicts(body),
    };
  }
  if (status === 401) return { kind: 'paused' };

  const error = syncError(status, body);
  const retryAfter = retryAfterMs(headers.get('Retry-After'));

  if (RETRY_STATUSES.has(status) || status >= 500) {
    // 502–504 mean the API itself is out of reach (a proxy answered).
    return { kind: 'retry', afterMs: retryAfter, offline: status >= 502 && status <= 504 };
  }
  // Forwarded only when the server says it kept the op for the school (§6.2,
  // `reason.forwardedTo`). A 403 without it was stored nowhere, so it stays
  // in the user's own tray rather than being lost.
  if (status === 403) {
    return error.reason?.forwardedTo ? { kind: 'forwarded', error } : { kind: 'rejected', error };
  }
  if (status === 409 && error.code === 'IDEMPOTENCY_IN_PROGRESS') {
    return { kind: 'retry', afterMs: retryAfter ?? 2000, offline: false };
  }
  if (status === 409 && error.code === 'PROVISIONAL_REF_TAKEN') return { kind: 'renumber', error };
  if (status === 409 && error.code && CONFLICT_CODES.has(error.code)) {
    return { kind: 'conflict', error };
  }
  if (error.code === 'REFERENCE_NOT_FOUND' && missingReferences(error).some(isQueued)) {
    return { kind: 'retry', afterMs: null, offline: false };
  }
  // 400, 404, 422, the other 409s, and any 4xx without a code.
  return { kind: 'rejected', error };
}

const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 5 * 60_000;

/** Exponential backoff with jitter: about 2 s, 4 s, 8 s … capped at 5 min. */
export function backoffMs(attempts: number, random = Math.random): number {
  const ceiling = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
  return Math.round(ceiling / 2 + random() * (ceiling / 2));
}
