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

## Phase 1, part 1: saved reads, per-user store and the status chip

Staff frontend `eac0cb0`, tested on 30 Oct 2026 **through the UI**. **Pass** for everything this commit covers.

**Setup**
- Frontend at `eac0cb0` from a clean checkout on :3005. Backend is B1 `f60fc3d` on DB `fastrack_qab1`.
- BIS-001: principal@bis.test and teacher yaw.darko@bis.test.
- QPM-402 for the mark sheet, since BIS-001 has no results module.
- "API unreachable" means every request to the API host is aborted, while the app's own pages still load. This is the case the commit handles. Reloading the page with the device offline needs the service worker (F2) and isn't covered here.

| # | Check | Result |
| --- | --- | --- |
| 1 | Online: open Students, Fees & Billing, Attendance (BIS) and a Primary 1 Mathematics mark sheet (QPM) | No chip. `fastrack-<principalId>` holds one saved read per endpoint (18 after the visits). |
| 2 | API unreachable, in-app links only | Each screen shows the same content as online, with "Offline · data from this minute" in the header. The mark sheet shows the saved sheet. |
| 3 | A screen never opened online (School calendar) | Its usual error: "Unable to load the calendar · Can't reach Fastrack right now…". |
| 4 | API back | The chip stays until the next request, then hides. |
| 5 | Explicit sign-out | `fastrack-<principalId>` is deleted, and the registry `fastrack_offline_users` is `[]`. |
| 6 | The session ends by itself (bad access and refresh tokens) | Redirected to login, and the database is kept (11 reads before and after). |
| 7 | The teacher signs in on the same tab, no reload, then the API goes away | The teacher gets their own database. **No new keys were written to the principal's database.** The teacher's offline Attendance shows "Something went wrong · Can't reach Fastrack", not the principal's saved registers. |
| 8 | Super admin and parent sessions | No `fastrack-*` database is opened. |
| 9 | Typing a mark on the saved sheet while the API is unreachable | The status shows "Unsaved changes", plus the toast "Marks not saved · Can't reach Fastrack". It's honest, not silently "saved". The mark is held in memory only until phase 2 (outbox). |

**Note for F2**
- With the browser fully offline (`setOffline`), an in-app link to a screen whose code isn't loaded yet turns into a full page load and shows Chrome's offline page. Next.js has to fetch that screen's code from its server first.
- So with no service worker, offline navigation depends on what the browser already has.
- The F2 re-test will use a production build in a separate checkout, with the device fully offline, covering both reload and navigation.

## F2: staff service worker

Staff frontend `0bb1d29` (docs `3d9e36d`), tested on 30 Oct 2026 **through the UI**, with a production build in a separate checkout. **Pass**, with one open finding (OFF-1).

**Setup**
- `next build` + `next start` on :3005, against B1 on `fastrack_qab1`, as principal@bis.test.
- For the offline steps, the frontend and API servers were **killed**, not only `setOffline`. A Chromium `setOffline` doesn't cut the service worker's own fetches.

| # | Check | Result |
| --- | --- | --- |
| 1 | Precache after sign-in | One registration, scope `/school-admin`. 43 pages saved (every staff page, the sheet and class-report sub-pages, every dashboard area, sign-in, offline), 88 static files and 4 assets. |
| 2 | Reload Attendance with both servers down | Loads with the saved register (KG 2, Fri 30 Oct) and "Offline · data from this minute". "Save register" is disabled. |
| 3 | In-app link to Staff, whose code was never loaded | Loads from the cache and shows its own "Unable to load staff · Can't reach Fastrack" (no saved read). |
| 4 | In-app link to Students, visited online | The saved list of 12 pupils with the chip |
| 5 | Address bar: Fees (never visited), a mark sheet with a query, and the dashboard | All three pages load. Fees shows "Could not load academic terms" (nothing saved), and the sheet and dashboard render. |
| 6 | Unknown path `/school-admin/nope` | "You are offline · This page has not been saved on this device yet…", with Try again and Go to overview |
| 7 | New tab on `/school-admin/students` while offline | Full saved list, signed in, with the chip "data from 1 minute ago" |
| 8 | Parent app unaffected | A clean profile on `/parent` is controlled by `parent-sw.js` only. With both installed: `/school-admin` → `school-sw.js`, `/parent` → `parent-sw.js`, and separate `school-*` / `parent-*` caches. A signed-in staff user opening `/parent/login` is redirected to the staff dashboard; that redirect is expected. |
| 9 | Update prompt after `school-sw.js` changes | The new worker waits, and the page shows "Update available · A new version of Fastrack is ready · Reload". Reload reloads onto the new worker. |

**OFF-1 (Medium, open; owner: staff frontend): screens saved up front stay on the old release after a deploy**

`PRECACHE_PAGES` skips pages already in `school-pages-v1`. A release that changes app code but not `school-sw.js` therefore leaves every screen the user doesn't visit on the previous release.

Reproduction:
1. Install release 1 and let the precache run.
2. Deploy release 2, which changes only the Staff page subtitle.
3. Online, open Students only, and wait 15 s for the page list to be posted again.
4. Kill both servers and click Staff.

Result: the subtitle is release 1's. The saved `/school-admin/staff` HTML still names release 1's scripts, which are still in `school-static-v1`.

Why it matters: offline, unvisited screens run old code against newer saved data. Once phase 2 adds the outbox, an old screen could queue writes in an outdated payload shape.

Suggested fix: post the build ID with the page list. The worker records it, and re-saves every page when it changes, then drops static files no saved page names.

### OFF-1 fix 575f870: pages saved again on each new release

Tested on 30 Oct 2026 **through the UI**, with production builds in a separate checkout and one persistent browser profile. Each release changed only the Staff subtitle; `school-sw.js` didn't change between releases. **OFF-1: fixed.** One new finding: OFF-2.

| Release | Online | Saved state | Offline (both servers killed) |
| --- | --- | --- | --- |
| 1 (`mvv9kocy`) | Sign in | 43 pages, `school-static-v1-mvv9kocy` (88), saved build `mvv9kocy` | not run |
| 2 (`mvv9m9k2`) | Open Students | Saved build `mvv9m9k2`. **Only** `school-static-v1-mvv9m9k2` (92) is left; release 1's cache was deleted. | Staff shows **RELEASE-2**. Staff, Students, Fees, Attendance, Calendar, Setup, Dashboard and Account all render. |
| 3 (`mvv9o640`) | Open Students | The whole re-save finished in under 2.5 s. Saved build `mvv9o640`, one static cache (87). | Staff shows **RELEASE-3**, and every screen renders |

### OFF-2 (Medium, fixed in 4d1ad08; owner: staff frontend): a new release's page can be saved without its code, so the screen is blank offline

**What happens**
- Both `networkFirstPage` (any online visit) and `savePage` (the re-save) write the page's HTML into `school-pages-v1` **before** that release's scripts are in a static cache.
- If the scripts then fail to download, the saved page names files the device doesn't have. The previous release's working copy is already overwritten.
- Offline, the screen shows an endless spinner.

**Reproduced twice through the UI** (release 3 to release 3, and release 3 to release 4):
1. After a deploy, open Students online while the static downloads fail. In the test, every `/_next/static` request made by the worker is aborted, which is a flaky connection after the HTML has arrived.
2. The HTML is saved, but no scripts. The re-save never starts, because the page doesn't hydrate, so the saved build stays on the previous release. That part is correct.
3. Kill both servers and open Students: an endless spinner (`shots-off1/r4-offline-students.png`). Every other screen still renders on the previous release.

**The re-save path** has the same order: `pages.put(...)`, then the static `add`s. A drop between the two would break that page the same way. I couldn't time that live, because locally the whole re-save takes under 2.5 s.

**Suggested fix**
- In `savePage`, save the static files first, and `put` the page only when all of them are cached.
- In `networkFirstPage`, don't overwrite a saved page with HTML whose static files aren't all cached. Either check before the `put`, or leave saving new-release pages to the re-save.

### OFF-2 fix 4d1ad08: a page is kept only once all its files are on the device

Tested on 30 Oct 2026 **through the UI**, with production builds in a separate checkout and one persistent profile. Release 2 changed only the Students subtitle. The integrity check: for every saved page, every `/_next/static` file its HTML names must be in a cache. **OFF-2: fixed.**

| Step | Saved state | Offline (both servers killed) |
| --- | --- | --- |
| Release 1 (`mvva26w7`), sign in | 43 pages. One static cache (88). Integrity: 0 of 1,924 files missing. | not run |
| Release 2 (`mvva32z1`), open Students online with every worker `/_next/static` download aborted | Nothing replaced: still release 1, 88 files, 0 of 1,924 missing | **Students renders** on release 1, with no spinner. All 9 screens render. |
| Release 2, normal visit | Saved build `mvva32z1`, only `school-static-v1-mvva32z1` left, 0 of 1,924 missing | Students shows **RELEASE-2**, and all 9 screens render |

## Phase 2 groundwork: outbox, sync engine and the guarded sign-out (dc1c020, docs 8b95589)

Tested on 30 Oct 2026 **through the UI** with `next dev` in a separate checkout (8b95589), against backend `feat/offline-sync` f60fc3d on a copy of the dev DB (`fastrack_qab1`), as principal@qpm.test and teacher@qpm.test. No screen queues writes yet, so ops (cash payments for one QPM-402 pupil) were queued from the console with `window.__fastrackSync.enqueueWrite`. The chip, the guard and sign-in were checked on screen, and the server side in `sync_operations` and `fees_payments`. Outages were simulated by aborting every request to the API. `pnpm test:sync` passes (every row of the §6 table). **Result: pass, with one Low finding (OFF-3) and one merge-order condition.**

| # | Case | Result |
| --- | --- | --- |
| 1 | Online send | Sent once with `Idempotency-Key`, `X-Client-Recorded-At`, `X-Client-Sent-At` and `X-Device-Id`. The server row is `completed 201` and records the device and the recorded time. The chip stays hidden. |
| 2 | API unreachable | The chip reads **"Offline · 1 waiting"**, including after a page reload. Two tries were made while blocked. Once the API was back, the op was sent once (`completed 201`). Across retries the key and recorded time stayed the same, and only `X-Client-Sent-At` changed. |
| 3 | Answer lost after the server saved | The retry got 201 with `Idempotent-Replayed: true`. One payment. |
| 3b | Answer lost **while the server is still saving** (row lock held 45 s) | 8 × `409 IDEMPOTENCY_IN_PROGRESS`, `Retry-After: 2`, retried every ~2.1 s. Then a 201 replay. One payment. The chip went from "1 waiting" to hidden. |
| 4 | Sign-out with a waiting change, offline | The guard reads "1 change hasn't been sent yet. Signing out deletes it from this device. You're offline. Stay signed in and it'll be sent when the connection is back." The choices are **Stay signed in**, **Sync now** and **Discard 1 change and sign out**. Stay keeps the session. After the API came back, **Sync now** sent the change and the guard switched to "All your changes have been sent." |
| 5 | 400 (invalid payment method) | Went to review once and was not resent through a 30 s poll and a reload. The chip reads **"1 need review"** in red. |
| 6 | Two tabs | An op queued in tab B, offline, was counted in tab A. It was sent once and both tabs went to 0. |
| 7 | Session ended by itself with a change waiting (tokens made invalid, then the API returned) | The send got a 401, the refresh was refused and the app went to the sign-in page. The database was **kept**. After the same user signed in, the op was sent (201). One payment. |
| 8 | Teacher's payment (403) | Counted as forwarded, not as review. The chip stays hidden. |
| 9 | Discard with two tabs open | The guard reads "1 change needs review…" with Stay signed in and **Discard 1 change and sign out**. After discarding, the user's database is deleted and the other tab is also on the sign-in page. A teacher signing in next on that browser has nothing waiting or in review. |
| – | Payments | Exactly 6 for the 6 valid ops (cases 1, 2, 3, 4, 6, 7), plus 2 in the lost-answer runs (3 and 3b). |

