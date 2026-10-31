import { ApiError, apiClient, errorCode, pathId, type PageMeta } from '@/lib/api-client';
import { formatDay } from '@/features/calendar/dates';
import { formatCedis } from '@/features/fees/money';
import { pageParams, toPage, type Page, type Raw } from '@/lib/pagination';
import type { CellConflict } from '@/lib/offline/syncOutcome';

/**
 * Changes a staff device queued offline that the server refused with a 403
 * and kept for the school (docs/offline/sync-contract.md §6.2, v0.4): a
 * teacher who lost a class, a role that lost a permission. A head or the
 * academic head (`sync:review`) applies them as themselves or dismisses them.
 */
export type ForwardedStatus = 'open' | 'applied' | 'dismissed';

export interface Person {
  id: string;
  name: string;
}

export interface ForwardedChange {
  id: string;
  status: ForwardedStatus;
  /** The 403 code: FORBIDDEN, OUT_OF_SCOPE, MODULE_NOT_ENABLED, SCHOOL_INACTIVE. */
  code: string;
  message: string;
  method: string;
  /** API path relative to the client's base URL (the stored `/api` prefix removed). */
  path: string;
  body: Raw | null;
  baseVersion: number | null;
  sentBy: Person | null;
  /** When the sender acted (server-corrected). */
  recordedAt: string;
  receivedAt: string;
  /** The key the reviewer's re-send must use, so it applies exactly once. */
  applyOpKey: string;
  resolvedBy: Person | null;
  resolvedAt: string | null;
  note: string | null;
  /** What was really applied, when applied (OFF-6); differs from `body` after an edit. */
  appliedBody: Raw | null;
  appliedWithEdits: boolean;
}

export interface ApplyResult {
  /** Cells of a register or mark sheet that had changed since; the rest applied (§5). */
  conflicts: CellConflict[];
}

const person = (value: unknown): Person | null => {
  const raw = value as Raw | null;
  return raw && typeof raw.id === 'string'
    ? { id: raw.id, name: String(raw.name ?? '') || 'Unknown' }
    : null;
};

const toChange = (raw: Raw): ForwardedChange => ({
  id: String(raw.id),
  status: raw.status as ForwardedStatus,
  code: String(raw.code ?? ''),
  message: String(raw.message ?? ''),
  method: String(raw.method ?? 'POST'),
  path: String(raw.path ?? '').replace(/^\/api(?=\/)/, ''),
  body: raw.body && typeof raw.body === 'object' ? (raw.body as Raw) : null,
  baseVersion:
    raw.baseVersion === null || raw.baseVersion === undefined ? null : Number(raw.baseVersion),
  sentBy: person(raw.sentBy),
  recordedAt: String(raw.recordedAt ?? ''),
  receivedAt: String(raw.receivedAt ?? ''),
  applyOpKey: String(raw.applyOpKey ?? ''),
  resolvedBy: person(raw.resolvedBy),
  resolvedAt: (raw.resolvedAt as string | null) ?? null,
  note: (raw.note as string | null) ?? null,
  appliedBody:
    raw.appliedBody && typeof raw.appliedBody === 'object' ? (raw.appliedBody as Raw) : null,
  appliedWithEdits: raw.appliedWithEdits === true,
});

/** Why the sender couldn't save it, in staff words. */
export const REASONS: Record<string, string> = {
  FORBIDDEN: 'Their role no longer allows this',
  OUT_OF_SCOPE: 'They no longer teach this class or pupil',
  MODULE_NOT_ENABLED: 'The school’s plan no longer includes this',
  SCHOOL_INACTIVE: 'The school was inactive at the time',
};

const count = (value: unknown) => (Array.isArray(value) ? value.length : 0);

/** A one-line description of what the change does. */
export function describe(change: ForwardedChange, names?: Map<string, string>): string {
  // Once applied, what was really saved (an edit may differ from what was sent).
  const body = (change.status === 'applied' && change.appliedBody) || change.body || {};
  const { method, path } = change;
  if (method === 'POST' && path === '/schools/me/payments') {
    const amount = Number(body.amount);
    const how = typeof body.paymentMethod === 'string' ? ` · ${body.paymentMethod}` : '';
    return `Fee payment${Number.isFinite(amount) ? ` of ${formatCedis(amount)}` : ''}${how}`;
  }
  if (path === '/schools/me/attendance/register') {
    const className = names?.get(String(body.classId));
    const parts = [
      'Attendance register',
      className,
      typeof body.date === 'string' ? formatDay(body.date) : undefined,
      `${count(body.marks)} pupils`,
    ];
    return parts.filter(Boolean).join(' · ');
  }
  if (/^\/schools\/me\/mark-sheets\/[^/]+\/marks$/.test(path)) {
    return `Marks · ${count(body.marks)} entries`;
  }
  return `${method} ${path}`;
}

/** An apply that didn't happen as asked, with the row as it is now when it was resolved meanwhile. */
export class ApplyRefused extends Error {
  constructor(
    message: string,
    readonly current?: ForwardedChange,
  ) {
    super(message);
    this.name = 'ApplyRefused';
  }
}

