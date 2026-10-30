import { apiClient, errorCode, pathId, type PageMeta } from '@/lib/api-client';
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
export function describe(change: ForwardedChange): string {
  const body = change.body ?? {};
  const { method, path } = change;
  if (method === 'POST' && path === '/schools/me/payments') {
    const amount = Number(body.amount);
    const how = typeof body.paymentMethod === 'string' ? ` · ${body.paymentMethod}` : '';
    return `Fee payment${Number.isFinite(amount) ? ` of ${formatCedis(amount)}` : ''}${how}`;
  }
  if (path === '/schools/me/attendance/register') {
    const date = typeof body.date === 'string' ? ` for ${body.date}` : '';
    return `Attendance register${date} · ${count(body.marks)} pupils`;
  }
  if (/^\/schools\/me\/mark-sheets\/[^/]+\/marks$/.test(path)) {
    return `Marks · ${count(body.marks)} entries`;
  }
  return `${method} ${path}`;
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

  /**
   * Applies a change as the reviewer (§6.2): re-sends it through its normal
   * route with the row's `applyOpKey`, so a retry replays rather than applying
   * twice, then marks the row applied. `IDEMPOTENCY_MISMATCH` means the key was
   * already used (another reviewer, or an earlier apply), which counts as applied.
   * Other refusals (a conflict, a closed term) throw, and the row stays open.
   */
  async apply(change: ForwardedChange, body: Raw | null = change.body): Promise<ApplyResult> {
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
        if (code === 'IDEMPOTENCY_MISMATCH') break;
        if (code !== 'IDEMPOTENCY_IN_PROGRESS' || attempt >= IN_PROGRESS_TRIES) throw err;
        await new Promise((resolve) => setTimeout(resolve, IN_PROGRESS_WAIT_MS));
      }
    }
    await apiClient.post(`/schools/me/sync/rejections/${pathId(change.id)}/applied`, {
      appliedOpKey: change.applyOpKey,
    });
    return { conflicts };
  },

  async dismiss(change: ForwardedChange, note: string) {
    await apiClient.post(`/schools/me/sync/rejections/${pathId(change.id)}/dismiss`, {
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  },
};
