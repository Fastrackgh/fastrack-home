# QA findings register

- **Audit date:** 20 Oct 2026.
- **Scope:**
  - Frontend `fastrack` at `141f575` (plus uncommitted fees work)
  - Backend `fastrack-backend` at `01dda02` → `173bb33` (branch `feat/phase-10-api-contract-v2`)
  - The AdminJS panel
- **Method:** code tracing by three reviewers (backend RBAC, backend security/finance/AdminJS, frontend), then a live run against a throwaway database, then a browser walk-through of the frontend in headless Chromium as all six staff roles (both in [live-test-log.md](./live-test-log.md); screenshots in [screenshots/](./screenshots/)).

**Status key**
- **Live ✔:** reproduced against the running backend.
- **Browser ✔:** reproduced by clicking through the frontend.
- **Code ✔:** confirmed by reading the code.
- **Suspected:** depends on timing or data; not reproduced.

**Sides:** FE = frontend, BE = backend, Both. Paths:
- FE paths are relative to `fastrack/`.
- BE paths are relative to `fastrack-backend/src/`.

## Summary

| Severity | Count |
|---|---|
| Critical | 8 |
| High | 31 |
| Medium | 63 |
| Low | 24 |
| **Total** | **126** |

| ID | Sev | Cat | Side | Status | Title |
|---|---|---|---|---|---|
| QA-001 | Critical | SEC/EDGE | BE | Live ✔ | Concurrent payments lose credits on the invoice and fee account |
| QA-002 | Critical | FLOW | BE | Live ✔ | Carried-forward arrears are counted twice; a paid-up student's bill still shows a debt |
| QA-003 | Critical | SEC | Both | Live ✔ Browser ✔ | Suspending a school has no effect; the UI reports success |
| QA-015 | Critical | FLOW | Both | Browser ✔ | Invited staff can never get in: the invite links to a page the frontend doesn't have — **fixed** (page in 41eeb3b; crash fixed 22 Oct, QA-204) |
| QA-020 | Critical | FLOW | FE | Browser ✔ | Waitlist and contact forms send nothing; every lead is lost — **mostly fixed** (41eeb3b) |
| QA-204 | Critical | FLOW | FE | Browser ✔ | Invite link page crashes (no AuthProvider): no invited user can activate an account — **fixed** (22 Oct) |
| QA-206 | Critical | EDGE/data | BE | **Fixed** 22 Oct (backend bcb2e0b) | Setting the current year/term returns 500 and leaves two current years/terms |
| QA-212 | Critical | FLOW | FE | **Fixed** 22 Oct | Parent sign-up crashes on the first keystroke |
| QA-004 | High | SEC/EDGE | Both | Live ✔ | Payments can be double-submitted; a client-chosen receipt number causes a 500 — FE half **fixed** (41eeb3b); rest in QA-086 |
| QA-005 | High | SEC | BE | Live ✔ | AdminJS is mounted in production, never rate-limited, and can edit the ledger directly |
| QA-006 | High | SEC | BE | Code ✔ | Notification client logs OTPs and invite tokens and serves them on a LAN port |
| QA-007 | High | SEC | BE | Code ✔ | Accepting an invite re-activates a deactivated user; revoked invites can be resent |
| QA-008 | High | EDGE/SEC | Both | Live ✔ (partly); race not reproduced in browser | Multi-tab use: a refresh race logs out every session; signing in another tab swaps the identity |
| QA-009 | High | SEC | Both | Live ✔ Browser ✔ | Logout and password change never end the session on the server; tokens sit in localStorage with no CSP |
| QA-010 | High | SEC | BE | Live ✔ | Public invoice opens by its database UUID, never expires, isn't throttled, and exposes a staff email |
| QA-013 | High | SEC | BE | Live ✔ Browser ✔ | An Academic Head can create an Account Officer with a chosen password, then use it to handle money |
| QA-016 | High | SEC | Both | Live ✔ Browser ✔ | Teachers see every student in the school, with national IDs, guardian contacts and medical notes |
| QA-026 | High | FLOW | Both | Code ✔ | Parents can't use any real feature: every parent API call returns 403 and there is no parent UI |
| QA-027 | High | FLOW | Both | Browser ✔ | No forgot/reset password anywhere — **in progress** (backend on `main`; FE pages uncommitted) |
| QA-028 | High | FLOW | FE | Live ✔ Browser ✔ | Generate-invoices toast reads "Generated undefined … GHS 0.00" because the field names don't match |
| QA-030 | High | EDGE | FE | Code ✔ / Live ✔ | Lists silently cut off: classes at 10, payment student picker at 100, schools at 50 |
| QA-031 | High | FLOW | Both | Code ✔ | Fees KPI cards add up only the 20 invoices on screen |
| QA-032 | High | UX/data | FE | Code ✔ | Admission saves medical and personal defaults (O+, AA, Christian, Male…) the user never chose |
| QA-033 | High | FLOW | FE | Code ✔ | A new school can't be set up from the UI (no Principal assignment, no years/terms/classes/fees setup) — **partly fixed** (School setup page, uncommitted; see QA-075 to QA-079) |
| QA-034 | High | UX | FE | Code ✔ | Sample data looks real: the Overview, parent pages, attendance and admissions are mock-ups |
| QA-055 | High | FLOW/money | FE | Browser ✔ | Record Payment overwrites the amount the cashier typed once the balance finishes loading — **fixed** (41eeb3b) |
| QA-060 | High | Bug | BE | Live ✔ | Staff list of optional-service requests returned 500 — **fixed** (08c9ee3) |
| QA-061 | High | Data | Data, FE | Live ✔ | Flagged current term doesn't contain today; billing forms default to it (9 robotics bills went to Term 2) |
| QA-064 | High | EDGE/data | FE | Code ✔ | Design builder can save the previous design onto the version just opened |
| QA-065 | High | EDGE/data | FE | Code ✔ | Design edits in the last 1.2 s are lost on switch or leave; no unsaved-changes guard |
| QA-066 | High | FLOW | FE | Code ✔ | Publish can push an older design than the one on screen |
| QA-201 | High | SEC/UX | BE | Browser ✔ | Emails are case- and space-sensitive: capitalised login fails; duplicate accounts per mailbox |
| QA-207 | High | FLOW | Both | Browser ✔ | Classes have no order; promotion is one pupil at a time with no next-class suggestion |
| QA-208 | High | FLOW | Both | Browser ✔ | Revoking an invite locks that person out for good (Reactivate gives an account with no password) — **fixed** (22 Oct; backend `e14ddfc` on `main`) |
| QA-210 | High | FLOW/data | FE | Browser ✔ | Admission "Next" submits early: Health & Safety unreachable; no guardian required |
| QA-211 | High | FLOW | FE | Browser ✔ | Guardian contacts can't be viewed or corrected after admission, so parents may never link |
| QA-214 | High | SEC | Both | Browser ✔ | Staff unlink doesn't stick: the parent relinks immediately (safeguarding) |
| QA-222 | High | Money/UX | FE | Browser ✔ | Parent app "paid of" total counts carried bills again every term |
| QA-227 | High | Money/SEC | BE | Browser ✔ | An old "tamper-proof" public bill changes later (live class and balance) |
| QA-011 | Medium | SEC | BE | Live ✔ | Invoice job status can be read across schools (sequential ids) |
| QA-012 | Medium | SEC | BE | Live ✔ | No security headers; Swagger public; CORS `*` with credentials; unset `NODE_ENV` runs production as dev |
| QA-014 | Medium | SEC | BE | Live ✔ | User enumeration through register-parent, login timing and ward-link errors |
| QA-017 | Medium | FLOW | BE | Live ✔ | Exited students can still be paid against; their open invoices are never written off |
| QA-018 | Medium | EDGE | Both | Live ✔ | Terms can't be closed: past and future-dated writes are accepted; term dates aren't validated |
| QA-019 | Medium | EDGE | BE | Live ✔ | Payment input gaps: oversized amount returns 500, unvalidated `dueDate`, allocations not checked |
| QA-021 | Medium | SEC | BE | Suspected | A failed OTP send is never caught and can crash the API process |
| QA-022 | Medium | SEC/FLOW | BE | Live ✔ | Some paths skip module and suspension checks (public invoice, media, ward linking, queued jobs) |
| QA-023 | Medium | SEC | BE | Code ✔ | Throttling is keyed on IP+email, held in memory, spoofable through `X-Forwarded-For`, with no lockout |
| QA-024 | Medium | SEC | BE | Live ✔ | `PATCH /students/:id` lets a Secretary graduate or transfer a student, bypassing `students:exit` |
| QA-025 | Medium | SEC | BE | Code ✔ | `POST /users` can link a parent login to any child without the guardian-contact check |
| QA-029 | Medium | EDGE/UX | Both | Live ✔ | Overpayment accepted with no cap or warning (GHS 50,000 on a GHS 1,450 bill) |
| QA-035 | Medium | EDGE | Both | Browser ✔ | Role, permissions and modules go stale in an open page until reload; stored permission copies drift from the matrix |
| QA-036 | Medium | FLOW | Both | Browser ✔ | Non-teacher staff (Academic Head, Account Officer, Secretary) can't be listed, edited or re-activated |
| QA-037 | Medium | EDGE | FE | Browser ✔ | A failed refresh hard-redirects (draft lost); a network blip logs out; possible redirect loop |
| QA-038 | Medium | EDGE | FE | Code ✔ | Search races: no protection against stale responses; Students search isn't debounced |
| QA-039 | Medium | UX | FE | Browser ✔ (partly) | Failed loads show a toast, but the page also shows zeros as if the data were real; raw "Failed to fetch"; school mismatch logs out silently |
| QA-040 | Medium | UX/EDGE | FE | Code ✔ | Platform console: one-click deactivate, stale module drawer, can't clear optional fields |
| QA-041 | Medium | UX | FE | Code ✔ | Payment, invoice, receipt and admission modal friction |
| QA-042 | Medium | EDGE | BE | Code ✔ | Invoice modification reads outside its transaction and leaves later arrears stale; no audit trail |
| QA-044 | Medium | DOC | FE | Code ✔ | Marketing and login copy claim things the product doesn't do |
| QA-045 | Medium | SEC | BE | Suspected | `BaseRepository` stops filtering by school when none is in context (backup control) |
| QA-053 | Medium | FLOW | FE | Suspected | The in-progress fees `api.ts` reads lists as `data[]`+`meta`, but the backend returns `data.items` |
| QA-056 | Medium | FLOW | Both | Browser ✔ | Platform staff counts are wrong (overview says 3 staff, school page says 1) |
| QA-057 | Medium | FLOW | BE | Browser ✔ | Bill & report designs page returns 500: uncommitted entity column `layout` has no migration — **fixed** (backend 5bae8a2) |
| QA-062 | Medium | Money | BE | Code ✔ | Extra-bill duplicate check ignores term bills, so a fee can be charged twice |
| QA-067 | Medium | EDGE | Both | Code ✔ | Template edits have no conflict check; last save wins |
| QA-068 | Medium | FLOW | BE | Code ✔ | A published design that fails on real data breaks the parent bill; no fallback |
| QA-069 | Medium | FLOW | Both | Code ✔ | Code editor silently converts a visual design into a code design |
| QA-070 | Medium | UX/EDGE | FE | Code ✔ | Design builder error states: sticky preview errors, kind-switch races, silent rename failures |
| QA-072 | Medium | EDGE | Both | Code ✔ | Past terms stay editable on the calendar; closures change attendance totals after the fact |
| QA-073 | Medium | EDGE | FE | Suspected | Calendar term/class switch can show another term's events and stats |
| QA-075 | Medium | FLOW | Both | Code ✔ | A mistaken year, term or class can't be deleted |
| QA-076 | Medium | EDGE | Both | Code ✔ | Term and year dates aren't checked against each other (overlap, order, containment) |
| QA-077 | Medium | EDGE | BE | Code ✔ | Current year and current term can disagree |
| QA-080 | Medium | FLOW | FE | Code ✔ | Staff optional-requests page unreachable in committed code (route rule uncommitted) |
| QA-081 | Medium | SEC/UX | FE | Code ✔ | Parent sample-data mode has no production guard |
| QA-084 | Medium | Money/data | BE | Code ✔ | Renaming a fee type changes invoices already issued |
| QA-085 | Medium | Money | BE | Code ✔ | Structure penalty and due date ignored; bill prints a hard-coded 10% penalty |
| QA-086 | Medium | Money/EDGE | FE | Code ✔ | A cash payment can still be recorded twice after a timeout or closed modal |
| QA-200 | Medium | EDGE | BE | Browser ✔ | School codes case-sensitive and untrimmed |
| QA-202 | Medium | FLOW | Both | Browser ✔ | Pending principal invite invisible to Super Admin; two principal invites can be open |
| QA-203 | Medium | FLOW | BE | Browser ✔ | Plain-text email links broken (`token&#x3D;`) |
| QA-209 | Medium | EDGE | Both | Browser ✔ | Future birth date accepted at admission |
| QA-213 | Medium | UX | FE | Browser ✔ | Ward-link OTP errors flattened; no "start again" after lockout |
| QA-215 | Medium | Money | BE | Browser ✔ | GHS 0 invoice marked UNPAID and sent to parents |
| QA-216 | Medium | Money/FLOW | Both | Browser ✔ | One MoMo transfer can't cover several siblings |
| QA-217 | Medium | UX | FE | Browser ✔ | Fees KPI cards stale after payments and Refresh |
| QA-218 | Medium | FLOW | BE | Browser ✔ | Only one extra bill per fee type per term |
| QA-219 | Medium | UX/Money | BE | Browser ✔ | Public bill labels this term's extra bills "Bal B/f" |
| QA-220 | Medium | Money | BE | Browser ✔ | Credit not applied to new extra bills |
| QA-221 | Medium | Money/FLOW | FE | Browser ✔ | Extra bills can't be paid on their own |
| QA-223 | Medium | EDGE | Both | Browser ✔ | Promotion accepts a past, already-billed term |
| QA-224 | Medium | FLOW | Both | Browser ✔ | Exit dialog hides the outstanding balance |
| QA-225 | Medium | EDGE | BE | Browser ✔ | Attendance roster uses current class for past dates |
| QA-226 | Medium | UX | FE | Browser ✔ | Design preview needs the invoice UUID, not its number |
| QA-228 | Medium | FLOW | BE | Browser ✔ | Published design not used on public bill links |
| QA-229 | Medium | FLOW | Both | Browser ✔ | Paystack rejects some parent emails; raw error; no fallback |
| QA-231 | Medium | UX/trust | BE | Browser ✔ Code ✔ | The design preview shows another school ("Fastrack International School") instead of the user's own |
| QA-232 | Medium | FLOW/audit | Both | Code ✔ (DB) | Invoices from one billing run share no run ID: runs can't be undone, audited or re-sent as a unit |
| QA-233 | Medium | FLOW | Both | Code ✔ | Subject teachers can't be assigned (`staff_subjects` and `timetable_slots` exist but have no API or UI) |
| QA-236 | Medium | EDGE/data | BE | Browser ✔ | Making a year current leaves the current term in another year |
| QA-237 | Medium | EDGE | Both | Browser ✔ | Unticking the current term leaves the school with no current term, silently |
| QA-043 | Low | FLOW | BE | Code ✔ | Discounts stack to 100%, silently overwrite, and don't re-price issued invoices |
| QA-046 | Low | SEC | BE | Code ✔ | Super Admin permissions never checked; no rank check on invites; `isActive` field duplicates the endpoints |
| QA-047 | Low | SEC/data | BE | Code ✔ / Live ✔ | Config hygiene: seed passwords, secret reuse, DB TLS, email case, `$argon2` bypass, PII in logs, current-term flag |
| QA-048 | Low | EDGE | BE | Code ✔ | Arrays have no `ArrayMaxSize`; optional-fee `feeTypeId` not validated |
| QA-049 | Low | EDGE/SEC | BE | Code ✔ | Invite acceptance isn't atomic; media residuals (non-revocable signed URLs, no upload limit) |
| QA-050 | Low | UX | FE | Code ✔ | Four currency formats, four date formats, partial dark mode, accessibility gaps |
| QA-051 | Low | DOC/SEC | FE | Code ✔ | API URL defaults to Next's port; client-only guard; menus vs routes; hand-copied permission list |
| QA-052 | Low | DOC | BE | Code ✔ | Architecture docs out of date; three different list envelope shapes |
| QA-058 | Low | FLOW | Both | Browser ✔ | The new Calendar page can't be opened by any role: the backend never grants `calendar:read` — **fixed in code** (needs migration run and re-login) |
| QA-059 | Low | UX | FE | Browser ✔ | Login gives no message on an empty submit and repeats each error 3 times; Teacher's Students breadcrumb is blank |
| QA-063 | Low | UX | BE | Live ✔ | Whole-school invoice run message named one class — **fixed** (e28166d) |
| QA-054 | Low | Process | BE | Suspected | Something creates "Parent Ward Link Academy" in the **dev** database every few minutes |
| QA-071 | Low | UX/EDGE | Both | Code ✔ | Smaller design-builder gaps |
| QA-074 | Low | EDGE/UX | Both | Code ✔ | Smaller calendar gaps (overnight events, timed closures, stuck loader, +N more) |
| QA-078 | Low | UX | FE | Code ✔ | A failed read makes school setup look done |
| QA-079 | Low | EDGE | Both | Code ✔ | Smaller school-setup gaps (email, code, class codes, checklist) |
| QA-082 | Low | FLOW | BE | Code ✔ | Optional-service requests that should no longer be possible (orphaned, leavers, forced fees) |
| QA-083 | Low | UX/FLOW | Both | Code ✔ | Smaller optional-request gaps (issued bills, price, races, paging) |
| QA-087 | Low | EDGE/UX | Both | Code ✔ | Smaller fee-setup gaps (module gating, duplicates, huge amounts, lists) |
| QA-088 | Low | FLOW/UX | Both | Code ✔ | Invite page and lead-form edge cases — invite double sign-in **fixed** (22 Oct) |
| QA-205 | Low | DOC | BE | Code ✔ | Reset email says 30 minutes; the link lasts 60 |
| QA-230 | Low | UX | FE | Browser ✔ | Parent "Coming up" shows 3 events and leaves out the PTA meeting |
| QA-234 | Low | FLOW | Both | Code ✔ | Only one class teacher per class (no assistant or co-teacher) |
| QA-235 | Low | FLOW/data | BE | Code ✔ | Changing a class teacher overwrites it; no history of who taught the class each term |