### OFF-3 (Low, fixed in 0637a5d; owner: staff frontend): after a send gets no answer, the retry waits for the 30 s poll, not its backoff

**What happens**
- When a send gets no answer (status 0, or 502–504), `drain` returns as soon as `handle` gives `false`.
- It never reaches `scheduleAt`, so no timer is set for the op's `nextAttemptAt` (about 1–2 s on the first try).
- The retry waits for the next trigger: the 30 s poll, focus, `online`, or another request reaching the API.
- In case 3b, with an idle page, the answer was dropped at :53.5 and the retry went at :22.4, **29 s later**. The chip read "Offline · 1 waiting" for that whole time, although the API was answering.
- `staff-offline.md` lists "when a backing-off op is due" as a trigger.

**Impact.** Nothing is lost or doubled. On a flaky school connection, each dropped answer can add up to 30 s before the change lands, and the chip shows "Offline" while it waits.

**Suggested fix.** Set the timer on the offline path too. For example, call `this.scheduleAt(await outbox.all(this.db))` before returning `false`, so the backoff decides when the next try happens.

### Merge-order condition (handled in 0637a5d, cleared by backend 5fa1c04): 403 → forwarded needs the backend's §6.2 store

- At f60fc3d the server **does not keep** a 403'd op: no `sync_operations` row (count 0) and no `sync_rejections` yet.
- On the device it becomes a `forwarded` item. Forwarded items appear nowhere on screen: not in the chip, and the review tray isn't built yet. They are not counted by the sign-out guard either.
- In case 8 the teacher signed out with no guard, and the item was deleted with the database. That change now exists nowhere.
- No screen queues writes yet, so this doesn't affect users today. A screen that queues writes (attendance, marks) must not ship before the backend stores 403'd ops for heads and admins (§6.2). Until then, the frontend should treat a 403 as review.

### Re-test of 0637a5d (docs 55c3713): OFF-3 fixed, 403 handled

Tested on 30 Oct 2026 **through the UI**, with the same setup as above at 55c3713. The page was left idle: no focus or `online` events. `pnpm test:sync` passes. **OFF-3: fixed. The merge-order condition is handled on the frontend.**

| Case | Result |
| --- | --- |
| Answer dropped after the server saved | Retried **2.0 s** later (it was 29 s before the fix). 201 with `Idempotent-Replayed: true`. One payment. |
| API unreachable for 7 s, then back | Tries at 0, 1.4, 4.9 and 13.0 s, following the growing backoff with no wait for the poll. Sent once at the first try after the API was back. One payment. |
| Teacher's payment, a 403 with no `reason.forwardedTo` (f60fc3d) | Goes to **review as rejected**, not forwarded. The chip reads **"1 need review"**. Not resent through a 30 s poll and a reload. Sign-out is guarded ("1 change needs review… Discard 1 change and sign out"), and **Stay signed in** keeps it. |

- A 403 becomes forwarded only once backend §6.2 returns `reason.forwardedTo`. Re-test this when §6.2 lands.

## Needs review tray (2cd84a6, docs efa5e8d)

Tested on 30 Oct 2026 **through the UI** with `next dev` at efa5e8d, against f60fc3d on `fastrack_qab1`, as principal@qpm.test. The 400 is real. The backend can't produce a 409 `CONFLICT`, a cell conflict or a forwarded 403 yet (B2, §6.2), so those were answered by `page.route` on test paths. "Keep mine" used a test resolver registered from the console. **Result: 16 of 17 pass. One finding: OFF-4.**

