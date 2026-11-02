import type { SyncError } from './syncOutcome';

type Changes = Record<string, { from: unknown; to: unknown }>;

/** What a 409 `CONFLICT` on a `changes` update splits into (contract §5, step 4). */
export interface Rebased {
  /** The clashing fields, as sent: they go to review. */
  clashing: { changes: Changes };
  /** The other fields, resent from `current` (null when every field clashed). */
  rest: { body: { changes: Changes }; baseVersion: number } | null;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/**
 * Splits a refused `changes` update: nothing applied, so the fields that
 * didn't clash are resent as a new op with `from` taken from `current` and
 * `X-Base-Version` set to its `rowVersion`, and the clashing fields go to
 * review. Null when the op or the answer isn't of that form (a plain body,
 * no `current.rowVersion`, or no clashing field it sent).
 */
export function rebaseChanges(body: string | undefined, error: SyncError): Rebased | null {
  if (error.code !== 'CONFLICT' || !error.conflictingFields?.length) return null;
  const current = asRecord(error.current);
  const version = current?.rowVersion;
  if (!current || typeof version !== 'number') return null;
  let changes: Changes | null = null;
  try {
    changes = asRecord(asRecord(body ? JSON.parse(body) : null)?.changes) as Changes | null;
  } catch {
    return null;
  }
  if (!changes) return null;

  const clashed = new Set(error.conflictingFields);
  const clashing: Changes = {};
  const rest: Changes = {};
  for (const [field, change] of Object.entries(changes)) {
    if (clashed.has(field)) clashing[field] = change;
    else rest[field] = { from: current[field] ?? null, to: change.to };
  }
  if (Object.keys(clashing).length === 0) return null;
  return {
    clashing: { changes: clashing },
    rest: Object.keys(rest).length ? { body: { changes: rest }, baseVersion: version } : null,
  };
}
