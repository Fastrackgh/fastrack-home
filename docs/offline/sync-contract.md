# Offline sync contract (staff portal)

**Status:** **agreed** v0.4 (31 Oct 2026), changing only §6.2 and adding the `ALREADY_RESOLVED` code. Signed off by the staff frontend; QA re-tests the routes. Phase 2 builds against this version; any change goes through a new version here.
**Owners:** backend (`fastrack-backend`), staff frontend (`/school-admin`).
**Plan:** `humming-tumbling-codd.md`, "Sync contract" and "Backend work" B1–B5.

This document is the single source of truth for how the offline outbox talks to the backend. Online screens are unaffected: every header and field below is optional, and a request without them behaves exactly as it does today. The API contract snapshots stay unchanged except for the additive fields listed here.

All paths are relative to `/api`. Every request also sends `X-Api-Contract: 2`, as `api-client.ts` already does.

**Pupil identity:**
- The backend has two pupil ids:
  - `studentId` is the global person.
  - `schoolStudentId` is the pupil's enrolment record at this school. It is the roster item's `id`.
- **Sync always uses `schoolStudentId`**, in collection ids, cells and `from`/`current`.
- Attendance today speaks `studentId`, so two additive changes cover it:
  - The register entry gains `schoolStudentId`.
  - `PUT /schools/me/attendance/register` accepts `schoolStudentId` in each `marks[]` entry as an alternative to `studentId`. Sending both, and having them disagree, gives 400.

---

## 1. Request headers on queued writes

The client sets these when the op is enqueued, and resends them **byte for byte** on every retry. The one exception is `X-Client-Sent-At`.

| Header | Required | Value | Server use |
| --- | --- | --- | --- |
| `Idempotency-Key` | every queued write | the op's `opId`: a lowercase UUIDv4. It fits the existing `[\w.:-]{8,100}` rule in `idempotency-key.ts`. | Dedupe and replay (§4) |
| `X-Base-Version` | updates and deletes of a versioned record | the `rowVersion` the device last saw (integer) | Conflict check (§5) |
| `X-Client-Recorded-At` | when the user's action time matters (attendance, payments, admissions); harmless elsewhere | the **raw device clock** when the user acted, as ISO 8601 with offset | Clock-corrected (below), then stored. **Never used for ordering.** |
| `X-Client-Sent-At` | every queued write | the **raw device clock** at the moment of *this* send. It changes on each retry and is left out of the request hash. | Measures the device's clock skew |
| `X-Device-Id` | every queued write | a UUID created once per device per user and kept in the per-user DB | Informational only: stored on the op for audit and support. It needs no registration, and the server never trusts or authorises by it. A malformed value gives 400. |

### Device clocks (R1)

School devices often have wrong clocks, so the server **never rejects an op because of its timestamp**. It corrects the time instead:

- `skew = X-Client-Sent-At − received_at`. The send and the receipt happen within seconds of each other, so this measures how far off the device clock is.
- `recorded_at = min(X-Client-Recorded-At − skew, received_at)`. A future time is clamped to `received_at`.
- The server stores the raw `client_recorded_at`, `clock_skew_ms` and the corrected `recorded_at`. When `|skew|` exceeds `SYNC_CLOCK_SKEW_FLAG_MINUTES` (default 5), it sets `clock_skew_flagged` for support. The op is still applied.
- **The client sends raw device times and does not correct them itself.** Otherwise the skew would be removed twice. It may still use `X-Server-Time` for its own display ("Synced N min ago", the session warning).
- Without `X-Client-Sent-At` the skew is taken as 0. Without `X-Client-Recorded-At`, `recorded_at = received_at`.
- The server keeps `received_at` separate. The change feed order is always server commit order (§7).
- **Known limit:** the skew is measured at send time. A device whose clock is corrected between the user's action and the send (e.g. by NTP) still sends a `recorded_at` off by the old error. The attendance `date` and the feed order don't depend on it, so only audit times are affected. Possible later fix: the client also sends the skew it last saw at enqueue.
- **Age limit:** an op whose corrected `recorded_at` is more than the retention window (30 days) before `received_at` gets 422 `OP_TOO_OLD`. This is measured on the server clock only.

## 2. Creates: client-supplied `id`

- Create DTOs for synced collections accept an optional `id` (UUIDv4). The server uses it as the primary key.
- If that `id` already exists **in the same school** under the same `Idempotency-Key`, the request is a replay (§4).
- If it exists under a different key, or in another school, the server returns 409 `DUPLICATE_ID`, which the client treats as rejected. The server never reveals which school holds the id.
- Server-allocated fields (student code, receipt number) are allocated at sync time and returned in the create response. Until then the device shows them as pending.
- A create or update that references an id the server doesn't know (e.g. attendance for a pupil whose admission is still queued) returns 422 `REFERENCE_NOT_FOUND` with `reason.missing: [{collection, id}]`. If that dependency is still in the outbox, the client should retry once it lands. Otherwise the op goes to review. The client should send dependencies first anyway (`dependsOn`).