| # | Case | Result |
| --- | --- | --- |
| 1 | Real 400 payment | The chip opens the drawer. The card shows the label, **Not accepted**, "Made this minute", the server's message ("paymentMethod must be one of…") and **Discard my change**. There's no Send again, since payments have no resolver. Discarding shows "Nothing to review. Every change you made has been applied." and hides the chip. It stays gone after a reload. |
| 2 | 409 `CONFLICT` on `firstName` (lastName also sent, unchanged) | The chip reads "1 need review" in red. The card shows **Changed by someone else** and "changed by Mrs A. Mensah", and the **Now / Yours** table has only **First name: Ama / Amma**. **Keep mine** sent a **new key** with `X-Base-Version: 5` (the server's) and `from: "Ama"`. The tray cleared. |
| 3 | Batch-cell conflict (status differs, remark equal) | Only **Status: absent / present** is shown, with "changed by Mr K. Owusu". **Keep theirs** is the only button (no resolver). It cleared. |
| 4 | Forwarded 403 (`reason.forwardedTo`) | The chip reads **"1 sent to head teacher"**. The card is under its own heading ("…passed to the head teacher or an admin…") with **OK**. After OK, the chip hides. |
| 5 | Two tabs, both trays open on one conflict, **Keep mine** in both | **Fail: sent twice, with two different keys.** See OFF-4. |
| 5b | Tab B's tray is open when tab A clicks Keep theirs | B's tray updates to "Nothing to review". |
| 5c | Double-click **Keep mine** in one tab (3 runs) | Sent once each time. |
| 6 | Phone (390 px) | The drawer is full width (390 px) with no sideways scroll, and a long label wraps. |

### OFF-4 (Low, fixed in 4a9b791; owner: staff frontend): Keep mine in two tabs queues the change twice

**What happens**
- `resend(id)` reads the item, queues the resolver's op (`outbox.enqueue`) and then removes the item, in three separate IndexedDB transactions.
- If two tabs act on the same item at about the same time, both read it before either removes it.
- Both queue a new op with its own new key, so the server's idempotency can't merge them.
- **Reproduced:** two tabs of the same user, both trays open, Keep mine pressed in both, gave two `/resolved` requests with keys `79c63e3d…` and `9f62ecc5…`.

**Impact**
- A field change or an attendance cell sent twice is harmless: the second one conflicts or applies the same value.
- A resolver for "Send again" on a **payment** or an admission would record it twice.
- No real collection has a resolver yet.

**Suggested fix.** Make resend one IndexedDB transaction over `conflicts`, `outbox` and `meta`:
1. Get the item, and stop if it's gone.
2. Allocate the `seq`.
3. Put the new op.
4. Delete the item.

IndexedDB runs overlapping read-write transactions one at a time across tabs, so the second tab finds the item gone and queues nothing. The same applies to `dismiss`, which is harmless today.

**Note (not a finding):** until §6.2, a teacher's 403 is a rejected item whose message is the raw "Forbidden resource". Something like "You don't have access to this any more" would read better for staff.

### Re-test of 4a9b791 (docs 799771b): OFF-4 fixed, plain wording for a refused 403

Tested on 30 Oct 2026 **through the UI** with the same setup at 799771b. The tray suite ran again in full. `pnpm test:sync` passes. **Result: 20 of 20 pass. OFF-4 is fixed.**

- **Two tabs, Keep mine in both:**
  - With Playwright clicks, sent once.
  - With both pages' DOM `click()` armed for the same instant, sent once in each of **5 runs**, and both tabs settled at 0 waiting and 0 in review.
  - Before the fix, the Playwright-click version already sent it twice.
- **Real teacher 403** (f60fc3d, no `forwardedTo`): the card reads "You no longer have permission to make this change, so it wasn't saved. Ask the head teacher or an admin if it's still needed." "Forbidden resource" no longer appears.
- **Regression:** no change in cases 1 to 6 (rejected, field conflict and Keep mine with a new key, cell conflict, forwarded, other tab's tray, phone width).

## Session-expiry warning (2690b96, docs 71860b6)

Tested on 30 Oct 2026 **through the UI** with `next dev` at 71860b6, against backend 9ecbbf7 on `fastrack_qab1`, as principal@qpm.test. The browser time zone was Africa/Accra. As agreed, I set `fastrack_session_expires_at` by hand to stand in for day 12. **Result: the warning works as designed with a correct device clock. Finding OFF-5 (Medium): a device clock that is ahead causes a refresh storm.**

| # | Case | Result |
| --- | --- | --- |
| A | Sign in | 14.000 days stored, matching the server's `refreshExpiresAt` to within 5 s. No banner. |
| B | Online, 1 day left, two tabs reloaded together | Renewed to 14 days with a new refresh token and no banner in either tab. **One** `/auth/refresh` call. |
| C | Offline, 1 day left, 1 change waiting | Yellow banner: "Connect to the internet by **Sat 31 Oct, 22:45** to stay signed in. After that you'll need to sign in again before the 1 change saved on this device can be sent. They're kept until you do." The deadline matches the stored time. The banner is also on Fees. |
| D | Offline, time passed | Red banner: "Your sign-in has ended. Connect and sign in again to send the 1 change saved on this device." |
| E | Yellow, then the connection returns (no reload) | The change was sent, the session renewed to 14 days, and the banner went away by itself. |
| F | Sign out | `fastrack_session_expires_at` is removed. |
| G | Device clock **365 days ahead**, online, nothing queued | **Fail: 2,315 `/auth/refresh` calls in 20 s.** In `refresh_tokens`, **2,321 rows** were created in those few minutes. A red "Your sign-in has ended" banner showed while the user was signed in and online. See OFF-5. |

### OFF-5 (Medium, fixed in 8ccd927 + backend 5fa1c04; owner: staff frontend, with backend 9ecbbf7): a device clock that is ahead makes the app renew the session in a loop

**What happens**
- At 9ecbbf7, `/auth/login` and `/auth/refresh` don't send `X-Server-Time`, so before any queued write `serverOffsetMs` is 0.
- `refreshExpiresAt` is stored as the server's time, unchanged. Device time is then more than 12 days ahead of it, so `near` is true straight after sign-in.
- Online, `SessionExpiryWarning` renews. The renewal returns a new `refreshExpiresAt`, which is a new value. The `renewing` guard is per expiry value, so the effect renews again, and again: about 115 refreshes a second for as long as the page is open.
- Each refresh rotates the token and writes a `refresh_tokens` row.
- Meanwhile the banner tells a signed-in, online user that their sign-in has ended.

**Who it hits.** Any staff device whose clock is more than 12 days ahead. A wrong year, or a reset RTC, are common on school machines. One such device keeps hammering the auth endpoint and the token table.

**Suggested fix (both parts)**
- **Backend:** send `X-Server-Time` on `/auth/login` and `/auth/refresh` (already requested). Then the stored expiry is right on any device clock.
- **Frontend, regardless of the backend:**
  - Limit automatic renewal to once per window, e.g. one attempt per 10 minutes, kept in `localStorage` so it holds across tabs and reloads.
  - Don't renew again if the last renewal didn't move the expiry out of the warning window.
  - Don't show "Your sign-in has ended" while the API is accepting the session.

### Re-test of 8ccd927 (docs 67b82e3): OFF-5 fixed

Tested on 30 Oct 2026 **through the UI** at 67b82e3. I ran the same 9 checks twice: once with `X-Server-Time` stripped from every API answer, which proves the frontend half alone, and once against the real backend 5fa1c04/c44f008. **Both runs: 9 of 9. OFF-5: fixed.**

| Case | Server time stripped | Real backend |
| --- | --- | --- |
| G: clock 365 days ahead, online, nothing queued, 26 s plus two reloads | **1** `/auth/refresh` call, no banner | **0** calls. Stored expiry reads 14.000 days on the device clock. No banner. |
| A–F (sign-in, two-tab renewal, yellow and red offline banners, renew on return, sign-out) | Pass | Pass |

- **The 10-minute limit works as intended.** In one run, case E (renew when the connection returns) didn't renew, because case B had renewed 2 minutes earlier. That only happened because I set the expiry by hand. A real expiry can't be 1 day away minutes after a renewal. The test now clears `fastrack_session_renewed_at` before E.
- **Observation, not a finding.** In 2 of 8 two-tab runs (`next dev`), one tab sent `/auth/refresh` twice, about a second apart, with the **same** refresh token. The backend accepts a reused refresh token (checked: reusing a rotated token gives 200), so the only effect was one extra `refresh_tokens` row. It didn't reproduce in 4 traced runs or the final 2 suites. This matters only if the backend later adds reuse detection.

## §6.2 school review list (backend 5fa1c04, then c44f008)

Tested on 30 Oct 2026, with the teacher's side **through the UI** (staff frontend 71860b6) against 5fa1c04, then c44f008. The migrations 1792600002200, 2300 and 2400 ran on `fastrack_qab1`. There's no head screen yet, so the head's side went through the API. **Result: 13 of 14, and the one failure was my script's (see below). One finding: OFF-6.** The merge-order condition on the 403 path is **cleared**.

| Case | Result |
| --- | --- |
| Teacher's queued payment | A real `403 FORBIDDEN` with `reason.forwardedTo: "school-review"`. The device counts it as forwarded (review 0). The chip reads "1 sent to head teacher", and the tray lists it under that heading. One `sync_rejections` row (`open`). |
| Same key resent / no key | Resent: 403 again, still one row. With no key: not stored. The teacher can't read the list (403). |
| Head lists it | `sentBy` "Tete Qpm", `code`, `message`, `path`, `body` and (c44f008) `applyOpKey`. |
| `/applied` too early or with a wrong key | 422 "That change hasn't been saved yet. Re-send it first…" for the first, and 422 for the second. |
| Head re-sends with `applyOpKey` | 201 and one payment. The head's `sync_operations.recorded_at` equals the teacher's original time. With a stable `X-Client-Recorded-At`, a retry replays (`Idempotent-Replayed: true`) both before and after "applied". A different body gives `IDEMPOTENCY_MISMATCH`. |
| Mark applied, twice | 200, `resolvedBy` "Ofori Retest". The repeat is 200 (c44f008). |
| Dismiss with a note | `dismissed`, note "Not needed". |
| Teacher signs out with only forwarded items | Not blocked. The server now holds them. |
| `X-Server-Time` | Sent on login, refresh, and a refused refresh (401). |

- **My script's failure:** its first "retry" changed `X-Client-Recorded-At` between sends. That header is part of the request hash, so the server rightly answered `IDEMPOTENCY_MISMATCH`. The sync engine keeps it fixed per op. Re-checked by hand with it fixed: the retry replays.

### OFF-6 (Low, resolved by contract v0.4 29ae61b, backend 2b376d1 and screen 5eaa421; owner: backend): the apply key isn't tied to the forwarded request

**What happens**
- At c44f008 any request sent with a row's `applyOpKey` takes the teacher's original `recorded_at`. `/applied` then accepts the row once any op with that key has completed.
- Nothing checks that the request is the one that was forwarded: the method, path and body against the row's `request_hash`.

**Reproduced.** The teacher's forwarded change was a **GHS 5 cash** payment. The head sent a **GHS 50 MoMo** payment with that row's `applyOpKey`:
- It was accepted (201).
- Its `recorded_at` was set to the **teacher's** time, earlier than when it was made.
- `/applied` marked the teacher's row **applied**.

**Impact**
- The review list says the teacher's change was applied when a different one was recorded.
- That other write is backdated to the teacher's time.
- Heads are trusted to make edits, so this is about a buggy client or a mistaken re-send, not an attack. Still, the audit record is wrong.

**Suggested fix.** In `clockFor` (or before claiming the key), when the key is an open row's `applyOpKey`, require the request's hash to equal the row's `request_hash`. Otherwise answer 409 `IDEMPOTENCY_MISMATCH` and change nothing. Since the head re-sends the stored request, that hash should match.

## The head's "Changes to review" screen (afb038b, docs 8fe0171)

Tested on 30 Oct 2026 **through the UI** with `next dev` at 8fe0171, against backend c44f008 on `fastrack_qab1`. A teacher (teacher@qpm.test) forwarded six cash payments with keyed requests, and the head (principal@qpm.test) worked them on screen. **Result: 6 of 8 cases pass. Two findings: OFF-7 (backend) and OFF-8 (staff frontend).**

| # | Case | Result |
| --- | --- | --- |
| 0 | Teacher | No "Changes to review" link, and the direct URL lands on the dashboard |
| 1 | Card | "Fee payment of GHS 1.81 · Cash", "Tete Qpm · made 30 Oct 2026, 23:09", "Their role no longer allows this", and the pupil as "Yaa RetestP2 · QPM-402/STD/2026/003" (no id) |
| 2 | Apply | "Change applied … is now saved". One payment. Under Applied: "Applied by Ofori Retest · 23:10". |
| 3 | Edit | Invalid JSON gives "The edited change isn't valid…". Editing 1.82 to 1.87 records **one** payment of 1.87 and none of 1.82. |
| 4 | Dismiss with a note | Under Dismissed: "Dismissed by Ofori Retest · … · "Paid at the bank instead"". No payment. |
| 5a | **Stale card: tab A applies, then tab B edits the same change (1.84 to 1.88) and applies** | **Fail (OFF-8).** B's re-send got `409 IDEMPOTENCY_MISMATCH`. The screen treated that as applied, called `/applied` (200), and the card moved off the list as if done. **The edit was never saved**, only A's 1.84, and B wasn't told. |
| 5b | **Stale card: tab A dismisses, then tab B applies the same change** | **Fail (OFF-7).** The payment of 1.85 **was recorded**. The row stays `dismissed`, and B's card shows only "This change has already been resolved". |
| 6 | Phone (390 px) | No sideways scroll |

### OFF-7 (Medium, fixed in backend 2b376d1 + screen 5eaa421; owner: backend): a dismissed change can still be written with its apply key

**What happens**
- At c44f008 the idempotency interceptor accepts a request carrying a row's `applyOpKey` whatever the row's status.
- For a dismissed row, `findOpenByApplyKey` finds nothing, so the request is treated as an ordinary op and saved.
- `/applied` then answers 409 "already resolved", but by then the write has happened.

**Repro.** Two heads (or two tabs) have the same change open. One dismisses it ("not needed"), and the other, from a stale card, presses Apply. A payment of GHS 1.85 was created against a dismissed row. The money is booked while the review list says it was dismissed.

**Suggested fix.** When a request's key is any row's `applyOpKey`, refuse it unless that row is `open`: 409 with a code such as `ALREADY_RESOLVED`, the row's status and who resolved it, and no write. A replay of an op that already completed with that key can still return its stored response.

### OFF-8 (Medium, fixed in c885507; owner: staff frontend): "Apply edited change" on a stale card reports success when the edit was refused

**What happens**
- `syncReviewApi.apply` treats `IDEMPOTENCY_MISMATCH` as "already applied" and goes on to `/applied`. That answers 200 for a key that's already applied.
- When the head **edited** the change, a mismatch means the server holds a different request under that key, and the edit was not saved. The screen still moves the card off the list as applied.

**Repro.** Case 5a above: the edit to 1.88 was refused, only 1.84 exists, and the head who edited got no message.

**Suggested fix.** On `IDEMPOTENCY_MISMATCH`, re-read the row and stop calling `/applied` on its behalf.
- If the row is `applied`, show "Already applied by <name> at <time> with the original values; your edit wasn't saved."
- If it's `open`, show the mismatch as an error.
- With no edit, a mismatch after one's own lost answer can stay "applied".

### Design note for OFF-6, the edit flow and v0.4

- OFF-6 asked the backend to bind `applyOpKey` to the forwarded request's hash.
- The new **Edit** flow deliberately sends a different body under that key, and the edited 1.87 in case 3 depends on it. Binding to the original hash would break Edit.
- So the contract needs to say which is allowed: edits under `applyOpKey` (the key is then bound to the first request made with it, as now), or a separate route for an edited apply.
- Either way, OFF-6's real risk (a backdated, unrelated write marking the row applied) needs the server to record what was actually applied. For example, `/applied` could store the applied op's body or hash, so the review list shows "applied with changes".

### Re-test of c885507 (docs ba50f58): OFF-8 fixed, OFF-7 narrowed on the screen

Tested on 30 Oct 2026 **through the UI** at ba50f58, against c44f008. **OFF-8: fixed. OFF-7: the screen no longer sends a stale apply; the server fix is still needed for true races. New Low finding: OFF-9.**

| Case | Result |
| --- | --- |
| 5a: A applies 1.54, then B edits a stale card to 1.58 and applies | B **sends nothing** (it re-reads the row first). B's card shows "Already applied by Ofori Retest on 30 Oct, 23:17 with the original values, so your edit wasn't saved." One 1.54, no 1.58. |
| 5b: A dismisses 1.45, then B applies a stale card | Not sent and **no payment**. B's card shows "Dismissed by Ofori Retest on 30 Oct, 23:16, so it wasn't applied." |
| 7: Apply with the answer to the re-send lost, then edit 1.46 to 1.49 and apply | The first try shows "Can't reach Fastrack right now…". The edit is refused with "This change was already saved with its original values, so your edit wasn't saved. Apply it without edits to mark it done." The row stays open, with one 1.46 and no 1.49. A plain **Apply** then marks it applied, and there's still one payment. |
| Cases 0–4 and 6 | No change: pass |

- OFF-7 is still open on the backend. A dismiss and an apply at the same instant can both pass the screen's re-read.

### OFF-9 (Low, fixed in 5384aa7; owner: staff frontend): the first "Apply edited change" click can miss after typing compact JSON

**What happens**
- The edit box is a `JsonInput` with `formatOnBlur`.
- If the head types or pastes the change on one line, pressing **Apply edited change** blurs the box first. It reformats to several lines and grows, so the button moves down before the click lands.
- Nothing happens: no request, no message, and the card stays in edit mode. A second click works.
- Seen in the full suite's case 5a (compact JSON, clicked straight after typing). Case 3 (already formatted JSON) is unaffected.

**Suggested fix.** Format on the button's press rather than on blur. Alternatively, keep the buttons from moving: place them above the box, or give the box a fixed height with scrolling.

### Re-test of 5384aa7: OFF-9 fixed

Tested on 30 Oct 2026 **through the UI** at 5384aa7, against c44f008. I ran the full "Changes to review" suite with **compact one-line JSON** typed and "Apply edited change" clicked once, straight away. That was in case 3 (1.22 to 1.27) and case 5a. **Result: 10 of 10. OFF-9: fixed.**
- Case 3 recorded one 1.27 and no 1.22.
- Case 5a showed "Already applied … your edit wasn't saved" on the first click.
- No regressions: the stale dismiss, the lost answer then edit, the 390 px layout and the teacher's access are unchanged.
- **Still open:** OFF-7's server refusal (backend) and OFF-6's "record what was applied" (v0.4).

## Backend fixes 2b376d1 and ed00507, and the screen at 5eaa421 (contract v0.4, 29ae61b)

Tested on 31 Oct 2026 against backend ed00507, after running migration 1792600002500 on `fastrack_qab1`. Server cases went through the API (`be-fixes.js`, `be-order.js`). Screen cases went **through the UI** at 5eaa421. Before the UI run I marked the 17 test rows left open from earlier runs as dismissed on my copy. **OFF-7: fixed. OFF-6: resolved as agreed in v0.4.**

**Server (API)**

| Case | Result |
| --- | --- |
| Re-send with a **dismissed** row's `applyOpKey` | `409 ALREADY_RESOLVED` with `reason {rejectionId, status: "dismissed", resolvedBy: Ofori Retest, resolvedAt}`. No payment. |
| **Applied** row | An identical retry replays (`Idempotent-Replayed: true`). A different body gives `IDEMPOTENCY_MISMATCH`. One payment. |
| Dismiss and re-send fired **at the same time**, 8 times | Every outcome consistent: dismissed, 409 and no payment. Dismiss won all 8. |
| Re-send saved first, then dismiss | Dismiss gives 409 "This change has already been applied. Mark it applied instead." `/applied` gives 200. One payment. |
| Edited apply (GHS 2.03 cash sent as GHS 2.08 MoMo) | `appliedWithEdits: true`, and `appliedBody` is the MoMo body. A plain apply gives `appliedWithEdits: false`. |
| Refresh cap | Within a minute of signing in, **9** refreshes gave 200, then 429, 429. The refused token worked again after a minute. The fix note says 10 per sign-in per minute; the sign-in itself appears to count as one. Harmless. |
| Refresh-token reuse | Within 30 s: 200 (the multi-tab grace). After 32 s: 401 "Refresh token reuse detected", and the newer token of that sign-in is refused too (the sign-in ended). |

**Screen (UI), 13 of 13**
- Cases 0–7 pass as before.
- The **Applied** tab shows what was saved: "Fee payment of GHS 8.47", "Amount 8.47 (sent as 8.42)", "**Applied with edits** by Ofori Retest".
- **8, true race:** every read of the row was rewritten to "open" by the test, so only the server could stop it. Tab B's Apply was refused with no payment, and the card says "This change was dismissed, so it was not applied."
- **9:** A applies, then B, on a stale card, dismisses. The row stays applied with one payment, and B's card says "Already applied by Ofori Retest on 31 Oct, 00:19, so it can't be dismissed."
- **Test note:** the Applied and Dismissed tabs list oldest first, so with many rows the newest are on the last page (fastrack-18 has asked the backend for newest-resolved first). The suite now opens the last page.
- **Polish (not a finding):** the field table shows amounts unpadded ("Amount 8.9"), while the title shows "GHS 8.90".

### Re-test of d1234df (money formatting) and backend b41cf9c (resolved tabs newest first)

Tested on 31 Oct 2026 **through the UI**. The suite ran with the last-page workaround switched off. **Result: 13 of 13.**
- The field table reads "Amount GHS 4.37 (sent as GHS 4.32)", matching the title.
- This run's applied and dismissed rows were on **page 1** of their tabs, among more than 100 older rows.
- b41cf9c has no migration.

## Step 4a: queued attendance register writes (backend a0e58b5)

Tested on 31 Oct 2026 against a0e58b5, after migration 1792600002600 on `fastrack_qab1`. No staff screen queues attendance yet: fastrack-18's work is uncommitted. So I checked the new rules **through the API** (`att.js`, 9 of 9), and the existing **online attendance screen through the UI** (committed frontend d1234df). I used FIS-001, whose current term covers this week. BIS-001's current term is in 2027 after fast-forwarded rollovers, which makes the "as of the day" rules misleading there. Accounts: Primary 1 homeroom teacher kwame.mensah@fastrack.school and head@fastrack.school. **Result: pass.** OFF-10, raised here, was closed as not a bug (see below).

| # | Case | Result |
| --- | --- | --- |
| 1 | Two devices, one register (Primary 1, 29 Oct) | The teacher marks Hugo and Efua Present (`from: null`). The head's device, offline since before, sends Hugo Absent and Kofi Late 08:20 (both `from: null`). The head gets 200 with **one** `conflicts[]` entry: Hugo, `current` Present "Kwame Mensah" rowVersion 1, `mine` Absent. Kofi's Late was applied. Each entry has its own `rowVersion`. |
| 2 | Keep mine (`from` = the server's value) | Applied, and Hugo is Absent with rowVersion 1 → 2 |
| 3 | Replay | Same key, body and recorded time: 200 with `Idempotent-Replayed: true`. Another body: `IDEMPOTENCY_MISMATCH`. The register is unchanged. |
| 4 | Same cell, two keys at once (4 school days; the weekend correctly shows as closed) | Each time: both 200, **exactly one** applied and the other got a conflict, with one row |
| 5 | Pupil moved mid-term (Kofi Ansah, Primary 1 → Primary 2 from 30 Oct, through `promote`), then marked for 28 Oct | In Primary 1: 200. In Primary 2: **422 `NOT_ENROLLED_ON_DATE`** "was not in Primary 2 on 2026-10-28", for both keyed and online callers. The 28 Oct registers list him in Primary 1 and not in Primary 2. |
| 6 | A teacher queues JHS 1, a class that isn't theirs | **403 `OUT_OF_SCOPE`** with `forwardedTo`. The row is `open` with that code. The head re-sends it with `applyOpKey` (200) and marks it applied, so Emmanuel Osei is Late 08:45, with `recorded_at` equal to the teacher's time. |
| UI | Online register (Primary 1, 30 Oct) | The teacher's "rest present" saved 7 ("7 marks saved for Primary 1"). The head's change of one pupil to Absent saved 1, with version 2. Primary 1 correctly lists 7: the moved pupil counts as Primary 2 from 30 Oct. |

### OFF-10 (closed, not a bug): "one pupil on two registers" was two pupils with the same name

- What I reported: Kwame Adjei listed on both the Basic 1 and the Basic 2 registers for 29 Oct in BIS-001.
- These are **two different pupils**: BIS-001/STD/2026/001 (enrolment 8b5106c3, Term 1 2026/27 in Basic 1) and BIS-001/STD/2026/009 (enrolment ce7c650c, Term 1 in Basic 2).
- My history query grouped rows by first name and merged them.
- `enrollment_history` has `UNIQUE (school_student_id, term_id)`, so one enrolment can't be on two registers. The backend session confirmed this, and I re-checked it on `fastrack_qab1`.
- **Intended behaviour, worth knowing:** with rosters as of the day, a pupil promoted ahead for a later term stays on the old class's register until that term starts.

- **Test-data note:** in BIS-001, pupils with no row for a past term fall back to their current class. So a pupil admitted in 2027 shows on 2026 registers. That's fine for real schools, whose current term covers today.

## Offline attendance screen (a1a1a24, docs da640b6), against backend a0e58b5

Tested on 31 Oct 2026 **through the UI** with `next dev` at da640b6, on FIS-001 Primary 1. The teacher was kwame.mensah@fastrack.school (homeroom) and the head head@fastrack.school, each in their own browser context. Outages were simulated by aborting every request to the API. **Result: 10 of 11 checks pass. The one failure was my test's. Two findings: OFF-11 (Medium) and OFF-12 (Low).**

| # | Case | Result |
| --- | --- | --- |
| A | Online save | "Register saved: 8 marks saved for Primary 1". Sent as a keyed op, with the device recorded. |
| B/C | Opened online, then offline: Hugo Absent and Efua Late saved, then Hugo Late saved again | "Saved on this device: 2 marks for Primary 1 will be sent when you're back online". Two rows show **Waiting to sync**. The chip reads **"Offline · 2 waiting"**. After an offline reload, Hugo still shows Late with Waiting to sync, and 2 ops are queued. |
| B/C | Meanwhile the head marks Efua Present online. Then the teacher's connection returns. | Hugo ends **Late v2** (the chained `from`, no self-clash). Efua keeps the head's **Present**. The chip reads "1 need review". The tray card: "**Attendance for Primary 1, Mon 26 Oct · Ansah, Efua**", "changed by Ama Owusu", **Now Present / Yours Late**. **Keep mine** gives Late on the server. |
| D | Offline, Fri 23 Oct never opened | Orange banner: "Offline: this day's register isn't saved on this device. The pupils come from the register of Mon 26 Oct…". The marks were saved later: 8 rows. |
| E | Serwaa moved to Primary 2 from Wed 28 Oct. Offline, 28 Oct (never opened) is built from Fri 23 Oct, which still lists her. | The whole register is refused, with 0 rows. Tray: "**Boateng, Serwaa wasn't in this class on Wed 28 Oct, so none of these marks were saved.**" with **Send without Boateng, Serwaa**. That saved the other **7**, with none for her. |
| F | The teacher **loses the class while offline**: a queued 22 Oct register, then the homeroom is cleared before reconnecting | Forwarded: the chip reads "1 sent to head teacher", nothing is saved, and Changes to review shows "They no longer teach this class or pupil". **Apply** saved 8 rows. |

- **My failure:** my notice reader had been removing Mantine notification elements, which crashed React ("removeChild… not a child"). After fixing that, the second offline save's notice reused the first notice's slot, so my counter missed it. Both are mine, not the screen's.
- **Not a bug:** the screen's first load opens the latest school day (30 Oct). So that day was already saved and correct offline, and the moved-pupil case had to use a day the teacher never opened.

### OFF-11 (Medium, fixed in 6279ab5; owner: staff frontend): a mark changed while a save is still running is silently dropped

**What happens.** Offline, Save waits up to 8 s before saying "Saved on this device". If the teacher changes a mark in that window, the change is thrown away when the save finishes:
- The control flips back to the saved value.
- **Save register** becomes disabled, as if nothing were left to save.
- Nothing is queued for it.

**Repro** (21 Oct, offline): set Efua to Late and press Save. Two seconds later, set her to Absent.
- The button goes from loading straight to disabled.
- The screen shows **Late** (also after a reload). The outbox holds only `Efua: Late from null`. The server ends with **Late v1**.
- Button samples, 1 s apart: untouched gives `LLLLLLLLLddddd`; with the edit, `LLLLLLdddddddd`.

**Suggested fix.** When a save finishes, keep the unsaved edits made since it started, i.e. diff the draft against what was queued, not against everything. Alternatively, lock the controls while saving. A teacher marking quickly on a slow or no connection will hit this.

### OFF-12 (Low, fixed in 6279ab5; owner: staff frontend): the head's review card for a forwarded register shows ids and raw JSON

**What happens.** In Changes to review, a forwarded attendance register reads:
- "Attendance register for **2026-10-22** · 8 pupils"
- "Class id e9f509e9-…"
- "Date 2026-10-22"
- "Marks [{"schoolStudentId":"41f8d6ff-…","status":"Present","from":null},…]"

The head has to decide on the change without seeing the class name or which pupils got which mark.

**Suggested fix.** For attendance bodies, show the class name and a readable day, plus a short table of pupil name and status, the way payments already show "Pupil Yaa RetestP2 · code".

### Re-test of 6279ab5: OFF-11 and OFF-12 fixed

Tested on 31 Oct 2026 **through the UI** at 6279ab5, against backend 58d7b6f. **Both fixed. The attendance suite is 10 of 11; the one miss is my test's notice counter, as before.**
- **OFF-11 repro** (offline, Efua Late → Save → Absent 2 s later):
  - Save samples `LLLLLLeeeeeeee`, so the button is enabled again afterwards. The screen keeps **Absent** and Save reads "(1)".
  - The second save queues `Efua: Absent from "Late"` next to `Late from null`. Back online, the server ends **Absent v2**.
  - Unsaved edits are still lost on a reload before Save. That's expected.
- **OFF-12:** the head's card reads "**Attendance register · Primary 1 · Thu 22 Oct · 8 pupils**", "They no longer teach this class or pupil", "Class Primary 1", "Date Thu 22 Oct", and Entries "Hugo Agyare Present, Efua Ansah Present, …". There are no ids or JSON. Apply saves 8 rows.

## Offline marks (825db22, docs 1840327), against backend 58d7b6f

Tested on 31 Oct 2026 **through the UI** at 1840327 on the QPM-402 Primary 1 Mathematics sheet (Test 1, out of 20). The teacher was teacher@qpm.test; the head, principal@qpm.test; and a second teacher device was another context. Backend 58d7b6f has no migration. **Result: 9 of 9.**

| # | Case | Result |
| --- | --- | --- |
| M1 | Online mark (Seed01 11) | Saved, and sent as a keyed `PUT /mark-sheets/:id/marks` with `from: null`. "All changes saved". |
| M2 | Offline: Seed02 12, then 13 a second later; Seed03 14 | "**3 marks waiting to sync**". After an offline reload, 13 and 14 are still in their cells. |
| M3 | Meanwhile the head enters 6 for Seed03; then the teacher reconnects | Seed02 is **13** (chained, no self-clash). Seed03 keeps the head's **6**, and the cell is outlined orange with the notice "Someone else changed this sheet…". The tray card: "**Marks: Mathematics, Primary 1 · Seed03 Paging · Test 1**", changed by Ofori Retest, **Raw score Now 6 / Yours 14**. **Keep mine** gives 14. |
| M4 | The teacher's other device fills the sheet (Seed04 5) and submits it, while the first device has Seed04 7 queued offline | The first device's save is refused. Tray: "The sheet was submitted before these marks arrived, so they weren't saved. Once it's returned to you, send them again." with **Send again**. Seed04 keeps 5. The head then returns the sheet. **Send again** gives a clash, Now 5 / Yours 7 (from the other device). **Keep mine** gives 7. |
| M5 | Offline, Seed05 9, then **Submit marks** | After about 15 s: "**Not submitted yet**: 1 mark is still waiting to be sent." The sheet stays draft. Once back online and landed: "Marks submitted". |

- **Wording polish (not a finding):** the clash notice says "1 of your marks clashed with theirs and **were** not saved". For one mark it should read "was".
- **Not covered:** a descriptor-band sheet. QPM-402 has only the scored Mathematics sheet. I'll check band names in the tray when one exists.

### Notes from the backend after the 4b pass (31 Oct)

- **Merge order:** backend **36460de** drops `details.rowVersion` from every stale-sheet 409. It must reach main **with or after** staff frontend **825db22**, which reads `code` rather than `details.rowVersion`. I haven't re-tested the direct path, used when there's no offline store, against 36460de.
- **Descriptor sheets:** the per-cell path compares `descriptorBandId` the same way. The backend will cover it with an e2e case in the B3 work, since no QA school has a descriptor sheet.
- **OUT_OF_SCOPE on marks:** this uses the same forwarding path that passed for attendance (case F), so a separate UI check is optional.
- **Next:** B3, the change feed.

### Re-test of 59c1296: singular clash notice

Tested on 31 Oct 2026 **through the UI**, running marks cases M1–M3 again at 59c1296. **Result: 5 of 5.**
- The notice now reads "Someone else changed this sheet: 1 of your marks clashed with theirs and **was** not saved."
- No regressions: the clash, the tray and Keep mine are unchanged.
- **Tiny leftover:** the next sentence still says "**They're** outlined in orange" for a single mark.

## B3a: change log infrastructure (backend 3c6529a)

Tested on 31 Oct 2026 against 3c6529a, after migration 1792600002700 on `fastrack_qab1`. There are no feed endpoints yet, so I made writes through the API (`b3a.js`) and the online attendance screen, then checked `change_log` and `sync_school_seq` directly. **Result: 9 of 9, plus the UI check.**

| # | Case | Result |
| --- | --- | --- |
| 1 | Attendance PUT with 2 cells | Two rows: `attendance <schoolStudentId>:2026-10-12 upsert` each |
| 2 | Replay of the same op | No new row |
| 3 | Partial apply (1 conflict, 1 applied) | One row, for the applied cell only |
| 4 | 422 `NOT_ENROLLED_ON_DATE` (whole register refused) | No row: the rolled-back write logs nothing |
| 5 | Class renamed twice | Two `classes <id> upsert` rows. `row_version` 1 → 3. |
| 6 | Subject created, then deleted | `subjects <id> upsert`, then `subjects <id> delete` |
| 7 | A QPM-402 mark save | QPM's own sequence: `marks <sheetId>:<schoolStudentId> upsert` and `mark-sheets <sheetId> upsert`. FIS's sequence didn't move. |
| 8 | 9 attendance writes at once | 9 rows. Seqs 8–16 are unique and gap-free, and `sync_school_seq` = 16. |
| 9 | `row_version` columns | Present on academic_years, academic_terms, subjects, classes and school_students |
| UI | Online register saves (the teacher's "rest present" = 6, the head's 1 change) | 7 `attendance upsert` rows |

- **Commit order** (an earlier writer committing last gets the later seq) is covered by the backend's e2e test. I didn't reproduce it from outside.
- **Note:** `change_log` has no `version` column, unlike the plan sketch. B3b's feed will show whether devices get versions some other way.

## B3b: change feed and snapshot (backend 9db902b)

Tested on 31 Oct 2026 **through the API** (`feed.js`), since no screen pulls yet. Backend 9db902b ran on `fastrack_qab1` after migration 1792600002800. Accounts: FIS-001 head@fastrack.school and the Primary 1 teacher kwame.mensah@fastrack.school, plus QPM-402's principal for the cross-school case. **Result: 10 of 11. One finding: OFF-13 (Medium).**

| # | Case | Result |
| --- | --- | --- |
| 1 | `changes` with no `since` | 410 `RESYNC_REQUIRED`, `reason.cause: NO_CURSOR`, with the collections to snapshot |
| 2 | Snapshot `classes,subjects` with `limit=2` | 5 pages, **one** cursor across them. 9 classes = 9 live rows. FIS has no subjects. |
| 3 | Class renamed twice, then a pull | One upsert with its current state: `version` 11 = `data.rowVersion` 11 = `row_version` in the DB. The next pull is empty, `hasMore: false`. |
| 4 | Subject created, then deleted | Upsert v1, then a tombstone: `op: delete`, `reason: deleted`, **version 2**, no `data`. (A restore through SQL isn't seen, because it bypasses the app. There's no restore endpoint in phase 1, so restore isn't covered.) |
| 5 | R8: an attendance write, then a pull for `classes` only | Only classes are returned, and `nextSince` moves past the attendance write. So the frontend needs **one cursor per collection set**. |
| 6 | `POST /dev/sync/expire-cursors`, then a pull | 410, `cause: CURSOR_EXPIRED` |
| 7 | Teacher's snapshot of `students,attendance` | Students = exactly the 5 current Primary 1 pupils. Attendance (36 rows) is only for them, with the oldest on 9 Oct, inside the 120-day window. Classes: all 9 (the list is school-wide). |
| 8 | The head moves a Primary 1 pupil to Primary 2, then the teacher pulls `students` | That pupil arrives as `delete`, `reason: out_of_scope` |
| 9 | The teacher loses the homeroom (`PATCH /classes` homeroom null) / dev `scope-changed` hook | 410, `cause: SCOPE_CHANGED`, both ways. A direct SQL homeroom change is caught too. |
| 10 | A cursor from another school / a cursor ahead of the school | **Accepted (200).** See OFF-13. A cursor with a tampered fingerprint gives 410. |
| 11 | `collections=payments` | 400 "Unknown collection: payments" |

### OFF-13 (Medium, fixed in 5bee8d2; owner: backend): a cursor ahead of the school's sequence is accepted, so the device silently stops getting changes

**What happens**
- A cursor is base64 `{"s": seq, "t": time, "f": scope fingerprint}`.
- The fingerprint is the same for every full-scope user (both heads got `rhNM_k50ZpWbear-`), and it doesn't include the school.
- The server never checks that `s` is at or below the school's current `sync_school_seq`.

**Reproduced**
- **Cursor ahead of the school:** I took FIS's real cursor (s=31) and set s=81. The pull gave 200 with no changes and `nextSince` 81. After two real class edits, a pull from that cursor still returned **0 changes**. The device would miss every change until FIS's sequence passes 81.
- **Cursor from another school:** FIS's head pulling with QPM's cursor (s=2) got 200 with FIS changes.

**When it happens for real**
- **Restoring the database from a backup** rewinds `sync_school_seq`. Every device's cursor is then ahead, and every device silently stops seeing changes, with no 410 to make it re-snapshot.
- A staff account moved to another school, keeping its device database.

**Suggested fix**
- If `s` is greater than the school's current seq, answer 410 `RESYNC_REQUIRED` with a cause such as `CURSOR_AHEAD`.
- Put the school id, or a per-school epoch that changes on a restore, into the fingerprint.

- **Test data:** to test moves on my copy, Primary 1 pupils Kofi Ansah, Serwaa Boateng, Efua Ansah and one more were moved to Primary 2. Their attendance and registers on `fastrack_qab1` reflect that.

### Re-test of 5bee8d2: OFF-13 fixed

Tested on 31 Oct 2026 **through the API**, with the same setup. **Result: 4 of 4, and the feed suite 11 of 11. OFF-13: fixed.**
- A cursor 50 ahead of the school gets 410 `RESYNC_REQUIRED`, cause **`CURSOR_AHEAD`**. The real current cursor still works (200).
- QPM's cursor used by FIS's head gets 410, cause **`SCOPE_CHANGED`**. The fingerprints now differ per school.
- **Restore runbook** (`UPDATE sync_school_seq SET cursors_valid_from = now()`): an existing cursor gets 410 `CURSOR_EXPIRED`, and a fresh snapshot's cursor works.
- **Caveat (by design):** `CURSOR_AHEAD` alone only covers the time before the numbering passes a device's old position again. After a real database restore, the runbook step is what protects devices. It's documented in backend end-to-end-api-flow §23.3 and must be part of any restore procedure.

### Re-test of 9c8c6d1: a teacher's attendance snapshot follows the class on the day

Tested on 31 Oct 2026 **through the API** on FIS-001 (`snap-moved.js`). Five Primary 1 pupils have moved to Primary 2 this term: Serwaa from 28 Oct, Kofi from 30 Oct, and Efua, Kojo and Yaw from 31 Oct. **Result: pass.**
- **Snapshot:** the Primary 1 teacher's `collections=attendance` snapshot contains **all 31** of those pupils' marks dated before their move. It contains **none** of their marks after it (Kofi's Primary 2 mark on 30 Oct, added by the head for this test).
- **Feed:** the head changed Efua's 30 Oct mark (a Primary 1 day) to Excused. The teacher's pull got `upsert … Excused`.
- **Feed:** the head's change to Kofi's 30 Oct mark (a Primary 2 day) reached the teacher only as a **`delete` with no data**, i.e. drop it if you hold it. That's harmless, and no mark data crosses scope.
- Contract **v0.4.1 (85808ff)** adds `CURSOR_AHEAD` and says any 410 means a full re-snapshot.

## Pull side: records from the change feed (staff frontend ce3508d, docs 64bb1b2)

Tested on 31 Oct 2026 **through the UI** at 64bb1b2, against backend 9c8c6d1 (feed with the OFF-13 fix), using FIS-001 attendance (Primary 1 teacher) and the QPM-402 Mathematics sheet. The heads' changes were made through the API, as another device would. **Result: 7 of 7 in substance.** One check failed on my expected banner text (see the note).

| # | Case | Result |
| --- | --- | --- |
| P1 | First sign-in | The snapshot filled `records`: students 3, attendance 52, classes 9, terms 6, academic-years 2. `meta.pullCursor` and `pulledAt` are set. |
| P2 | The head marks Hugo Absent on Mon 5 Oct (a day the teacher never opened). The teacher syncs, then opens it offline. | Record `attendance 41f8…:2026-10-05` v1 Absent is on the device, and the register built offline shows **Absent**. |
| P3 | Offline, change Hugo to Late from there | Queued as `Late from Absent`, and it lands as **Late v2** with **no review item** (it chains on the synced value instead of clashing) |
| P4 | Register for 6 Oct opened online (saved). Then the head sets Hugo Excused, the teacher pulls, and opens it offline. | Shows **Excused**. Changed to Present offline, it lands **Present v2** with no review. |
| P5 | An op queued offline for 7 Oct, then the restore runbook step (`cursors_valid_from = now()`), then back online | The register landed. The pull got a 410 and re-snapshotted: **new cursor**, 55 attendance records. The outbox wasn't lost. |
| P6 | The head moves Abena Osei from Primary 1 to Primary 2 | The teacher's device keeps an **`out_of_scope` tombstone** for her |
| P7 | Marks: the teacher opens the sheet (Seed06 Test 1 empty). The head enters **8**. The teacher pulls, then opens the sheet offline. | The cell shows **8** |

- **Note on P2's banner:** I expected "The pupils come from the class list synced to this device". The device already had a saved register (31 Oct, from the screen's first load), so by design it said "from the register of Sat 31 Oct". The class-list path is only for when no register is saved.
- **Observation (not a finding):** a past day built offline uses today's pupil list, whether from a saved register or the synced class list. Pupils who were in the class on that day but have moved since (here, four pupils on 5 Oct) aren't listed, so they can't be marked offline for that day. Online, the server's as-of-day register lists them. That's fine for today's register, which is the normal offline case.
- The other suites (attendance 23, marks 15, tray 12, review 19) are reported passing by fastrack-18. I didn't re-run them here.

### Re-test of 9d7e864: past days and the class picker offline

Tested on 31 Oct 2026 **through the UI** at 9d7e864, against backend 9c8c6d1. A fresh device signed in as the Primary 1 teacher, waited for the pull, went offline, and only then opened Attendance. **Result: pass.**
- **Baseline before the fix** (64bb1b2, the same steps): Attendance showed "Something went wrong / Can't reach Fastrack", with **no classes** in the picker.
- **Class picker offline:** it offers **Primary 1** (the teacher's homeroom) from synced records.
- **Fri 23 Oct** (8 pupils marked Present then, 6 of whom have since moved to Primary 2): all **8** are listed with **Present**, including Efua, Kofi, Serwaa, Kojo, Yaw and Abena. That matches the database. The banner reads "The pupils come from the class list synced to this device…".
- **Fri 2 Oct** (nobody marked): only today's 2 pupils, unmarked. That's the stated limit: a day nobody marked can't be known offline, and the server's whole-register 422 → "Send without…" covers mistakes.

## Live demo for the user: two windows, attendance offline

Run on 31 Oct 2026 **through the UI** in two visible browser windows, with frontend 9d7e864 and backend 9c8c6d1 on the QA database copy. The teacher (Kwame Mensah, Primary 1) was on the left and the head (Ama Owusu) on the right, with a caption bar at each step. Script: `live-demo.js` in the QA scratchpad. **Result: pass.**

| Step | What happened |
| --- | --- |
| Offline save | The teacher opened Mon 26 Oct and went offline, then marked Hugo Absent and Efua Late and saved. "Saved on this device" appeared and the rows showed "Waiting to sync". The database held nothing. |
| Offline reload | After a reload while offline, the unsent register was still there |
| Clash | The head (online) saved Efua Present on the same day |
| Reconnect | The register synced by itself. Hugo was saved as **Absent**. Efua went to the teacher's **Needs review** tray (server Present, device Late). "Keep mine" made her **Late** on the server, and the head's register showed the result. |
| Lost class | The teacher saved Thu 22 Oct offline and was then taken off Primary 1. On reconnect the register was refused and forwarded to the head's **Changes to review**. The head applied it: **8 rows** saved. |

- **First run stopped on a script mistake, not the app:** the head's step used "Mark the rest present", so Hugo clashed too, and the tray correctly held two items while the script expected one. Fixed and re-run.

## Housekeeping, 1 Nov 2026

- **Branches pushed** by fastrack-backend-ed: `feat/offline-sync` (9c8c6d1) and `fix/shared-transfer-reference` (ec023c2, six payment and invoice fixes: QA-019, 029, 042, 084, 216, 277). The PR for the latter isn't open yet because gh isn't logged in. Compare link: https://github.com/Fastrackgh/fastrack-backend-/compare/main...fix/shared-transfer-reference?expand=1
- **Parent portal "Could not load the totals": an environment problem, not a code bug.** The user's backend ran from `fastrack-backend` on `fix/reinvite-unset-accounts`, 62 commits behind `main`, without `GET /parents/me/wards/:id/invoices/summary` (25eb632, QA-222). The call fell through to `invoices/:invoiceId` and got `400 Validation failed (uuid is expected)`.
  - **Fix:**
    - The folder's 14 uncommitted files (an unfinished attendance/calendar helpers/types refactor and an architecture review) were committed to `fix/reinvite-unset-accounts` as **98d0c5d (wip)**. It's local only.
    - The folder was switched to `main` (b5f7c83).
    - The `fastrack` database already had all 41 migrations, so no database change was made.
  - **Checked:** with parent rita.ansah@gmail.com, the summary returns **200** (4 bills, GHS 200 overpaid).
- **Frontend `fastrack`** stays on `feat/rbac-workspace`: it is ahead of `main` (it holds everything in `main` plus 237 commits). 102 of those commits are not on GitHub yet. Pushing them is waiting on the user's go-ahead.

## Merged to main, 1 Nov 2026

- **Merged by the user:** backend PR #6 (payment fixes, 2989a98), PR #7 (offline sync, adfcece) and PR #8 (QA-279, 001dede), and frontend fastrack-home#3 (72aae75). Backend main CI is green at 001dede, its first green run since 26 Oct.
- **Why CI was red:** commit 3c4a1ed reformatted `test/fixtures/results-fixtures.json`. The content was unchanged, but the bytes changed, so the pinned hash broke. fb738a8 restored the agreed bytes and added the file to `.prettierignore`.
- **Shared `fastrack` database:**
  - It was backed up first to `fastrack-space/db-backups/fastrack-2026-11-01-before-offline-sync.dump` (61 tables).
  - The run was rehearsed on a copy.
  - Then the migrations were run from main 001dede: **41 → 51**. That's the 8 sync migrations plus PaymentReceiptBalances and LineItemFeeNames from #6, which share timestamps with two sync migrations but have different names.
  - **Checked:**
    - All 306 invoice line items have a `fee_name`, with no fallback "Fee".
    - 11 users got `sync:review`.
    - Old payments have no stored balances, and the staff receipt shows "—" for them, as designed in QA-277.
- **Behaviour change in #7:** a payment resent with the same Idempotency-Key and body now replays the original 201 receipt (`Idempotent-Replayed: true`) instead of returning a 409. A different body returns 409 IDEMPOTENCY_MISMATCH. Only one payment row is written.

### Post-merge re-test on the user's own setup

Run **through the UI** against frontend :3001 (`fastrack`) and backend :3000 (main 001dede) on the shared database. **Result: 6 of 6.**

| # | Check | Result |
| --- | --- | --- |
| 1 | The teacher saves Primary 1 for Fri 30 Oct online | "Register saved", 8 rows |
| 2 | The teacher saves Thu 29 Oct offline, then reconnects | "Saved on this device", 0 rows on the server. After reconnecting: 8 rows, Hugo Absent. |
| 3 | The head opens Changes to review | It opens: "Nothing to review" |
| 4 | Students search "Abena Osei" (QA-279) | One row: Abena Osei |
| 5 | The QPM teacher enters a Test 1 mark offline, then reconnects | "1 mark waiting to sync", then saved (9.00) |
| 6 | Parent (Rita Ansah) opens the Bills tab | The totals card shows (In credit GHS 200.00). No "Could not load the totals". |

This test data stays on the shared dev database: FIS Primary 1 registers for 29 and 30 Oct, and the "Split Check" Test 1 mark of 9 on the QPM Mathematics sheet.

## Step 5a: offline cash payments (frontend 4e4a738, backend cb08fa7)

Tested on 1 Nov 2026 **through the UI** as accounts@bis.test and principal@bis.test on BIS-001, on a database copy, with backend cb08fa7 merged with main 444a778. Setup steps and a few server-only cases went through the API, marked below. **Result: all 18 cases pass. Findings: OFF-14 and OFF-15 (both fixed), and OFF-16 (fixed), from the re-tests below.**

| # | Case | Result |
| --- | --- | --- |
| 1 | Online payment | Official receipt with an RCT number. The row also stores an OFF number and a group id. |
| 2 | Offline payment | "Provisional Payment Receipt", "PROVISIONAL — PENDING SYNC", OFF number, and the crest loads from a blob with the network blocked. Nothing on the server. |
| 2b | Offline list | "Provisional · waiting to sync", and the "Offline:" note after a refresh |
| 3 | Second offline payment for the pupil | The form shows GHS 4,110.00 (4,130 less the first 20). Both survive an offline reload. |
| 4 | Back online | Both land once with RCT numbers and no warnings. The balance is 4,080.00. The list shows "was OFF-…". |
| 5 | GHS 3,000 offline against GHS 2,930 owed | Tray: "Nothing was recorded: the GHS 3,000.00 is still in the cash drawer. It is GHS 70.00 more than the bill owed." Nothing on the server. |
| 5b | "Keep as credit" | Lands with the same OFF number |
| 6 | Offline payment for a whole bill the head paid online meanwhile | Applied with BILL_CHANGED and POSSIBLE_DOUBLE_PAYMENT. The tray's "Saved, but check this" names the other RCT, who recorded it, and the credit kept. |
| 7 | The head modifies the bill down by GHS 100 (API) | Applied with BILL_CHANGED and CREDIT_KEPT. The bill reads -100.00. |
| 8 | Another op holds the next OFF number (API) | Lands renumbered (OFF-2227-2), printed_ref keeps OFF-2227-1, and nothing goes to review |
| R | Generate term bills while the clerk is offline (API) | REALLOCATED / CARRIED_FORWARD: the GHS 40 went onto the Term 3 bill (0047). 1,720 carried, 1,680 now owed. Found through the renumbering case, which used the same pupil. |
| 9 | Response dropped after the server saved | Exactly one payment |
| 10 | Head's warnings filter | "Possibly paid twice" finds the payment from the other device, with the badge |
| 11 | Teacher (API) | Naming money collections is 403. The default snapshot has none. |
| 12 | Sign out with a payment queued | Guarded |
| 13 | Sign-out wipe | The user's IndexedDB database is gone |
| 14 | Next user on the same browser | The OFF number continues (4 after 3) |
| API | NO_BILL, same-key replay, ref taken | 422 NO_BILL; the same RCT with Idempotent-Replayed and one row; 409 PROVISIONAL_REF_TAKEN |

- **Not run:** backend e2e on cb08fa7. Its session stopped without reporting, so CI on its PR is the first e2e run. Typecheck and unit tests pass on the merge with main: 807/807.
- **Correction:** this log first said fastrack-18 reported the DUPLICATE_REFERENCE, RECEIPT_NUMBER_TAKEN and PAYMENT_DATE_TOO_EARLY cards and the sibling resend as passing. That was QA's misreading: nobody had run them through the UI. See the re-test below.
- **Observation (not a finding):** RCT numbers follow sync order, not the order cash was taken (Yaa's two payments, queued first, got 0017 and 0018, after later ones got 0014–0016). The contract's order is first-in-first-out per record, so this is allowed. The paper trail is the OFF number and the payment date.

### OFF-14 (Medium; owner: staff frontend): the clerk waits about 8 seconds for each provisional receipt while offline

Measured at 8,425 ms. `RecordPaymentModal.tsx settle()` waits `LAND_WAIT_MS = 8_000` for the op to land, even though the device already shows Offline and nothing can land. A clerk with a queue of parents sits behind a spinner on every payment. **Fix:** skip the wait when the device knows it's offline, and show the provisional receipt at once.

### Re-test of f5a2428: OFF-14 fixed, and the refusal cards

Tested on 1 Nov 2026 on a database copy, frontend f5a2428 with backend cb08fa7 merged with main 444a778.
- **OFF-14 fixed:** the provisional receipt appears 217 ms after submit on the first offline payment and 114 ms on the second (was 8,425 ms).
- **SHARED_TRANSFER_REFERENCE, UI:** an offline MoMo payment for another pupil with a used reference. The card reads "Nothing was recorded: the GHS 20.00 is still in the cash drawer", and "Same transfer for siblings" lands it.
- **DUPLICATE_REFERENCE, UI:** the same pupil and reference. The same cash-drawer wording, only "Discard my change" is offered, and discarding clears it with nothing saved.
- **RECEIPT_NUMBER_TAKEN and PAYMENT_DATE_TOO_EARLY, API only:** 409 and 422 with the right codes. The form sends neither a receipt number nor a date, so these cards can't be reached from it today.

### OFF-15 (High; owner: staff frontend, with backend input): an offline payment is dated the day it syncs, not the day the cash was taken

The queued body has no `paymentDate`. `payments-sync.ts` keeps the date only in the device's local copy, and `payments.service.ts` defaults a missing date to the server's today. Checked through the API with the same body the form sends: `X-Client-Recorded-At` 29 Oct, synced 1 Nov, `paymentDate` **2026-11-01**. Found from the code and the API, not by waiting days in the UI.

**Why it matters:** the parent's provisional receipt shows the day the cash was taken, but the official receipt shows a later one. The payment falls in the wrong day's cash records, and a payment spanning a term end could fall in the wrong term.

**Suggested fix:** send `paymentDate` (the device's local date when queued) in the body. The backend should also default a missing date on a keyed op to the school-local date of `X-Client-Recorded-At`. Add the rule to contract §9.1.

### Re-test of 73b1011: OFF-15 fixed

Tested on 1 Nov 2026 **through the UI** on a database copy, frontend 73b1011 with backend cb08fa7 merged with main 444a778, with the device clock shifted in the page. **Result: pass.**

| Case | Result |
| --- | --- |
| Online | Dated today |
| Clock 2 days behind, reloaded offline (no server offset) | The receipt and the official payment both read 2026-10-30 |
| "Keep as credit" resend of that kind of payment | Keeps 2026-10-30 |
| Clock 3 days ahead, reloaded offline | Not saved. Card: "It was dated 2026-11-04, which is in the future, so the device's date was probably wrong", with the cash line and "Made this minute". "Send dated today" lands it as 2026-11-01 with the same OFF number. |
| Clock 2 days ahead from before sign-in | Dated 2026-11-01 by the server clock, with no refusal |

- `X-Server-Time` is sent on auth, sync and keyed writes, not on ordinary GETs. A clock changed after sign-in is only corrected at the next such request. Until then it behaves like the reloaded cases above.
- PAYMENT_DATE_TOO_EARLY can't be reached through the UI on BIS-001: its first year began 61 days ago, past the 25-day rule below. API only.

### OFF-16 (Low; owner: staff frontend): two wrong-clock edges

1. **Misleading card past 25 days.** With the clock 30 or more days behind, the card reads "Made 30 days ago … This change waited more than 25 days and was not sent", and only "Discard my change" is offered, not "Send dated today". It's safe: nothing is saved, and the card says the cash is in the drawer. But the clerk has to record the payment again under a new OFF number, while the parent holds the old one.
2. **The server offset isn't kept across a reload.** `serverOffsetMs` lives in memory. Reloading offline with a clock that is days behind dates the payment on that wrong day, and nothing flags it, because a past date is valid. Storing the offset on the device would fix this.

### Re-test of 67a442b: OFF-16 fixed

Tested on 1 Nov 2026 **through the UI** on a database copy, frontend 67a442b with backend cb08fa7 merged with main 444a778, with the device clock shifted in the page. **Result: 4 of 4.**
- **Clock 30 days behind from before sign-in, reloaded offline:** the receipt and the payment read today, with nothing in review.
- **Clock 2 days behind at sign-in, corrected while offline:** dated today, not 2 days ahead.
- **Payment queued, then a 26-day jump with no server contact** (GETs blocked, so nothing could re-learn the offset first): the card reads "This payment may not have been recorded…", makes no cash-drawer claim, points to the OFF number under Payments, and offers discard only. Nothing was sent.
- **Ordinary offline payment, correct clock:** dated today, nothing in review.

Nit: that card's badge still reads "Not accepted", which claims slightly more than its text does.

Known limit, from fastrack-18's docs and not tested here: a clock changed while the app is closed can't be detected, and it shifts dates until the next server contact.

## Backend check: payment date safeguard (a0c3bf4, PR #11) and step 5b (fa4c184)

Tested on 1 Nov 2026 **through the API** on a database copy, at fa4c184, which contains a0c3bf4. The 5b screens aren't built yet, so the UI re-test comes with the frontend step. PR #11 was open and green at a0c3bf4.

**Payment date**

| Case | Result |
| --- | --- |
| Keyed payment with no date, recorded 3 days ago | Dated 3 days ago |
| Explicit date with an older recorded time | The explicit date wins |
| Future date | 400 `PAYMENT_DATE_IN_FUTURE` |
| Online, no key, no date | Today |
| No date, recorded time 5 days in the future | Dated today, not in the future |

**Admissions**

| Case | Result |
| --- | --- |
| Keyed admission with a client id | 201, id kept, code allocated, `rowVersion` 1 |
| The same request again | Same code, `Idempotent-Replayed`, one row |
| Same key, different body | 409 `IDEMPOTENCY_MISMATCH` |
| Id reused by another op | 409 `DUPLICATE_ID` |
| Same name (case and spacing differ) and birth date | 409 `LIKELY_DUPLICATE`, candidate with code, name, class, birth date, phone and status |
| Same name, other birth date, phone as `+233 54 777 0007` against stored `0547770007` | 409 `LIKELY_DUPLICATE` |
| Same name, other birth date and phone | Admitted |
| A one-digit guardian phone | Doesn't match anyone |
| `confirmNotDuplicate` | Admitted |
| Online, no key | The same 409 |
| Same details as a pupil of another school | Admitted, and nothing about that school leaks |
| Id of another school's pupil | 409 `DUPLICATE_ID`, with no school details |
| The same child from 4 devices at once | One 201, three 409, one row |
| 12 different children at once | All admitted, 12 distinct codes |
| Teacher | 403, nothing created |

**Not exercised:**
- **`guardianPhone` hidden without `students:read_sensitive`:** the secretary and academic head both received the phone, so neither lacks the permission. No e2e test asserts it either.
- **`id` with a returning pupil's record (400):** the pupil I used was still enrolled, and got 409 "already actively enrolled", which is correct for that case.
- **Backend e2e:** not re-run by QA. The backend session reports 488/488 on 5b and some earlier one-off failures that passed when re-run alone, cause not found.

## Step 5b: offline admissions (frontend 44b2605, backend 40e7520)

Tested on 1–2 Nov 2026 **through the UI** as the BIS-001 principal, on a database copy. **Result: pass, no findings.**

| # | Case | Result |
| --- | --- | --- |
| 1 | Online admission | "enrolled with code: BIS-001/STD/2026/013" |
| 2a | Online duplicate (Esi Adjei, same birth date) | "This may be a pupil already in the school", with code, class, birth date and guardian phone. Status is shown only when it isn't Active. |
| 2b | "Check the details" | Back to the form, tray empty, not admitted |
| 2c | "It's this pupil" | Not admitted, tray empty |
| 2d | "Admit anyway" | A second Esi admitted |
| 3a | Offline admission | "Saved on this device…", survives an offline reload, listed "Code pending · waiting to sync", nothing on the server |
| 3b | Opening the waiting row | Doesn't open |
| 3c–d | Offline register lists the pupil; mark Late; back online | The admission lands first with a code, then the mark |
| 3e | Students list afterwards | Shows the real code |
| 4 | Offline duplicate of Kojo Owusu with an Excused mark queued for the new pupil | The queued mark names the new id and depends on the admission. Back online: "Possible duplicate" card naming 004, **no attendance row while it's in review**. "It's Kojo Owusu": no second Kojo, and the mark lands on 004. |
| 5 | Offline duplicate, tray "Admit anyway" | A second pupil admitted, and the held mark lands after it |
| 6 | The same new child offline on two devices | One admitted, the other gets the card |
| 7 | Sign out with a queued admission | Guarded |
| 8 | Secretary with `students:read_sensitive` removed on the copy | Candidates shown, phone hidden |

- **Corrections to my own first run:** case 4 first looked like a mark sent early. In fact the 30 Oct register legitimately lists the real Kojo too, and my script clicked his row. Re-run on the right row, on 29 Oct.
- **Not covered:**
  - A queued payment for a pupil admitted offline. They have no bill yet, so the form can't take one.
  - `ID_MISMATCH_RETURNING`: the form can't send it, and the backend e2e covers it.
  - Marks on a mark sheet for an offline pupil: the sheet's pupils come from the server (fastrack-18's documented limit).
- **Observation (not a finding):** while offline, a likely duplicate can appear twice in a register, with the new row showing "—" for its code. The clerk can't tell them apart beyond that, so a mark may go on the real pupil's row. Nothing is lost.

### Re-test of frontend 479516e with backend b1665ca and c664e97: admission dates and "Code pending" (contract v0.5.6)

Tested on 2 Nov 2026 **through the UI** on a database copy. **Result: pass.**
- **Offline admission today:** it's in today's Basic 1 register as "Code pending", and **not** in the 30 Oct register. After sync, `admission_date` is 2026-11-02, a code is given, and today's Late mark landed.
- **Online:** the 30 Oct register leaves that pupil out. Existing pupils are still listed (4 rows).
- **API:** a mark for 30 Oct for that pupil is 422 `NOT_ENROLLED_ON_DATE`.
- **Likely duplicate in a register (57fa24c):** the real Kojo shows with BIS-001/STD/2026/004 and the new one with "Code pending".
- **Two false alarms from my own script:**
  - A date-field selector matched three inputs.
  - I first expected the real Kojo in today's Basic 2 register, but his enrolment history puts him in Basic 1 for Term 1 2026/27 and in Basic 2 only from Term 1 2027/28. The register was right.
- **Environment:** the dev frontend was slow on this machine (30 s for one page, under load), so timeouts were raised.

## Production URL clean-up (backend PR #12, e1d17b3)

Checked on 2 Nov 2026 by grep and by starting the built server with NODE_ENV=production. The user asked for it ("I see https://fastrack.com/ a lot in the codebase"), and production domains aren't decided yet, so the rule is "no production host in code".
- **Grep:** `fastrack.(com|school|edu|space)` over src and test finds nothing outside `seeds/`, which is kept on purpose for the dev demo logins. The `localhost` uses left are the dev-only fallbacks, dev routes, doc comments, test snapshots and DTO examples, plus one guard in online payments that *rejects* localhost.
- **Production start-up:**
  - Without `INVOICE_PUBLIC_BASE_URL`: refuses, "INVOICE_PUBLIC_BASE_URL is required in production".
  - Without `EMAIL_SENDER`: refuses, "EMAIL_SENDER is required in production".
  - With everything set: passes validation and fails only on the (deliberately missing) database.
- **Suggestion (Low):** `INVOICE_PUBLIC_BASE_URL=http://localhost:…` is accepted in production. Rejecting localhost there would also catch a copied dev `.env`, like the guard online payments already has.
- **Still to do:** the frontend has its own: page metadata `https://fastrack.com.gh` in `src/app/layout.tsx`, and the API fallback `http://localhost:3000/api` in `src/lib/api-client.ts`. Waiting for the user's go-ahead to send it to fastrack-18.

## Backend check: step 5c part 1, student edits (a41e650)

Tested on 2 Nov 2026 **through the API** on a database copy (the frontend for 5c isn't built yet). **Result: 11 of 11 as specified. One High finding outside 5c's own rules: QA-283** (in findings.md, also on main).

| # | Case | Result |
| --- | --- | --- |
| 1 | Online plain PATCH, no key | Applied; rowVersion 1 → 2 |
| 2 | Keyed `changes`, fresh base | Applied; +1 |
| 3 | Stale base, a field nobody changed (otherName, on the person) | Applied; +1 |
| 4 | Stale base, the field already holds `to` | 200, no clash |
| 5 | A real clash plus a clean field | 409 CONFLICT, conflictingFields `["religion"]`, `current.rowVersion` matches, and **the clean field wasn't applied** |
| 6 | Plain body from a stale base, differing value | 409 CONFLICT |
| 7 | Both forms / unknown field / future birth date | 400 each. Another pupil's code is 409 "already exists". |
| 8 | Same key twice / same key with another body | Replayed, the version rises once / IDEMPOTENCY_MISMATCH |
| 9 | Feed after an edit | `students` and `student-details` for the pupil, same version |
| 10 | Teacher | 403 |
| 11 | Another school's pupil | 404, nothing changed |

- **Observations (Low):**
  - The no-op in case 4 still raises `rowVersion` (4 → 5), so other devices see the record as changed when it wasn't.
  - A base version *ahead* of the server (+50) is accepted (200). Harmless with the field-level `from` check, but it may deserve the same treatment as `CURSOR_AHEAD`.
- **QA-283:** a user without `students:read_sensitive` replaced a guardian phone they see as blank, through both forms.

### Step 5c part 1 through the UI (frontend b387cf9, backend a41e650)

Tested on 2 Nov 2026 as the BIS-001 principal on a database copy, with the academic head making the "someone else" edits through the API. **Result: 8 of 8.**

| # | Case | Result |
| --- | --- | --- |
| 1 | Online profile edit (Residence) | "Student updated", stored |
| 2a | Offline: Nationality and Digital address | "Saved on this device…", "Changes waiting to sync" in the drawer, photo buttons hidden |
| 2b | Reload offline and reopen | The queued values show, with "Offline copy" |
| 2c | Meanwhile the academic head changes Nationality; back online | Digital address lands. Nationality waits in review, and theirs is kept. |
| 2d | Tray | Only Nationality: "Changed by someone else", Now (theirs) and Yours (mine) |
| 2e | "Keep mine" | Mine lands |
| 3 | Guardians tab edit (father's name) offline | Lands |
| 4 | A clash, then "Keep theirs" | The server value stays, and the tray clears |

Not covered: photos (5c part 2, waiting on contract v0.5.7), RECORD_DELETED, and updatedBy on the card, all listed by fastrack-18. QA-283 (sensitive fields writable without `read_sensitive`) is a backend fix and is unaffected: the staff UI already makes the Guardians tab read-only without that permission.

### Backend check: step 5c complete (e6c9e22, contract v0.5.7)

Tested on 2 Nov 2026 **through the API** on a database copy (local media driver). **Result: 11 of 11.** The first run's P1 "failure" was my resend changing `X-Client-Recorded-At`, which correctly gives IDEMPOTENCY_MISMATCH. An identical resend replays.

| # | Case | Result |
| --- | --- | --- |
| P1 | Keyed photo upload; identical resend | 200, version +1; the resend is replayed, the version rises once, one media row |
| P2 | Same key with another file; a wrong `X-Content-SHA256` | 409 IDEMPOTENCY_MISMATCH; 400 VALIDATION_FAILED |
| P3 | Stale base, and the photo changed since `from` | 409 CONFLICT `["photo"]`, `current.photoId` and `photoUrl` |
| P4 | Stale base, `from` equals the current photo | Applied |
| P5 | DELETE with a stale `from` / the current `from` / the photo already gone | 409 / 204 / 204 |
| P6 | Feed after a photo change | A `student-details` upsert with the new photo |
| L1 | No-op edit, in both forms | rowVersion unchanged (fixes my Low note) |
| L2 | Base 50 above the server | 409 CONFLICT, nothing applied (fixes my Low note) |
| S1 | Clerk without `read_sensitive`, `changes` on a guardian phone, fresh and stale base | 403, no `current` leaked, number unchanged (QA-283 in this branch) |
| R1 | Pupil deleted by the school: keyed edit and photo / online edit | 422 RECORD_DELETED / 404 |
| R2 | Another school's pupil, keyed | 404 (no hint that it exists) |

### Step 5c part 2: offline photos through the UI (frontend d27e8c2, backend e6c9e22)

Tested on 2 Nov 2026 as the BIS-001 principal on a database copy, with the academic head making the "someone else" photo change through the API. **Result: 7 of 7. Found along the way: OFF-17.**

| # | Case | Result |
| --- | --- | --- |
| 1 | Online photo | Stored; the signed link serves it (200 image/png) |
| 2a | Offline replacement | The device copy (blob) shows, also after an offline reload. Nothing on the server, 1 op waiting. |
| 2b | Back online | Replaced |
| 3a | Offline replacement while someone else changes the photo | Card: "Someone else changed Nana Tetteh's photo after your device last saw it…", with **both pictures loading** (Now from the signed link, Yours from the device). Theirs kept meanwhile. |
| 3b | "Keep mine" | Mine replaces theirs. The device's photo bytes are dropped; only the cached `schoolLogo` is left in `blobs`. |
| 4 | Offline removal | Lands |
| 5 | Edit queued for a pupil deleted meanwhile | "Not saved: Abena Classcheck's record was removed.", discard only |

- **My setup, not the app:** at first the signed photo links answered 404. My temporary folder was `.qa-tmp`, and Express `sendFile` refuses paths that pass through a dot-folder. With the media root in a normal folder they serve fine. That only affects the local (dev) media driver.
- **Diagnostic:** after the pupil deletion in case 5, a fresh device never received any records, and its offline Students list read "Unable to load students". That led to OFF-17.

### OFF-17 (Medium; owner: backend, step 5a / PR #11): one soft-deleted pupil with a fee account breaks the whole sync snapshot for the school

`GET /schools/me/sync/snapshot` → **500** "Cannot read properties of null (reading 'id')" for the BIS principal, once one pupil with a fee account was soft-deleted (`school_students.deleted_at`, set by SQL as the e2e does). Per collection, only `fee-accounts` fails; the other 12 return 200. Cause: `student-fee-account.repository.ts pageSchoolStudentIds()` loads `schoolStudent` without the deleted rows and maps `row.schoolStudent.id`, so the relation is null. Because the device pulls every collection in one snapshot, **no money-role device in that school can do its first sync**. The pupil list and everything else stay empty offline.

The app has no "delete pupil" route, so this needs AdminJS, a script (e.g. `cleanup-test-schools`) or SQL. Still, one such row takes down sync for the school. **Fix:** skip accounts whose pupil is deleted, or send them as `out_of_scope`/`delete` tombstones, and add an e2e with a deleted pupil that has an account. Check the feed (`changes`) for the same assumption.

### Re-test of OFF-17 (backend 6c294b0, carried to 8c99c57)

Tested on 2 Nov 2026 on a database copy at 8c99c57, with BIS pupil 011 (who has a fee account) soft-deleted. **Result: fixed.**
- **Full snapshot:** 200, with 10 fee accounts and the deleted pupil's left out. `GET /fee-accounts` is 200, also without it.
- **Feed:** `changes` since before the deletion has no entry, as expected, because the deletion happened outside the app.
- **Fresh device, UI (frontend d27e8c2):** the first pull finishes in 7 s with every collection (students 11, fee-accounts 10, invoices 11, …).

**Known limit:** a device that synced *before* such an out-of-app deletion keeps that account until it next re-snapshots. The feed only sends a tombstone when a change entry for it comes up.

### OFF-18 (Low–Medium; owner: staff frontend): the Students list is blank offline on a device that never opened it online

On that fresh device, with 11 `students` records synced, going offline and opening Students shows **"Unable to load students — Can't reach Fastrack"**. After opening Students online once, the same offline visit lists all 11. So the page reads its own saved response, not the synced records. The attendance class picker had the same gap, fixed in 9d7e864. **Fix:** when there's no saved read, list from the synced `students` records (with search and class filter), with the "Offline" note.

### Re-test of OFF-18 (8e50369) and the download-failure chip (caa31c6)

Tested on 2 Nov 2026 **through the UI** with backend 8c99c57 on a database copy (BIS-001, 12 pupils, 3 in Basic 1). **Result: 5 of 5. OFF-18 fixed.**
- **Fresh device, Students never opened online, then offline:** 12 rows, "of 12 registered", and "Offline: showing the pupils synced to this device."
- **Offline search "Esi Adjei":** only Esi Adjei.
- **Offline class filter:** the options come from synced classes, and Basic 1 gives "of 3 registered".
- **First download answered with a forced 500 on `/sync/snapshot`:** the chip reads "Couldn't download school data". It clears once a pull succeeds.
- **No connection at all on first sign-in:** the chip reads "Offline", correctly not the server-error wording.

## Merge state check: frontend main (d0cef88, fastrack-home#6 merged early) with backend #16 (e793dd8, includes #11 and main with #13)

Tested on 2 Nov 2026 **through the UI** on a database copy, with migration OfflinePayments 1792600002900 applied. Frontend #6 merged before backend #11 and #16, so frontend main sends 5a/5b requests that backend main doesn't accept until those two merge. This checks the combination they produce. **Result: 6 of 7, with one failure that didn't reproduce in three re-runs.**

| # | Case | Result |
| --- | --- | --- |
| 1 | Online payment | Official RCT, OFF ref stored |
| 2 | Offline payment | Provisional receipt at once |
| 3 | Back online, with a double payment and an over-payment | Lands with its own date; the over-payment held as "cash in drawer"; POSSIBLE_DOUBLE_PAYMENT flagged |
| 4 | Tray wording after #13's error filter | "still in the cash drawer" and "Saved, but check this" intact |
| 5 | Keep as credit | Lands |
| 6 | Online likely duplicate | The window shows the candidate |
| 7 | Offline admission plus offline register mark (Basic 1, today) | **Once:** the pupil was admitted with today's date and a code, but the register mark didn't land, and the device ended with `review: 2`. **Three re-runs:** the register landed every time. |

- **Re-runs of 7:**
  - a straight run;
  - an online duplicate closed with Escape first (in Basic 2, and in Basic 1);
  - an offline register in Basic 3.
  All landed (PUT 200). The theory that an unresolved duplicate card holds the class register is **disproven**: the register saved with the card still open.
- **Observation (UX, Low):** closing the online "This may be a pupil already in the school" window with Escape or × doesn't drop the admission. It waits in the tray as "Possible duplicate". "Check the details" leaves nothing queued, so the two ways of backing out behave differently.
- **Likely explanation for case 7** (from fastrack-18; not confirmed, because the copy and its server log were already deleted): a 422 `NOT_ENROLLED_ON_DATE`. Offline, a register for a day the device never opened is built from the class's latest saved register. If that list still held a pupil who has since left Basic 1 (Kojo moved in earlier rounds), the server refuses the whole register, and the card offers "Send without <pupil>", as designed. A refused register writes no `sync_operations` row, so "no PUT recorded" in that table didn't prove no PUT was sent. The re-runs landed because the day had by then been opened online. If it recurs, read the second card, or `conflicts[].error.code`: NOT_ENROLLED_ON_DATE is expected; OP_TOO_OLD would be a bug.
- **Escape / × / Cancel on the duplicate window** now drop the admission like "Check the details" (frontend 27b9918). **Re-tested 2 Nov through the UI** with backend e793dd8: leaving the window by Escape, by ×, or by "Check the details" each leaves review 0, pending 0 and still one Esi Adjei. Pass.
