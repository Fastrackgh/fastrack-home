# Offline sync: QA log

QA results for the offline-first staff portal. The plan is in `~/.claude/plans/humming-tumbling-codd.md`, and the contract is [../offline/sync-contract.md](../offline/sync-contract.md). Each phase is tested through the staff UI first. API and DB checks only add to that.

## Contract review

| Version | Date | Result |
| --- | --- | --- |
| v0.1 | 29 Oct 2026 | Found 4 correctness gaps:<br>• a change-feed number given out at insert can be skipped<br>• the idempotency record wasn't saved in the same transaction as the write<br>• device clocks that are wrong would get ops rejected<br>• out-of-scope ops had no owner<br>Plus 4 testability asks. |
| v0.2 | 30 Oct 2026 | 1 blocker: a slow op that outlived its lease could run twice.<br>2 minor: forwarded ops could be stored twice, and a restore after a tombstone could be lost. |
| v0.3 | 30 Oct 2026 | Signed off: fenced `claim_token`, a lease heartbeat, `sync_rejections` unique per key, and a restore version above the tombstone. |

## B1: idempotent queued writes

Backend `f60fc3d` (`feat/offline-sync`), tested on 30 Oct 2026. **Pass**, with one merge-order condition.

**Setup**
- A clean detached backend checkout.
- DB copy `fastrack_qab1`. Migration `1792600002100` was applied there only.
- Its own Redis on port 6391.
- The committed staff frontend `2d116a5` on :3005.
- School QPM-402, as `principal@qpm.test`.

| # | Check | How | Result |
| --- | --- | --- | --- |
| 1 | Backend e2e `test/sync-idempotency.e2e-spec.ts` | jest | 11/11 pass. It needs Redis; without it, setup times out. |
| 2 | Lost response after the server saved, then a retry from the same Record Payment modal | **UI**: `route.fetch()` then `abort('timedout')`, then submit again | The first attempt shows "Payment Failed: Can't reach Fastrack". The retry gets 201 with `Idempotent-Replayed: true` and shows "Payment Recorded Successfully, Receipt RCT/QPM-402/2026/0021", the original receipt. The DB has 1 payment for the key, and INV/QPM-402/2026/0008 went 400 → 399 once. |
| 3 | The browser can read the new headers | **UI** (in-page `fetch`) | `Idempotent-Replayed` and `X-Server-Time` are readable. `Access-Control-Expose-Headers: Idempotent-Replayed,X-Server-Time,Retry-After`. |
| 4 | Same key, different amount | API | 409 `IDEMPOTENCY_MISMATCH` |
| 5 | Device clock 2 h fast | API | 201. `clock_skew_ms` 7,199,960 and flagged. `recorded_at` = received − 60 s. |
| 6 | Recorded time in the future on a correct clock | API | 201, and `recorded_at` is clamped to `received_at` |
| 7 | Op recorded 40 days ago | API | 422 `OP_TOO_OLD`. No payment, and the key is freed. |
| 8 | Malformed `X-Device-Id` | API | 400 `VALIDATION_FAILED` |
| 9 | 5 identical requests in parallel | API | One 201 and four 409 `IDEMPOTENCY_IN_PROGRESS` with `Retry-After: 2`. 1 payment. |
| 10 | No key (the online path) | API | 201, as before. INV 0008 ends at 395.00 after exactly 5 payments. |
| 11 | Fenced takeover of a slow op | e2e, then live | The save is made slow by holding a `FOR UPDATE` lock on the pupil's `student_fee_accounts` row from psql. Mid-save, `/dev/sync/expire-claims` expires the claim, and a retry takes it over (claim token 11640b68 → 3b104918). The first attempt rolls back with 409 `IDEMPOTENCY_IN_PROGRESS`, and the retry commits RCT/QPM-402/2026/0029. 1 payment; the balance went 391 → 388 once. A later resend replays 0029. |

**Merge-order condition**
- The committed frontend (`2d116a5`) treats every 409 as "Already recorded" and forgets the payment's key.
- B1 can now return 409 `IDEMPOTENCY_IN_PROGRESS` while a first attempt is still saving (row 9).
- On that frontend, a re-entered cash payment could then be recorded twice.
- Fixed by staff frontend `9fed7ce` (below). B1 must reach main together with `9fed7ce` or after it.

### Staff frontend 9fed7ce: waiting out a payment that is still saving

Re-tested on 30 Oct 2026 against B1 `f60fc3d`, **through the UI**. **Pass.** The save was made slow with the same fee-account row lock as row 11. The first submit's answer was dropped after 1 s, while the server kept saving.

| Case | What the cashier sees | Requests | DB |
| --- | --- | --- | --- |
| A. The save takes a few seconds. Resubmit during it. | "Payment Failed: Can't reach Fastrack", then after the resubmit "Payment Recorded Successfully, Receipt RCT/QPM-402/2026/0027" and the receipt window | Several 409 `IDEMPOTENCY_IN_PROGRESS`, then 201 with `Idempotent-Replayed: true` (0027) | 1 payment, GHS 1 |
| B. The save outlasts the 4 tries (lock held 25 s). Resubmit during it, then again after it finishes. | "Still saving: This payment is still being saved. Check Payments in a moment before trying again". The modal stays open with the same details. The later resubmit shows "Payment Recorded Successfully, Receipt RCT/QPM-402/2026/0028". | Four 409 `IDEMPOTENCY_IN_PROGRESS` 2 s apart, then 201 replayed (0028) | 1 payment, GHS 2. INV 0008 went 393 → 391. |

Five parallel sends can't be made from the modal: the button is disabled while saving. They were covered by the API in row 9.