---

## Critical

### QA-001: Concurrent payments lose credits
- **Side / status:** BE / Live ✔
- **Evidence:**
  - `modules/finance/payments/strategies/payment-processor.strategy.ts:46-69, 108-162`: plain SELECT, add in JS, save the absolute value.
  - `student-fee-account.repository.ts:93-130` does the same.
  - READ COMMITTED isolation (`payments.service.ts:88`).
  - The receipt advisory lock is taken after the balance write.
  - `docs/architecture/fees-and-billing.md` §5 wrongly calls this atomic.
- **Repro:** 5 parallel GHS 100 payments on one invoice give 5 `fees_payments` rows (GHS 500), but the invoice has `total_payment=100` and `balance=1350`. See live log #6.
- **Expected vs actual:** GHS 500 credited vs GHS 100. The school's ledger disagrees with its own receipts, and parents are chased for money they paid.
- **Fix:**
  - `SELECT … FOR UPDATE` on the invoice and fee-account rows, or a per-student advisory lock taken before any read.
  - Apply SQL deltas (`total_paid = total_paid + $1`).
  - Add an e2e test that checks final balances after concurrent payments, not just receipt uniqueness.
  - Run a one-off reconciliation script over production data.

### QA-002: Arrears counted twice
- **Side / status:** BE / Live ✔
- **Evidence:**
  - `invoice-generation.service.ts:313-326` sets the new invoice's `arrearsBf` to the account balance.
  - The prior invoice keeps its `balance>0`, and the payment waterfall pays it first (`student-fees-invoice.repository.ts:155-169`).
  - `test/student-fees-lifecycle.e2e-spec.ts:753-783` only checks `totalPayment`.
