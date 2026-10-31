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