## 3. Updates: `changes`, or plain fields

During the migration, `PATCH` endpoints of synced collections accept **either** body form:

```jsonc
// a) field changes with the value the device started from (preferred for queued ops)
{ "changes": { "firstName": { "from": "Ama", "to": "Amma" }, "classId": { "from": "c1", "to": "c2" } } }

// b) plain fields, as today (online screens, or no known base)
{ "firstName": "Amma", "classId": "c2" }
```

- Field names are the DTO keys of the plain form. Each field is compared as a whole value: an array or object counts as one field.
- Sending both forms, or a `changes` key the DTO doesn't allow, gives 400.
- The server validates `to` values with the same DTO rules as the plain form.

### Wire form (R2)

Every value uses one JSON wire form wherever it appears: `from`, `to`, `current`, feed and snapshot `data`, GET items and write responses.

| Kind | Wire form |
| --- | --- |
| date | `"YYYY-MM-DD"` |
| timestamp | ISO 8601 UTC with milliseconds, `"2026-10-29T08:14:03.120Z"` |
| money / decimal | string with the column's scale, `"120.50"` |
| time of day | `"HH:MM"` |
| empty | `null` (never `""` or a missing key) |

Before comparing, the server normalises **both** sides to this form. A device that sends `120.5` against a stored `"120.50"` therefore doesn't clash. As part of B2, the backend checks every phase 1 read shape against this table and fixes any that differ, with a contract test for each.

## 4. Idempotency (B1)

The server keeps a `sync_operations` row per `(school, Idempotency-Key)` for the retention window (**30 days**).

- **Request hash:** SHA-256 over `method`, the route template plus its params, the canonical JSON body (keys sorted), `X-Base-Version` and `X-Client-Recorded-At`. `X-Client-Sent-At` and `X-Device-Id` are left out.
- **Claim, then complete atomically.** Without these two steps, a crash or a dropped response between the business commit and the key store would let a retry apply the op twice:
  1. **Claim.** Before the handler runs, the server inserts `(school, key, user, hash, status='in_progress', claim_token = <new uuid>, lease_until = now + SYNC_CLAIM_LEASE_SECONDS)` in its own short transaction. The unique key makes a concurrent duplicate fail here, which gives `IDEMPOTENCY_IN_PROGRESS`.
  2. **Heartbeat.** While the handler runs, the server extends `lease_until` every lease/3 seconds (`… WHERE key = $k AND claim_token = $mine`). A slow op that is still alive therefore keeps its claim.
  3. **Complete, fenced.** Inside the handler's business transaction, as its last statement, the server runs `UPDATE sync_operations SET status = 'completed', response_status = …, response_body = … WHERE school_id = $s AND op_key = $k AND claim_token = $mine`. If **0 rows** match, the claim was taken over: the server throws, and the whole business write rolls back. Either the write and the completion are both saved, or neither is, and only the current claim holder can commit.
  - If the handler fails (any non-2xx), the claim is deleted (`… AND claim_token = $mine`) and the key is free again.
  - **Takeover.** If the process dies, or its heartbeat stops, the lease runs out (default 60 s). The next retry takes the claim over with a **new** `claim_token` and runs the op. If the first attempt is somehow still running, its fenced completion matches 0 rows and rolls back. **Exactly one attempt commits.**
  - **Side effects outside the database** (emails, SMS, queued jobs) are sent only after the business transaction commits, never from inside it. A rolled-back attempt therefore leaves no trace.
- **Only 2xx responses are stored.** Any other outcome releases the key. A retry after a 5xx or a network drop therefore runs again, and after a rejection the client sends a *new* op (with a new `opId`) once the user has resolved it.
- **Replay:** the same key with the same hash returns the stored status and body byte for byte, plus `Idempotent-Replayed: true`. This happens even if the user has since lost the permission or the school has been suspended (§6.1), because the op was allowed when it was first applied. The body is the record **as it was when the op was first applied**, so its versions may since be behind. The apply rule (§7) makes that harmless, and newer state comes from the feed.
- **Mismatch:** the same key with a different hash, or from a different user, returns 409 `IDEMPOTENCY_MISMATCH`. The op goes to review as a client bug and is never retried.
- **In flight:** an unexpired claim on the key returns 409 `IDEMPOTENCY_IN_PROGRESS` with `Retry-After: 2`. Retry it; don't send it to review.
- **Payments:** a replayed `POST /schools/me/payments` returns the original 201 receipt. It replaces today's 409 "already recorded (receipt …)" at `payments.service.ts:98-102` when the key matches. The MoMo and bank reference dedupe stays, and a *different* key with a known reference still gives 409 `DUPLICATE_REFERENCE` (rejected).
- **Age limit:** the client must not send an op older than the retention window, because its replay can't be guaranteed. The frontend sends ops older than 25 days to review early, with a warning. The server enforces the limit with `OP_TOO_OLD` (§1).