- **Repro (live #7):**
  1. Term 1 is GHS 1450; pay 400.
  2. Generate Term 2: arrears 1050, balance 2500.
  3. Pay 2500.
- **Expected vs actual:** expected both invoices settled. Actually the account balance is 0, but the Term 2 invoice still shows GHS 1050 outstanding (PARTIAL on the parent-facing bill).
- **Fix:** when arrears roll forward, close the prior invoices as "carried forward", or keep arrears out of invoice balances and treat the account as the single debt record. Add a regression test.

### QA-003: Suspending a school has no effect
- **Side / status:** Both / Live ✔
- **Evidence:**
  - `schools.is_active` is written by `school-admin.service.ts:49-53`.
  - It is never read by `auth.service.ts:53-133` (login and refresh), `jwt.strategy.ts:30-46`, the guards, invite acceptance, the public invoice or the job processors.
  - FE `platform/page.tsx:217-235` and `SchoolDetail.tsx:83-103` show success.
- **Repro (live #8):** deactivate RIV, then login returns 200, payment 201 and refresh 200.
- **Expected vs actual:** the suspended school's users are blocked vs everything works, including collecting fees.
- **Fix:**
  - Reject inactive schools in `JwtStrategy.validate`, login, refresh, invite accept and the job processors (Super Admin exempt).
  - Revoke the school's refresh tokens on deactivate.
  - FE: confirmation modal plus a "school suspended" screen.

### QA-015: Invited staff can never get in
- **Side / status:** Both / Code ✔
- **Evidence:**
  - BE `invitations.service.ts:315-320` emails `${FRONTEND_URL}/auth/setup-password?token=`.
  - FE has no such route under `src/app`.
  - `GET /auth/verify-invite` and `POST /auth/setup-password` exist (`auth.controller.ts:38,54`).
  - An account without a password gets "Invalid credentials" on login.
- **Repro:** Principal → Staff → Invite teacher → open the email link (404) → try to sign in (401).
- **Fix:** add the FE `/auth/setup-password` page (verify, set password, sign in) with expired and revoked states. Add an e2e test of the full invite journey.

### QA-020: Waitlist and contact forms discard leads
- **Side / status:** FE / Code ✔
- **Evidence:** `components/organisms/WaitlistForm/WaitlistForm.tsx:30-34, 85`; `ContactSection.tsx:31-35`. Both use a simulated delay and send no request, and the success card promises login credentials.
- **Fix:** POST to the backend, a CRM or a form service with spam protection; add an error state; make the copy honest. This is the only marketing conversion path, so every lead so far has been lost.

## High

### QA-004: Double-submitted payments; client-chosen receipt numbers
- **Side / status:** Both / Live ✔
- **Evidence:**
  - BE: no idempotency key; `transactionReference` isn't unique; `record-payment.dto.ts:128` accepts `receiptNumber`.
  - No handler for unique-constraint error 23505 (→ 500).
  - Receipt numbering uses `MAX(suffix)`, so a typed `…/999999` shifts every later receipt.
  - FE: `RecordPaymentModal.tsx:64-111`: the modal can be closed with Esc mid-save; no request timeout.
- **Repro (live #9, #10):** the same body (`MTN-123`) twice gives 201, 201. The same `receiptNumber` twice gives 201, then 500.
- **Fix:**
  - `Idempotency-Key` header, generated once each time the modal opens.
  - Unique `(school, method, txn_ref)` for non-cash payments.
  - Server-issued receipt numbers only.
  - Map 23505 → 409.
  - Block closing the modal while saving.

### QA-005: AdminJS
- **Side / status:** BE / Live ✔ (rate limit)
- **Evidence:**
  - Always mounted (`main.ts:11` → `bootstrap/configure-app.ts:24-26`).
  - The login route sits outside Nest's throttler (`adminjs/admin.setup.ts:190-200`); 30 wrong logins all returned 200.
  - Sessions use the in-memory store, have no `sameSite`, last 24h, and aren't re-validated.
  - Invoice `balance`/`totalPayment`/`arrearsBf` and payment `amountPaid`/`receiptNumber` are editable, bypassing the ledger.
  - Deletes are hard deletes, and `withTenantScoping` does nothing.
- **Fix:** see backend `docs/architecture/adminjs.md` §7. In short: an `ADMIN_ENABLED` flag (off in production by default), rate limit plus lockout, Redis session store, read-only finance resources, and an audit log.

### QA-006: Notification client leaks secrets
- **Side / status:** BE (third party) / Code ✔
- **Evidence:**
  - `node_modules/@relu-interactives/notification-client/dist/index.js:243,409` logs the payload, including OTP codes and invite links.
  - In dev mode (`:81-229`) it serves each message on port 80-89 on all interfaces and runs `open`.
  - `notification.config.ts` enables dev mode when the API key is missing, even in production.
- **Fix:** allow dev mode only when `NODE_ENV=development`; refuse to boot in production without the key; `pnpm patch` out the payload logging.

### QA-007: Invite reactivates deactivated users
- **Side / status:** BE / Code ✔
- **Evidence:**
  - `invitations.service.ts:295-306` sets `isActive=true` on accept.
  - Deactivation doesn't revoke pending invites (`users.service.ts:156-171`, `staff.service.ts:153-162`).
  - Resend re-opens REVOKED/EXPIRED invites (`:173-191`), and EXPIRED status isn't checked on accept.
  - FE `StaffPage.tsx:186-209` shows Resend on revoked invites.
- **Fix:** accept only PENDING invites; revoke them on deactivate; never reactivate an explicitly deactivated user; reject resend of revoked invites.

### QA-008: Multi-tab session failures
- **Side / status:** Both / Live ✔ (reuse detection), Code ✔ (swap)
- **Evidence:**
  - FE `lib/api-client.ts:61-68`: only one refresh at a time within a tab, nothing across tabs. The backend treats a reused refresh token as theft and revokes the whole family (live #23).
  - `api-client.ts:34-50` reads the token on every request, and `auth-context.tsx` has no `storage` listener. Signing in as another user in tab B makes tab A send tab B's token under tab A's UI.
- **Browser:** two tabs with an expired access token reloaded at the same moment both stayed signed in, so the race didn't trigger in this attempt. It depends on timing; the code path above is still unguarded.
- **Fix:** a cross-tab lock (Web Locks or BroadcastChannel) and re-reading storage before refreshing; a short backend grace window for the previous token; a `storage` listener that resets the app when the user changes.

### QA-009: Sessions aren't revoked
- **Side / status:** Both / Live ✔
- **Evidence:**
  - FE `auth-context.tsx:139-142` logs out locally only and never calls `POST /auth/logout`; refresh tokens then keep working (live #24).
  - BE `auth.service.ts:140-157`: change-password doesn't revoke refresh tokens (they last 14/30/60 days).
  - Tokens are in localStorage; `next.config.mjs` has no CSP.
  - There is no change-password UI (FE F-34).
- **Fix:** call logout; revoke tokens on password change, deactivation and suspension; move the refresh token to an HttpOnly cookie and keep the access token in memory; add a CSP; add an account menu.

### QA-010: Public invoice link
- **Side / status:** BE / Live ✔
- **Evidence:**
  - Links are built from `invoice.id` (`invoice-view-url.ts`, `invoice-batch.writer.ts:99-102`).
  - The lookup accepts the UUID or the 16-byte token (`student-fees-invoice.repository.ts:234-241`).
  - No expiry, throttle, suspension or module check; the response includes `signedByEmail`.
  - Live #16: 200 with no auth.
- **Fix:** 32-byte token only (stored as a hash), expiry and rotation on send-link, throttling, drop the staff email.

### QA-013: Academic Head privilege escalation
- **Side / status:** BE / Live ✔
- **Evidence:**
  - `users.service.ts:53-64` blocks only SUPER_ADMIN and PRINCIPAL as target roles.
  - A supplied password activates the account at once (`user-provisioning.service.ts:44-50`).
  - Live #31: Academic Head creates an Account Officer, logs in as it, and records a payment.
- **Fix:** a creation policy that mirrors `user-administration.policy.ts` (Principal → AH/AO/SE/TE; AH → TE/SE). Allow `password` only for Super Admin; everyone else goes through invitations.

### QA-016: Teachers see the whole school
- **Side / status:** Both / Live ✔
- **Evidence:**
  - The matrix comment promises "scoped to assigned classes" (`common/auth/role-permissions.matrix.ts:190`), but `student-query.service.ts:113-147` filters by school only.
  - Live #28: the teacher received every student, including `guardianContact` and `nationalId`.
  - Medical notes are on the detail endpoint.
  - FE `rbac/routes.ts:23-27` lets teachers open `/students`.
- **Fix:** scope by homeroom and `staff_subjects`; return a reduced DTO for teachers; FE hides the sensitive columns. This involves children's data, a Data Protection Act 2012 concern.

### QA-026: Parents are locked out
- **Side / status:** Both / Code ✔
- **Evidence:**
  - A parent's `schoolId` is null, so `common/guards/module.guard.ts:56-63` returns 403 on fee routes.
  - `tenant-context.ts:45-50` blocks academic routes.
  - The parent branches in `invoice-query.service.ts` and `payments.service.ts` can never run.
  - FE parent pages are fixtures; there is no register or link-child UI.
  - Backend audit item 1.2 is still open.
- **Fix:** ward-scoped routes `/parents/me/wards/:id/{invoices,receipts,…}` that check the module against the ward's school; FE pages for register, link child (OTP) and wards. Until then, don't market the parent experience.

### QA-027: No password recovery
- **Side / status:** Both / Code ✔
- **Evidence:** no endpoint (`POST /auth/forgot-password` → 404); an unused template at `infrastructure/notification/index.ts:194-210`; no link on the login page.
- **Fix:** forgot and reset endpoints (always 204, throttled, revoke sessions on reset) plus FE pages.

### QA-028: Generate-invoices response mismatch
- **Side / status:** FE / Live ✔
- **Evidence:**
  - FE `features/fees/api.ts:181-190` and `GenerateInvoicesModal.tsx:55-58` read `totalInvoicesGenerated` and `totalFeePayable`.
  - The live response is `{generatedCount, skippedCount, totalProcessed, termLabel, …}`.
  - The toast says "Generated undefined … GHS 0.00", and skipped counts are never shown.
- **Fix:** map the real fields and add a contract test that shares types with the backend.

### QA-030: Lists silently cut off
- **Side / status:** FE / Code ✔ (limits confirmed live: max 100)
- **Evidence:**
  - Classes are requested without a limit, so the backend default of 10 applies (`students/page.tsx:167`, `fees/api.ts:210`). Admission, filters and invoice generation miss classes 11 and up.
  - The payment student picker loads 100 (`fees/api.ts:212-214`).
  - Staff and invitations load 100 (`staff/api.ts:51,54`).
  - Platform schools load 50 with client-side search (`platform/page.tsx:128, 287-299`).
- **Fix:** server-side search selects (`search`, `status=Active`), real totals and paging.

### QA-031: Fees KPIs cover one page
- **Side / status:** Both / Code ✔
- **Evidence:** `features/fees/FeeMetrics.tsx:10-14` adds up only the visible page (`PAGE_SIZE=20`); filtering by PAID makes "Outstanding" read GHS 0.00.
- **Fix:** a backend `GET /schools/me/invoices/summary`; until then, label the cards "this page".

### QA-032: Invented admission data
- **Side / status:** FE / Code ✔
- **Evidence:** `students/page.tsx:92-131` defaults are always sent (`:292-337`): blood group O+, genotype AA, Christian, Male, Primary, Day, "Mother".
- **Fix:** empty defaults; gender explicitly required; don't send medical fields the user didn't touch. Clean existing records.

### QA-033: No onboarding path
- **Side / status:** FE / Code ✔
- **Evidence:**
  - No UI for `POST /super-admin/schools/:id/school-head`, academic years and terms, classes, or fee types and structures (the latter are being added in uncommitted work).
  - `SchoolDetail.tsx:174-177` shows "Not assigned".
- **Fix:** an "Assign Principal" action plus a school setup checklist (year → terms → classes → fees → staff).

### QA-034: Sample data looks real
- **Side / status:** FE / Code ✔
- **Evidence:**
  - `dashboard/Overview.tsx`, `phase-one/Workspace.tsx:86-145`, and `fixtures.ts:445-470` (a parent sees "Fees remaining GH₵ 850" for children who aren't theirs).
  - `attendance/page.tsx:30-41, 117-124`: hard-coded roster and buttons that do nothing; there is no backend attendance API.
  - Admissions portal: enrolment is local state only.
- **Fix:** a live landing page for staff, honest empty states, and preview pages either disabled or clearly marked.

## Medium

| ID | Evidence | Fix |
|---|---|---|
| QA-011 | `invoices.controller.ts:134-160` (also the super-admin variant `:133`); live #17 read RIV's job as FIS | Compare `job.data.schoolId`; 404 on mismatch; UUID job ids |
| QA-012 | No helmet, `X-Powered-By` sent; `main.ts:12` Swagger always on; `configure-app.ts:37-38` `origin ?? '*'` + credentials; `env.validation.ts:49-50` defaults `NODE_ENV` to dev (live #25-27) | helmet; gate Swagger; require `CORS_ORIGINS` and `NODE_ENV` in production |
| QA-014 | `auth.service.ts:188-191` register-parent 409 for staff emails (live #22); login skips the hash for unknown emails (timing); `parents.service.ts:91-133` distinct ward-link errors | Uniform responses, a dummy hash for unknown emails, email verification |
| QA-017 | `student-resolver.strategy.ts:32-44` (single student, no status filter for payments); live #18: a payment for a Transferred_Out student was accepted, and the open invoice stayed at GHS 1440. Generation for the exited student was correctly refused (live #19) | Block or confirm payments for exited students; write off or settle on exit |
| QA-018 | Terms have only `isCurrent`; no status/close; `paymentDate` 2030 accepted (live #12); `setCurrent` writes term and year separately with no transaction; start > end accepted (`academic-years.service.ts:30-52`). The FE closed-term read-only rule is preview-only (`phase-one/domain.ts:21-23`) | Term status OPEN/CLOSED, `assertTermWritable`, a close endpoint, date checks |
| QA-019 | `amount` with no upper bound → 500 (live #11); `dueDate` unvalidated; allocations aren't validated against fee types and `amount` is ignored when both are sent (`fee-calculation.helper.ts:50-69`) | `@Max`, `@IsDateString`, mutually exclusive amount/allocations |
| QA-021 | `infrastructure/otp/otp.service.ts:85,141` `void sender.otp()` with no `.catch`; Node 24 exits on an unhandled rejection | `.catch(log)` or send through the queue |
| QA-022 | Public invoice served while `fees` is disabled (live #21); `/api/media` doesn't check the `students` module; optional fees gated by `students`, not `fees`; queued jobs don't re-check suspension, module or actor | Check module and suspension on every path, including the job processors |
| QA-023 | `common/throttling/sensitive-route-throttler.guard.ts:25-36` keys on IP+email; in-memory storage (`app.module.ts:47-53`); `TRUST_PROXY=true` trusts `X-Forwarded-For`; AdminJS uncovered | IP-only limit, Redis storage, per-account lockout, hop-count proxy trust |
| QA-024 | `students.controller.ts:104-117` needs only `students:update`; `student-enrollment.service.ts:87-102` sets status/class directly (live #33) | Remove `status`/`classId` from `UpdateStudentDto`; route through `/exit` and `/promote` |
| QA-025 | `users.service.ts:83-131` links `studentIds` with only a school check, bypassing `student-guardian.service.ts:56-66` | Remove `studentIds` or route through the guardian service |
| QA-029 | `payment-processor.strategy.ts:62-67,140-143`; live #14 accepted GHS 50,000 on a GHS 1,450 bill; FE `RecordPaymentModal.tsx:45-78` allows submit before the balance loads | Explicit overpayment/credit handling with confirmation; FE waits for the balance |
| QA-035 | FE `auth-context.tsx:71-109` never refreshes the profile or modules; `policy.ts:64-66` treats unknown modules as allowed; BE stores a copy of the role defaults per user (`user.repository.ts:221-229`, `permission-resolver.ts:16-23`), so matrix changes need data migrations, and `[]` can't express "no permissions" | Use the user from the refresh response, refetch on focus and on 403; store only overrides |
| QA-036 | `user.repository.ts:264-277` staff list is TEACHER-only; `GET /users` is Super Admin only; no activate endpoint; FE directory shows teachers only | Generalise the staff routes to all school roles; add activate |
| QA-037 | `api-client.ts:95-97` clears the session on a network error; `:127-131` redirects without `?next`; `:72,90-94` null paths don't clear (possible loop) | Clear only on a 401 from refresh; keep `?next`; ideally re-authenticate in place |
| QA-038 | `students/page.tsx:195-236` sends 2 requests per keystroke with no abort; `FeesPage.tsx:101-117` has no stale guard; `InvoicesTab.tsx:56-57` resets the page and fires a request with the old search | Debounce plus AbortController or request ids |
| QA-039 | `students/page.tsx:187-189`, `platform/page.tsx:127-150` (allSettled makes the catch dead code), `AppShell.tsx:79-90`, `auth-context.tsx:52-60`; raw "Failed to fetch" (`api-client.ts:116-119`) | Inline errors plus Retry; tell "not configured" apart from "failed"; friendly network errors; a request timeout |
| QA-040 | `platform/page.tsx:688-700` one-click deactivate, no pending state; `:159-194` module drawer shows the previous school's switches if the load fails; `SchoolDetail.tsx:547-554` can't clear fields | Confirmation modal, state reset, send null for cleared fields |
| QA-041 | `ReceiptModal.tsx:45-68` prints the whole page, "PAID & VERIFIED" on part payments, raw ISO date, first allocation only; `GenerateInvoicesModal.tsx:84-110` "undefined • undefined", past due dates allowed, no preview; admission modal: Esc discards 4 steps, late term check, exam score dropped (`students/page.tsx:111, 282-285, 692-695`) | See frontend-architecture and user-flow docs; add confirmation and preview steps |
| QA-042 | `invoice-modification.service.ts:70-92` reads payments outside the transaction; later invoices keep stale arrears; no audit table | Lock rows; block edits when a newer invoice exists; audit log |
| QA-044 | `login/page.tsx:24-43,142` (260+ schools, 99.98% uptime, "Port 3001"); `schoolModules.ts` (MoMo integration, SMS, payroll, QR IDs, a Student role); `ComingSoonTemplate.tsx:25-49` countdown resets every visit | Copy review before launch |
| QA-045 | `infrastructure/database/repositories/base.repository.ts:103-112` runs unscoped without a school; `tenant-context.middleware.ts:20-46` reads `x-school-id` before auth. No leak found today | Fail closed with an explicit `withoutTenantScope()` |
| QA-053 | Uncommitted `src/features/fees/api.ts` expects `data[]`+`meta`; the backend (without `X-Api-Contract: 2`) returns `data:{items,total,…}` for invoices, payments, fee structures and discounts | Send `X-Api-Contract: 2` from `api-client` or parse `items`; check before committing |

## Low

| ID | Evidence / fix |
|---|---|
| QA-043 | `discounts.service.ts`: discounts add up and are capped at gross (60%+50% = free); creating a discount silently replaces one for the same student, fee type and term; issued invoices aren't re-priced. Decide the policy and show a warning. |
| QA-046 | `permissions.guard.ts:35-37` skips Super Admin, so any SA can create more SAs; invitation resend/revoke has no rank check (`invitations.service.ts:124-136,173-225`); `UpdateStaffDto.isActive` lets an AH re-activate someone the Principal deactivated. |
| QA-047 | Seed users all use `S3curePassw0rd!` with no production guard; invoice, admin-cookie and media secrets fall back to `JWT_SECRET`; DB TLS `rejectUnauthorized:false`; case-sensitive email uniqueness; `user.entity.ts:89` stores any value starting with `$argon2` raw; AuthService logs email addresses at LOG level; the seed sets no `is_current` term (the API falls back to dates). |
| QA-048 | No `@ArrayMaxSize` on any array DTO (allocations, line items, batch fee structures, `studentIds`, `moduleIds`); optional-fee `feeTypeId` not validated. |
| QA-049 | `invitations.service.ts:265-313`: two parallel accepts both succeed; signed media URLs can't be revoked (TTL up to 7 days); no upload rate limit; PDFs not sanitised. Working correctly: magic-byte checks, EXIF stripping, path traversal blocked, cross-school media 404s. |
| QA-050 | Currency shown 4 ways (`fees/money.ts`, `phase-one/domain.ts:198`, `AppShell.tsx:237`, `platform/page.tsx:478`) and dates 4 ways; dark mode key mismatch (`MantineThemeProvider` vs `ColorSchemeScript`); white-on-white platform top bar, unlabelled icon buttons and inputs, platform not responsive. |
| QA-051 | `api-client.ts:1` defaults to `localhost:3000` (Next's own dev port); no `middleware.ts`; URL-only routes not in menus (Secretary → attendance, AH → admissions, Teacher → students, AO → students and staff; the browser pass confirmed each, and found Teacher → staff is correctly redirected); `scripts/check-dashboard.cjs:33-91` hand-copies the backend matrix and `permissions.ts` lacks `school_profile:manage` and `student_fee_preferences:manage`. |
| QA-052 | `docs/architecture/domain-modules.md:96-108` lists routes that don't exist; `request-lifecycle.md` omits PermissionsGuard and school `isActive`; `fees-and-billing.md` claims atomic updates, an `OVERPAID` status and `DELETE fee-types` that don't exist; `end-to-end-api-flow.md` uses the wrong page keys; `endpoint-audit-issues.md` lists fixed items as open; three list envelope shapes. |
| QA-054 | During this audit the **dev** database `fastrack` gained a "Parent Ward Link Academy" school every ~10 minutes (29 since midnight on 20 Oct). This QA run didn't cause it (it used `fastrack_qa`). It looks like an e2e or script run pointed at the dev database; check and clean up. |

## Found in the browser walk-through

Headless Chromium against the frontend dev server (`:3101`) and a throwaway backend (`:3100`, database `fastrack_qa`), signed in as each of the six staff roles of FIS-001. There's no seeded parent account, so the parent pages weren't walked. Screenshots are in [screenshots/](./screenshots/).

### QA-055: Record Payment overwrites the amount the cashier typed
- **Side / status:** FE / Browser ✔ · **Severity:** High
- **Evidence:** `src/features/fees/RecordPaymentModal.tsx:45-62`. Picking a student starts a balance lookup and, when it returns, calls `setAmount(latest.balance)` without checking whether the user has already typed an amount. The amount box and the submit button stay enabled while "Fetching student ledger debt…" shows.
- **Repro:**
  1. As the Account Officer, open Record Payment.
  2. Pick Yaw Agyemang.
  3. Type 50 straight away and submit.
- **Expected vs actual:** expected a GHS 50 payment. The balance lookup finished after the typing and replaced 50 with 1,450, so receipt RCT/FIS-001/2026/0001 was issued for **GHS 1,450.00** (confirmed in `fees_payments`). Screenshot: `flow-fees-payment-form.png` shows 50 typed while the lookup is still running.
- **Why it matters:** on a slow mobile connection this happens to anyone who types quickly. A wrong-amount receipt can't be undone from the UI.
- **Fix:**
  - Prefill only if the amount field is still empty and untouched.
  - Disable the amount field and submit button while the balance loads.
  - Ask for confirmation when the amount equals the full balance and differs from what was typed.

### QA-056: Platform staff counts are wrong
- **Side / status:** Both / Browser ✔ · **Severity:** Medium
- **Repro:** sign in as Super Admin. The overview card says **Total staff 3** (the two schools have 10 staff users), and FIS-001's detail page says **Staff 1** (it has 4 staff besides the Principal). Screenshot: `flow-sa-platform.png`.
- **Cause:** it looks like only teachers are counted, the same gap as QA-036.
- **Fix:** count every staff role, or label the card "Teachers".

### QA-057: Bill & report designs page returns 500
- **Side / status:** BE / Browser ✔ · **Severity:** Medium (in-progress work)
- **Repro:** as Principal, open `/school-admin/templates`. `GET /api/schools/me/document-templates?kind=invoice.bill` returns 500, and the backend logs `column DocumentTemplate.layout does not exist`.
- **Cause:** the uncommitted change to `infrastructure/database/entities/document-template.entity.ts` adds a `layout` column, but no migration adds it. Screenshot: `principal-templates.png`.
- **Fix:** add the migration before committing the entity change.

### QA-058: The new Calendar page can't be opened
- **Side / status:** Both / Browser ✔ · **Severity:** Low (in-progress work)
- **Repro:** every role that opens `/school-admin/calendar` is redirected to the dashboard.
- **Cause:** `src/lib/rbac/routes.ts:48-51` requires `calendar:read`, which the backend's role-permission matrix never grants.
- **Fix:** add `calendar:read` and `calendar:manage` to the backend matrix, with a migration for stored role permissions, and to `scripts/check-dashboard.cjs`.

### QA-059: Login and navigation polish
- **Side / status:** FE / Browser ✔ · **Severity:** Low
- **Login:**
  - Submitting an empty form shows nothing.
  - One wrong password shows "Invalid credentials" three times: two inline alerts and a toast. The toasts pile up on each retry.
  - Screenshot: `flow-login-errors.png`.
- **Breadcrumb:** the Teacher's breadcrumb on `/students` is blank ("Workspace ›") because the page isn't in their menu.
- **Good:** wrong-password and unknown-email attempts get the same message, so the login doesn't reveal which accounts exist.

### What the browser showed for existing findings

| ID | What the browser showed |
|---|---|
| QA-003 | Super Admin clicked Deactivate and got "School deactivated". The Principal then signed in fresh and saw the student list, and the Account Officer's open session carried on. |
| QA-004 | Double-clicking "Record Payment & Print Receipt" sent only one request; the button's loading state protects the UI. The backend gap remains for retries and other clients. |
| QA-009 | Logout clears the browser's storage but never calls `/auth/logout`. The old refresh token still returned 200 afterwards. |
| QA-013 | The Academic Head's Invite dialog offers Account Officer and Academic Head. Sending an Account Officer invite returned 201 with "will receive an email to set up their account" (`flow-ah-invites-ao.png`). |
| QA-015 | `/auth/setup-password?token=…`, the link in the invite email, is a 404 (`flow-invite-link.png`). |
| QA-016 | Teacher opens `/school-admin/students` by URL and sees the whole school with guardian names and phone numbers (`teacher-students.png`). |
| QA-020 | The waitlist shows "Registration Received… we will send login credentials to qa@example.com", and Contact shows "Message Sent Successfully!". Neither sent any request (`flow-waitlist-submitted.png`). |
| QA-027 | There's no "Forgot password" link on the login page, and `/school-admin/forgot-password` is a 404. |
| QA-028 | After Generate Invoices, the toast reads "Generated undefined student invoices totaling GHS 0.00" (3 invoices were created). |
| QA-035 | With Fees switched off mid-session, the open page showed three "module is not enabled" errors but kept Record Payment and Generate. A reload, not a fresh sign-in, removed the menu item and redirected to the dashboard. |
| QA-036 | The Staff page lists only Kwame Mensah (teacher). The Academic Head, Account Officer and Secretary aren't shown (`flow-staff.png`). |
| QA-037 | When the refresh request failed with a network error, the user was sent to login and storage was wiped. |
| QA-039 | With a failing invoices request, an error toast appears. But the KPI cards show GHS 0.00 and the table says "No invoices match your search or filter", as if the data were real (`flow-api-failure-fees.png`). |
| QA-044 | The waitlist page lists payroll, MoMo reconciliation and attendance SMS as "READY". |
| — | Each role lands on the right page, and every page outside a role's rules redirects to the dashboard. At 390 px wide, Dashboard, Students, Fees and Staff have no horizontal scroll. |

## Found while integrating the merged backend (21 October 2026)

Checked against the backend on localhost:3000 (`main` a5478b9 plus the branches named below), signed in as the Principal and a parent of Fastrack International School.

### QA-060: Staff list of optional-service requests returns 500 — **Fixed**
- **Side / status:** BE / Live ✔ · **Severity:** High
- `GET /schools/me/optional-fee-requests` returned 500 with any query, so `/school-admin/fees/requests` couldn't load. `pending-count` worked.
- **Cause:** `optional-fee-request.repository.ts:61` ordered by the raw column `request.created_at` with joins plus `skip`/`take`.
- **Fix:** backend 08c9ee3 (`fix/optional-fee-requests-list`), with an e2e test. Re-checked: no params, `page`/`limit`, `status`, and page 2 all return 200, and a created request shows every joined field.

### QA-061: The flagged "current" term doesn't contain today, and billing defaults to it — **Open (data + FE)**
- **Side / status:** Data, FE / Live ✔ · **Severity:** High
- FIS-001 has Term 2 (2027-01-08 to 2027-04-09) flagged `isCurrent`, while today falls in Term 1 (2026-09-01 to 2026-12-18).
- **Effect:** Fees & Billing takes its term from `/academic-terms/current`, so Generate Term Invoices and Extra bill both default to Term 2. A whole-school robotics extra bill went to Term 2: 9 invoices of GHS 500, INV/FIS-001/2026/0030 to 0038.
- **Backend side, fixed:** attendance defaults used the flagged term, which gave from > to (a 400 for parents, and 0 school days in the summary). 8301857 now uses the term containing today.
- **Still to do:**
  - Correct the flag in School setup if Term 2 was set early by mistake.
  - Decide what happens to the 9 Term 2 robotics bills.
  - Consider having the billing forms start on the term containing today, and show the chosen term's dates.

### QA-062: An extra bill can charge a fee already on the term bill — **Open (BE)**
- **Side / status:** BE / Code ✔ · **Severity:** Medium
- The supplementary duplicate check (`findExistingSupplementaryLineItems`) only looks at `supplementary` invoices. A fee type in a class's fee structure lands on the term bill, and an extra bill for the same fee type and term charges it again.
- **Repro:**
  1. Add a fee structure for fee type X to class C in term T.
  2. Generate term invoices for T.
  3. Create an extra bill for X, C and T with the amount empty.
  4. Pupils in C now owe X twice.
- **Fix:** also skip pupils whose `regular_term` invoice for T already has a line for X, or warn in the form.

### QA-063: Invoice-run message names one class for a whole-school run — **Fixed**
- **Side / status:** BE / Live ✔ · **Severity:** Low
- A whole-school extra bill that charged Primary 1 (8 pupils) and Primary 2 (1 pupil) said "…for robotics fee (Term 2) (Primary 1)". The class came from the first pupil processed (`invoice-generation.service.ts:728`; the term run had the same bug).
- **Fix:** backend e28166d (`fix/invoice-run-class-label`) uses the requested class, or "whole school". The frontend shows only the message, so it needed no change.

## Edge-case pass on the newer features (21 October 2026)

This is a code-reading pass over the features built after the audit:
- bill and report designs
- calendar
- school setup
- optional-service requests
- fee setup

It also re-checks the fixes in frontend `41eeb3b`. The backend was read on `fastrack-backend` `fix/invoice-run-class-label` (same code as `main` at `8301857`). Each feature's flow doc lists its gaps under "Known gaps":
- [document-templates.md](../user-flows/document-templates.md)
- [calendar.md](../user-flows/calendar.md)
- [school-setup.md](../user-flows/school-setup.md)
- [optional-service-requests.md](../user-flows/optional-service-requests.md)
- [fees-invoices-payments.md](../user-flows/fees-invoices-payments.md)

FE paths are relative to `src/features/<feature>/` unless shown in full. Nothing here was run in a browser.

### Status of earlier findings

| ID | Now | Evidence |
|---|---|---|
| QA-004 | **Frontend half fixed.** One `Idempotency-Key` per payment attempt and an in-flight guard (`fees/RecordPaymentModal.tsx:46,56,86`). The backend honours the key: 409 on a repeat, backed by the unique index `UQ_PAYMENTS_SCHOOL_IDEMPOTENCY_KEY`. What's left is QA-086. | 41eeb3b |
| QA-015 | **Fixed** (22 Oct, with QA-204). Before that: **partly fixed.** `/auth/setup-password` verifies the invite, sets the password and signs in. The working-tree version imports the untracked `src/app/auth/AuthShell.tsx`, so committing the page alone breaks the build. Edge cases are in QA-088. | 41eeb3b |
| QA-020 | **Mostly fixed.** The forms post to the backend's `POST /public/leads`, which is throttled and stores leads in `marketing_leads`. The waitlist success message still promises "login credentials" (`WaitlistForm.tsx:112`). | 41eeb3b |
| QA-027 | **In progress.** The backend has forgot-password, reset-password verification and reset-password on `main`. The frontend pages and the "Forgot password?" link exist only as uncommitted work. | working tree |
| QA-030 | Also applies to the discount student picker (`fees/api.ts:431-433`, `limit=100`). | Code ✔ |
| QA-033 | **Partly fixed.** The School setup page adds years and terms, departments, classes, the school profile and a checklist. Platform "Assign principal" is also added. All of it is uncommitted. Still missing: deleting items (QA-075), date checks (QA-076), keeping the current year and term in step (QA-077), and a fee-structure step. | working tree |
| QA-043 | Re-confirmed. The frontend also shows "Discount added" when the backend actually replaced an existing discount (`fees/DiscountModal.tsx:81-85`; `discounts.service.ts:87-112`). | Code ✔ |
| QA-055 | **Fixed.** A typed amount is never replaced (`fees/RecordPaymentModal.tsx:38-42,66-70`). The typed amount does carry over when you pick a different student (`:57`). | 41eeb3b |
| QA-057 | **Fixed.** Migration `1792500000800-AddDocumentTemplateLayout` (backend 5bae8a2). It is already applied to the local dev database. | Code ✔ |
| QA-058 | **Fixed in code.** `calendar:read` and `calendar:manage` are now granted on both sides, and migration `1792600000100-GrantCalendarPermissions` backfills them for existing users. For it to work, the migration must be run and existing users must sign in again. | Code ✔ |

### Bill and report designs

#### QA-064: Switching design version can save the previous design onto the one just opened
- **Side / status:** FE / Code ✔ (that it persists is Suspected) · **Severity:** High
- **Evidence:** `builder/TemplateBuilder.tsx:153-163,177-201`.
  - `open()` changes `currentId` straight away.
  - The autosave effect then runs with `debouncedLayout`, which still holds the previous design for 1.2 s.
- **Repro:** with two bill drafts, open A, then pick B in the version select. The next `PATCH` to B carries A's blocks. If the page is left within 1.2 s, or the requests land out of order, B keeps A's design. Switching between bill and report does the same and fails with a 400.
- **Fix:** debounce `{id, layout}` together and skip the save when the ids differ. Remount the builder for each template.

#### QA-065: Edits made in the last 1.2 s are lost; no unsaved-changes guard
- **Side / status:** FE / Code ✔ · **Severity:** High
- **Evidence:** `TemplateBuilder.tsx:177` (1200 ms debounce), `:153-163` (`open` resets state), `:232`. There's no `beforeunload` handler or route guard anywhere in the feature.
- **Repro:** edit a section's text, then within 1 s switch version or leave the page. The edit is gone.
- **Fix:** save any pending edit before `open`, publish or unmount. Warn on leave while the layout differs from the last saved one.

#### QA-066: Publish can push an older design than the one on screen
- **Side / status:** FE / Code ✔ · **Severity:** High
- **Evidence:** `TemplateBuilder.tsx:539`. Publish is disabled only while a save is running, so it stays enabled during the debounce wait and after "Not saved". The server publishes the last saved HTML (`documents/document-templates.service.ts:270-289`).
- **Repro:** edit, then press Publish within 1 s, or after a failed save. Parents get the old version.
- **Fix:** enable Publish only when the layout equals the last saved one and the last save succeeded, or save first and then publish.

#### QA-067: Template edits have no conflict check; the last save wins
- **Side / status:** Both / Code ✔ · **Severity:** Medium
- **Evidence:** the backend `document-templates.service.ts:208-234` checks no version or `updatedAt`, and the frontend `update()` sends no precondition.
- **Repro:** a Principal and the Super Admin (platform Designs tab), or two tabs, edit the same draft. One overwrites the other without warning.
- **Fix:** send `updatedAt` and return 409 when it doesn't match. The frontend then offers "changed elsewhere — reload".

#### QA-068: A published design that fails on real data breaks the parent's bill
- **Side / status:** BE / Code ✔ (the trigger is Suspected) · **Severity:** Medium
- **Evidence:** `document-renderer.service.ts:36-54` has no fallback. Validation test-renders with sample data only (`service.ts:465-467`), and rendering is capped at 1 s (`engine/liquid-engine.ts:7`).
- **Fix:** catch the render error, log it, and fall back to Fastrack's standard design.

#### QA-069: The code editor silently turns a visual design into a code design
- **Side / status:** Both / Code ✔ · **Severity:** Medium
- **Evidence:**
  - Frontend `TemplateEditor.tsx:98` makes every draft editable whatever its mode.
  - Saving PATCHes html, css and settings (`:195-197`).
  - The backend then clears `layout` (`service.ts:381-392`).
- **Repro:** as Super Admin, open a visual draft under Advanced and click Save draft. Principals can no longer edit it in the builder.
- **Fix:** make visual drafts read-only in the code editor, or require an explicit "Convert to code" step that calls the existing `convertToCode` endpoint.

#### QA-070: The builder's error states can be wrong or missing
- **Side / status:** FE / Code ✔ (b is partly Suspected) · **Severity:** Medium
- **a.** A preview error stays on screen after the problem is fixed, and the previous preview remains visible. Preview and save errors share one `problem` state (`TemplateBuilder.tsx:214-220`).
- **b.** Switching between bill and report previews the old layout against the new kind, which flashes a 400 (`:204-224`). Loading versions has no cancellation, so another kind's version list can show (`:131-151,166-174`).
- **c.** A failed rename is silent: `.catch(() => undefined)` at `:303-309`. The server caps names at 120 characters, the input has no limit, and the version list isn't refreshed after a rename.
- **Fix:** keep the preview error separate from the save error, clear the layout when the kind changes, ignore out-of-date responses, and add `maxLength`, a toast on error and a list refresh to rename.

#### QA-071: Smaller builder gaps
- **Side / status:** Both / Code ✔ · **Severity:** Low
- If samples or images fail to load, the whole page shows "Designs unavailable" (`TemplateBuilder.tsx:134-149`).
- A failed fee-types load looks like "No fee types set up yet". This happens, for example, when the school doesn't have the fees module (`:139`; `PropertyField.tsx:407`).
- Uploading a sample jumps to the newest version (`:495-498`), and the sample picker's position isn't reset when the kind changes (`:762-764`).
- Code editor Duplicate, Publish, Unpublish and Remove sample have no busy state (`TemplateEditor.tsx:297-331,375-383`). The backend picks the next version as the latest plus one with no unique index, so duplicate version numbers are possible (Suspected).
- Preview needs `document_templates:manage`, while the page only needs read (`document-templates.controller.ts:81,160` vs `src/lib/rbac/routes.ts:69`).
- Leaving Advanced doesn't reload the version list (`TemplateBuilder.tsx:402`).
- Inputs have no client-side length limits (server caps are 500 and 5,000 characters), and clearing a number field sends 0 (`PropertyField.tsx:49-66,127-128`).
- Undo records one step per keystroke, up to 100 steps (`useLayoutHistory.ts:4,19-25`).
- Moving a section into a column needs drag and drop, which doesn't work on touch screens (`builder/Outline.tsx:47-110`).

### Calendar

#### QA-072: Past terms stay editable, and closures change attendance totals after the fact
- **Side / status:** Both / Code ✔ · **Severity:** Medium
- **Evidence:**
  - The manage buttons show for any term (`CalendarPage.tsx:145,250-257`).
  - The backend `calendar.service.ts:77-157` doesn't check the term's dates.
  - Attendance counts school days from the same closures (`attendance/attendance-days.ts:77`).
- **Repro:** pick last term and add a HOLIDAY. That term's school days and every pupil's attendance totals change.
- **Fix:** block, or ask for confirmation on, writes to a term that has ended, on both sides. This relates to QA-018.

#### QA-073: Switching term or class quickly can show the wrong term's events
- **Side / status:** FE / Suspected (timing) · **Severity:** Medium
- **Evidence:** `CalendarPage.tsx:90-110`. `load` sets events and days with no abort and no request-id check. Lines 229-235 also keep showing the old term's stats while the new term loads, because `days` isn't reset.
- **Fix:** add an AbortController or request counter, and run `setDays(null)` at the start of each load.

#### QA-074: Smaller calendar gaps
- **Side / status:** Both / Code ✔ · **Severity:** Low
- **Overnight timed events are rejected.** Both sides compare times without looking at the dates, so Fri 18:00 to Sat 08:00 fails (`EventModal.tsx:90`; `calendar.service.ts:263-267`).
- **The backend accepts a HOLIDAY or MID_TERM_BREAK with times** (`calendar.service.ts:268-277`), and still counts it as a full closed day.
- **Some users see Add/Edit but can't save.** The buttons show for anyone with `calendar:manage`, but the backend also requires the Principal, Academic Head or Secretary role (`CalendarPage.tsx:44`; `calendar.controller.ts:44-48`). A Teacher given that permission gets a 403 on save.
- **Removing or editing an event someone else already removed** leaves the modal open and the list stale (`CalendarPage.tsx:120-132`).
- **The loader can spin forever.** Years and terms are fetched without `limit` (`api.ts:141,153`). If the current term falls outside the first 10, the page never finishes loading (`CalendarPage.tsx:70,239`).
- **"+N more" in the month grid can't be clicked** (`MonthGrid.tsx:109-113`).
- **The list view files events only under the month they start in** (`CalendarPage.tsx:318-322`).

### School setup

All of the school-setup code is uncommitted: `src/features/school-setup/`, the `(school)/setup` route, and the `setup` route rule and `school_profile:manage` permission in `src/lib/rbac/`.

#### QA-075: A mistaken year, term or class can't be deleted
- **Side / status:** Both / Code ✔ · **Severity:** Medium
- **Evidence:** the frontend `api.ts:120-181` can only list, create and update. The backend year, term and class controllers have no `@Delete`.
- **Fix:** add delete routes that refuse while students or invoices reference the row, plus a Delete button.

#### QA-076: Term and year dates aren't checked against each other
- **Side / status:** Both / Code ✔ · **Severity:** Medium (extends QA-018)
- **Evidence:**
  - Backend: `academic-terms.service.ts:37-56,184-186` checks only that the term number is unique. `academic-years.service.ts:30-49,95-110` doesn't check end ≥ start, overlapping years, or terms left outside the year.
  - Frontend: `DatesModal.tsx:41-45` checks that a term sits inside its year, but not overlap or order.
- **Repro:** Term 1 runs Sep 1 to Dec 20, then Term 2 is added for Nov 1 to Mar 1, and it saves. Or shorten a year so that Term 3 now falls outside it.
- **Fix:** validate end ≥ start, containment, no overlap, and order by term number on the backend, and mirror the checks on the frontend.

#### QA-077: The current year and the current term can disagree
- **Side / status:** BE / Code ✔ · **Severity:** Medium (related to QA-061)
- **Evidence:** `academic-years.service.ts:110-115` updates only the years. Making a term current also makes its year current (`academic-terms.service.ts:58-61`), but not the other way round.
- **Repro:** mark next year as current while a term of this year is current. The current term stays in the old year. Unmarking a year leaves no current year but keeps its term current.
- **Fix:** when the current year changes, clear the current term or require one from the new year, with both writes in one transaction.

#### QA-078: A failed read makes setup look done
- **Side / status:** FE / Code ✔ · **Severity:** Low
- **Evidence:** in `SetupPage.tsx:51-55,64,73-74,107`, a failed step is dropped from the checklist, so the "Getting started" card can disappear when a call returns 500. If loading teachers fails (`:87-90`), the class-teacher pickers are empty with no error.
- **Fix:** show the step as "couldn't check", with an error next to the pickers.

#### QA-079: Smaller setup gaps
- **Side / status:** Both / Code ✔ (the last two are Suspected) · **Severity:** Low
- The school email can't be cleared: the frontend sends `""`, which the backend rejects as `@IsEmail` (`SchoolProfilePanel.tsx:76-87`; `update-school.dto.ts:49`).
- A Principal can change the school code and logo URL through `PATCH /schools/me` (`update-school.dto.ts:23,71`), although the UI says the code is "Set by Fastrack".
- Class codes that differ only in case (`B4` and `b4`) are both accepted (`school-class.repository.ts:72-80`). A class name can be blank or untrimmed (`classes.service.ts:91`; `update-class.dto.ts:20-23`).
- An empty term number is sent as 0 (`DatesModal.tsx:56`).
- "Add standard departments" gives no feedback (`DepartmentsPanel.tsx:33-37`).
- The checklist under-counts:
  - "Invite your staff" counts only active teachers.
  - "Fees" is ticked once a single fee type exists, without checking for fee structures (`SetupPage.tsx:74-81`).
- A class teacher who is inactive, or outside the first 100 staff, shows as "Assigned" with no name (`ClassesPanel.tsx:64,134`).
- Class search can show a stale page (`ClassesPanel.tsx:49-62`). Suspected.
- A `span 2` cell breaks the profile layout on phones (`SchoolProfilePanel.tsx:176`). Suspected.

### Optional-service requests

The staff list returning 500 is QA-060, fixed on `main` by `08c9ee3`. The fix is **not** on `feat/parent-fees`, and `docs/api/parent-portal.md:72` still says "Built on feat/parent-fees". Deploy from `main`.

The backend handles these correctly:
- Duplicate pending requests get a 409, enforced by a partial unique index.
- A ward not linked to the parent gets a 404.
- Approve, decline and cancel races are prevented by conditional updates that return 409.
- Approving runs in a single transaction.

#### QA-080: The staff requests page is unreachable without uncommitted changes
- **Side / status:** FE / Code ✔ · **Severity:** Medium
- **Evidence:** at HEAD (`a757a41`), three pieces exist only in uncommitted changes (`routes.ts:42-49`, `permissions.ts:49`, `FeesPage.tsx:68,120-129,278-295`):
  - the `optionalFeeRequests` rule in `src/lib/rbac/routes.ts`
  - `student_fee_preferences:manage` in `permissions.ts`
  - the Fees page button
- **Effect:** an unregistered route is denied to everyone, so the committed code shows the page to nobody.
- **Fix:** commit the three changes with the feature.

#### QA-081: Parent sample-data mode has no production guard
- **Side / status:** FE / Code ✔ · **Severity:** Medium
- **Evidence:**
  - `src/features/parent/api.ts:223,235`: `NEXT_PUBLIC_PARENT_API_MOCK=1` switches on sample data, and nothing stops this in a production build.
  - The only sign of it is a note on the More page (`more/MorePage.tsx:118-121`).
  - A sample request is stored in `sessionStorage` and is never decided.
- **Repro:** build with the flag set. A parent sees "Request sent", but nothing reaches the school.
- **Fix:** ignore the flag, or fail the build, in production, and show a banner across the parent app whenever it's on.

#### QA-082: Requests that should no longer be possible
- **Side / status:** BE / Code ✔ · **Severity:** Low
- **Orphaned requests.** Delete a fee type, or make it non-optional, while a request for it is pending. The parent can no longer see or cancel the request, but staff can still approve it. Approving doesn't re-check the fee type, enrolment or current preference (`optional-fee-requests.service.ts:108-109,251-271`).
- **Leavers can still request.** A parent can request for a child who has graduated or exited, because ward access falls back to the latest enrolment (`ward-access.service.ts:63-65`).
- **Forced optional fees look wrong.** A fee forced through `includeOptionalFeeTypeIds` shows as "Not taking", and asking to stop it gets a 409 (`invoice-generation.service.ts:203-204,248-250`).
- **Fix:**
  - Cancel pending requests automatically when their fee type changes.
  - Re-validate on approve.
  - Allow requests only for current enrolments.
  - Work out "taking" the same way invoice generation does.

#### QA-083: Smaller request-flow gaps
- **Side / status:** Both / Code ✔ (one item is Suspected) · **Severity:** Low
- **Approving doesn't change bills already issued.** A stopped service stays on this term's invoice and rolls into arrears. Only the help text mentions it (`optional-fee-requests.service.ts:250-271`; `OptionalFeeRequestsPage.tsx:316-321`).
- **Requests don't record a price,** so staff approve without seeing what the parent was quoted (`optional-fee-request.entity.ts`).
- **Losing a race leaves the row actionable.** When staff get a 409, the request still shows Approve and Decline (`OptionalFeeRequestsPage.tsx:297-300`).
- **Parent Cancel has no busy state** (`parent/fees/OptionalServices.tsx:66-78,201-209`).
- **Paging problems on the staff list.**
  - Deciding the last row on a page leaves an empty page.
  - Changing filters quickly can show an out-of-date list (Suspected).
  - Evidence: `OptionalFeeRequestsPage.tsx:70-85,169-182`.
- **Parent history is cut off.** The endpoint returns everything, but the screen shows only 10 (`optional-fee-request.repository.ts:20-30`; `OptionalServices.tsx:133`).
- **Small mismatches between the two sides.**
  - The route doesn't check role, but the backend only allows the Principal or Account Officer.
  - The "Reason for the parent" note on a decline is optional.
  - A ward that isn't linked shows "not available yet".

### Fee setup and payments

#### QA-084: Renaming a fee type, or toggling Optional, changes invoices already issued
- **Side / status:** BE / Code ✔ · **Severity:** Medium
- **Evidence:** line items keep only the fee type's ID (`invoice-line-item.entity.ts:30-32`), and responses read the name live (`invoice-line-item-response.dto.ts:30-32`).
- **Repro:** generate invoices, then rename "Tuition Fee". Old invoices and receipts show the new name.
- **Fix:** copy the fee type's name and optional flag onto each line item when the invoice is generated.

#### QA-085: Penalty and due date set on a fee structure are ignored, and the bill prints a fixed 10%
- **Side / status:** BE / Code ✔ · **Severity:** Medium
- **Evidence:** only the fee-structures module reads `penalty`. The invoice due date comes from the Generate form, and the bill block hard-codes "A penalty of 10%…" (`documents/layout/blocks/bill.blocks.ts:186`).
- **Fix:** use the configured penalty and due date, or remove the fields and the hard-coded text.

#### QA-086: A cash payment can still be recorded twice after a timeout or a closed modal
- **Side / status:** FE / Code ✔ · **Severity:** Medium (what's left of QA-004)
- **Evidence:**
  - X, Esc and clicking outside still close the modal while it saves (`fees/RecordPaymentModal.tsx:128-130`).
  - There's no request timeout.
  - A 409 "already recorded" shows as a red "Payment Failed", with no receipt and no list reload.
  - Reopening the modal creates a new key.
- **Fix:**
  - Keep the modal open while it saves.
  - Keep the key until the student or amount changes.
  - On a 409, show the existing receipt and reload the list.

#### QA-087: Smaller fee-setup gaps
- **Side / status:** Both / Code ✔ (two items are Suspected) · **Severity:** Low
- **Discounts tab not gated on the module.** The tab ignores the `discounts` module, so a school without it sees a 403 error (`fees/FeesPage.tsx:73-74,362,424`).
- **Fee type description can't be cleared** (`FeeTypeModal.tsx:29`; `fee-types.service.ts:96`).
- **Duplicate fee type names allowed.** Names that differ only in case or spaces are both accepted (`fee-type.repository.ts:33-42`).
- **Seeding double-click errors.** Double-clicking "Add the standard fee types" shows an error although the types were added (`FeeTypesPanel.tsx:32-43`). Suspected.
- **Huge amounts return 500.** Structure and discount amounts have no `@Max` (`decimal(12,2)` columns). Suspected.
- **Mid-term structure edits split a class.** After an edit, newly enrolled pupils are billed at the new rate and earlier pupils at the old one, with no notice.
- **Structure and discount lists have list problems.** There's no guard against stale responses, and the pager sticks after the last row on a page is deleted (`StructuresPanel.tsx:51-67`; `DiscountsPanel.tsx:39-55`).

#### QA-088: Invite page and lead-form edge cases
- **Side / status:** Both / Code ✔ (the honeypot is Suspected) · **Severity:** Low
- **Invite sign-in can get stuck — fixed 22 Oct (QA-204):** the page now signs in from the `setup-password` response. Before that, the invite page ignored the tokens returned by `POST /setup-password` and signs in a second time (`src/app/auth/setup-password/page.tsx:97,103`). If that sign-in fails (a suspended school, for example), pressing again gives "already accepted", and nothing points the user to the login page.
- **A network error looks like a bad link.** One during invite or reset verification shows "Invitation not valid" (`setup-password/page.tsx:71-77,134-138`).
- **Autofill can silently drop leads.** The honeypot field is named `website`, so browser autofill can fill it. The backend then drops the lead but still returns 202.
- **Fix:**
  - Use the returned tokens for sign-in.
  - Give network errors their own error state with a retry button.
  - Give the honeypot a field name that autofill won't fill, and flag suspected spam instead of dropping it.

## End-to-end UI run: Bismark International School (21 October 2026)

A new school (BIS-001) was set up and run through every built feature in the web frontend, in a visible browser. Step-by-step log: [e2e-bismark-international.md](./e2e-bismark-international.md).
- **Backend:** `main`, rebuilt at 18:40.
- **Frontend:** `feat/rbac-workspace` working tree.
- **Screenshots:** [screenshots/](./screenshots/) (`bis-*.png`).

**Status key:** "Browser ✔" means reproduced by clicking through the UI. "Code ✔" means the cause was confirmed in code.

### Status of earlier findings seen in this run

| ID | Now |
|---|---|
| QA-002 | **Looks fixed.** Two rollovers carried arrears exactly once, and invoices and accounts reconcile. |
| QA-003 | **Fixed.** Suspended schools are refused at login and mid-session (403). |
| QA-007 | **Partly fixed.** The backend refused to resend a revoked invite. **Changed 22 Oct (QA-208):** a revoked invite can be reopened again, but only for an account that never set a password, and only by someone who may reactivate that role. |
| QA-008 | Still open. A sign-in in another tab silently swaps the identity of an open tab. |
| QA-009 | **Fixed.** Sign out calls `/auth/logout`, and the old refresh token gets 401. |
| QA-015 | **Not fixed at runtime** during the run: the page crashed (QA-204). **Fixed 22 Oct** and re-tested in the browser. |
| QA-016 | **Improved.** Guardian phones are hidden from teachers, but they still see every class and medical notes. |
| QA-028 | **Fixed.** The toast reads "Successfully generated 10 term invoice(s)…". |
| QA-032 | **Fixed.** No invented admission defaults. |
| QA-036 | **Fixed.** All staff roles are listed, editable and can be deactivated (the Principal isn't listed). |
| QA-055 | **Fixed** (confirmed in the browser). |
| QA-057 | **Fixed.** The designs page loads. |
| QA-058 | **Fixed.** The calendar works for staff. |

### Critical

#### QA-204: Invite links crash; no invited user can activate an account — **Fixed** (22 Oct)
- **Side / status:** FE / Browser ✔ Code ✔ · **Fixed and re-tested in the browser** · **Severity:** Critical
- **Repro:** open the invite link `/auth/setup-password?token=…` from any invite email.
- **Actual:** "Application error: a client-side exception". The console says `useAuth must be used within an AuthProvider`.
- **Cause:**
  - `src/app/auth/setup-password/page.tsx` calls `useAuth()`.
  - `AuthProvider` is mounted only in `src/app/school-admin/layout.tsx` and `src/app/parent/layout.tsx`.
  - The committed page from `41eeb3b` has the same call, so the QA-015 fix never worked at runtime.
- **Impact:** a new school can't onboard its principal or any staff through the product.
- **Fix:** wrap `/auth/*` in `AuthProvider` (an `src/app/auth/layout.tsx`), or use the `LoginResponse` that `POST /auth/setup-password` already returns (QA-088). Add an e2e test.
- **Fixed 22 Oct (both parts):**
  - New `src/app/auth/layout.tsx` mounts `AuthProvider` for every `/auth/*` page. `AuthProvider` never redirects, so signed-out visitors stay on the page.
  - New `acceptInvite(token, password)` in `src/lib/auth/auth-context.tsx` starts the session from the `setup-password` response. The page no longer calls `login()` a second time.
- **Re-test (22 Oct, BIS-001, browser):** the principal invited a teacher (kofi.boateng@bis.test) from Staff → Invite user, and the link from the email preview was opened in a signed-out tab.
  - A tampered token shows "Invitation not valid · Invitation not found or invalid link".
  - The real link shows the form. A short password gives "Use at least 8 characters", and mismatched passwords give "The two passwords do not match".
  - A valid password shows "Password set · Your account is ready" and lands on the teacher's dashboard. The network shows one `POST /auth/setup-password` and no `/auth/login`.
  - Database: 1 refresh token, 1 login record, invitation `ACCEPTED`, user active.
  - Opening the link again shows "Invitation has already been accepted".
  - `/auth/forgot-password` and `/auth/reset-password` still load with no page errors.

#### QA-206: Making a year or term current returns 500 and leaves two current years or terms — **Fixed**
- **Side / status:** BE / Browser ✔ Code ✔ · **Severity:** Critical
- **Repro:** add a year or term with "This is the current…" ticked, or edit one to tick it.
- **Actual:** "Could not save · Internal server error". The backend log shows `missing FROM-clause entry for table "academicyear"` (and `"academicterm"`).
- **Effect:**
  - The row is saved with `is_current = true`, but the other years or terms are never cleared.
  - Rolling over to Term 2 left **Term 1 and Term 2 both current**.
  - Moving to 2027/28 left **two current years and two current terms**.
  - Billing silently follows one of them.
- **Cause:**
  - `BaseRepository.createQueryBuilder()` (`infrastructure/database/repositories/base.repository.ts:156-176`) appends `"<EntityName>.school_id = :__tenantSchoolId"`.
  - `AcademicYearRepository.setCurrent` (`academic-year.repository.ts:47-58`) and `AcademicTermRepository` (`academic-term.repository.ts:84-95`) build alias-less `UPDATE`s, so that alias doesn't exist.
  - `refresh-token.repository.ts:30,58` uses the same pattern, but in-app password change and logout worked in this run.
- **Workaround seen:** tick the new one (ignore the 500), then untick the old one.
- **Fix:**
  - Give the `UPDATE`s an alias, or use `repository.update({ school: { id } }, …)`.
  - Do both writes in one transaction.
  - Add a contract test for set-current under tenant context.
- **Fixed 22 Oct** in backend `bcb2e0b`, now on `main`:
  - Setting a year or term current clears the old one in the same transaction. Making a term current also makes its year current.
  - Unique indexes `UQ_ACADEMIC_YEARS_SCHOOL_CURRENT` and `UQ_ACADEMIC_TERMS_SCHOOL_CURRENT` now allow only one current year and one current term per school.
  - Re-tested by API on FIS-001: `PATCH` of the current term and the current year with `isCurrent: true` returned 200 with `isCurrent: true` (both returned 500 before). Each school in the dev database has exactly one current year and one current term.
  - Not re-tested: switching to a different term. FIS-001 was left on Term 2 until the school decides which term is current.
  - The frontend had no workaround to remove: the dates form just sends `isCurrent`.
- **Browser re-test 22 Oct (BIS-001, Principal, School setup → Years & terms):**
  - Ticked "current" on 2026/27 Term 2 (current was 2027/28 Term 1): "Term updated · Saved", **no 500**. The badges moved at once; the database had exactly one current term (2026/27 Term 2) and the year followed (2026/27).
  - Ticked "current" on the 2027/28 year: saved, one current year. The current term stayed in 2026/27 (new **QA-236**).
  - Unticked the current term: saved, leaving no current term (new **QA-237**).
  - Ticked 2027/28 Term 1: one current term and one current year again. BIS-001 is back where it started.
  - All four saves returned 200; no "Internal server error" anywhere.
- **Where the fix lives:** `bcb2e0b`, on backend `main` (pushed 22 Oct). The running dev server has it and the migration `OneCurrentYearAndTermPerSchool1792600000300` is applied.

#### QA-212: Parent sign-up crashes on the first keystroke — **Fixed**
- **Side / status:** FE / Browser ✔ Code ✔ · **Severity:** Critical
- **Repro:** open `/parent/register` and type a letter in First name.
- **Actual:** "Application error". The console says `Cannot read properties of null (reading 'value')`.
- **Cause:** `src/features/parent/auth/ParentAuth.tsx:210` (committed: `:200`) reads `e.currentTarget.value` inside a `setForm(current => …)` updater. React runs the updater after the event, when `currentTarget` is null.
- **Impact:** no parent can create an account, so the whole parent product is unreachable.
- **Fix:** read the value first, `const v = e.currentTarget.value; setForm(c => ({ ...c, [field]: v }))`. Add an e2e test that types into the form.
- **Fixed 22 Oct** (uncommitted): `set()` now reads `e.currentTarget.value` before calling `setForm`. Checked in headless Chrome: all six fields keep what is typed and there are no page errors; with the old line put back, the same check crashes. The same pattern appears nowhere else in `src/`. No automated browser test was added: the project has no browser test tool yet.

### High

#### QA-201: Email addresses are case- and space-sensitive everywhere
- **Side / status:** BE / Browser ✔ · **Severity:** High
- **Login:** `Head@fastrack.school` with the right password gets "Invalid credentials" (`user.repository.ts:67-81` matches exactly). Phones capitalise the first letter by default.
- **Trailing space:** a trailing space gets "email must be an email".
- **Duplicates:** assigning principal `HEAD@Fastrack.school` created a **second account and a pending invite for another school's principal's mailbox**.
- **Fix:**
  - Lower-case and trim on write and lookup.
  - Add a unique index on `lower(email)`.
  - Migrate the existing rows.

#### QA-207: Classes have no order; promotion is one pupil at a time
- **Side / status:** Both / Browser ✔ · **Severity:** High (real-world workload)
- **Evidence:**
  - The class form has only code, name, department and teacher.
  - Lists sort alphabetically ("Basic 1… Basic 3, KG 2").
  - "Move to another class" suggests nothing and offers every class.
  - Promoting 8 pupils took 8 separate drawer flows (about 8 clicks each), with no confirmation.
- **Fix:**
  - A `level` or `sequence` on classes (or on departments plus classes).
  - A "Promote class" or "Promote school" screen that maps each class to the next, with exceptions for repeaters and leavers.
  - Graduation of the top class.

#### QA-208: Revoking an invite locks that person out for good
- **Side / status:** Both / Browser ✔ · **Severity:** High
- **Repro:** revoke a pending staff invite.
- **What follows:**
  - The person appears as INACTIVE with "Reactivate".
  - Reactivate makes an ACTIVE account **with no password**.
  - Resend is refused ("Invitation has been revoked").
  - A new invite says "Email already registered".
  - Forgot-password skips accounts without a password.
- **Only workaround:** a different email address. The class-teacher picker then shows two identical names.
- **Fix:**
  - Don't create the user until the invite is accepted, or delete the shell user on revoke.
  - Allow a fresh invite for a never-activated account.
  - Hide Reactivate and Resend for revoked, never-activated rows.
- **Seen again 22 Oct by the reviewer:** they invited a teacher (Jesse Baki), revoked the invite, saw "Inactive" on the staff list, pressed Reactivate, and the teacher still couldn't sign in. Two more problems surfaced:
  - The staff list called a never-set-up invitee "Inactive", which reads like a deactivated account and invites Reactivate.
  - Reactivate switched on an account with no password, which nobody can sign in to.
- **Fixed 22 Oct** (backend `e14ddfc` on `main`; frontend `e8ea8b9` on `feat/rbac-workspace`):
  - **Resend works for any account without a password**, even after a revoke or after it was wrongly activated (`invitations.service.ts` `resend`). Reopening a *revoked* invite needs the same rank as reactivating that role (`assertCanReopen`, using `ADMINISTRABLE_ROLES.deactivate`), so an Academic Head can't reopen an Account Officer's invite.
  - **Accepting** an invite is refused only when the account already has a password; an active account with no password can still be set up.
  - **Activate refuses accounts without a password:** 400 "<name> hasn't set up their account yet. Resend their invitation instead." (`staff.service.ts` `assertSetUp`, for both `/activate` and `PATCH` with `isActive`).
  - **Staff API returns `accountSetUp`** (`StaffResponseDto`, from `UserRepository.findIdsWithoutPassword`).
  - **A second invite to the same email** now says "Email already registered. This person has not set up their account yet, so resend their invitation instead." when the account has no password.
  - **Staff page:** never-set-up people show an orange **Not set up** badge with **Resend invite** (it resends their latest open invitation) instead of Reactivate or Deactivate (`src/features/staff/StaffPage.tsx`).
  - Tests: 4 new or changed unit tests in `invitations.service.spec.ts`. Identity and academics suites pass (225 tests).
- **Re-test (22 Oct, BIS-001, browser):**
  - Jesse Baki and the old revoked "Akosua Frimpong" both showed **Not set up · Resend invite**.
  - Through the API: deactivating Akosua Frimpong's unused account returned 200, then activating it returned **400** with the message above.
  - Resend invite on Jesse's row gave "Invitation resent"; the invitation went back to PENDING with a new 48-hour expiry, and a new email was sent.
  - Jesse opened the new link, set a password and landed on the teacher dashboard. The staff row now reads **Active**.
- **Still open:** the shell user is still created at invite time, so the class-teacher picker can show two identical names when a school re-invites on a different email.

#### QA-210: Admission skips Health & Safety and allows no guardian
- **Side / status:** FE / Browser ✔ Code ✔ · **Severity:** High
- **Repro:** fill steps 1–3 and click "Next Step" on Guardians.
- **Actual:** the student is admitted immediately and step 4 (blood group, allergies, emergency contact) is never shown. Pressing Enter in any field submits too.
- **Cause:** the Next `<Button>` sits inside the `<form>` without `type="button"` (`students/page.tsx:1244-1253`).
- **Related:** a student with **no** mother, father or emergency contact was accepted.
- **Fix:**
  - Add `type="button"` to the Next button.
  - Require at least one guardian contact.
  - Make the emergency contact mandatory or explicitly skipped.

#### QA-211: Guardian contacts can't be viewed or corrected after admission
- **Side / status:** FE / Browser ✔ Code ✔ · **Severity:** High
- **Evidence:** mother and father name, phone and email exist only in the admission form (`students/page.tsx`). The student drawer has no guardian-contact fields, and there's no "link parent" action for staff.
- **Impact:** parent linking sends the OTP to "the contact on record". A typo, a missing contact or a changed number means that parent can **never** link, and the school can't fix it.
- **Fix:** an editable Guardians section in the drawer (with an audit trail), and a staff "link parent" action (the API `POST me/students/:id/parents` exists).

#### QA-214: Unlinking a parent doesn't stick (safeguarding)
- **Side / status:** Both / Browser ✔ · **Severity:** High
- **Repro:** staff unlink the father, and he links himself again straight away with a new OTP.
- **Cause:** his contact is still on record (QA-211), and there's no block list.
- **Impact:** custody disputes and court orders can't be honoured.
- **Fix:**
  - Unlink can also remove or flag that contact.
  - A "blocked from linking" list per student.
  - Notify the remaining guardians.

#### QA-222: Parent app's "paid of" total counts carried bills again every term
- **Side / status:** FE / Browser ✔ · **Severity:** High (money shown to parents)
- **Repro:** after rollovers, Esi's Fees page says "GHS 0.50 paid of **GHS 4,489.50**", then "of **GHS 9,119.00**". Her real total billed is GHS 2,870, then 4,630.
- **Cause:** the sum adds every bill's payable, including bills whose balance was moved into the next bill.
- **Fix:** total only invoices that aren't carried forward (or use the account's `total_billed`).

#### QA-227: An old "sealed" bill link changes after it was sent
- **Side / status:** BE / Browser ✔ · **Severity:** High
- **Repro:** open the Term 1 public bill link from an earlier SMS after promotion and the next term's billing.
- **Actual:** the header still says "TERM 1 2026/27" with Term 1's fee lines, but "ClassID: BASIC 1" (her current class; she was billed as KG 2), "Bal B/f 3,130.00" and "TOTAL FEES DUE 4,629.50" (her current all-time balance). All of it sits under "DIGITALLY SIGNED & SEALED · Tamper-Proof & Verified".
- **Fix:**
  - Render public bills from the invoice's signed snapshot (`snapshot_data`).
  - Label carried-forward bills "Moved to INV/…".
  - Never mix in live account balances.

### Medium

| ID | Sev | Side | Finding | Fix |
|---|---|---|---|---|
| QA-200 | Medium | BE | School codes are compared exactly. The unique index on `schools.code` is case-sensitive and untrimmed, so `fis-001` or `FIS-001 ` would be a second school. Parents type this code. | Normalise to upper case and trim; unique on `upper(code)`. |
| QA-202 | Medium | Both | After the Super Admin assigns a principal, the school still says "Principal: Not assigned". The pending invite isn't shown and can't be resent or revoked there, and a second principal invite was accepted while the first was open (two PRINCIPAL invites pending). | Show the pending invite with Resend and Revoke. Allow one open principal invite per school. |
| QA-203 | Medium | BE | The plain-text part of the invite and reset emails contains `setup-password?token&#x3D;…` (HTML-escaped), a broken link in text-only clients. | Don't HTML-escape the text template. |
| QA-209 | Medium | Both | Birth date in the future (2030) accepted at admission and saved. | Validate the birth date (past; a reasonable age range for the class). |
| QA-213 | Medium | FE | Ward-link errors are all shown as "We could not link… check the code" or "That code is not right… send a new one". This hides "2 attempts remaining", "Maximum attempts reached, start over" and "already linked to your account". "Send a new code" after a lockout fails. | Map backend messages to clear copy. After a lockout, offer "Start again". |
| QA-215 | Medium | BE | An invoice whose discounts bring it to GHS 0 is created as **UNPAID**. It appears in arrears views and got a "view your bill" SMS. | Mark GHS 0 invoices PAID or "No fees due", and exclude them from reminders. |
| QA-216 | Medium | Both | One MoMo transaction ID can be used only once, so a parent who pays several siblings in one transfer can't be recorded (the second child gets 409). | "Split one payment across siblings", or scope the reference check to (reference, student). |
| QA-217 | Medium | FE | The Fees KPI cards don't update after recording payments, and the page's **Refresh** button doesn't update them. They showed "Collected GHS 0.00 · 0%" with GHS 5,800.50 collected, until a full browser reload. | Re-fetch `invoices/summary` after payments and on Refresh. |
| QA-218 | Medium | BE | Only one extra bill per fee type, per student, per term. A second excursion in the same term is refused, so each event needs a new fee type (and fee types can't be deleted). | Key the duplicate check on title or batch, or allow an "allow another" override. |
| QA-219 | Medium | BE | The public bill shows this term's extra bills as "**Bal B/f**" (balance brought forward), as if old debt. | List extra bills by title, and keep "Bal B/f" for previous-term arrears. |
| QA-220 | Medium | BE | Credit isn't applied to new extra bills. Students in credit (−500, −200, −100) still have the GHS 120 excursion UNPAID and were sent SMS. | Apply account credit to new invoices (term and supplementary), or show "covered by credit". |
| QA-221 | Medium | FE | Record Payment always targets the latest **term** invoice and has no bill picker, so an extra bill (excursion, science kit) can't be paid on its own. It stays UNPAID until rolled into arrears. | Let the cashier pick the bill(s), or allocate oldest-first across open bills. |
| QA-223 | Medium | Both | "Move to another class" accepts a **past, already-billed term**. Kwame was moved to Basic 2 "from 2026/27 Term 2", which he was billed for as Basic 1, with no warning. | Restrict to current or future terms, or warn and offer to re-bill. |
| QA-224 | Medium | Both | Recording an exit doesn't show or warn about the outstanding balance (Ama Serwaa 1,270, Kofi 1,570, Adwoa 680), and there's no view of leavers' debts. | Show the balance in the exit dialog. Add a "leavers with balances" report. |
| QA-225 | Medium | BE | The attendance register and term totals list pupils by their **current** class whatever the date, so after promotion the past and current registers show next year's class. | Resolve the roster from enrolment history for the date or term. |
| QA-226 | Medium | FE | The design builder's "Show a real bill (invoice id)" needs the internal UUID. The invoice number is rejected with "invoiceId must be a UUID". | Accept the invoice number, or offer a searchable picker. |
| QA-228 | Medium | BE | A published bill design is used in the parent app's printable bill but **not** on the public bill link sent by SMS or email, which still uses the default design. | Render public links through the same document renderer. |
| QA-231 | Medium | BE | Every school's bill and report designer previews a hard-coded sample from "**Fastrack International School**" (code FIS, East Legon, `accounts@fastrack.school`, no logo) instead of its own name, logo and contacts (`documents/copies/invoice.bill/invoice.bill.sample.ts`, `exam.report/exam.report.sample.ts:52`, used by `document-templates.service.ts:434`). FIS-001 is a real school in the database, so it looks like a data leak, and the school can't check its own header or logo while designing (QA-226 blocks the real-bill preview). Published bills are unaffected. | Build the sample from the signed-in school's profile (name, code, logo, address, contacts, a real class and fee types), or default to its latest real bill. |
| QA-232 | Medium | Both | Nothing ties together the invoices created by one billing run. `student_fees_invoices` has no run or batch column, and there's no runs table. Runs can only be guessed by grouping type, title, term and `issued_at` to the second (BIS-001: 7 inferred runs, 0001–0042), which breaks for same-second runs. Background-run job IDs live only in Redis and expire (see QA-011). Corrections re-sign the bill, so `signed_by` no longer shows who ran it (0004 and 0007 now show the Principal). "Send bill links" broadcasts aren't recorded either. **Effect:** a mistaken run (wrong amount or class, the duplicate PTA levy of QA-062) can't be undone as a unit, there's no answer to "who billed this and when", and reminders or reprints can't target a run. | Add an `invoice_runs` table (type, term, scope, title, fee type, amount, created by and when, counts created and skipped, total, job ID) and a `run_id` on each invoice. Add a runs list in Fees & Billing with "Undo run" (only while unpaid) and "Send links for this run". Record broadcasts too. |
| QA-233 | Medium | Both | Only a class (homeroom) teacher can be set, in School setup → Classes → Edit → Class teacher (`classes.homeroom_staff_id`). The tables `staff_subjects` and `timetable_slots` (class, subject, staff, term, day and time) exist, but only analytics reads them. There's no endpoint or screen, and the "Timetable" and "Faculty & workload" pages show sample data. A subject teacher (for example, maths for Basic 2 and Basic 3) has no link to any class, so they can't take attendance or (later) enter scores for those classes. | Add subject and teaching assignments (class × subject × teacher × term) with API and UI, and use them for attendance rights, gradebook access and the timetable. Scope teachers' student lists by these assignments (QA-016). |
| QA-236 | Medium | BE | Found in the QA-206 re-test (22 Oct). With 2026/27 Term 2 current, ticking "This is the current academic year" on 2027/28 saved fine, but the current **term** stayed 2026/27 Term 2. The school then had current year 2027/28 and a current term from 2026/27. Making a term current already moves the year, but not the other way round. | When a year becomes current, either make its first (or date-matching) term current too, or refuse with "Pick the current term in this year". Show a warning when the current term isn't in the current year. |
| QA-237 | Medium | Both | Found in the QA-206 re-test (22 Oct). Unticking "This is the current term" on the current term saved with "Term updated" and left the school with **no current term** (the year stayed current). Billing, attendance and the calendar then fall back to dates or show nothing, with no warning. | Don't allow unticking the only current term; the way to change it is to tick another term. Or show a banner "No current term set" on setup and fees. |
| QA-229 | Medium | Both | Paystack checkout uses the parent's login email. If Paystack rejects it, the parent sees the raw "Invalid Email Address Passed" and can't pay online. | Validate the email at sign-up, fall back to a school or placeholder email, and show friendly errors. |

### Low

| ID | Sev | Side | Finding | Fix |
|---|---|---|---|---|
| QA-205 | Low | BE | The reset email says the link "will expire in 30 minutes". The real TTL is 60 minutes (`PASSWORD_RESET_TTL_SECONDS`), and the app says "one hour". | Use the constant in the copy. |
| QA-234 | Low | Both | A class has a single `homeroom_staff_id`, so there's no assistant or co-teacher (common in KG and lower primary), and a second adult can't mark that class's register. | Allow several class teachers with a role (lead or assistant). |
| QA-235 | Low | BE | Changing the class teacher overwrites `homeroom_staff_id` with no history, so there's no record of who taught the class in an earlier term. Terminal reports ("Class teacher's remarks") and audits need this. | Keep class-teacher assignments per term (from and to dates) and read historical ones for past terms. |
| QA-230 | Low | FE | Parent home "Coming up this term" shows only the first three events (no year), leaves out the parents' PTA meeting, and there's no parent calendar page. | Prioritise events for parents and closures, show the year, and link to a full list. |

Smaller observations from the run, not given IDs:
- Raw validator or internal wording: "SCHOOL_LOGO", "Term sequence already exists".
- Terms outside their year are blocked with no message.
- The website was saved without a scheme.
- No toast when switching optional fees.
- The MoMo "Channel / Network" picker is empty.
- The bill breakdown has no due date or penalty.
- Cancelled online payments show no message.
- The calendar's future-date message gives the wrong reason.
- One phone number can link several parent accounts without notice.
- Promotion history shows no year.

## Re-check of the backend's existing `endpoint-audit-issues.md`

- **Fixed:** 1.1, 1.3, 2.1b, 2.1c, 2.1d, 2.1e, 2.2, 3.1 (lookups).
- **Fixed, with residual issues:** 2.1 (residuals are QA-013 and QA-025).
- **Still valid:** 1.2 (now QA-026) and 3.2 (bulk-sync returns the whole catalogue; low).

## Verified as working (good news)

- **School isolation on `me` routes:** reading or paying another school's invoice or student returns 404 (live #1-2).
- **Role checks:** Teacher, Secretary and AH can't record payments (403, live #3); Secretary can't use `/exit` (live #32).
- **Mass assignment:** a body `schoolId` for another school gets 403. `ValidationPipe` uses whitelist + forbidNonWhitelisted.
- **Pagination** is capped at 100.
- **Invoice generation** doesn't duplicate (re-run skipped, live #15).
- **Module switch-off** takes effect on the very next request (live #20).
- **Sessions:**
  - Refresh-token reuse is detected and the whole family revoked.
  - Refresh tokens are stored hashed.
  - Deactivated users are blocked on the next request.
  - Permissions are read from the DB on every request.
- **Frontend redirects:** crafted `?next=` values fall back safely.
- **CSV export:** escapes formula injection.
- **Test suites:** backend 46 suites / 500 tests pass; frontend `test:dashboard` passes. Typecheck is clean on both. ESLint: 0 errors (backend 739 warnings, frontend 7).