const stamp = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Why an apply or dismiss didn't happen: the row was resolved by someone else meanwhile. */
function resolvedMessage(
  row: ForwardedChange,
  { edited = false, action = 'apply' }: { edited?: boolean; action?: 'apply' | 'dismiss' } = {},
): string {
  const by = row.resolvedBy?.name ?? 'someone else';
  const when = row.resolvedAt ? ` on ${stamp.format(new Date(row.resolvedAt))}` : '';
  if (row.status === 'dismissed') {
    return action === 'dismiss'
      ? `Already dismissed by ${by}${when}.`
      : `Dismissed by ${by}${when}, so it wasn’t applied.`;
  }
  const how = row.appliedWithEdits ? ' with their own edits' : ' with the original values';
  if (action === 'dismiss') return `Already applied by ${by}${when}, so it can’t be dismissed.`;
  return `Already applied by ${by}${when}${edited ? `${how}, so your edit wasn’t saved` : ''}.`;
}

/**
 * The row was resolved meanwhile: an unedited apply of a row already applied
 * is done (null); anything else is refused with the row as it is now.
 */
function resolvedRefusal(now: ForwardedChange, edited: boolean): ApplyRefused | null {
  if (now.status === 'applied' && !edited) return null;
  return new ApplyRefused(resolvedMessage(now, { edited }), now);
}

/** JSON with sorted keys, to tell an edited body from the stored one. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Raw).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

/** Waits for an attempt still being saved (`IDEMPOTENCY_IN_PROGRESS`, Retry-After 2). */
const IN_PROGRESS_WAIT_MS = 2000;
const IN_PROGRESS_TRIES = 4;

export const syncReviewApi = {
  async list(status: ForwardedStatus, page: number): Promise<Page<ForwardedChange>> {
    const res = await apiClient.get<Raw[], PageMeta>(
      `/schools/me/sync/rejections?${pageParams(page, { status })}`,
    );
    return toPage(res, toChange);
  },

  async get(id: string): Promise<ForwardedChange> {
    return toChange(
      (await apiClient.get<Raw>(`/schools/me/sync/rejections/${pathId(id)}`)).data ?? {},
    );
  },

  /**
   * Applies a change as the reviewer (§6.2): re-sends it through its normal
   * route with the row's `applyOpKey`, so a retry replays rather than applying
   * twice, then marks the row applied.
   * - The row is re-read first; one resolved meanwhile (another tab or reviewer)
   *   isn't sent again (narrows OFF-7).
   * - `IDEMPOTENCY_MISMATCH` means the key was already used with other content
   *   (OFF-8). Only an unedited apply after its own lost answer counts as done;
   *   an edit that the server didn't save is reported, never marked applied.
   * Refusals throw `ApplyRefused` (with the row as it is now, if it changed)
   * or the API error, and the row stays as it was.
   */
  async apply(change: ForwardedChange, body: Raw | null = change.body): Promise<ApplyResult> {
    const edited = stableJson(body) !== stableJson(change.body);
    const latest = await syncReviewApi.get(change.id);
    if (latest.status !== 'open') {
      // An unedited apply of a row already applied (e.g. after a lost answer) is done.
      const refusal = resolvedRefusal(latest, edited);
      if (refusal) throw refusal;
      return { conflicts: [] };
    }

    const send = () =>
      apiClient.exchange<Raw>(change.path, {
        method: change.method,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          'Idempotency-Key': change.applyOpKey,
          // No X-Client-Recorded-At: the server keeps the sender's time (§6.2).
          'X-Client-Sent-At': new Date().toISOString(),
          ...(change.baseVersion === null ? {} : { 'X-Base-Version': String(change.baseVersion) }),
        },
      });
    let conflicts: CellConflict[] = [];
    for (let attempt = 1; ; attempt++) {
      try {
        const { body: res } = await send();
        const list = (res.data as Raw | undefined)?.conflicts ?? (res as unknown as Raw).conflicts;
        conflicts = Array.isArray(list) ? (list as CellConflict[]) : [];
        break;
      } catch (err) {
        const code = errorCode(err);
        // ALREADY_RESOLVED: dismissed, or applied by another request, meanwhile (OFF-7).
        if (code === 'ALREADY_RESOLVED' || code === 'IDEMPOTENCY_MISMATCH') {
          const now = await syncReviewApi.get(change.id);
          if (now.status !== 'open') {
            const refusal = resolvedRefusal(now, edited);
            if (refusal) throw refusal;
            return { conflicts: [] };
          }
          if (code === 'ALREADY_RESOLVED') throw err;
          if (edited) {
            throw new ApplyRefused(
              'This change was already saved with its original values, so your edit wasn’t saved. Apply it without edits to mark it done.',
            );
          }
          break;
        }
        if (code !== 'IDEMPOTENCY_IN_PROGRESS' || attempt >= IN_PROGRESS_TRIES) throw err;
        await new Promise((resolve) => setTimeout(resolve, IN_PROGRESS_WAIT_MS));
      }
    }
    await apiClient.post(`/schools/me/sync/rejections/${pathId(change.id)}/applied`, {
      appliedOpKey: change.applyOpKey,
    });
    return { conflicts };
  },

  /** Dismisses a change; a 409 (applied or dismissed meanwhile) throws `ApplyRefused` with the row now. */
  async dismiss(change: ForwardedChange, note: string) {
    try {
      await apiClient.post(`/schools/me/sync/rejections/${pathId(change.id)}/dismiss`, {
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    } catch (err) {
      if (!(err instanceof ApiError) || err.statusCode !== 409) throw err;
      const now = await syncReviewApi.get(change.id);
      if (now.status === 'open') throw err;
      throw new ApplyRefused(resolvedMessage(now, { action: 'dismiss' }), now);
    }
  },
};