## 5. Versions and conflicts (B2)

- Every record of a synced collection carries `rowVersion`: an integer that starts at 1 and rises by 1 on every write to the record's fields in its read shape.
- It appears in **every** GET, feed and snapshot entry, and in every write response for that collection, including each entry of the batch-cell responses (R5).
- On an update with `X-Base-Version` and `changes`:
  1. If the base equals the current `rowVersion`, every change applies.
  2. Otherwise each field is checked on its own. It **applies** if its current value equals `from`, or already equals `to` (a no-op). It **clashes** if the current value is anything else.
  3. If nothing clashes, the non-clashing fields apply and the response is a normal 200.
  4. If anything clashes, **nothing applies** and the server returns 409 `CONFLICT`. The client re-bases: it resends the non-clashing fields as a new op, with `X-Base-Version = current.rowVersion` and `from` taken from `current`. The clashing fields go to review.
- With a plain body and a stale `X-Base-Version`, every sent field whose current value differs from the sent value is a clash.
- **Deletes** with a stale `X-Base-Version` give 409 `CONFLICT` (`conflictingFields` lists the fields changed since the base). A delete of a record that is already gone returns 200 `{ id, deleted: true, alreadyDeleted: true }`, so a delete is always safe to resend.
- An update to a record the server has deleted gives 422 `RECORD_DELETED`, which goes to review.
- **Tombstone version (R6):** a delete takes `rowVersion + 1` of the deleted record. That version is above every upsert ever emitted for the record, and feed order follows commit order (§7), so no upsert can arrive after its own tombstone.
- **Restore after a tombstone:** a restore (e.g. `AttendanceService.mark` clearing `deleted_at` on a soft-deleted mark) writes `rowVersion = tombstone version + 1`. The restore's upsert therefore passes the apply rule on devices that have already applied the delete.

### Batch-cell endpoints: partial outcome

Two endpoints write many independent cells in one request. Putting the whole request in review because one cell clashed would lose too much, so these endpoints apply what they can:

| Endpoint | Cell (R3) | Per-cell base |
| --- | --- | --- |
| `PUT /schools/me/attendance/register` | `{schoolStudentId, date}` | each `marks[]` entry may carry `from: {status, arrivalTime, note} \| null` (what the device saw; `null` = unmarked) |
| `PUT /schools/me/mark-sheets/:id/marks` | `{schoolStudentId, componentKey, itemIndex}` | each `marks[]` entry may carry `from: {status, rawScore, descriptorBandId} \| null` |

- **A cell applies only when its current value equals `from` or `to`.** Otherwise it clashes. There is no "same user" exception (R4). A user editing one cell twice offline is covered by the FIFO `from` chain, and the same user on two devices gets a normal conflict for review.
- The response is 200 with the normal body, plus:

  ```jsonc
  "conflicts": [{
    "cell":    { "schoolStudentId": "…", "date": "2026-10-28" },          // marks: {schoolStudentId, componentKey, itemIndex}
    "current": { "status": "absent", "arrivalTime": null, "note": null,
                 "updatedBy": "Mrs A. Mensah", "updatedAt": "2026-10-28T09:02:11.000Z" },
    "mine":    { "status": "present", "arrivalTime": null, "note": null }
  }]
  ```

  - The op counts as **applied**. Each conflict becomes its own review item, and resolving one sends a new op for that cell alone.
  - `updatedBy` is a display name, and `updatedAt` is the server time of the last write.
- **Versions in the response (R5):**
  - Each register entry carries its own `rowVersion`.
  - Each marks row carries `version`: the sheet `rowVersion` of the write that last changed that row. The PUT response returns only the rows it changed (as today), so in a write response this is the sheet's new `rowVersion`. A row's version therefore rises strictly on every write to it.
  - The client stores both under the feed's apply rule.
- On marks, `rowVersion` in the body becomes the sheet base. A stale sheet `rowVersion` no longer rejects the whole request when the cells carry `from`. Without `from`, the current behaviour stays: a stale version gives 409 `CONFLICT` (shape in §6).
- A sheet that was submitted, approved or returned while the device was offline gives 422 `SHEET_LOCKED`, with `current` set to the sheet and its server values.
- Attendance checks class membership **as of the attendance date** (enrolment history), not today. A pupil who wasn't in the class that day gives 422 `NOT_ENROLLED_ON_DATE`.

## 6. Error envelope

Every sync-relevant error uses one body. It extends the v2 error shape that `ApiError` already parses:

