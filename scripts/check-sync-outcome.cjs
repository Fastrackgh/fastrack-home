// Run with node scripts/check-sync-outcome.cjs. Checks the sync engine's
// response mapping against docs/offline/sync-contract.md §6, row by row.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
require.extensions['.ts'] = (mod, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  mod._compile(compiled, filename);
};
const s = require(path.resolve(__dirname, '..', 'src/lib/offline/syncOutcome.ts'));

const res = (status, body = {}, headers = {}) => ({
  status,
  body,
  headers: { get: (name) => headers[name] ?? null },
});
const err = (status, code, extra = {}) =>
  res(status, { success: false, statusCode: status, message: 'm', code, ...extra });
const kind = (response, isQueued) => s.classify(response, isQueued).kind;

// 2xx: applied, replayed, with cell conflicts.
assert.deepEqual(s.classify(res(201, { data: { id: 'p1' } })), {
  kind: 'applied',
  replayed: false,
  cellConflicts: [],
});
assert.equal(s.classify(res(201, {}, { 'Idempotent-Replayed': 'true' })).replayed, true);
const cell = {
  cell: { schoolStudentId: 's1', date: '2026-10-28' },
  current: { status: 'absent' },
  mine: { status: 'present' },
};
assert.deepEqual(s.classify(res(200, { data: { entries: [], conflicts: [cell] } })).cellConflicts, [
  cell,
]);
assert.deepEqual(s.classify(res(200, { data: {}, conflicts: [cell] })).cellConflicts, [cell]);

// 409s.
assert.equal(
  kind(err(409, 'CONFLICT', { current: { rowVersion: 4 }, conflictingFields: ['firstName'] })),
  'conflict',
);
const conflict = s.classify(
  err(409, 'CONFLICT', { current: { rowVersion: 4 }, conflictingFields: ['firstName'] }),
);
assert.deepEqual(conflict.error.current, { rowVersion: 4 });
assert.deepEqual(conflict.error.conflictingFields, ['firstName']);
assert.equal(kind(err(409, 'LIKELY_DUPLICATE')), 'conflict');
assert.deepEqual(s.classify(err(409, 'IDEMPOTENCY_IN_PROGRESS')), {
  kind: 'retry',
  afterMs: 2000,
  offline: false,
});
assert.equal(
  s.classify({
    ...err(409, 'IDEMPOTENCY_IN_PROGRESS'),
    headers: { get: (n) => (n === 'Retry-After' ? '5' : null) },
  }).afterMs,
  5000,
);
for (const code of ['IDEMPOTENCY_MISMATCH', 'DUPLICATE_ID', 'DUPLICATE_REFERENCE']) {
  assert.equal(kind(err(409, code)), 'rejected', code);
}

// 400 / 404 / 422 rejected; REFERENCE_NOT_FOUND waits for a queued dependency.
for (const [status, code] of [
  [400, 'VALIDATION_FAILED'],
  [404, 'NOT_FOUND'],
  [422, 'SHEET_LOCKED'],
  [422, 'OP_TOO_OLD'],
  [422, 'NOT_ENROLLED_ON_DATE'],
]) {
  assert.equal(kind(err(status, code)), 'rejected', code);
}
const missing = err(422, 'REFERENCE_NOT_FOUND', {
  reason: { missing: [{ collection: 'students', id: 'st9' }] },
});
assert.equal(
  kind(missing, (id) => id === 'st9'),
  'retry',
);
assert.equal(
  kind(missing, () => false),
  'rejected',
);

// 403 of any code is forwarded (§6.2); 401 pauses.
for (const code of [
  'FORBIDDEN',
  'OUT_OF_SCOPE',
  'SCHOOL_INACTIVE',
  'MODULE_NOT_ENABLED',
  undefined,
]) {
  assert.equal(kind(err(403, code)), 'forwarded', String(code));
}
assert.equal(
  s.classify(err(403, 'OUT_OF_SCOPE', { reason: { forwardedTo: 'school-review' } })).error.reason
    .forwardedTo,
  'school-review',
);
assert.deepEqual(s.classify(err(401, undefined)), { kind: 'paused' });

// 408, 429, 5xx and no answer retry; 502–504 and no answer mean offline.
assert.deepEqual(s.classify({ status: 0 }), { kind: 'retry', afterMs: null, offline: true });
assert.deepEqual(s.classify(err(500)), { kind: 'retry', afterMs: null, offline: false });
assert.equal(s.classify(err(503)).offline, true);
assert.equal(kind(err(408)), 'retry');
assert.equal(
  s.classify({ ...err(429), headers: { get: (n) => (n === 'Retry-After' ? '10' : null) } }).afterMs,
  10000,
);

// Any other 4xx without a code is rejected.
assert.equal(kind(res(418, { message: 'teapot' })), 'rejected');
assert.equal(s.classify(res(418, {})).error.code, null);

// Retry-After and backoff.
assert.equal(s.retryAfterMs('2'), 2000);
assert.equal(s.retryAfterMs(new Date(10_000).toUTCString(), 4_000), 6000);
assert.equal(s.retryAfterMs('soon'), null);
assert.equal(
  s.backoffMs(1, () => 0),
  1000,
);
assert.equal(
  s.backoffMs(1, () => 1),
  2000,
);
assert.equal(
  s.backoffMs(3, () => 1),
  8000,
);
assert.equal(
  s.backoffMs(50, () => 1),
  300000,
);

console.log('sync outcome checks passed');