```jsonc
{
  "success": false,
  "statusCode": 409,
  "error": "Conflict",
  "message": "Someone changed this pupil while you were offline.",   // human, shown in review
  "code": "CONFLICT",                                                // machine, drives the engine
  "current": { /* server record in its read shape, incl. rowVersion, updatedBy, updatedAt */ },
  "conflictingFields": ["firstName"],
  "reason": { /* code-specific detail, e.g. {missing:[…]}, {candidates:[…]}, {forwardedTo:"school-review"} */ },
  "details": ["…"]                                                    // validation messages, as today
}
```

- `code` is always present on 4xx responses from synced routes. `current`, `conflictingFields` and `reason` appear when they apply.
- `current` always carries `updatedBy` (a display name) and `updatedAt` for the review tray (R3).
- These fields sit at the top level, so on the frontend they are `ApiError.details.code` and so on (`details` holds the whole body).
- Backend change: `ContractExceptionFilter` passes these extra top-level fields through. Today it keeps only `message` and `error`.
- **Marks migration:** the stale-`rowVersion` 409 moves to this shape (`code: 'CONFLICT'`, `current` = the sheet with `rowVersion`). For one release it **also** keeps `details.rowVersion`, so the current `useMarkSheet.ts` keeps working. The old field is removed when the frontend says it reads `code`.

### How the engine treats each response

| Response | Outcome | Engine action |
| --- | --- | --- |
| 2xx | applied | Store the returned record, then pull the feed. With `Idempotent-Replayed: true` the outcome is **replayed** and is treated the same way. With `conflicts[]` it is **applied**, and each conflict becomes a review item. |
| 409 `CONFLICT`, `LIKELY_DUPLICATE` | conflict | Review tray, showing `current` beside the device value |
| 409 `IDEMPOTENCY_IN_PROGRESS` | retry | Wait for `Retry-After` |
| 409 `IDEMPOTENCY_MISMATCH`, `DUPLICATE_ID`, `DUPLICATE_REFERENCE` | rejected | Review tray, never retried |
| 409 `ALREADY_RESOLVED` | rejected | Only on a reviewer's apply (§6.2): show who dismissed or applied it. Never retried |
| 400, 404, 422 (any code) | rejected | Review tray, never retried. Exception: `REFERENCE_NOT_FOUND` while the dependency is still queued (§2) |
| 403 (any code) | forwarded | Mark the op "Sent to the head teacher for review" and remove it from the user's own tray (§6.2) |
| **401** | pause | **Never a rejection.** Pause the queue, refresh or sign in, then resume as the same user |
| 408, 429, 5xx, network failure | retry | Exponential backoff. Honour `Retry-After` |
| any other 4xx with no `code` | rejected | Review tray. The backend treats a missing code as its own bug |

The 403 codes:
- `FORBIDDEN`: the role lacks the permission key.
- `OUT_OF_SCOPE`: the user has the permission but not for this class or pupil, e.g. a teacher who has been unassigned.
- `SCHOOL_INACTIVE`: the school is suspended or deactivated.
- `MODULE_NOT_ENABLED`: the school's subscription no longer includes the module.

The 422 codes so far: `VALIDATION_FAILED`, `TERM_CLOSED`, `SHEET_LOCKED`, `NOT_ENROLLED_ON_DATE`, `RECORD_DELETED`, `REFERENCE_NOT_FOUND`, `OP_TOO_OLD`. New codes are added only through this section.

### 6.1 Order of checks

A request can fail more than one check. The server runs them in this order and returns the **first** one that fails:

| # | Check | Response |
| --- | --- | --- |
| 1 | Authenticated | 401 |
| 2 | Idempotency: a completed op with this key | replay (2xx), or `IDEMPOTENCY_MISMATCH`. **Before** steps 3–6, so an op that was already applied always replays. |
| 3 | School status, then module, then permission key | 403 `SCHOOL_INACTIVE`, then `MODULE_NOT_ENABLED`, then `FORBIDDEN` |
| 4 | Idempotency: an unexpired claim on this key | `IDEMPOTENCY_IN_PROGRESS`; otherwise the server takes the claim |
| 5 | Headers and DTO | 400 `VALIDATION_FAILED` |
| 6 | Row scope (this class or pupil is the caller's) | 403 `OUT_OF_SCOPE` |
| 7 | Target record exists; create id is free | 422 `RECORD_DELETED`, 404, 409 `DUPLICATE_ID` (an already-deleted target on a DELETE gives 200 `alreadyDeleted`) |
| 8 | Referenced records exist | 422 `REFERENCE_NOT_FOUND` |
| 9 | Op age | 422 `OP_TOO_OLD` |
| 10 | Domain locks | 422 `TERM_CLOSED`, `SHEET_LOCKED` |
| 11 | Domain rules | 422 `NOT_ENROLLED_ON_DATE` and other 422s |
| 12 | Version and fields | 409 `CONFLICT`, `LIKELY_DUPLICATE`, `DUPLICATE_REFERENCE` |
| 13 | Apply | 2xx, with `conflicts[]` on the batch-cell endpoints |

A failure at any step after 4 releases the claim taken at step 4.

### 6.2 Ops nobody on the device can resolve

When a teacher loses a class (scope tombstones, §7) or a role, their queued ops for it can't be resolved on their own device. They must not be lost silently:

- The device **still sends** them; it doesn't drop them locally. The server rejects each one with its 403, and stores the full op (headers, body, user, device) in `sync_rejections`, separately from `sync_operations`, so the key stays free. The body carries `reason.forwardedTo: "school-review"`.
- `sync_rejections` is **unique on `(school_id, op_key)`**. A resend of the same key, e.g. after a lost 403 response, returns the same 403 with `reason.forwardedTo` and adds no second row. A head therefore sees each op once, and can apply it once.
- Every 403 carries a `code` (§6) whether or not it has a key. Only a 403 on a keyed write is forwarded.
- A school-level list, for the principal and academic head (new permission `sync:review`):
  - `GET /schools/me/sync/rejections?status=open|applied|dismissed&page=&limit=` lists the forwarded ops (v2 list).
  - `GET /schools/me/sync/rejections/:id` returns one.
  - Each row: `{id, status, code, message, opKey, method, path, body, baseVersion, sentBy:{id,name}, deviceId, recordedAt, receivedAt, applyOpKey, resolvedBy, resolvedAt, note, appliedOpKey, appliedBody, appliedWithEdits}`. `recordedAt` is the sender's corrected action time.
- **Applying is done by the reviewer's client, through the normal route** (v0.4), so the op passes every check in §6.1 like any other write, and the head can edit it first:
  1. Each row has a server-issued **`applyOpKey`** (UUID, made when the row is created). The reviewer's client re-sends the stored `method`, `path` and `body` (edited or not) as the reviewer, with **`Idempotency-Key: <applyOpKey>`**, **`X-Base-Version: <baseVersion>` when the row has one** (so a stale edit gets the normal §5 `CONFLICT` / `conflicts[]` instead of overwriting), and **no `X-Client-Recorded-At`**.
  2. That op takes its `recorded_at` from the rejection, which also governs the `OP_TOO_OLD` age. The reviewer's device clock is never applied, and the sender's is not applied twice.
  3. The usual idempotency rules then make the apply exactly once. A retry after a lost answer replays. Editing and re-sending after a failed attempt works, because a non-2xx frees the key. A second reviewer, or an edit after a successful apply, gets `IDEMPOTENCY_MISMATCH`, which the client treats as "already applied".
     - The key stays bound to its first successful request, not to the original body, so **edits are allowed**. The row records what was really applied: `appliedBody`, and `appliedWithEdits` (true when it differs from `body`).
     - A write whose key is the `applyOpKey` of a row that is **no longer open** (dismissed, or applied by a different request) is refused **before anything is claimed** with 409 **`ALREADY_RESOLVED`**. Its `reason` is `{rejectionId, status, resolvedBy:{id,name}, resolvedAt}`, and nothing is written. A completed op under that key still replays first (§6.1 step 2).
     - Apply and dismiss of the same row are serialised by a row lock, and a row whose re-send has been saved can no longer be dismissed (409). It can only be marked applied.
  4. Then `POST /schools/me/sync/rejections/:id/applied {appliedOpKey, note?}`:
     - It accepts only `appliedOpKey === applyOpKey`, and only once that op has completed. Otherwise it returns 422.
     - A repeat with the same key returns 200 and the row, so a retry after a lost answer is clean.
     - It returns 409 only when the row was resolved differently (dismissed).
- `POST /schools/me/sync/rejections/:id/dismiss {note?}` closes a row without applying it. It returns 409 if the row is already resolved, or if its re-send has already been saved.
- Both `applied` and `dismiss` are audited.
- The table stores forwarded ops from phase 1. The list and the actions ship with phase 2 (offline attendance and marks writes).
- A `SCHOOL_INACTIVE` op stays on the list until the school is active again.
- The new `sync:review` permission is added to `DEFAULT_ROLE_PERMISSIONS` for heads and admins. That is an intended, reviewed change to the route snapshot.

## 7. Pull: change feed and snapshot (B3)

### Cursors

- The cursor is an **opaque string**. It encodes a per-school sequence number. Compare cursors only by asking the server; never parse them.
- **Guarantee:** once a pull has returned cursor N, no change with a cursor at or below N can commit afterwards. A device that stores `nextSince` therefore never skips a change.
- **How the backend keeps it:** a bigserial is handed out at INSERT, not at COMMIT, so it can't be used directly. Instead:
  1. The change-log subscriber buffers its entries during the transaction.
  2. It allocates their sequence numbers in `beforeTransactionCommit`, with `UPDATE sync_school_seq SET seq = seq + n WHERE school_id = $1 RETURNING seq`.
  3. That row lock is held until COMMIT, so per school, the order of sequence numbers is the order of commits.
  4. The lock is taken only at the very end of each transaction, so a long batch job doesn't hold up other writes for the same school.
- Sequence numbers may have gaps (a rolled-back transaction), but never arrive out of order.

### `GET /schools/me/sync/snapshot?collections=a,b&pageToken=&limit=`

The client bootstraps from this endpoint, and again after a 410.

```jsonc
{
  "data": {
    "cursor": "…",                  // feed position taken BEFORE the first page was read; same on every page
    "items": [ { "collection": "students", "id": "…", "version": 7, "data": { /* read shape */ } } ],
    "nextPageToken": "…",           // null on the last page
    "serverTime": "2026-10-29T08:15:00.000Z"
  }
}
```

- `limit` defaults to 500, with a maximum of 1000.
- After the last page, call `/sync/changes?since=<cursor>`.
- **There is no gap**, because the cursor is fixed before any row is read. **Overlap is possible** (a row changed during paging can come from both), and is harmless under the apply rule below.

### `GET /schools/me/sync/changes?since=<cursor>&collections=a,b&limit=`

```jsonc
{
  "data": {
    "changes": [
      { "cursor": "…", "collection": "students", "id": "…", "op": "upsert", "version": 8, "data": { /* read shape */ } },
      { "cursor": "…", "collection": "attendance", "id": "…", "op": "delete", "version": 3, "reason": "deleted" }
    ],
    "nextSince": "…",
    "hasMore": true,
    "serverTime": "2026-10-29T08:15:00.000Z"
  }
}
```

- `limit` defaults to 500, with a maximum of 1000. Changes come in cursor order. Within one response there is at most one entry per `(collection, id)`, the latest.
- `upsert` always carries `data`. `delete` never does.
- **Filtered feed (R8):** with `collections=` set, `nextSince` still moves past every entry the client didn't ask for, including entries from other collections and entries filtered out by scope. A page can hold fewer than `limit` entries, or none at all, with `hasMore: true`.
- **Adding collections later:** when a later phase adds collections, the client snapshots the new ones and keeps reading the rest from its existing cursor.
- **Apply rule:** apply an upsert only when `version` is above the local version. Apply a delete when `version` is at or above the local version. Then store `nextSince`.
- **Delete reasons:**
  - `deleted`: a true delete. Discounts, fee structures, departments and invoice lines get tombstones too, so devices learn about hard deletes.
  - `out_of_scope`: the record still exists but this user can no longer see it, e.g. a pupil moved to a class the teacher doesn't take. Drop the record locally, but **keep sending** its pending ops. The server forwards them to the school review list (§6.2).
- **410 `RESYNC_REQUIRED`** has `reason.cause`:
  - `NO_CURSOR`: `since` is missing.
  - `CURSOR_EXPIRED`: the cursor is older than the change-log retention.
  - `SCOPE_CHANGED`: the user's own scope changed wholesale, e.g. they gained or lost a class assignment or changed role.
  - `reason.collections` names what to re-snapshot. The client re-snapshots those collections only, and keeps its outbox.

### Response headers (R7)

- `X-Server-Time` (ISO) is sent on **every** response to a request that carries `Idempotency-Key`, whatever its status, including the batch-cell 200s and replays. It is also sent on every `/sync/*` response.
- `Idempotent-Replayed: true` is sent on every replay.
- CORS sets `Access-Control-Expose-Headers: Idempotent-Replayed, X-Server-Time, Retry-After`, so the browser lets the frontend read them.

### Scope

The server filters both endpoints by the caller's permissions:
- A class teacher sees their own classes and those classes' rosters, attendance, mark sheets and marks.
- A head or admin sees the whole school.
- No sync data is served to super-admin or platform tokens, or to parents.

## 8. Collections (phase 1)

`data` is **the same shape as the item in the existing GET response** named below, plus `rowVersion`, `updatedBy` and `updatedAt`, all in the §3 wire form. The frontend needs no mappers.

| Collection | `id` | `data` shape |
| --- | --- | --- |
| `academic-years` | year uuid | item of `GET /schools/me/academic-years` |
| `terms` | term uuid | item of `GET /schools/me/academic-years/:yearId/terms` |
| `classes` | class uuid | item of `GET /schools/me/classes` |
| `subjects` | subject uuid | item of `GET /schools/me/subjects` |
| `students` | `schoolStudentId` (the roster `id`) | **list** item of `GET /schools/me/students`: the roster row, not the detail view. It carries both `id` and the global `studentId`. |
| `attendance` | `<schoolStudentId>:<YYYY-MM-DD>`, a natural key so a device can address a cell it created offline | the register entry from `GET /schools/me/attendance/register` (`RegisterEntryDto`, with the new `schoolStudentId`), plus `classId`, `date` and `termId` |
| `mark-sheets` | sheet uuid | item of `GET /schools/me/mark-sheets`, including its items |
| `marks` | `<markSheetId>:<schoolStudentId>` | one entry of `rows` in the `PUT /schools/me/mark-sheets/:id/marks` response, plus `markSheetId`. **Every cell of the row** carries `componentKey` and `itemIndex`. `version` is the sheet `rowVersion` of the write that last changed that row. The PUT response returns only the rows it changed (as today), so in a write response this is the sheet's new `rowVersion` (§5). |

`academic-years` is added to the plan's list because terms are fetched per year. Phase 2 adds `invoices`, `payments`, `fee-accounts` and `guardians` to this table, each with its source GET, before they are built.

## 9. Fields named for later phases

These are fixed now so the outbox can store them from day one.

- **Payments (P2):**
  - The request takes an optional `provisionalRef`: `OFF-<first 4 of deviceId>-<n>`, unique per device.
  - The response, replays and the feed all carry both `provisionalRef` and the server's `receiptNumber`. That pair is the `OFF-… → RCT/…` mapping.
  - `provisionalRef` can be searched on the payments list.
- **Admissions (P2):**
  - `POST /schools/me/students` takes `id`, the new `schoolStudentId`. `studentCode` is allocated at sync under a lock and returned.
  - A likely duplicate (same name, DOB and guardian phone) gives 409 `LIKELY_DUPLICATE` with `reason.candidates: [{id, studentCode, name}]`.
- **Session:**
  - `POST /auth/refresh` and login responses gain `refreshExpiresAt` (ISO), so the day-12 warning doesn't depend on the device clock.
  - This is additive. Until it ships, compute the warning as login time + 14 days, using `serverTime`.

## 10. Configuration and test hooks

These exist so QA can check each rule through the UI without waiting for real time to pass.

| Env var | Default | Effect |
| --- | --- | --- |
| `SYNC_RETENTION_DAYS` | 30 | The `sync_operations` window, the change-log window (the 410 `CURSOR_EXPIRED` point) and the `OP_TOO_OLD` limit. Fractional values such as `0.01` (about 15 min) are allowed outside production. Production requires at least 30. |
| `SYNC_CLAIM_LEASE_SECONDS` | 60 | How long an `in_progress` claim lasts (§4) |
| `SYNC_CLOCK_SKEW_FLAG_MINUTES` | 5 | The skew above which an op is flagged; it is never rejected (§1) |

Dev-only endpoints are mounted only when `NODE_ENV=development`, under the existing `DevModule`. They are left out of Swagger, and listed in the route snapshot like the other dev routes:
- `POST /dev/sync/expire-cursors`: the current cursor becomes the oldest one kept, so any older cursor gets 410 `CURSOR_EXPIRED`.
- `POST /dev/sync/scope-changed` takes `{userId, collections?}`. That user's next pull gets 410 `SCOPE_CHANGED`.
- `POST /dev/sync/expire-claims`: every `in_progress` claim's lease ends now.

## 11. Decisions

| # | Question | Decision |
| --- | --- | --- |
| Q1 | Should a single-record `CONFLICT` apply partially? | No: all-or-nothing (§5). Frontend and QA agree. |
| Q2 | Attendance ids | Natural key `<schoolStudentId>:<date>`. Sync uses `schoolStudentId` everywhere (see Pupil identity at the top). |
| Q3 | Retention | 30 days, configurable (§10). The frontend sends ops to review early at 25 days. |
| Q4 | `marks` granularity | One entry per pupil row, carrying every cell, with a strictly rising `version` (§8). |

## 12. Review log

### Frontend review of v0.1 (staff frontend, 29 Oct 2026)

| Item | Resolution in v0.2 |
| --- | --- |
| R1 clamp future recorded-at, flag skew | Done, with server-side correction through `X-Client-Sent-At` (§1). The client sends raw times. |
| R2 one wire form for equality | Done. The table in §3; the server normalises both sides; contract tests per read shape |
| R3 cell shapes, `updatedBy`/`updatedAt` | Done (§5, §6, §8) |
| R4 drop the attendance same-user exception | Done (§5) |
| R5 versions in batch responses | Done (§5) |
| R6 tombstone version above the last upsert | Confirmed: `rowVersion + 1` (§5) |
| R7 expose headers | Done (§7) |
| R8 a filtered feed still advances | Confirmed (§7) |

Frontend-side notes (no backend change):
- A session that ends on its own keeps the per-user DB, locked until the same user signs in again. Only an explicit sign-out (blocked while ops are pending) or "Discard N changes" deletes it.
- The engine reads response headers through a request variant. The public `api.ts` signatures stay the same.
- The frontend tells the backend when `useMarkSheet.ts` reads `code: 'CONFLICT'`, so `details.rowVersion` can be removed.

### QA review of v0.1 (29 Oct 2026)

| Item | Resolution in v0.2 |
| --- | --- |
| 1 cursor order vs commit order | A per-school sequence row locked at commit (§7). Test: two concurrent writes with a pull between them; nothing is missed. |
| 2 key store atomic with the write | Claim, then complete in the same transaction (§4). Test: abort the response after the commit, retry, and exactly one RCT exists. |
| 3 device clock skew | Never rejected; corrected and flagged. The 30-day limit is measured on the server clock (§1). |
| 4 out-of-scope ops nobody can resolve | Forwarded to the school review list, `sync:review` (§6.2) |
| 5 test config | `SYNC_RETENTION_DAYS` and dev endpoints (§10) |
| 6 headers on every queued write, exposed | Done (§7) |
| 7 same user on two devices | **Changed after the frontend's R4:** the exception is gone, so this is now a normal conflict for review, not a silent overwrite (§5) |
| 8 order of checks | §6.1 |

### QA review of v0.2 (29 Oct 2026)

QA signs off once item 1 is in.

| Item | Resolution in v0.3 |
| --- | --- |
| 1 (blocker) a slow op outliving its lease gets run twice | The claim is fenced by `claim_token`, completed in the business transaction, and rolled back on 0 rows. A heartbeat extends the lease while the handler runs. Side effects outside the database wait until after commit (§4). Test: `SYNC_CLAIM_LEASE_SECONDS=1`, a slow op, `/dev/sync/expire-claims` mid-request, then a retry: exactly one effect commits. |
| 2 duplicate forwarded ops | `sync_rejections` unique on `(school_id, op_key)`; a resend returns the same 403 (§6.2) |
| 3 restore after a tombstone | A restore writes `rowVersion = tombstone version + 1` (§5) |

### Frontend sign-off of v0.3 (staff frontend, 30 Oct 2026)

**Signed off.** R1–R8 are resolved as asked. §6.2 (forwarding 403s to a school review list) matches the user's decision of 29 Oct: ops a teacher can no longer send go to a head or admin. They are not discarded on the device.

Two non-blocking notes, for a later version:
- **Clock changes while offline.** The skew is measured at send time. A device whose clock is corrected (for example by NTP) between the user's action and the send still sends a `recorded_at` that is off by the old error. The attendance `date` and the feed order don't depend on it, so this only affects audit times. If it matters later, the client could also send the skew it last saw against `X-Server-Time` at enqueue time.
- **Marks row `version` wording.** §5 says the sheet `rowVersion` *after the write*. §8 says the sheet `rowVersion` *at the row's last write*. If a PUT response returns untouched rows stamped with the new sheet version, that's harmless, because the data is current. Please align the two sentences so QA tests one rule.

## Change history

| Date | Version | Change |
| --- | --- | --- |
| 2026-10-29 | 0.1 | First draft (backend) |
| 2026-10-29 | 0.2 | Takes in the frontend R1–R8 and QA 1–8 (see §12). Main changes: `schoolStudentId` everywhere; `X-Client-Sent-At` replaces `RECORDED_AT_OUT_OF_RANGE` with skew correction and `OP_TOO_OLD`; commit-ordered cursors; claim-then-complete idempotency; order of checks; school review list for forwarded 403s; wire-form table; conflict cell shapes; per-entry versions; test config and dev endpoints. |
| 2026-10-30 | 0.3 | QA review of v0.2: fenced claims with a heartbeat, and side effects outside the database only after commit (§4); forwarded ops deduped by key (§6.2); restore version above the tombstone (§5). QA signed off. |
| 2026-10-30 | 0.3.1 | Frontend sign-off. The marks row `version` rule is worded the same in §5 and §8, and the clock-change limit is noted in §1. **Agreed.** |
| 2026-10-30 | 0.3.2 | Built with B1. In §6.1 the claim (step 4) comes after the 403 checks (step 3), so the in-progress and 403 codes swap places when both apply; a replay still comes before both. The §10 wording on dev routes is corrected. No change for the client. |
| 2026-10-31 | 0.4 | **Agreed.** §6.2: applying a forwarded op is a client re-send through the normal route with a server-issued `applyOpKey` as the `Idempotency-Key`, keeping the sender's `recorded_at`, followed by an idempotent `POST …/applied`. It replaces the server-side `…/apply`. This takes in both of the staff frontend's conditions. Row shape and list routes given. The re-send carries `X-Base-Version` when the row has one. Edits are allowed and recorded (`appliedBody`, `appliedWithEdits`, QA OFF-6). An apply of a row that is no longer open gets 409 `ALREADY_RESOLVED`, and apply and dismiss are serialised (QA OFF-7). Built in backend c44f008 and 2b376d1. |
