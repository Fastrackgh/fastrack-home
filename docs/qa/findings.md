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

| Severity | Count | Fixed | Partly fixed | Open |
|---|---|---|---|---|
| Critical | 8 | 7 | 1 | 0 |
| High | 31 | 27 | 3 | 1 |
| Medium | 80 | 45 | 14 | 21 |
| Low | 39 | 21 | 6 | 12 |
| **Total** | **158** | **100** | **24** | **34** |

Statuses reconciled against the code and re-test history on 24 Oct 2026; see [Status reconciliation](#status-reconciliation-24-oct-2026).

| ID | Sev | Cat | Side | Status | Title |
|---|---|---|---|---|---|
| QA-001 | Critical | SEC/EDGE | BE | Live ✔ | Concurrent payments lose credits on the invoice and fee account — **fixed** (reconciled 24 Oct) |
| QA-002 | Critical | FLOW | BE | Live ✔ | Carried-forward arrears are counted twice; a paid-up student's bill still shows a debt — **fixed** (reconciled 24 Oct) |
| QA-003 | Critical | SEC | Both | Live ✔ Browser ✔ | Suspending a school has no effect; the UI reports success — **fixed** (reconciled 24 Oct) |
| QA-015 | Critical | FLOW | Both | Browser ✔ | Invited staff can never get in: the invite links to a page the frontend doesn't have — **fixed** (page in 41eeb3b; crash fixed 22 Oct, QA-204) |
| QA-020 | Critical | FLOW | FE | Browser ✔ | Leads are saved now, but the waitlist success message still promises "login credentials" — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-204 | Critical | FLOW | FE | Browser ✔ | Invite link page crashes (no AuthProvider): no invited user can activate an account — **fixed** (22 Oct) |
| QA-206 | Critical | EDGE/data | BE | **Fixed** 22 Oct (backend bcb2e0b) | Setting the current year/term returns 500 and leaves two current years/terms — **fixed** (reconciled 24 Oct) |
| QA-212 | Critical | FLOW | FE | **Fixed** 22 Oct | Parent sign-up crashes on the first keystroke — **fixed** (reconciled 24 Oct) |
| QA-004 | High | SEC/EDGE | Both | Live ✔ | Payments can be double-submitted; a client-chosen receipt number causes a 500 — FE half **fixed** (41eeb3b); rest in QA-086 |
| QA-005 | High | SEC | BE | Live ✔ | AdminJS was mounted in production, unthrottled, with in-memory sessions and an editable ledger — **fixed** (24 Oct; BE `44b2a3f`: off in production unless ADMIN_ENABLED=true, sessions in Redis, SameSite=Lax, 8h) |
| QA-006 | High | SEC | BE | Code ✔ | Notification client logs OTPs and invite tokens and serves them on a LAN port — **fixed** (24 Oct; BE `8dfd574`, `5af0b93`: no OTP/link logging; dev preview on 127.0.0.1:4080–4089 only; never dev in production) |
| QA-007 | High | SEC | BE | Code ✔ | Invite acceptance checks the expiry date, not the status, so a superseded (EXPIRED-status) token is still accepted — **fixed** (25 Oct; BE `17900c0`, re-tested) |
| QA-008 | High | EDGE/SEC | Both | Live ✔ (partly); race not reproduced in browser | Multi-tab use: a refresh race logs out every session; signing in another tab swaps the identity — **fixed** (reconciled 24 Oct) |
| QA-009 | High | SEC | Both | Live ✔ Browser ✔ | Logout and password change never end the session on the server; tokens sit in localStorage with no CSP — **fixed** (reconciled 24 Oct) |
| QA-010 | High | SEC | BE | Live ✔ | Public invoice opens by its database UUID, never expires, isn't throttled, and exposes a staff email — **fixed** (24 Oct; BE `a417fb0`: token-only links, rotated on resend, rate-limited, no staff email, 404 when suspended) |
| QA-013 | High | SEC | BE | Live ✔ Browser ✔ | Any staff creator can set a password that activates the new account at once (Academic Head role limits are fixed) — **fixed** (24 Oct; BE `5857a8d`: only a Super Admin sets a password at creation; staff invite) |
| QA-016 | High | SEC | Both | Live ✔ Browser ✔ | Teachers still see every class in the school and medical notes (national IDs and guardian contacts are now hidden) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-026 | High | FLOW | Both | Code ✔ | Parents can't use any real feature: every parent API call returns 403 and there is no parent UI — **fixed** (reconciled 24 Oct) |
| QA-027 | High | FLOW | Both | Browser ✔ | No forgot/reset password anywhere — **fixed** (reconciled 24 Oct) |
| QA-028 | High | FLOW | FE | Live ✔ Browser ✔ | Generate-invoices toast reads "Generated undefined … GHS 0.00" because the field names don't match — **fixed** (reconciled 24 Oct) |
| QA-030 | High | EDGE | FE | Code ✔ / Live ✔ | Some pickers still stop at 100 (payment/discount student picker, staff, invites, platform staff); classes and schools now page fully — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-031 | High | FLOW | Both | Code ✔ | Fees KPI cards add up only the 20 invoices on screen — **fixed** (reconciled 24 Oct) |
| QA-032 | High | UX/data | FE | Code ✔ | Admission saves medical and personal defaults (O+, AA, Christian, Male…) the user never chose — **fixed** (reconciled 24 Oct) |
| QA-033 | High | FLOW | FE | Code ✔ | A new school can't be set up from the UI (no Principal assignment, no years/terms/classes/fees setup) — **fixed** (reconciled 24 Oct) |
| QA-034 | High | UX | FE | Code ✔ | The dashboard Overview KPIs are still sample data (attendance is live; admissions is labelled "Preview only") — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-055 | High | FLOW/money | FE | Browser ✔ | Record Payment overwrites the amount the cashier typed once the balance finishes loading — **fixed** (41eeb3b) |
| QA-060 | High | Bug | BE | Live ✔ | Staff list of optional-service requests returned 500 — **fixed** (08c9ee3) |
| QA-061 | High | Data | Data, FE | Live ✔ | Flagged current term doesn't contain today; billing forms default to it (9 robotics bills went to Term 2) — **open** (code re-checked 24 Oct) |
| QA-064 | High | EDGE/data | FE | Code ✔ | Design builder can save the previous design onto the version just opened — **fixed** (25 Oct; FE `55c49bb`, re-tested in the browser; see QA-064 status) |
| QA-065 | High | EDGE/data | FE | Code ✔ | Design edits in the last 1.2 s are lost on switch or leave; no unsaved-changes guard — **fixed** (25 Oct; FE `55c49bb`, re-tested in the browser; see QA-064 status) |
| QA-066 | High | FLOW | FE | Code ✔ | Publish can push an older design than the one on screen — **fixed** (25 Oct; FE `55c49bb`, re-tested in the browser; see QA-064 status) |
| QA-201 | High | SEC/UX | BE | Browser ✔ | Emails are case- and space-sensitive: capitalised login fails; duplicate accounts per mailbox — **fixed** (24 Oct; BE `e226f97`, FE `df392ad`) |
| QA-207 | High | FLOW | Both | Browser ✔ | Classes have no order; promotion is one pupil at a time with no next-class suggestion — **fixed** (24 Oct; BE `23504b6`, FE `a2f0bff`; follow-ups QA-245, QA-247) |
| QA-208 | High | FLOW | Both | Browser ✔ | Revoking an invite locks that person out for good (Reactivate gives an account with no password) — **fixed** (22 Oct; backend `e14ddfc` on `main`) |
| QA-210 | High | FLOW/data | FE | Browser ✔ | Admission "Next" submits early: Health & Safety unreachable; no guardian required — **fixed** (24 Oct; FE `90d7a5a`, BE `23504b6`) |
| QA-211 | High | FLOW | FE | Browser ✔ | Guardian contacts can't be viewed or corrected after admission, so parents may never link — **fixed** (23 Oct; BE `a89ee57`, FE `0fd3b0d`) |
| QA-214 | High | SEC | Both | Browser ✔ | Staff unlink doesn't stick: the parent relinks immediately (safeguarding) — **fixed** (23 Oct; shared-contact gap QA-240 also fixed) |
| QA-222 | High | Money/UX | FE | Browser ✔ | Parent app "paid of" total counts carried bills again every term — **fixed** (23 Oct; FE `b945bd8`, BE `25eb632`) |
| QA-227 | High | Money/SEC | BE | Browser ✔ | An old "tamper-proof" public bill changes later (live class and balance) — **fixed** (24 Oct; BE `eb0f25c` on `main`; older bills keep showing the current class by choice) |
| QA-011 | Medium | SEC | BE | Live ✔ | Invoice job status can be read across schools (sequential ids) — **fixed** (25 Oct; BE `17900c0`, re-tested) |
| QA-012 | Medium | SEC | BE | Live ✔ | No security headers; Swagger public; CORS `*` with credentials; unset `NODE_ENV` runs production as dev — **fixed** (24 Oct; BE `c9c06b9`: security headers; production refuses Swagger, open CORS and a missing NODE_ENV) |
| QA-014 | Medium | SEC | BE | Live ✔ | User enumeration through register-parent, login timing and ward-link errors — **open** (code re-checked 24 Oct) |
| QA-017 | Medium | FLOW | BE | Live ✔ | Exited students can still be paid against; their open invoices are never written off — **fixed by policy** (25 Oct; BE `80fb344`: leavers' bills stay owed and payable, and are listed) |
| QA-018 | Medium | EDGE | Both | Live ✔ | Terms can't be closed (term dates and payment dates are now checked) — **partly fixed** (25 Oct; BE `f6cf1d2`, `8abbe07`) |
| QA-019 | Medium | EDGE | BE | Live ✔ | Payment input gaps: allocations aren't checked against the bill's fee types (the amount limit, dueDate and amount-vs-allocations checks are fixed) — **partly fixed** (25 Oct; BE `80fb344`) |
| QA-021 | Medium | SEC | BE | Suspected | A failed OTP send is never caught and can crash the API process — **fixed** (25 Oct; BE `17900c0`, code and unit tests) |
| QA-022 | Medium | SEC/FLOW | BE | Live ✔ | Public invoice, media, optional fees and queued jobs still skip module and suspension checks (payments are fixed) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-023 | Medium | SEC | BE | Code ✔ | The main throttler is still in memory, keyed on IP+email and spoofable, with no lockout (only AdminJS has one) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-024 | Medium | SEC | BE | Live ✔ | `PATCH /students/:id` lets a Secretary graduate or transfer a student, bypassing `students:exit` — **fixed** (25 Oct; BE `17900c0`, re-tested) |
| QA-025 | Medium | SEC | BE | Code ✔ | `POST /users` can link a parent login to any child without the guardian-contact check — **fixed** (25 Oct; BE `17900c0`, re-tested) |
| QA-029 | Medium | EDGE/UX | Both | Live ✔ | Staff payments accept any overpayment as credit with no confirmation (online payments are capped) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-035 | Medium | EDGE | Both | Browser ✔ | Permissions refresh only on app load: no refetch on focus or 403, unknown modules allowed, stored permission lists drift — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-036 | Medium | FLOW | Both | Browser ✔ | Non-teacher staff (Academic Head, Account Officer, Secretary) can't be listed, edited or re-activated — **fixed** (reconciled 24 Oct) |
| QA-037 | Medium | EDGE | FE | Browser ✔ | A failed refresh hard-redirects (draft lost); a network blip logs out; possible redirect loop — **fixed** (reconciled 24 Oct) |
| QA-038 | Medium | EDGE | FE | Code ✔ | No stale-response guard on searches, and Students search sends 2 requests per keystroke (fees search is debounced) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-039 | Medium | UX | FE | Browser ✔ (partly) | KPI cards still show GHS 0 when the load fails, and there's no request timeout (errors are now friendly, with Retry) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-040 | Medium | UX/EDGE | FE | Code ✔ | Platform console: deactivate is still one click, the module drawer goes stale, and optional fields can't be cleared — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-041 | Medium | UX | FE | Code ✔ | Payment, invoice, receipt and admission modal friction — **open** (code re-checked 24 Oct) |
| QA-042 | Medium | EDGE | BE | Code ✔ | Invoice modification has no audit trail and overwrites signedBy (the transaction race is fixed) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-044 | Medium | DOC | FE | Code ✔ | Marketing and login copy claim things the product doesn't do — **open** (code re-checked 24 Oct) |
| QA-045 | Medium | SEC | BE | Suspected | `BaseRepository` stops filtering by school when none is in context (backup control) — **open** (code re-checked 24 Oct) |
| QA-053 | Medium | FLOW | FE | Suspected | The in-progress fees `api.ts` reads lists as `data[]`+`meta`, but the backend returns `data.items` — **fixed** (reconciled 24 Oct) |
| QA-056 | Medium | FLOW | Both | Browser ✔ | Platform staff counts are wrong (overview says 3 staff, school page says 1) — **fixed** (reconciled 24 Oct) |
| QA-057 | Medium | FLOW | BE | Browser ✔ | Bill & report designs page returns 500: uncommitted entity column `layout` has no migration — **fixed** (backend 5bae8a2) |
| QA-062 | Medium | Money | BE | Code ✔ | Extra-bill duplicate check ignores term bills, so a fee can be charged twice — **fixed** (25 Oct; BE `80fb344`) |
| QA-067 | Medium | EDGE | Both | Code ✔ | Template edits have no conflict check; last save wins — **fixed** (25 Oct; BE `0cb9bdc`, FE `9ec374e` and the code-mode follow-up) |
| QA-068 | Medium | FLOW | BE | Code ✔ | A published design that fails on real data breaks the parent bill; no fallback — **open** (code re-checked 24 Oct) |
| QA-069 | Medium | FLOW | Both | Code ✔ | Code editor silently converts a visual design into a code design — **open** (code re-checked 24 Oct) |
| QA-070 | Medium | UX/EDGE | FE | Code ✔ | Design builder error states: sticky preview errors, kind-switch races, silent rename failures — **fixed** (25 Oct; FE `55c49bb`, re-tested in the browser; see QA-064 status) |
| QA-072 | Medium | EDGE | Both | Code ✔ | Past terms stay editable on the calendar; closures change attendance totals after the fact — **open** (code re-checked 24 Oct) |
| QA-073 | Medium | EDGE | FE | Suspected | Calendar term/class switch can show another term's events and stats — **open** (code re-checked 24 Oct) |
| QA-075 | Medium | FLOW | Both | Code ✔ | A mistaken term or class can't be deleted (years can now be archived) — **partly fixed** (25 Oct; BE `f6cf1d2`) |
| QA-076 | Medium | EDGE | Both | Code ✔ | Term and year dates aren't checked against each other (overlap, order, containment) — **fixed** (25 Oct; BE `f6cf1d2`, re-tested) |
| QA-077 | Medium | EDGE | BE | Code ✔ | Current year and current term can disagree — **fixed** (25 Oct; BE `f6cf1d2`, re-tested) |
| QA-080 | Medium | FLOW | FE | Code ✔ | Staff optional-requests page unreachable in committed code (route rule uncommitted) — **fixed** (reconciled 24 Oct) |
| QA-081 | Medium | SEC/UX | FE | Code ✔ | Parent sample-data mode has no production guard — **open** (code re-checked 24 Oct) |
| QA-084 | Medium | Money/data | BE | Code ✔ | Invoice API line items still show the live fee type name after a rename (public bills use the snapshot) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-085 | Medium | Money | BE | Code ✔ | Structure penalty and due date ignored; bill prints a hard-coded 10% penalty — **fixed** (25 Oct; BE `80fb344`) |
| QA-086 | Medium | Money/EDGE | FE | Code ✔ | A cash payment can still be recorded twice after a timeout or closed modal — **open** (code re-checked 24 Oct) |
| QA-200 | Medium | EDGE | BE | Browser ✔ | School codes case-sensitive and untrimmed — **fixed** (24 Oct; BE `611856b`) |
| QA-202 | Medium | FLOW | Both | Browser ✔ | Pending principal invite invisible to Super Admin; two principal invites can be open — **fixed** (24 Oct; BE `7d5a143`, FE `2c15920`; follow-up QA-253) |
| QA-203 | Medium | FLOW | BE | Browser ✔ | Plain-text email links broken (`token&#x3D;`) — **fixed** (24 Oct; BE `7d5a143`) |
| QA-209 | Medium | EDGE | Both | Browser ✔ | Future birth date accepted at admission — **fixed** (24 Oct; BE `7d5a143`, FE `d5d0ae1`) |
| QA-213 | Medium | UX | FE | Browser ✔ | Ward-link OTP errors flattened; no "start again" after lockout — **open** (code re-checked 24 Oct) |
| QA-215 | Medium | Money | BE | Browser ✔ | GHS 0 invoice marked UNPAID and sent to parents — **fixed** (25 Oct; BE `80fb344`) |
| QA-216 | Medium | Money/FLOW | Both | Browser ✔ | One MoMo transfer can't cover several siblings — **open** (code re-checked 24 Oct) |
| QA-217 | Medium | UX | FE | Browser ✔ | Fees KPI cards stale after payments and Refresh — **open** (code re-checked 24 Oct) |
| QA-218 | Medium | FLOW | BE | Browser ✔ | Only one extra bill per fee type per term — **fixed** (25 Oct; BE `80fb344`) |
| QA-219 | Medium | UX/Money | BE | Browser ✔ | The public bill lumps this term's extra bills into "Balance from previous bills" instead of listing them (the "Bal B/f" label is gone) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-220 | Medium | Money | BE | Browser ✔ | Credit not applied to new extra bills — **closed: by design** (25 Oct; the user decided extra bills don't take credit) |
| QA-221 | Medium | Money/FLOW | FE | Browser ✔ | Extra bills can't be paid on their own — **open** (code re-checked 24 Oct) |
| QA-223 | Medium | EDGE | Both | Browser ✔ | Promotion accepts a past, already-billed term — **open** (code re-checked 24 Oct) |
| QA-224 | Medium | FLOW | Both | Browser ✔ | Exit dialog hides the outstanding balance — **open** (code re-checked 24 Oct) |
| QA-225 | Medium | EDGE | BE | Browser ✔ | Attendance roster uses current class for past dates — **open** (code re-checked 24 Oct) |
| QA-226 | Medium | UX | FE | Browser ✔ | Design preview needs the invoice UUID, not its number — **open** (code re-checked 24 Oct) |
| QA-228 | Medium | FLOW | BE | Browser ✔ | Published design not used on public bill links — **fixed** (reconciled 24 Oct) |
| QA-229 | Medium | FLOW | Both | Browser ✔ | Paystack rejects some parent emails; raw error; no fallback — **open** (code re-checked 24 Oct) |
| QA-231 | Medium | UX/trust | BE | Browser ✔ Code ✔ | The design preview shows another school ("Fastrack International School") instead of the user's own — **open** (code re-checked 24 Oct) |
| QA-232 | Medium | FLOW/audit | Both | Code ✔ (DB) | Invoices from one billing run share no run ID: runs can't be undone, audited or re-sent as a unit — **open** (code re-checked 24 Oct) |
| QA-233 | Medium | FLOW | Both | Code ✔ | Subject teachers can be assigned per class now; `timetable_slots` still has no API, and attendance stays with the class teacher — **partly fixed** (25 Oct; results phase 0) |
| QA-236 | Medium | EDGE/data | BE | Browser ✔ | Making a year current leaves the current term in another year — **fixed** (25 Oct; BE `f6cf1d2`, `8abbe07`) |
| QA-237 | Medium | EDGE | Both | Browser ✔ | Unticking the current term leaves the school with no current term, silently — **fixed** (25 Oct; BE `f6cf1d2`, re-tested) |
| QA-238 | Medium | FLOW/audit | FE | Browser ✔ | Guardian change history always shows "No changes recorded yet" (reads `items`, API v2 returns a list) — **fixed** (23 Oct, FE `b0ac515`) |
| QA-239 | Medium | FLOW | FE | Browser ✔ | Staff signed in before an update lose new permissions until they sign out (contacts "hidden" yet shown, no editing) — **fixed** (23 Oct, FE `b0ac515`) |
| QA-240 | Medium | SEC | BE | Browser ✔ | Blocking a parent leaves their other linked account with the same phone in place — **fixed** (23 Oct, BE `cece817` + FE warning `b0ac515`) |
| QA-243 | Medium | Money/data | BE | DB ✔ | FIS-001 Efua Ansah: a bill shows GHS 8,400 paid against GHS 2,000 of payments, and only GHS 300 of its credit moved to the next bill — **fixed** (23 Oct; BE `5deed77`, `f8944de`, on `main`) |
| QA-245 | Medium | FLOW/data | Both | Browser ✔ | When two classes share the top order number, a middle class is pre-filled to "Graduates" on Move classes up — **fixed** (24 Oct; BE `f9e93b5`, FE `e469eda`: order numbers are unique; remaining gap QA-248) |
| QA-248 | Medium | FLOW/data | Both | Browser ✔ | When the classes after it have no order (0), the last numbered class is pre-filled to "Graduates" — **fixed** (24 Oct; BE `2119f1e`) |
| QA-250 | Medium | Money | BE | Browser ✔ | AdminJS Analytics "Fees invoiced" counts carried-forward balances again (BIS-001: 78,789 shown, 46,420 real), so the collection rate is wrong — **fixed** (24 Oct; BE `611856b`) |
| QA-251 | Medium | Bug | BE | Browser ✔ | AdminJS filters on School Module (school), Parent Student (parent) and Marketing Lead (kind) return 500 — **fixed** (24 Oct; BE `611856b`) |
| QA-253 | Medium | FLOW | Both | Browser ✔ | After revoking a principal invite on the platform school page, the same person can't be invited again from the UI — **fixed** (24 Oct; BE `d4c87aa`, FE `0ca3e3b`) |
| QA-254 | Medium | Dev tooling | BE | Live ✔ | Dev email previews no longer open: the preview binds 127.0.0.1:80, which macOS refuses (EACCES) — **fixed** (24 Oct; BE `5af0b93`: preview moved to port 4080) |
| QA-255 | Medium | Bug | BE | Live ✔ Browser ✔ | A deleted subject's code can't be reused (500), so grading setup with "add subjects" crashes on schools that deleted one — **fixed** (24 Oct; BE `3708535`, local, not pushed: partial unique indexes on code and name) |
| QA-257 | Medium | FLOW/data | FE | Browser ✔ | "Run setup again" in Grading setup starts from the suggested presets, and applying silently replaces the school's existing department choices — **fixed** (24 Oct; FE `4913515`, `769f63e`, local, not pushed) |
| QA-258 | Medium | Data | BE | Live ✔ Browser ✔ | Term report attendance counts every school day of the term as the total, even days with no register and days before a pupil joined ("1 of 39" for a pupil there 7 days) — **fixed** (24 Oct; BE `a0220a2`: total = register days while the pupil was in the class) |
| QA-043 | Low | FLOW | BE | Code ✔ | Discounts stack to 100%, silently overwrite, and don't re-price issued invoices — **open** (code re-checked 24 Oct) |
| QA-046 | Low | SEC | BE | Code ✔ | Super Admin skips the permissions guard, and revoke or pending resend have no rank check (staff isActive and reopen are checked) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-047 | Low | SEC/data | BE | Code ✔ / Live ✔ | Config hygiene: seed passwords, JWT secret fallbacks, DB TLS not verified, $argon2 skip, emails in logs (email case is fixed) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-048 | Low | EDGE | BE | Code ✔ | Arrays have no `ArrayMaxSize`; optional-fee `feeTypeId` not validated — **fixed** (25 Oct; BE `17900c0`, re-tested) |
| QA-049 | Low | EDGE/SEC | BE | Code ✔ | Media residuals (non-revocable signed URLs, no upload limit); invite acceptance is now atomic — **partly fixed** (25 Oct; BE `17900c0`) |
| QA-050 | Low | UX | FE | Code ✔ | Four currency formats, four date formats, partial dark mode, accessibility gaps — **open** (code re-checked 24 Oct) |
| QA-051 | Low | DOC/SEC | FE | Code ✔ | API URL defaults to localhost:3000, there is no middleware route guard, and the permission script is a hand copy — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-052 | Low | DOC | BE | Code ✔ | Architecture docs out of date; three different list envelope shapes — **open** (code re-checked 24 Oct) |
| QA-058 | Low | FLOW | Both | Browser ✔ | The new Calendar page can't be opened by any role: the backend never grants `calendar:read` — **fixed** (reconciled 24 Oct) |
| QA-059 | Low | UX | FE | Browser ✔ | A wrong password shows both an inline alert and a toast (empty submit and the Teacher breadcrumb are fixed) — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-063 | Low | UX | BE | Live ✔ | Whole-school invoice run message named one class — **fixed** (e28166d) |
| QA-054 | Low | Process | BE | Suspected | The e2e test creates "Parent Ward Link Academy" schools and never deletes them (74 left in the dev DB; creation stopped 20 Oct) — **fixed** (24 Oct; backend `71ec686`, leftovers deleted) |
| QA-071 | Low | UX/EDGE | Both | Code ✔ | Smaller design-builder gaps — **open** (code re-checked 24 Oct) |
| QA-074 | Low | EDGE/UX | Both | Code ✔ | Smaller calendar gaps (overnight events, timed closures, stuck loader, +N more) — **open** (code re-checked 24 Oct) |
| QA-078 | Low | UX | FE | Code ✔ | A failed read makes school setup look done — **open** (code re-checked 24 Oct) |
| QA-079 | Low | EDGE | Both | Code ✔ | School setup: clearing the email sends "", a Principal can change the code and logo URL, and an empty term number is sent — **partly fixed** (reconciled 24 Oct; see Status reconciliation) |
| QA-082 | Low | FLOW | BE | Code ✔ | Optional-service requests that should no longer be possible (orphaned, leavers, forced fees) — **open** (code re-checked 24 Oct) |
| QA-083 | Low | UX/FLOW | Both | Code ✔ | Smaller optional-request gaps (issued bills, price, races, paging) — **open** (code re-checked 24 Oct) |
| QA-087 | Low | EDGE/UX | Both | Code ✔ | Smaller fee-setup gaps (module gating, duplicates, huge amounts, lists) — **open** (code re-checked 24 Oct) |
| QA-088 | Low | FLOW/UX | Both | Code ✔ | Invite page and lead-form edge cases — invite double sign-in **fixed** (22 Oct) |
| QA-205 | Low | DOC | BE | Code ✔ | Reset email says 30 minutes; the link lasts 60 — **fixed** (24 Oct; BE `7d5a143`) |
| QA-230 | Low | UX | FE | Browser ✔ | Parent "Coming up" shows 3 events and leaves out the PTA meeting — **open** (code re-checked 24 Oct) |
| QA-234 | Low | FLOW | Both | Code ✔ | Only one class teacher per class (no assistant or co-teacher) — **open** (code re-checked 24 Oct) |
| QA-235 | Low | FLOW/data | BE | Code ✔ | Changing a class teacher overwrites it; no history of who taught the class each term — **open** (code re-checked 24 Oct) |
| QA-241 | Low | UX/audit | BE | Browser ✔ | "Link parent account" on an already-linked parent says linked again and logs a second link — **fixed** (23 Oct, BE `cece817`) |
| QA-242 | Low | UX | BE | Browser ✔ | Staff link refused with "more than one parent account" when the others are blocked or already linked — **fixed** (23 Oct, BE `cece817`) |
| QA-244 | Low | UX/money | FE | Browser ✔ | Parent bill list shows a credit bill as "GHS 0.00 of GHS -200.00" — **fixed** (24 Oct; FE `01ce719`) |
| QA-256 | Low | UX | BE | Live ✔ | Setup apply with a weight override keeps the preset's name ("GES 30/70 (Lower Primary)" for a 40/60 scheme) — **fixed** (24 Oct; BE `3708535`, local, not pushed: edited copies named after their content) |
| QA-259 | Low | Bug | BE | Live ✔ | Term report class view returns `batch.classId: null` (the class relation isn't loaded) — **fixed** (24 Oct; BE `a0220a2`) |
| QA-260 | Low | UX | Both | Browser ✔ | A position reads "2nd of 4" on screen but "2nd out of 5" on the printed report (the pupil who left is counted), and ties aren't marked "=" — **fixed** (24 Oct; BE `a0220a2`, FE `018cc3b`: "2nd=" on screen and in print; "out of" = on roll) |
| QA-261 | Low | UX | FE | Browser ✔ | The term reports page requests the remark bank for a secretary and gets 403 each time — **fixed** (24 Oct; FE `018cc3b`) |
| QA-262 | Low | UX | FE | Browser ✔ | Parent portal Fees tab shows "Could not load … Try again" at a school without the fees module, instead of hiding it — **fixed** (24 Oct; FE `c98d2c4`, `e85bd47`, BE `e6616cb`, local) |
| QA-263 | Medium | Perf | DX | Browser ✔ | Moving between pages on the dev server takes 1–3.5 s the first time each page opens after a restart or code change (production: about 60 ms) — **fixed** (25 Oct; FE `7558121`: Turbopack dev; takes effect when :3001 is restarted) |
| QA-264 | Medium | Perf | FE | Browser ✔ | Pages request the same data more than once (Fees, Setup, Students, Calendar), even in a production build — **fixed** (25 Oct; FE `2bdcb1f`, `7558121`) |
| QA-265 | Low | UX | FE | Browser ✔ | Bill & report designs calls the fee-types API at a school without the fees module (repeated 403s), as Setup did in QA-246 — **fixed** (25 Oct; FE `2bdcb1f`) |
| QA-266 | Medium | UX | FE | Browser ✔ | Dragging a section onto an empty column moves it out of the Columns section, to just above it, instead of into the column — **fixed** (25 Oct; FE `f9162ee`) |
| QA-267 | Medium | Data | FE | Browser ✔ | A head's "Remove" on a class test that already has marks deletes the test and every mark in it at once, with no confirmation — **fixed** (25 Oct; FE `3cdfbf6`) |
| QA-268 | Low | EDGE | BE | Live ✔ | A later period can be dated before an earlier, still undated one, leaving no room for the earlier period — **fixed** (25 Oct; BE `8abbe07`) |
| QA-269 | Low | UX | FE | Browser ✔ | "Set dates" on an undated term shows the switch "This is the current academic year", although it sets the current term — **fixed** (25 Oct; FE `78939e7`) |
| QA-246 | Low | UX | FE | Browser ✔ | School setup calls the fee-types API on schools without the fees module (repeated 403s) — **fixed** (24 Oct; FE `e469eda`) |
| QA-247 | Low | Data | BE | DB ✔ | A promotion into a later term records the new class history row as starting today, not on the term's start date — **fixed** (24 Oct; BE `f9e93b5`) |
| QA-249 | Low | UX | Both | Browser ✔ | Move classes up: the result says "0 stayed" for classes set to "Don't move", though the confirmation counted them — **fixed** (24 Oct; FE `b032a41`) |
| QA-252 | Low | UX | BE | Browser ✔ | AdminJS Analytics shows cedi amounts with "$" and raw ISO dates on the attendance trend — **fixed** (24 Oct; BE `611856b`) |

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
| QA-012 | Fixed (re-tested 24 Oct after 44b2a3f) | helmet; gate Swagger; require `CORS_ORIGINS` and `NODE_ENV` in production |
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
- **Re-test 24 Oct (browser): fixed.**
  - **Login:** staff "Principal@BIS.test " (capitals and a trailing space) signed in as principal@bis.test. Parent "Grace.Adjei@BIS.TEST " signed in as grace.adjei@bis.test.
  - **Forgot password:** "  GRACE.ADJEI@bis.TEST" returned 204, and the reset email preview was addressed to grace.adjei@bis.test. The link wasn't used and the password is unchanged.
  - **Duplicates:** on PRM-001, inviting "Teacher@PRM.Test" (teacher@prm.test exists) shows "Email already registered" (409) in the form. `POST /auth/register-parent` with "GRACE.Adjei@bis.test" gets 409 "Email already registered".
  - **Data:** the unique index `UQ_USERS_EMAIL_LOWER` on `lower(email)` is in place, and no stored email has capitals. The old duplicate is now head-bis@fastrack.school (inactive, no password), next to the single head@fastrack.school.
  - **Fields:** the staff login, parent login, forgot-password, parent sign-up and invite email fields all have `type=email`, `inputmode=email`, `autocapitalize=none`, `autocorrect=off` and `spellcheck=false`. Autocomplete is `username` on staff login, `email` on parent login, forgot password and sign-up, and `off` on the invite form.
  - Screenshot: `prm-qa201-invite-dup.png`.

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
- **Re-test 24 Oct (browser): fixed.** The test ran on a new throwaway school, **PRM-001 "QA Promotion Test School"** (id `b9fa310c-b6ed-4a3c-b18b-05ee3559203a`). It has principal@prm.test and teacher@prm.test (`Prm!Pass2026`), 2026/27 with Term 1 (current) and Term 2, and classes A, B and C with 3 pupils each.
  - **Class order:** Class A, B and C, created in School setup with Order left empty, got Order 1, 2 and 3, and the list is sorted by it.
  - **Preview** (`/school-admin/students/promote`, linked from the Students header): A → Class B, B → Class C and C → "Graduates (leaves the school)", each 3 of 3. "6 pupils move up, 3 graduate, 0 stay."
  - **Repeater:** unticking Akwasi PromoA gave "5 pupils move up, 3 graduate, 1 stay."
  - **Shared order:** with Class C set to Order 2, Class A showed "Choose where this class goes" and Review was blocked. Order 3 restored it. See QA-245 for what happens to Class B.
  - **The one real run:** start term Term 2, 2026/27 (pre-filled), leaving date 18 Dec 2026, Akwasi kept back. The confirm dialog read "5 move up, 3 graduate…, 1 stay… Move 8 pupils". The toast read "5 pupils moved up, 3 graduated and 1 stayed". The results table showed A→B 2 moved / 1 stayed, B→C 3, C→Graduated 3. The DB matches: Akwasi is in A, Adjoa and Aba in B, all of B in C, and Comfort, Kweku and Cecilia are Graduated with no class. Benewaa's history gained "Class C · Term 2 2026/27". Comfort's exit is "Graduated · Term 1 2026/27 · 2026-12-18".
  - **Teacher:** the page has no link for her, opening it directly redirects to the dashboard, and `GET /promotions/preview` and `POST /promotions` both return 403.
  - Screenshots: `prm-qa207-preview.png`, `prm-qa207-results.png`.
  - **Clean-up:** PRM-001 is throwaway test data and can be deleted.

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
- **Re-test 24 Oct (browser, Principal on BIS-001): fixed.**
  - **Steps:** Enter in the Surname field moved to Academics. "Next Step" moved to Guardians.
  - **Guardian rule:** "Next Step" with an empty Guardians step stayed there with "Add the mother's or father's name and phone number.", and so did a mother's name with no phone. Nothing was admitted.
  - **Health:** with the mother's phone added, Enter opened Health & Safety (Blood Group, Genotype, Allergies & Medical Notes, Emergency Contact Person). Still nothing was admitted.
  - **One admission:** "Complete Admission" admitted once. "Student Admitted Successfully · Kwesi Admissiontest enrolled with code: BIS-001/STD/2026/012", and the DB count is 1.
  - **Skipping ahead:** a second test (Esi Skipaheadtest) jumped to Health & Safety with the step header and no guardian. "Complete Admission" showed "Admission Form Alert · Add the mother's or father's name and phone number." and went back to Guardians. Nothing was admitted, and the form was cancelled.
  - **API:** `POST /schools/me/students` with no guardian, or with a mother's name and no phone, gets 400 "Add the mother's or father's name and phone number, or link a parent account." Nothing was created.
  - Screenshots: `bis-qa210-guardian-required.png`, `bis-qa210-health-step.png`.

#### QA-211: Guardian contacts can't be viewed or corrected after admission
- **Side / status:** FE / Browser ✔ Code ✔ · **Severity:** High
- **Evidence:** mother and father name, phone and email exist only in the admission form (`students/page.tsx`). The student drawer has no guardian-contact fields, and there's no "link parent" action for staff.
- **Impact:** parent linking sends the OTP to "the contact on record". A typo, a missing contact or a changed number means that parent can **never** link, and the school can't fix it.
- **Fix:** an editable Guardians section in the drawer (with an audit trail), and a staff "link parent" action (the API `POST me/students/:id/parents` exists).
- **Fixed 23 Oct** (backend `a89ee57` on `main`; frontend `0fd3b0d`): a Guardians tab in the student drawer, edits recorded in `audit_logs`, and "Link parent account" from the mother's or father's contact on record.
- **Browser re-test (23 Oct, BIS-001):**
  - Principal: Esi Adjei's mother email entered as `  GRACE.ADJEI@BIS.TEST  ` with a blank occupation was saved as `grace.adjei@bis.test` and NULL. Save stays disabled until something changes, and "Link parent account" is disabled while edits are unsaved. A save that changes nothing after trimming writes no audit row.
  - Kwame Adjei (mother Comfort, no account): added the mother's email of an existing parent, saved, then "Link parent account" linked Grace Adjei. Grace now has two wards (Esi and Kwame).
  - Teacher (Yaw Darko): contacts hidden and read-only, no Unlink, Link or history. Account Officer: contacts visible, read-only, no editing.
  - **New issues:** QA-238 (the history panel is always empty), QA-239 (a session from before the update shows "hidden" and can't edit until the user signs in again), QA-241 (relinking an already-linked parent).

#### QA-214: Unlinking a parent doesn't stick (safeguarding)
- **Side / status:** Both / Browser ✔ · **Severity:** High
- **Repro:** staff unlink the father, and he links himself again straight away with a new OTP.
- **Cause:** his contact is still on record (QA-211), and there's no block list.
- **Impact:** custody disputes and court orders can't be honoured.
- **Fix:**
  - Unlink can also remove or flag that contact.
  - A "blocked from linking" list per student.
  - Notify the remaining guardians.
- **Fixed 23 Oct** (backend `a89ee57`; frontend `0fd3b0d`): Unlink has "Prevent this parent from linking again" with a reason, which stores a block covering the account and its phone and email. The student shows a "Blocked from linking" list with "Allow again".
- **Browser re-test (23 Oct, BIS-001, Nana Tetteh):**
  - The Principal unlinked samuel.tetteh@bis.test with a block and the reason "Court order (QA test)". The toast read "Parent unlinked and blocked", and the block was listed with who blocked and when.
  - Samuel then tried to link Nana in the parent app with her code. He got the ordinary "We could not link a child with those details…" (400), which doesn't reveal the block.
  - Staff "Link parent account" was refused (409, but with a misleading message: QA-242).
  - "Allow again" asked to confirm, then showed "Block lifted". Samuel relinked with a code sent to `+233 ••• 002`. Nana is back to her original two linked accounts.
  - **Gap:** his second account with the same phone stayed linked the whole time (QA-240). The change history didn't show any of this (QA-238).

#### QA-222: Parent app's "paid of" total counts carried bills again every term
- **Side / status:** FE / Browser ✔ · **Severity:** High (money shown to parents)
- **Repro:** after rollovers, Esi's Fees page says "GHS 0.50 paid of **GHS 4,489.50**", then "of **GHS 9,119.00**". Her real total billed is GHS 2,870, then 4,630.
- **Cause:** the sum adds every bill's payable, including bills whose balance was moved into the next bill.
- **Fix:** total only invoices that aren't carried forward (or use the account's `total_billed`).
- **Re-test 23 Oct (browser, parent Grace → Esi Adjei): fixed.** The card now reads `GET /parents/me/wards/:id/invoices/summary` for the selected term:
  - All terms: GHS 4,629.50 outstanding, "GHS 0.50 paid of GHS 4,630.00" (1,620 + 1,250 + 1,760), with no carry notes.
  - Term 1 2026/27: GHS 0.00, "GHS 0.50 paid of GHS 1,620.00", "GHS 1,619.50 moved to a later bill".
  - Term 2 2026/27: GHS 0.00, "GHS 0.00 paid of GHS 1,250.00", "Includes GHS 1,619.50 brought forward…", "GHS 2,869.50 moved to a later bill".
  - Term 1 2027/28 (current): GHS 4,629.50, "GHS 0.00 paid of GHS 1,760.00", "Includes GHS 2,869.50 brought forward from earlier bills".
  - Term 3 2026/27: no bills, so the page shows "No bills yet" and no card.
  - **FIS-001, after the carry-forward repair (migration 1792600000500):** parent.ansah → Kofi Ansah shows GHS 3,600.00 outstanding, "GHS 0.00 paid of GHS 3,600.00" for all terms (it was 5,250), with no brought-forward note. Term 1 2026/27: GHS 0.00, "0 of 1,650", "GHS 1,650.00 moved to a later bill". Term 2 2026/27 (current): GHS 3,600.00, "0 of 1,950", "Includes GHS 1,650.00 brought forward". A separate data issue on another FIS-001 ward is QA-243.
  - The carry chain adds up: 1,619.50 + 1,250 = 2,869.50, and 2,869.50 + 1,760 = 4,629.50. No API errors. Screenshots: `bis-q222-esi-all.png`, `bis-q222-esi-2026t1.png`.

#### QA-227: An old "sealed" bill link changes after it was sent
- **Side / status:** BE / Browser ✔ · **Severity:** High
- **Repro:** open the Term 1 public bill link from an earlier SMS after promotion and the next term's billing.
- **Actual:** the header still says "TERM 1 2026/27" with Term 1's fee lines, but "ClassID: BASIC 1" (her current class; she was billed as KG 2), "Bal B/f 3,130.00" and "TOTAL FEES DUE 4,629.50" (her current all-time balance). All of it sits under "DIGITALLY SIGNED & SEALED · Tamper-Proof & Verified".
- **Fix:**
  - Render public bills from the invoice's signed snapshot (`snapshot_data`).
  - Label carried-forward bills "Moved to INV/…".
  - Never mix in live account balances.
- **Re-test 24 Oct (browser, public links, backend `eb0f25c`): fixed.** Each link shows the bill as issued.
  - **Esi 0009 (Term 1):** "Fees Due 1,500.00 · Balance from previous bills 0.00 · Less Amount Paid to Date −0.50 · Balance moved to INV/BIS-001/2026/0033 −1,499.50 · TOTAL FEES DUE 0.00". The excursion bill 0019 moves its 120.00 to 0033 too, so 0033 receives 1,619.50.
  - **Esi 0033 (Term 2):** "Fees Due 1,250.00 · Balance from previous bills 1,619.50 · Balance moved to INV/BIS-001/2026/0041 −2,869.50 · TOTAL FEES DUE 0.00".
  - **Esi 0041 (2027/28 Term 1):** "Fees Due 1,760.00 · Balance from previous bills 2,869.50 · TOTAL FEES DUE 4,629.50".
  - **Efua 0039 (FIS-001):** "Fees Due 1,700.00 · Credit from previous bills −1,900.00 · CREDIT ON THIS BILL 200.00".
  - **Seal:** "CHARGES DIGITALLY SIGNED & SEALED" with "Payments as of <date>". "Bal B/f" is gone.
  - **Class:** a test pupil, Abena Classcheck (BIS-001/STD/2026/011), was admitted to Basic 1. She was billed alone for 2027/28 Term 1 (INV/BIS-001/2026/0043, 1,760.00), then moved to Basic 2. Her link still reads "Class: Basic 1". Screenshot: `bis-qa227-class-kept.png`.
  - **Known limit (user's choice, no backfill):** bills issued before the fix still show the current class. For example, Esi's Term 1 bill says Basic 1 though she was billed as KG 2.
  - A broken logo on the BIS-001 links during this test was environmental: the server ran from a separate worktree without the shared `storage/` folder. It isn't a product bug.

### Medium

| ID | Sev | Side | Finding | Fix |
|---|---|---|---|---|
| QA-200 | Medium | BE | School codes are compared exactly. The unique index on `schools.code` is case-sensitive and untrimmed, so `fis-001` or `FIS-001 ` would be a second school. Parents type this code. | Normalise to upper case and trim; unique on `upper(code)`. <br>Re-test 24 Oct (API, throwaway school "QA Code Test School", now QAC-200Z, with principal@qac.test / `Qac!Pass2026`; it can be deleted): **fixed**.<br>• **Super Admin create:** "qa/200", "Q" and "qa 200" get 400 "School code must be 2–20 letters, digits or hyphens". " bis-001 " and "Fis-001" get 409 "School code already exists". "  qac-200x " is saved as QAC-200X.<br>• **Super Admin edit:** "prm-001" gets 409, "x" and "qac 200" get 400, and "qac-200y" is saved as QAC-200Y.<br>• **Principal's own edit** (`PATCH /schools/me`): "Bis-001" gets 409, "a/b" gets 400, and " qac-200z " is saved as QAC-200Z.<br>• **Index:** `UQ_SCHOOLS_CODE_UPPER` on `upper(code)` is in place. |
| QA-202 | Medium | Both | After the Super Admin assigns a principal, the school still says "Principal: Not assigned". The pending invite isn't shown and can't be resent or revoked there, and a second principal invite was accepted while the first was open (two PRINCIPAL invites pending). | Show the pending invite with Resend and Revoke. Allow one open principal invite per school. <br>Re-test 24 Oct, on a throwaway school "QA Invite Test School", code QAI-202 (later renamed "St. Mary's QA Invite School"; it can be deleted). **Fixed.**<br>• **Second invite:** after inviting Ama O'Neil (ama.oneil@qai.test) with no password, a second invite (same or another email) gets 409 "A principal invitation is already pending for ama.oneil@qai.test. Resend or revoke it first."<br>• **API:** `GET /super-admin/schools/:id` returns `pendingPrincipalInvite` (name, email, sentAt, expiresAt, resendCount). `GET /invitations?schoolId=` returns just that school's invite, and BIS-001's list has none of it.<br>• **Platform page:** it shows "Ama O'Neil · INVITED · ama.oneil@qai.test · Sent 24 Oct 2026 · Expires 26 Oct 2026" with Resend and Revoke, and Assign principal is hidden. Resend gives "Invitation resent" and "(resent 1 time)". Revoke gives "Invitation revoked", and Assign principal comes back.<br>• **Follow-up:** inviting the same person again after Revoke is QA-253.<br>• Screenshot: `qai-qa202-invite-card.png`. |
| QA-203 | Medium | BE | The plain-text part of the invite and reset emails contains `setup-password?token&#x3D;…` (HTML-escaped), a broken link in text-only clients. | Don't HTML-escape the text template. <br>Re-test 24 Oct (dev email previews, rendered): **fixed**. The invite text part reads "…join St. Mary's QA Invite School…" and "http://localhost:3001/auth/setup-password?token=3bfb…". The reset text part (throwaway principal@qac.test) reads "…/auth/reset-password?token=9590…" and "If you didn't request…". There is no `&#x3D;` and no escaped apostrophe in the text. The raw preview page HTML-escapes its own `<pre>`, which is expected. |
| QA-209 | Medium | Both | Birth date in the future (2030) accepted at admission and saved. | Validate the birth date (past; a reasonable age range for the class). <br>Re-test 24 Oct (PRM-001; nothing saved): **fixed**.<br>• **API:** birth date 2027-03-15 gets 400 "Birth date can't be in the future" from admission (`POST /schools/me/students`), student edit (Aba), staff edit (teacher@prm.test), user create (`POST /users`) and super-admin staff create. No pupil or user was created, and Aba's birth date is unchanged (2019-03-04).<br>• **UI:** the admission and Profile date fields have `max=2026-10-24`. A typed future date shows "Birth date can't be in the future." and keeps admission on step 1, with Profile Save disabled.<br>• Screenshot: `prm-qa209-profile-future.png`. |
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
| QA-238 | Medium | FE | Found in the QA-211 re-test (23 Oct). Guardians tab → Change history → Show always says "No changes recorded yet". The audit rows exist (`audit_logs`), and `GET me/students/:id/history` returns them, but with `X-Api-Contract: 2` the data is a plain list, while `studentsApi.history` (`src/features/students/api.ts:215-218`) reads `page.items`. So staff can't see who changed a contact, which was the point of QA-211's audit trail. | Read the list (`data` is the array; paging in `meta`), like other v2 lists. Add a test against the v2 shape. <br>Re-test 23 Oct (browser): **fixed** (FE `b0ac515`). The panel lists the entries, e.g. "Changed guardian contacts · Ama Boateng · Mother's email: Grace.Adjei@bis.test → grace.adjei@bis.test". Screenshot: `bis-h1-qa238-history.png`. |
| QA-239 | Medium | FE | Found in the QA-211 re-test (23 Oct). The Principal's session from before the update showed "Phone numbers and emails are hidden for your role" with every field read-only, while the real phone and email were shown in those fields. `parseAuthUser` (`src/lib/auth/session.ts:43`) drops permission keys the frontend didn't know at sign-in, and token refresh never re-reads the user, so `students:read_sensitive` stayed missing until sign-out. Refresh tokens last up to 14 days, so after every release that adds a permission key, staff lose that feature until they sign in again. | Re-read the user (or `/auth/me`) after a refresh and on app load, instead of trusting the stored copy. Or keep unknown keys and only filter them when checking. <br>Re-test 23 Oct (browser): **fixed** (FE `b0ac515`). With `students:read_sensitive` removed from the stored session, a reload called `/auth/profile`, put the key back, and the Guardians tab was editable with no "hidden" alert. |
| QA-240 | Medium | BE | Found in the QA-214 re-test (23 Oct). Nana Tetteh had two linked accounts for her father: samuel.tetteh@bis.test and samuel.tetteh.bis@example.org, both with phone 024 777 0002. Unlinking and blocking the first stored a block covering that phone, but the second account stayed linked and nothing pointed it out. A blocked person can keep seeing the child through another account. | When blocking, list other linked accounts that share the blocked phone or email and offer to unlink them too, or unlink them in the same step. <br>Re-test 23 Oct (browser): **fixed** (BE `cece817`, FE `b0ac515`). The unlink dialog warns "Another account uses the same phone or email and will be unlinked and blocked too". Confirming unlinked both Samuel accounts, and one block covers `phone:247770002` and both emails. The second account's relink was refused with the neutral message. Polish (FE `a2c39cf`, checked in the browser): the warning now reads "…blocked too: Samuel Tetteh (samuel.tetteh.bis@example.org)". Screenshots: `bis-h1-qa240-warning.png`, `bis-h2-qa240-blocked.png`. |
| QA-243 | Medium | BE | Found in the QA-222 re-test on FIS-001 (23 Oct), flagged by the guardian-contacts session. Efua Ansah (school_student `5ebd4e59`, parent rita.ansah@gmail.com): supplementary bill INV/FIS-001/2026/0013 is GHS 100 with `total_payment` 8,400 and `balance` −8,300. Its only payment is GHS 2,000 (MAN-RCT-0046), and no online payments exist. The next bill (0019) brought forward only −300 of credit, and 0013 is not marked carried forward. The fee account says `total_paid` 2,000 and `total_billed` 3,900, although the payments add up to GHS 3,600 (1,600 + 2,000). The figures disagree three ways, so the parent and staff views may each show a different balance. It may be left over from earlier payment tests (QA-004/QA-086), but nothing in the app detects or repairs it. The browser view wasn't checked, because there is no test password for rita.ansah@gmail.com. | Decide the true credit (2,000 − 100 = 1,900 by the payments), then repair 0013, 0019 and the account. Add a reconciliation check that `invoice.total_payment` = the sum of its live payments, and that the account totals match the invoices. <br>Re-test 23 Oct: **fixed**.<br>• **Data:** Efua's bills are repaired. Bill 0013 shows paid 2,000, balance 0, with 1,900 carried forward. The new term bill 0039 brings forward −1,900 and keeps its balance of −200; before the fix it was clamped to 0. Extra bill 0040 is 500. The account shows billed 3,900, paid 3,600 (= 1,600 + 2,000) and balance 300 (= −200 + 500), so all three figures agree.<br>• **Ledger check:** `GET /super-admin/system/ledger-check` as Super Admin returns `consistent: true` for all schools, for BIS-001 and for FIS-001. The Account Officer gets 403.<br>• **Receipt numbers:** as the Account Officer on BIS-001, recording a payment with receipt "RCT/BIS-001/2026/0001", "  rct/bis-001/2026/0001  " or "Rct/Bis-001/2026/0001" gets 409 "Receipt number RCT/BIS-001/2026/0001 is already used by another payment in this school…" and creates no payment. The unique index `UQ_PAYMENTS_SCHOOL_RECEIPT_NORMALISED` on `(school_id, upper(trim(receipt_number)))` is in place. The staff payment form has no receipt field, so this was tested through the API.<br>• **Parent card (FE `9fbc58e`, browser):** as Rita Ansah (dev test password reset with the user's approval) Efua's card reads "Outstanding GHS 300.00", "GHS 3,600.00 paid of GHS 3,900.00" and "After GHS 200.00 credit from an earlier bill"; before this fix it said 500. Esi (GHS 4,629.50, no credit note) and Kofi (GHS 3,600.00) are unchanged. No API errors. The bill list wording is QA-244. |
| QA-245 | Medium | Both | Found in the QA-207 re-test on PRM-001 (24 Oct). Classes A, B and C had Order 1, 2 and 3; Class C was set to 2, so B and C share the top number. The page asks only Class A to choose ("Choose where this class goes"), but pre-fills **Class B → "Graduates (leaves the school)"**, the same as C. After choosing A → Class B, Review enabled, and the confirmation read "3 pupils move up, **6 graduate** and leave the school… Class B → Graduates… Move 9 pupils". One click would graduate a whole middle class. The dialog does list it, so it wasn't confirmed. Screenshot: `prm-qa245-b-graduates.png`. | Treat every class that shares the top order number as ambiguous: no pre-fill and a required choice, as for Class A. Better, refuse duplicate order numbers or warn about them in class settings. <br>Re-test 24 Oct (PRM-001): **fixed**. Order numbers are now unique.<br>• **Form:** setting Class C to Order 2 kept the form open with "Order 2 is already used by Class B. Give each class its own number." under the field, and no toast.<br>• **API:** a direct `PATCH` gets 409 with the same message.<br>• **Own number:** re-saving C as 3 works.<br>• **Order 0:** classes on 0 must be given a target and are never suggested as one. With B and C at 0, both showed "Choose where this class goes". The old scenario (B and C both pre-filled "Graduates") can't happen now. The remaining gap is QA-248. Screenshot: `prm-qa245-order-taken.png`. |
| QA-248 | Medium | Both | Found in the QA-245 re-test on PRM-001 (24 Oct; BE `f9e93b5`). With Class A on Order 1 and Classes B and C on 0 ("not ordered yet", e.g. created outside the app), the preview correctly asks B and C to choose. But it pre-fills **Class A → "Graduates (leaves the school)"**, because no numbered class follows it. After choosing "Don't move" for B and C, Review enabled, and the confirmation read "1 graduate and leave the school… Class A → Graduates… Move 1 pupil". I cancelled. A school that has numbered only its first classes would graduate the last numbered class by default. Screenshot: `prm-qa248-a-graduates.png`. | Suggest "Graduates" only when the class is the highest-numbered class and no class is on 0. Otherwise require a choice. Or show a warning: "Some classes have no order, so we can't tell which class is last." <br>Re-test 24 Oct (PRM-001): **fixed**. Class A is empty now, so it isn't listed. With A=1, B=2 (the top numbered class with pupils) and C=0, Class B starts with no target. Its options are Class C, Graduates, Don't move and Class A, and Review stays blocked until it is chosen, even after C is set to Don't move. With C back on 3: B → Class C, C → Graduates. Screenshot: `prm-qa248-choose.png`. |
| QA-250 | Medium | BE | Found in the AdminJS click-through (24 Oct; backend main `40daa86`). In Analytics, with Bismark International School (BIS-001) selected, the cards read "FEES INVOICED $78,789.00", "FEES COLLECTED $8,870.50 · 11% collection rate" and "OUTSTANDING BALANCE $37,549.50". In the DB, the sum of `fee_payable` over all bills is 78,789.00, because each bill's payable includes the balance brought forward from earlier bills. The charges actually raised (`total_fees − discount_amount`) sum to 46,420.00, which equals `student_fee_accounts.total_billed`. So the real collection rate is 19%, not 11%. Collected and outstanding are correct. This is the same double counting as QA-222, in the Super Admin dashboard. The all-schools view ($141,879.00 invoiced, 16%) is inflated the same way. Screenshot: `adm-qa250-analytics-bis.png`. | Sum charges once: `total_fees − discount_amount`, or the accounts' `total_billed`, or skip carried-forward bills' arrears, as the parent fees summary now does (QA-222). <br>Re-test 24 Oct (browser): **fixed**. Analytics shows BIS-001 "FEES INVOICED GH₵ 46,420.00 · 19% collection rate" and FIS-001 GH₵ 40,110.00 (15%). All schools shows GH₵ 100,750.00 (23%), which equals `sum(total_fees − discount_amount)` and the accounts' `total_billed`. Collected (8,870.50 and 22,770.50) and outstanding are unchanged. `GET /super-admin/analytics/schools-comparison` gives BIS-001 19.11% and FIS-001 15.21%. Screenshot: `adm-qa250-fixed-bis.png`. |
| QA-251 | Medium | BE | Found in the AdminJS click-through (24 Oct). Lists, records and new forms open for all 36 resources, but three filters fail with 500 "Internal server error", even with real values: `School Module` filtered by school (BIS-001's id), `Parent Student` by parent (Grace Adjei's id), and `Marketing Lead` by kind ("waitlist"). Request: `GET /admin/api/resources/<Resource>/actions/list?filters.<field>=…` → 500. Other filters work, e.g. Staff by email, School by email, Fee Type by name and Invoice by title. School Module and Parent Student are probably join tables keyed by those columns, and kind is an enum. The cause is in the server log. | Fix or remove those filter properties (`filterProperties`) and add a test that every resource's list works with each filter. <br>Re-test 24 Oct (browser): **fixed**. School Module filtered by BIS-001 gives 8 rows. Parent Student filtered by Grace Adjei gives 2 rows. Marketing Lead filtered by kind ("waitlist" or "WAITLIST") shows "No records", with no error; the dev DB has no leads. |
| QA-253 | Medium | Both | Found in the QA-202 re-test on throwaway school QAI-202 (24 Oct). After **Revoke**, the platform school page shows only "Assign principal". Assigning the same person (ama.oneil@qai.test) gets 409 "Email already registered. This person has not set up their account yet, so resend their invitation instead.", but the page has no Resend for a revoked invite, so the UI is a dead end. Resending the revoked invitation through the API (`POST /invitations/:id/resend`) works: the card came back as "INVITED… (resent 2 times)". A Super Admin who revokes by mistake, or wants to re-send to a principal whose link expired after a revoke, can't do it without the API or a different email. Revoke also has no confirmation step. Screenshot: `qai-qa253-reinvite-blocked.png`. | When the last principal invite was revoked or expired and the account was never set up, show the person with "Invite again" (resend) instead of a blank Assign principal. Or let Assign principal with the same email reopen the invite. Add a confirm to Revoke. <br>Re-test 24 Oct (browser, throwaway QAI-202): **fixed**.<br>• **Revoke:** it now asks "Revoke the invitation to Ama O'Neil? Their link stops working; you can invite them again." Cancel leaves the invite pending (resent 2).<br>• **After revoking:** the card shows "Not assigned… Ama O'Neil ama.oneil@qai.test · invitation revoked" with **Invite again** and **Assign someone else**, and the API returns `lapsedPrincipalInvite` with REVOKED.<br>• **Invite again:** "Invitation resent", and the invite is pending again ("resent 3 times").<br>• **Assign someone else:** after another revoke, inviting Kojo Newhead (kojo.newhead@qai.test) shows "Principal invited". His invite is now the pending one, and the lapsed line is gone.<br>• Screenshot: `qai-qa253-lapsed.png`. |
| QA-254 | Medium | BE | Found in the QA-006 re-test (24 Oct; backend `8dfd574`). Since the 16:24 restart, every email (staff invite, principal invite) logs `[relu-notification-client] failed to start preview server: Error: listen EACCES: permission denied 127.0.0.1:80` (18 times), and nothing listens on ports 80–89. On macOS a non-root process may bind ports below 1024 only on the wildcard address, which the old preview used. On dev, invite links, ward-link OTPs and reset links therefore can't be read, so invite acceptance, parent linking and password reset can't be completed or tested. The leak fix itself works: no "JSON Payload", token or OTP lines in the log. | Bind 127.0.0.1 on a high port (e.g. 1080+), or fall back to printing only the local preview URL. <br>Re-test 24 Oct (`5af0b93`): **fixed**. A staff invite logs "[relu-notification-client] preview available at http://localhost:4080/". The preview opens on 127.0.0.1:4080 with the invite and a working `setup-password?token=…` link. It listens on 127.0.0.1 only, so the LAN IP gets no answer, and there is still no "JSON Payload" line. |
| QA-255 | Medium | BE | Found in the results phase 1 test (24 Oct; backend `347d1be`) on throwaway QAS-300. After deleting an unused subject SCI (soft delete), `POST /schools/me/subjects {subjectCode:"SCI"}` returns **500**. The log shows `QueryFailedError: duplicate key value violates unique constraint "UQ_SUBJECTS_SCHOOL_CODE"`, because the index is `(school_id, subject_code)` without `WHERE deleted_at IS NULL`, while the lookups skip deleted rows. `POST /results-setup/apply` with `subjects:true` hits the same error. The preset list includes SCI "Science" (`presets.data.ts:98`), `findByCode` and `findByName` miss the deleted row, and `setup.service.ts:244` inserts it, so 500. In the wizard, the "Also add each preset's usual subjects" box is ticked by default, so **"Set up grading" fails with "Could not set up grading · Internal server error"** on any school that ever deleted a subject with a preset code. Unticking the box works. Screenshot: `qas-qa255-wizard-500.png`. | Make the unique indexes partial (`WHERE deleted_at IS NULL`) for code and name, or restore and reuse the deleted row. Map the unique violation to 409. Add a test: delete a subject, then apply a preset with subjects. <br>Re-test 24 Oct (`3708535`): **fixed**. The indexes are now `UQ_SUBJECTS_SCHOOL_CODE_UPPER` and `UQ_SUBJECTS_SCHOOL_NAME_LOWER`, both `WHERE deleted_at IS NULL`. A deleted QAZ "Zed Temp" was re-created as "qaz"/"zed temp" (201). Apply with `subjects:true` on QAS-300, which has a deleted SCI, gives 200 `{subjects: created 11, existing 19}` and re-creates SCI "Science". Four parallel creates of one code, and of one name, give one 201 and three 409s ("Subject code RACE-1 is already used.", 'A subject named "Race Name" already exists.'). POST SCI with a name another live subject uses still gets the expected 409 on the name. |
| QA-257 | Medium | FE | Found in the results phase 1 test (24 Oct; frontend `d6c494d`) on throwaway QAS-300. The existing setup was: whole school GES 30/70, JHS BECE, Upper Primary Cambridge (40/60, A*–U), Lower Primary GES with weights changed to 40/60. **Run setup again** opens the wizard on the suggested presets, not on this setup: the review said "Lower Primary: same as the whole school", "Upper Primary: same as the whole school", Pre-School Montessori and SHS WASSCE. Pressing **Set up grading** (subjects unticked) replaced it. The summary now shows whole school, SHS, JHS and Pre-School, so the Upper Primary Cambridge and Lower Primary 40/60 choices are gone. The confirmation only said "2 weightings and 2 grade scales created for 2026/27." No warning that existing choices would change. Screenshot: `qas-qa257-rerun-replaced.png`. | Start "Run setup again" from the current policy (per-department schemes and scales, overrides, settings), or warn on Review: "This replaces the setup for 2026/27: Upper Primary changes from … to …". <br>Re-test 24 Oct (FE `4913515`; QAS-300 set up again by API with Lower Primary 40/60, Upper Primary Cambridge, JHS bands from 85 and Pre-School early years with an edited label): **partly fixed**.<br>• **Fixed:** "Run setup again" prefills Upper Primary Cambridge, JHS "(changed)… 1 from 85" and Pre-School "Early years (descriptors) (changed)". Review now opens with "**This changes your current setup**" listing each change, plus a red "Some settings will be removed · 1 setting for a single class or subject, or a department's own grades, can't be shown here and will be removed when you apply."<br>• **Still wrong:** Lower Primary (same preset as the school, only weights 40/60) is prefilled as "same as the whole school", so Review lists "Lower Primary: Class score 40 / Exam 60 with GES A–F → same as the whole school" instead of "No change". Applying unchanged would still drop it, though now with a warning. Not applied. Screenshot: `qas-qa257-review-warning.png`. <br>Re-test 2 (24 Oct, FE `769f63e`): **fixed**.<br>• **Prefill:** "Run setup again" on QAS-300 shows "GES basic (30% class, 70% exam): your current (Class score 40 / Exam 60, GES A–F)" for Lower Primary, with its own weights card (worked example 30 of 40, 46 of 60). Upper Primary is Cambridge, and JHS and Pre-School show "your current".<br>• **Review:** "No change to weights or grades · Applying keeps the current setup; only the settings below are saved." The removal warning is gone.<br>• **Apply:** applying unchanged gives "0 weightings and 0 grade scales created", and the summary keeps all five rows.<br>• **Note:** a session that was open while `c2dae22` hot-loaded was briefly sent to the dashboard. After a reload it recovered: the profile refresh restored the new results permissions. Not a finding.<br>• Screenshot: `qas-qa257-no-change.png`. |
| QA-258 | Medium | BE | Found in the results phase 3 test (24 Oct; backend `101af33`) on throwaway QAR-301 Basic One. Registers were kept on 22 and 23 Oct only. After compute, every pupil's attendance is `{present: n, total: 39, source: "register"}`: 39 is every weekday from 1 Sep to 23 Oct. Latejoiner, admitted on 15 Oct (7 school days), shows "1 of 39". Pupilone, present on both register days, shows "2 of 39". The printed report says "Attendance: 2 out of 39", and the class view in the UI shows the same. Days with no register taken, and days before a pupil joined, count as absences, so a parent sees what looks like very poor attendance. A typed figure (Mover 3 of 4) works and survives a recompute. Screenshot: `qar-term-reports-class.png`. | Count only days a register was taken for the class, and only from the pupil's join (or move-in) date to their leave date. Or, if school days are meant, start each pupil's total at their joinedOn or movedFrom date and show "no register" when none were kept. <br>Re-test 24 Oct (`a0220a2`): **fixed**. After a recompute on QAR-301, the total is the days a register was taken while the pupil was in the class. Pupilone shows 2 of 2. Pupiltwo shows 2 of 2 (late counts as present). Latejoiner shows 1 of 2, and after a register on 14 Oct (before she joined) she still shows 1 of 2, while Pupilone goes to 3 of 3. Mover's typed 3 of 4 (manual) is kept. The print shows "Attendance: 2 out of 2". |
| QA-229 | Medium | Both | Paystack checkout uses the parent's login email. If Paystack rejects it, the parent sees the raw "Invalid Email Address Passed" and can't pay online. | Validate the email at sign-up, fall back to a school or placeholder email, and show friendly errors. |

### Low

| ID | Sev | Side | Finding | Fix |
|---|---|---|---|---|
| QA-205 | Low | BE | The reset email says the link "will expire in 30 minutes". The real TTL is 60 minutes (`PASSWORD_RESET_TTL_SECONDS`), and the app says "one hour". | Use the constant in the copy. <br>Re-test 24 Oct: **fixed**. The reset email's text and HTML parts both say "This link will expire in 1 hour for your security." "30 minutes" is gone. |
| QA-234 | Low | Both | A class has a single `homeroom_staff_id`, so there's no assistant or co-teacher (common in KG and lower primary), and a second adult can't mark that class's register. | Allow several class teachers with a role (lead or assistant). |
| QA-235 | Low | BE | Changing the class teacher overwrites `homeroom_staff_id` with no history, so there's no record of who taught the class in an earlier term. Terminal reports ("Class teacher's remarks") and audits need this. | Keep class-teacher assignments per term (from and to dates) and read historical ones for past terms. |
| QA-241 | Low | BE | Found in the QA-211 re-test (23 Oct). Pressing "Link parent account" for a parent who is already linked returns 200, shows "Parent account linked", and writes a second `student.parent.linked` audit row. There's no duplicate link row. | Answer "already linked" (200 with a flag, or 409) and don't write an audit row. <br>Re-test 23 Oct (browser): **fixed** (BE `cece817`). Linking Grace on Kwame Adjei again shows "The mother's parent account is already linked to this student." (409) and writes no audit row (the 2 `linked` rows are from before the fix). |
| QA-242 | Low | BE | Found in the QA-214 re-test (23 Oct). On Nana Tetteh, with one Samuel account blocked and the other already linked, staff "Link parent account" (father) said "More than one parent account uses the father's phone or email. Correct the contact on record…". The contact is correct; the real reason is that one match is blocked and the other is already linked. | Leave blocked and already-linked accounts out of the match, and say which case applies. <br>Re-test 23 Oct (browser): **fixed** (BE `cece817`). With the block active, staff link says "The father's parent account is blocked from linking to this student. Lift the block first." Screenshot: `bis-h2-qa242.png`. |
| QA-244 | Low | FE | Found in the QA-243 frontend re-test (23 Oct), parent Rita Ansah → Efua, FIS-001. In the Bills list, INV/FIS-001/2026/0039 has the badge "IN CREDIT" and reads "GHS 0.00 · of GHS -200.00". A negative "of" amount is hard for a parent to read. Also, the term bill and the extra bill (0040) are both titled "Term 2, 2026/27", so nothing tells them apart. Screenshot: `fis-qa243-efua-fees.png`. | For a bill in credit, show "GHS 200.00 credit" instead of "0.00 of −200.00". Label supplementary bills with their title, e.g. "Extra bill · Term 2, 2026/27". <br>Re-test 24 Oct (FE `01ce719`, browser at phone width, Rita Ansah → Efua, read-only): **fixed**. In the Bills list, 0039 now reads "IN CREDIT · GHS 200.00 credit · Nothing to pay", with no "of" line. The bill detail reads "GHS 200.00 credit · Nothing to pay on this bill", and its totals show "Total fees GHS 1,700.00", "Credit after fees GHS 200.00", "Paid so far GHS 0.00" and "Credit GHS 200.00". The fees card reads "In credit GHS 200.00 · GHS 4,100.00 paid of GHS 3,900.00". Extra bill 0040 now shows PAID: a GHS 500 MoMo payment (RCT/FIS-001/2026/0005, 23 Oct 23:11) was recorded after the QA-243 re-test. No API errors. Still the same: the breakdown line "Credit from last term GHS -1,900.00" keeps its minus sign, which reads fine as a deduction. Term bill 0039 and extra bill 0040 are also both still titled "Term 2, 2026/27" (the second suggestion). Screenshots: `fis-qa244-bill-list.png`, `fis-qa244-bill-detail.png`. |
| QA-256 | Low | BE | Found in the results phase 1 test (24 Oct). `POST /results-setup/apply` with Lower Primary on `ges_basic_30_70` and `overrides.components {class:{weight:40}, exam:{weight:60}}` and no `schemeName` creates a scheme named "GES 30/70 (Lower Primary)" whose components are class=40, exam=60. The Grading setup summary then shows "Lower Primary · GES 30/70 (Lower Primary)" for a 40/60 split. The wizard names its own copies (frontend `d6c494d`); this affects API callers and any other client. | When weights are overridden and no name is given, name the copy after its weights (e.g. "40/60 (Lower Primary)"), as the wizard does. <br>Re-test 24 Oct (`3708535`): **fixed**. Apply without schemeName or scaleName names the copies "Class score 40 / Exam 60" (numeric, weight override), "Early years areas (edited)" (descriptor, label change) and "BECE grades 1–9 (edited)" (scale, band change). Unedited copies keep the preset names, with no "(Department)" suffix. The older "GES 30/70 (Lower Primary)" row is from before the fix. |
| QA-259 | Low | BE | Found in the results phase 3 test (24 Oct). `GET /schools/me/report-batches/:termId/:classId` returns `batch: {termId, classId: null, status, …}` for Basic One, because `reports.service.ts:930` uses `batch.schoolClass?.id`, which isn't loaded. The UI doesn't rely on it (the URL has the class), but any API client or future screen reading `batch.classId` gets null. | Load the class relation or fall back to the requested classId. <br>Re-test 24 Oct: **fixed**. `batch.classId` now returns Basic One's id. |
| QA-260 | Low | Both | Found in the results phase 3 test (24 Oct). Pupiltwo and Mover tie on an average of 74. The class view shows "2nd of 4" (ranked count), while the printed report shows "Overall Position: 2nd out of 5" (on roll, including Pupilthree, who left and has no position). Neither marks the tie (e.g. "2nd=" or "joint 2nd"), so a parent can't tell two pupils share the place. | Print "out of" the ranked count, as the screen does, and mark shared places. <br>Re-test 24 Oct: **fixed**. The print reads "Overall Position: 2nd= out of 5" for both tied pupils, and the class view reads "2nd= of 5". Both now count the number on roll, as agreed. |
| QA-261 | Low | FE | Found in the results phase 3 test (24 Oct; frontend `3e58f4d`). Opening a class in Term reports as the Secretary (sec@qar.test) calls `GET /schools/me/remark-bank` twice, and both get 403 "Forbidden resource". Nothing visible breaks (the Secretary can't write remarks anyway), but the failing requests show in logs and the console. | Load the remark bank only for users who can write remarks (homeroom teachers and heads). <br>Re-test 24 Oct (`018cc3b`): **fixed**. The Secretary's class view makes no remark-bank calls (0 × 403) and still shows the remarks. |
| QA-262 | Low | FE | Found in the results phase 4 test (24 Oct) as parent@qar.test, whose child is at QAR-301 (no fees module). The parent **Fees** tab shows "Could not load · Your school has not turned this on for parents · Try again", an error state with a retry for a feature the school doesn't use. Home and Fees call `invoices`, `invoices/summary` and `academic-terms`, all 403. The home card handles it well ("Fees owed: Not available"). | Hide the Fees tab (and skip the calls) when the ward's school has no fees module, or show a plain "Your school doesn't use online fees" message without "Try again". <br>Re-test 24 Oct: **fixed**. Wards now carry `school.enabledModules`, and it matches the DB for QAR-301, PRM-001, BIS-001 and FIS-001. Tabs and Home tiles follow it: FIS-001 shows Home, Fees, Attendance and More; QAR-301 shows Home, Reports, Attendance and More; PRM-001 shows Home, Fees, Reports and More. There are no 403s while using the visible tabs. A direct URL to an off area (QAR Fees, FIS Reports, PRM Attendance) shows "Not offered by this school · Your child's school hasn't turned this on for parents. Ask the school if you need it." with no Try again. Screenshot: `fis-parent-reports-not-offered.png`. |
| QA-263 | Medium | DX | Found 25 Oct after the user reported that routing between pages is very slow. Measured as head@fastrack.school, clicking all 19 sidebar links twice, timing from the click until the address changed and the page's data settled. **Shared dev server (`next dev`, webpack, :3001), just after another session restarted it:** first visits took 3.6 s for Fees, 2.6 s for Setup, 2.3 s for Faculty, 2.1 s for Calendar, 2.0 s for Templates, 1.4 s for Staff and 1.3 s for Attendance before the address even changed. Second visits took 90–180 ms. As kwame.mensah (Teacher): Attendance 1.6 s and Calendar 1.2 s. Parent app (Rita, phone width): sign-in to Home 1.4 s, Fees 1.3 s, Attendance 1.8 s, More 1.2 s. **Production build of the same commit** (a separate copy in the scratchpad, `next build` + `next start`): every route changed in 44–90 ms and settled in under 0.4 s, first visit included. Full reloads were ready in 160–394 ms. **Cause:** the dev server compiles each page the first time it is opened. Every restart, and every file save by any of the sessions sharing the folder, makes pages compile again, so people keep hitting the slow first visit. Idle time doesn't (a warm page stayed at 90–450 ms after 30, 75 and 150 s idle). **Turbopack check** (isolated copy, cold): `next dev --turbopack` cut first visits roughly in half or better: Fees 1.29 → 0.99 s, Students 1.05 → 0.79 s, Staff 1.09 → 0.52 s, Calendar 2.53 → 0.59 s, Templates 1.61 → 0.76 s, Faculty 1.35 → 0.85 s. Full reloads went from 0.66–1.05 s to 0.26–0.32 s. Also in dev: the Next.js dev indicator badge sits over the parent app's Home tab at phone width and intercepts taps (`fis-parent-dev-indicator.png`). The bundles aren't the problem: 200–265 kB first-load JS per page. | Change the dev script to `next dev --turbopack` (Next 15.5 supports it); a webpack-only plugin would need checking first. Avoid restarting the shared :3001 server and batch edits where possible. Set `devIndicators: false` (or move the indicator) in `next.config.mjs` so it can't cover the parent tab bar. Judge speed on a production build, not the dev server. <br>Re-test 25 Oct (FE `7558121`: `"dev": "next dev --turbopack"`, `devIndicators: false`), timed on a cold Turbopack dev server in an isolated copy, because the shared :3001 hasn't been restarted: **fixed**. First visits went from webpack's 3.6 s to 0.79 s for Fees, 2.6 to 0.45 s for Setup, 2.1 to 0.45 s for Calendar, 2.0 to 0.58 s for Templates, 2.3 to 0.75 s for Faculty and 1.4 to 0.50 s for Staff. Repeat visits took 120 ms. Full reloads were ready in 0.49–0.80 s. In the parent app (Rita, 390px), sign-in to Home took 0.67 s, first visits 0.44–0.47 s and repeats about 0.11 s. The Home tab can be tapped, as the dev badge is gone. After the user approved it, :3001 was restarted on Turbopack (`next dev --turbopack -p 3001`, 25 Oct 17:50) and re-timed cold. First visits: Fees 0.84 s (was 3.6), Setup 0.51 s (was 2.6), Calendar 0.47 s (was 2.1), Templates 0.67 s (was 2.0), Faculty 0.80 s (was 2.3), Staff 0.48 s (was 1.4), Attendance 0.47 s (was 1.3). Repeat visits took about 120 ms, and full reloads were ready in 0.46–0.82 s. Parent app: sign-in to Home 0.75 s, first visits 0.42–0.47 s, repeats 90–105 ms. |
| QA-264 | Medium | FE | Found in the QA-263 timing (25 Oct). In development, React Strict Mode runs every effect twice, so every page makes each request twice (Fees 23 calls on the dev server against 12 in production). That part is dev-only. But some requests are still repeated in the **production build**. Fees: `academic-years/:id/terms` and `invoices/summary`, twice each. Setup (18 calls): `classes`, `staff`, `academic-years` and `academic-years/:id/terms`, twice each. Students: the list, twice. Calendar: `academic-years/:id/terms`, twice. Templates: `media`, twice, but on closer reading these were two different lists (design images and school samples), not a repeat. The real waste was that every bill/report switch reloaded kinds, images, samples and fee types. Each repeat adds server load and can make a list flash or arrive out of order (QA-038). | Load shared data such as the current year, term, classes and staff once, from a shared cache (e.g. a query cache or context), and make sure each page fires its list request once when it mounts. <br>Re-test 25 Oct, Templates part (FE `2bdcb1f`, production build in an isolated copy): **fixed**. On QPM-402, opening the page makes one call each to kinds, `media?purpose=TEMPLATE_ASSET`, the bill list and the preview. Switching to Terminal report fetches only that kind's list. Samples load only when School sample is opened, and Side by side makes no new call. FIS-001 is the same, plus one fee-types call. No call is repeated and there are no 4xx. Still open: Fees, Setup, Students and Calendar. <br>Re-test 25 Oct, the rest (FE `7558121`, production build in an isolated copy): **fixed**. Setup opens with 9 calls (was 18), as the other tabs now load when opened. Fees makes 11 calls (was 12), with `invoices/summary` once. Templates makes 4, Staff 2 and Attendance 2. The pairs left aren't repeats. Fees, Calendar and Setup call `academic-years/:id/terms` once per year, and FIS-001 has two years. Students fetches the list and the active count (`status=Active&limit=1`). Routes changed in 55–74 ms and settled in 74–341 ms. |
| QA-265 | Low | FE | Found 25 Oct on QPM-402 (students and results modules on, fees off). Opening Bill & report designs calls `GET /schools/me/fee-types` twice, and both get 403 "The 'fees' module is not enabled for this school". This is the same pattern QA-246 fixed for School setup. The page still works. | Skip the fee-types call (and the fee-table sample) when the school has no fees module, as QA-246 did. <br>Re-test 25 Oct (FE `2bdcb1f`, production build): **fixed**. On QPM-402, the designs page makes no fee-types call and gets no 403. FIS-001, which has fees, still loads fee types once. |
| QA-266 | Medium | FE | Found in the three-column test on QPM-402 (25 Oct, FE `f2006b1`). A three-column section held LEFT-A in the left column and MIDDLE-B in the middle, with the right column empty. Dragging MIDDLE-B onto the empty Right column zone saved, but MIDDLE-B landed on the page itself, just above the Columns section. The right column stayed empty, and the middle was now empty too. A drop on a column that already holds a section works: dropping onto LEFT-A put the section into the left column. **Cause** (`Outline.tsx`): the empty-column `BlockList` `onDrop` doesn't call `preventDefault` or `stopPropagation`, so the drop also reaches the Columns row's own `onDrop`, which moves the section to `beforeId: <columns id>`. This affects two-column sections too, so it's older than the three-column work. Nothing is lost, and Undo puts it back, but a section can't be dragged into an empty column at all; the only way is "Add here". | In the empty-column `onDrop`, call `e.preventDefault()` and `e.stopPropagation()` before `onDrop(id, { slot })`, as the row handler does. <br>Re-test 25 Oct (FE `f9162ee`): **fixed**. The layout was reset to PAGE-P on the page and a `33-33-33` section holding LEFT-A, MIDDLE-B and an empty right column. A real mouse drag of MIDDLE-B onto the empty Right zone gave L:LEFT-A, M:(empty), R:MIDDLE-B. A real drag of PAGE-P onto the now-empty Middle zone gave L:LEFT-A, M:PAGE-P, R:MIDDLE-B, with nothing left on the page. Undo put PAGE-P back on the page, and Redo moved it back in. Undo and Redo now have aria-labels. |
| QA-267 | Medium | FE | Found in the mark-grid regression pass on QPM-402 (25 Oct, FE `e2a3620`). Primary 1 Mathematics had a class test "Quiz 1 (edited)" with 21 marks entered. As the Principal (a head), Quiz 1 options → Remove removed the column at once: no dialog, no undo, and all 21 `class` marks were gone from `assessment_marks`. `MarkGridPage.removeItem` sends `deleteItem(…, force = marked && isHead)` with no confirm step. The code before the split (`e2a3620^`) did the same, so this isn't a regression from the split. A misclick costs a teacher's whole test. | Before removing a test that has marks, ask: "Remove Quiz 1 and its 21 marks? This can't be undone." Or keep removed tests restorable for a while. |
| QA-268 | Low | BE | Found in the academic calendar test on QRG-501 (25 Oct, BE `f6cf1d2`). Pattern: Semester ×2; 2026/27 runs 1 Sep 2026 to 31 Jul 2027. With Semester 1 undated, PATCHing Semester 2 to 2026-09-01 … 2026-12-20 succeeded (200), and Semester 2 became the current term. Semester 1 can then never be dated: any dates must fall before 1 Sep, outside the year, and dating it 1 Sep … 29 Jan got 400 "Semester 2 must start after Semester 1 ends". The order rule only compares periods that already have dates. | When dating period N, refuse a start date that leaves too little room for earlier undated periods, or at least warn that earlier periods must still fit before it. |
| QA-269 | Low | FE | Found 25 Oct on QRG-501, Setup → Years & terms. "Set dates" on an undated period (e.g. "Set the dates of Semester 2, 2027/28") shows the switch "This is the current academic year · Bills, attendance and the calendar open on the current one. Only one can be current." The switch actually makes the **term** current. `YearsPanel` passes `withSequence={!editor.term \|\| editor.term.datesSet}`, which is false for an undated period, and `DatesModal` uses `withSequence` to choose between the term and year wording. | Pass a separate "isTerm" flag for the wording, so the switch reads "This is the current term". |
| QA-246 | Low | FE | Found in the QA-207 setup (24 Oct). On PRM-001, which has only the students module, the School setup page calls `GET /schools/me/fee-types` on load and again on every class save. Each call gets 403 "The 'fees' module is not enabled for this school". Nothing breaks visibly, but it's noise in the logs and wasted requests. | Load fee types only when the fees module is on. <br>Re-test 24 Oct (PRM-001, students module only): **fixed**. Opening School setup → Classes and saving a class twice made no `fee-types` calls and got no 403s. |
| QA-247 | Low | BE | Found in the QA-207 re-test on PRM-001 (24 Oct). After moving Class B up into Term 2, 2026/27 (which starts 8 Jan 2027), Benewaa PromoB's new `enrollment_history` row reads "Class C · Term 2 2026/27 · enrolled 2026-10-24", the run date. Anything that resolves a pupil's class by date (attendance by date, see QA-225; class lists for a past date) will put her in Class C from 24 Oct, while she is still in Class B for the rest of Term 1. | Set `enrolled_on` to the start of the chosen term when it is later than today. Or keep the current class until the new term starts. <br>Re-test 24 Oct (PRM-001): **fixed**. I added Term 3 (starts 2027-04-26).<br>• **Bulk move:** Class A moved into Term 3 with the leaving date empty. Akwasi's new row reads "Class B · Term 3 · enrolled 2027-04-26".<br>• **Single move:** promoting Adjoa from the student drawer, "From term" Term 3, gives "Class C · Term 3 · enrolled 2027-04-26".<br>• **Older rows:** rows from before the fix keep the run date. For example, Adjoa's Term 2 row says 2026-10-24. |
| QA-249 | Low | Both | Found in the QA-247 re-test on PRM-001 (24 Oct). With Class A moving and Classes B and C set to "Don't move", the confirmation said "1 pupil move up, 0 graduate…, and **5 stay** in their class". The result toast and table said "1 pupil moved up, 0 graduated and **0 stayed**". The repeaters' count works, but whole classes left behind aren't counted, so the two screens disagree. | Count "Don't move" classes in the result's "stayed", or word the confirmation "5 not moved". <br>Re-test 24 Oct (PRM-001, one real run): **fixed**. B → C with Aba kept back, C set to Don't move, start term Term 2. The confirmation read "1 pupil move up, 0 graduate…, and 5 stay". The toast and Done alert read "1 pupil moved up, 0 graduated and 5 stayed". The table shows "Class B · Class C · 1 · 1" and "Class C · Not moved · 0 · 4". The DB matches: B has Aba, and C has Adjoa, Akwasi, Bekoe, Benewaa and Boatemaa. Minor: the confirmation's per-class list omits the "Class C → not moved: 4" line, though its total counts them. Screenshot: `prm-qa249-results.png`. <br>Re-test of that minor point, 24 Oct (FE `43dda52`, new throwaway school QPM-402 with Primary 1 (2 pupils), Primary 2 (1) and Primary 3 (2)): **fixed**. (a) Primary 1 and Primary 2 set to Don't move, with Esi unticked in Primary 3. The confirmation lists "Primary 1: doesn't move (2 pupils stay)", "Primary 2: doesn't move (1 pupil stays)" and "Primary 3 → Graduates: 1 move, 1 stay". The total reads "0 pupils move up, 1 graduate…, and 4 stay", and the button reads "Move 1 pupil". Cancel sent no request and moved nobody. (b) A real run with only Primary 2 set to Don't move. The confirmation lists "Primary 1 → Primary 2: 2 move", "Primary 2: doesn't move (1 pupil stays)" and "Primary 3 → Graduates: 2 move". The toast reads "2 pupils moved up, 2 graduated and 1 stayed". The table shows Primary 1 · Primary 2 · 2 · 0, Primary 3 · Graduated · 2 · 0 and Primary 2 · Not moved · 0 · 1. The DB matches: Primary 2 now has Ama, Kofi and Yaa, and Esi and Kojo graduated. Wording nit: "and 1 stay in their class" should read "1 stays". Fixed in FE `ac902f0` and re-tested after the push (Primary 2 → Primary 3, cancelled each time, no request sent). With two of three pupils unticked: "1 pupil moves up, 0 graduate, 2 stay" and "Primary 2 → Primary 3: 1 moves, 2 stay". With one unticked: "2 pupils move up, … and 1 stays in their class" and "2 move, 1 stays". Screenshots: `qpm-promote-confirm.png`, `qpm-promote-results.png`, `qpm-promote-verbs.png`. |
| QA-252 | Low | BE | Found in the AdminJS click-through (24 Oct). The Analytics page shows every amount with "$" ("$141,879.00", "+$22,770.50"), although fees are in Ghana cedis (GH₵). The Attendance Tracking tab labels its trend "2026-10-21T00:00:00.000Z" instead of a date. Also, the school picker lists 84 schools, mostly automated-test leftovers ("Class Test School A (CLSA-1792…)"), which makes the dev picker hard to use. That last part is dev data, not a product bug. | Format money as GH₵ (or the school's currency) and dates as "21 Oct 2026". Clean the dev DB of test schools. <br>Re-test 24 Oct (browser): **fixed**. Amounts read "GH₵ 46,420.00" and "+GH₵ 6,100.00", with no "$" left on the summary, Financial & Billing or Platform Health tabs. The attendance trend reads "2026-10-21". |
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


## Status reconciliation (24 Oct 2026)

Every index row that wasn't marked fixed was checked against the current code (backend `main` d4c87aa, frontend `0ca3e3b`) and the re-test history in this file. Rows already marked **fixed** with a re-test were not re-checked. "Fixed" from code reading alone (no new browser re-test) is noted as such.

| ID | Status | Evidence |
|---|---|---|
| QA-001 | Fixed | per-student advisory lock + row lock before reading balance (student-fee-account.repository.ts:46-57, payments.service.ts:86-111); e2e test; 18b3c9a, 5deed77 |
| QA-002 | Fixed | two term rollovers carried arrears exactly once and the ledger reconciles (browser, 21 Oct run) |
| QA-003 | Fixed | suspended schools are refused at login and mid-session with 403 (browser, 21 Oct run) |
| QA-005 | Fixed (re-tested 24 Oct after 44b2a3f) | Redis login lockout and read-only ledger resources (18b3c9a); still always mounted (no ADMIN_ENABLED), in-memory sessions, no sameSite, no audit log Re-test 24 Oct: the cookie is HttpOnly and SameSite=Lax with an 8h expiry; the session is in Redis (`adminjs:sess:*`, TTL 28800) and still worked after the 16:40 restart. Re-test 25 Oct (BE `d4a85d9` on main, throwaway data only): **pass**. **Audit:** as the seeded Super Admin, creating, editing, deleting and bulk-deleting Departments on QPM-402 wrote `admin.record.created`, `.updated` and `.deleted` rows, with entity_type `Department`, the record id and actor SUPER_ADMIN. The edit's `changes` were `{"name":{"from":"QA Audit Dept","to":"QA Audit Dept (renamed)"},"description":{"from":null,"to":"edited in AdminJS"}}`. Changing a throwaway admin's password logged `{"password":{"from":"[hidden]","to":"[changed]"}}`; no password text appears in audit_logs, and the stored value is `$argon2id…`. Bulk delete wrote one row per record. Failed creates (a missing school, a duplicate email) wrote no row. Minor: saving an edit with no change still wrote an `.updated` row with empty `changes`. Fixed in BE `17900c0`: re-tested 25 Oct, an edit with the same values writes no row, and a real rename writes one with `{"name":{"from":…,"to":…}}`. **Sign-out:** a throwaway super admin (qa-sa@qpm.test, now deleted) was signed in, then deactivated by the seeded admin. Their next `/admin/api` call within 30 s got 401 "Your session has ended. Sign in again.", `/admin` redirected to `/admin/login`, and signing in again was refused. The seeded admin was unaffected. Not checked: an audit write failure leaving the change in place. |
| QA-006 | Fixed (re-tested 24 Oct after 5af0b93) | notification dev mode still on when NODE_ENV≠production or no API key; client not patched |
| QA-007 | Fixed | 25 Oct, BE `17900c0` (pushed to main). Re-tested on throwaway QRG-501. A teacher invite was verified valid, then its row set to EXPIRED (as a supersede does) while still in date. Verify returned `valid:false` "This invitation link is no longer valid. Use the link in the latest invitation email.", and setup-password got 400 with the same text. After a Resend, the old token gets "not found" and the new one is valid. |
| QA-008 | Fixed | refresh under Web Locks + storage listener reloads on user change (6b1713d); 30s rotation grace (08954f5); code only, not re-tested in a browser |
| QA-009 | Fixed | sign-out calls /auth/logout and the old refresh token gets 401 (browser, 21 Oct run) |
| QA-010 | Fixed (re-tested 24 Oct after 44b2a3f) | public invoice still opens by UUID, links built from invoice.id, no expiry or throttle, signedByEmail returned |
| QA-011 | Fixed | 25 Oct, BE `17900c0`. `POST /schools/me/invoices/generate/async` on QPM-402 returned jobId `54a2403f-…` (a UUID). The own school reads it (200). BIS-001's principal gets 404 "Job with ID … not found", and a random UUID or "1" gets 404. |
| QA-012 | Fixed (re-tested 24 Oct after 44b2a3f) | no helmet, Swagger always on, CORS origin ?? '*' with credentials, NODE_ENV defaults to development |
| QA-013 | Fixed (re-tested 24 Oct after 44b2a3f) | Academic Head limited to Teacher/Secretary/Parent (18b3c9a); any creator can still set a password that activates at once |
| QA-014 | Open | register-parent 409 "Email already registered"; login skips hashing for unknown emails |
| QA-016 | Partly fixed | national IDs and guardian contacts hidden from teachers; list still whole-school and medical notes still shown |
| QA-017 | Fixed (policy) | 25 Oct, BE `80fb344`. The user decided a leaver's bills stay owed and payable. On QPM-402, Seed04 (bill 450) was exited as Transferred_Out. `GET /invoices?leavers=true` lists the bill, `/invoices/summary?leavers=true` and `?studentId=` return outstanding 450, and a GHS 10 payment then gets 201 (balance 440). The exit dialog showing the balance is QA-224 (frontend). |
| QA-018 | Partly fixed | Re-tested 25 Oct (BE `f6cf1d2`, `8abbe07`). Term end before start gets 400 (see QA-076). A future payment date gets 400 "The payment date can't be in the future". A date before the school's first live year (1990-01-01 or 2025-08-31 on QPM-402) gets 400 "The payment date can't be before 2026/27 began (2026-09-01)". Still open: there is no way to close a finished term. Only whole years can be archived, and only when unused. |
| QA-019 | Partly fixed | 25 Oct, BE `80fb344`. Amount 10,000,000.01 gets 400 "A payment can be at most 10,000,000.00" (it used to 500). Amount 100 with allocations of 60 gets 400 "The amount (100.00) doesn't match the allocations (60.00)". Generate with `dueDate: "soon"` gets 400. Still open: a GHS 60 allocation to QA Excursion, a fee type not on Seed02's bill, was accepted (201). |
| QA-020 | Partly fixed | forms post to POST /public/leads (submitLead); waitlist success copy still promises "login credentials" (WaitlistForm.tsx:112) |
| QA-021 | Fixed | 25 Oct, BE `17900c0`. `otp.service.ts:53` now catches the send failure and logs a warning. `otp.service.spec.ts` passes 6/6. Not triggered live, since the email client can't easily be made to fail. |
| QA-022 | Partly fixed | payments check suspension (18b3c9a); public invoice, media, optional fees, queued jobs still unchecked |
| QA-023 | Partly fixed | only AdminJS has a Redis lockout; main throttler still IP+email, in memory, no lockout |
| QA-024 | Fixed | 25 Oct, BE `17900c0`. On QPM-402, `PATCH /schools/me/students/:id` with `status: Graduated` or `classId` gets 400 "property … should not exist" for both the Principal and the Secretary, and the DB is unchanged. `otherName` still saves (200). `/promote` (Ama → Primary 3) gets 201, and `/exit` (Smoke Cleanup, Transferred_Out) gets 201. |
| QA-025 | Fixed | 25 Oct, BE `17900c0`. `POST /users` PARENT with `studentIds:[Kofi]` (QPM-402) and an email or phone not on Kofi's record gets 400 "The parent's phone or email must match a guardian contact on the student's record (Kofi RetestP1)", and no account is created. With phone 0249970402, the mother's on record, it gets 201 with relationship Mother; "+233249970402" also matches. After an unlink with preventRelink, a new account on that phone gets 409 "This parent is blocked from linking to the student. Lift the block first." |
| QA-026 | Fixed | parent portal live: ward-scoped parents/me/wards/:id routes with module checks (parent-fees.controller.ts, ward-access.service.ts); reports still "coming soon" |
| QA-027 | Fixed | forgot/verify/reset on the backend (auth.controller.ts:47-85); FE /auth/forgot-password and /auth/reset-password with links on both logins; used in the 23–24 Oct tests |
| QA-028 | Fixed | the toast reads "Successfully generated N term invoice(s)…" (browser, 21 Oct run) |
| QA-029 | Partly fixed | online payments capped at the balance; staff payments still accept any surplus as credit without confirmation |
| QA-030 | Partly fixed | classes and platform schools now page fully; payment/discount student picker, staff, invites and platform staff still limit=100 |
| QA-031 | Fixed | cards read /schools/me/invoices/summary over all matching invoices (fees/api.ts:285-297) |
| QA-032 | Fixed | admission no longer invents defaults (browser, 21 Oct run) |
| QA-033 | Fixed | School setup committed with checklist; Assign principal on the platform page; leftovers tracked as QA-075/076/077 |
| QA-034 | Partly fixed | attendance is live, admissions labelled "Preview only"; dashboard Overview KPIs still sample data |
| QA-035 | Partly fixed | profile re-read on app load (b0ac515); no refetch on focus or 403; unknown modules allowed; stored permission lists remain |
| QA-036 | Fixed | all staff roles are listed, editable and can be deactivated (browser, 21 Oct run) |
| QA-037 | Fixed | network errors keep the session, only a refresh 401/403 ends it, no hard redirect, ?next kept (api-client.ts:144-166, 6b1713d) |
| QA-038 | Partly fixed | fees search debounced; no stale-response guard; Students search still 2 requests per keystroke |
| QA-039 | Partly fixed | friendly "Can't reach Fastrack" and table Retry; KPI cards still show GHS 0 on a failed load; no request timeout |
| QA-040 | Partly fixed | school page has a loading state; deactivate still one click; stale module drawer and optional fields unchanged |
| QA-041 | Open | receipt still "PAID & VERIFIED" with raw date; generate modal can show "undefined • undefined"; Esc closes admission |
| QA-042 | Partly fixed | edit now locks and re-reads inside the transaction (18b3c9a); no audit trail, signedBy overwritten |
| QA-043 | Open | same student/fee/term discount still silently overwritten; stacking and re-pricing unaddressed |
| QA-044 | Open | login still claims "260+ schools", "99.98%", "Port 3001"; modules list MoMo and payroll |
| QA-045 | Open | BaseRepository still unscoped when no school in context; middleware reads x-school-id before auth |
| QA-046 | Partly fixed | staff isActive and invite reopen are rank-checked; Super Admin skips the permissions guard; revoke/resend not rank-checked |
| QA-047 | Partly fixed | emails case-insensitive (e226f97); seed passwords, JWT fallbacks, DB TLS off, $argon2 skip, emails in logs remain |
| QA-048 | Fixed | 25 Oct, BE `17900c0`. 51 `studentIds` get 400 "must contain no more than 50 elements", and 101 `includeOptionalFeeTypeIds` get 400 (max 100). Switching an optional fee on for Yaa (toggle and PUT): an unknown fee type or BIS-001's fee type gets 400 "Fee type not found in this school", compulsory QA Tuition gets 400 "QA Tuition is not an optional fee…", and optional QA Bus gets 200. |
| QA-049 | Partly fixed | 25 Oct, BE `17900c0`. Two simultaneous setup-password calls with the same new token gave one 200 and one 400 "Invitation has already been accepted", and a third gets 400. Still open: signed media URLs can't be revoked, and uploads have no size or rate limit. |
| QA-050 | Open | colour-scheme keys differ; currency formatted in several places |
| QA-051 | Partly fixed | permission list updated; API URL default, no middleware guard, hand-copied permission script remain |
| QA-052 | Open | fees-and-billing.md still has OVERPAID and DELETE fee-types; PermissionsGuard not documented |
| QA-053 | Fixed | api-client sends X-Api-Contract: 2, so lists are data[] + meta |
| QA-054 | Fixed | 24 Oct, backend `71ec686`: the ward-linking e2e spec now deletes the school, pupils and users it creates, and `scripts/cleanup-test-schools.ts` (a dry run unless `--yes`) clears throwaway schools. Checked: the dev DB has no PWL- or Class Test schools left (FIS-001, RIV-002, BIS-001, plus the new throwaway QPM-402), and `fastrack_qa_test` has 0 "Parent Ward Link" schools. The spec itself wasn't run in this check. |
| QA-056 | Fixed | platform overview and school page count every staff role below principal (user.repository.ts:197-218) |
| QA-058 | Fixed | calendar opens for staff (browser, 21 Oct run) |
| QA-059 | Partly fixed | breadcrumb fixed, empty submit shows a message; wrong password still shows both an alert and a toast |
| QA-061 | Open | FIS-001 still flags the Jan 2027 term current while today is in Term 1; billing forms still default to the flagged term with no dates shown |
| QA-062 | Fixed | 25 Oct, BE `80fb344`: an extra bill for PTA Levy for Seed02, whose term bill has PTA Levy, gets 409 "PTA Levy is already on the term bill of this pupil, so it can't be billed again as an extra bill." Earlier note: duplicate check still only looked at extra bills, not term bills (invoice-line-item.repository.ts:58) |
| QA-064 | Fixed | 25 Oct, FE `55c49bb`. Re-tested in the browser on QPM-402 throwaway drafts. (1) A section duplicated on v10, then a switch to v6 within 120 ms, sent one PATCH to v10 (blocks 10 → 11) and none to v6, which stayed at 6 blocks. |
| QA-065 | Fixed | 25 Oct, FE `55c49bb`. (3) An edit on v10, then the Overview link within 120 ms: the PATCH was sent before leaving (DB blocks 12). (4) With PATCH forced to 500, the status read "Not saved" with Try again. A kind switch retried the save, then asked "Your last change to this design could not be saved. Leave it anyway?". Declining stayed on v10, and Try again (with the failure removed) saved it, showing "All changes saved" (DB 13). (5) Reloading 100 ms after an edit raised the browser's leave warning; staying kept the page, and the edit saved (DB 14). |
| QA-066 | Fixed | 25 Oct, FE `55c49bb`. (2) An edit on v6, then Publish within 120 ms: PATCH v6 (7 blocks), then publish v6. The DB shows v6 PUBLISHED with the 7-block layout, the one on screen, and the page shows the "live and can't be changed. Use Edit a copy" notice. |
| QA-067 | Fixed | Re-tested 25 Oct (BE `0cb9bdc`, FE `9ec374e`) with two tabs on the QPM-402 draft "Conflict check". The API alone: a stale `expectedUpdatedAt` gets 409 "This design was changed somewhere else. Reload to see the latest."; a fresh stamp or none gets 200. In the browser: A's edit saves with the check (200, 5 blocks). B's edit then gets 409, and B shows "Changed somewhere else" with the banner "This design was changed in another tab or by someone else. Reload to see theirs (your unsaved change is dropped), or keep yours and replace theirs. · Reload · Keep mine". While B is in conflict, further edits send nothing, Publish publishes nothing (still DRAFT), and switching kind asks "Your last change to this design could not be saved. Leave it anyway?". **Keep mine** saves without the check (200; B's layout, 6 blocks). A's next edit then gets 409 and the banner; **Reload** loads the server's version, and A's next edit saves with the check (200, 7). Renaming then editing in one tab raises no false conflict. **Code mode, re-tested 25 Oct** as Super Admin (platform → QPM-402 → Designs → Advanced, draft "QA bytecheck v20", two tabs sharing one session). A saves `<p class="qa">QA-A1</p>` (PATCH +check, 200). B's save gets 409, B's HTML stays in the box, and Reload and Keep mine appear. **Keep mine** saves without the check (200; DB QA-B1), and B's next save checks again (200; QA-B2). A's stale save gets 409; **Reload** puts QA-B2 into A's box, and A's next save gets 200 (QA-A3). Now **fixed**. Side notes: an HTML comment typed in the code box isn't kept on save, and the first code save drops the visual layout (QA-069). |
| QA-068 | Open | a render error on real data still throws with no fallback to the default design |
| QA-069 | Open | code editor still edits any draft and clears its visual layout |
| QA-070 | Fixed | 25 Oct, FE `55c49bb`. (6) An edit, then a switch to Terminal report within 120 ms: the PATCH went first and no preview call failed with 400 during the whole run. Rename: Design name has maxlength 120 (typing 125 characters keeps 120). A rename saves on blur, and the version picker updates ("v10 · QA rename check"). A forced failure shows the toast "Name not saved · Simulated failure". The name was restored afterwards. Not re-tested: QA-067 (two editors at once), which still needs a backend version check. Note: the earlier tab closures during this re-test came from the test harness itself; two Playwright connections both handled the confirm dialog and crashed the launcher. That isn't an app issue. |
| QA-071 | Open | one failed side-load still fails the whole builder load |
| QA-072 | Open | past terms still editable on the calendar |
| QA-073 | Open | calendar load has no abort or request id |
| QA-074 | Open | times compared without dates; HOLIDAY accepts times; "+N more" not clickable |
| QA-075 | Partly fixed | 25 Oct, BE `f6cf1d2`: a year can be archived (not the current one, with a confirmation) and restored, its label is freed, and both are audited. "Show archived years" lists them with Restore. Terms and classes still couldn't be removed (no DELETE for classes, 404), and a period beyond the pattern could be added (Semester 3 on a two-semester school, 201) but not taken away. Re-test 25 Oct (BE `8abbe07`): an undated period can now be removed. Semester 3 added to 2028/29 then deleted gives 204, with the row gone and `academic_term.removed` audited. A dated period (Semester 3, 2026/27) or the current one gets 400 "… has dates, so it stays for the record. Only a period without dates can be removed." Still open: classes have no delete or archive. editable-guardian-contacts is raising this with the user. |
| QA-076 | Fixed | 25 Oct, BE `f6cf1d2`, re-tested on QRG-501: an end before the start gets 400 "Semester 1: the end date must be on or after the start date"; a term outside its year gets 400 "Semester 1 (2026-08-01 to 2027-01-31) must fall within 2026/27 (2026-09-01 to 2027-07-31)"; Semester 1 dated after Semester 2 gets 400 "Semester 2 must start after Semester 1 ends"; an overlapping year gets 409 "These dates overlap 2026/27 (…)"; and a year shortened so it strands a term gets 400. Gap: QA-268. |
| QA-077 | Fixed | 25 Oct, BE `f6cf1d2`: unticking the current year gets 400 "2026/27 is the current year. Make another year current instead.", and making another year current moves the current-term flag with it. The one leftover is under QA-236. |
| QA-078 | Open | failed reads still dropped silently on School setup |
| QA-079 | Partly fixed | department seeding shows errors; clearing email, principal editing code/logo, empty term number remain |
| QA-080 | Fixed | optional-requests route rule, permission and Fees entry are committed (rbac/routes.ts:47-55) |
| QA-081 | Open | sample-data mode env flag has no production guard |
| QA-082 | Open | approve doesn't re-check fee type or enrolment; leavers still resolve to their last enrolment |
| QA-083 | Open | no stored price; parent history capped at 10; issued bills unchanged by approve |
| QA-084 | Partly fixed | public bill uses the snapshot name; invoice API line items still read the live fee type name |
| QA-085 | Fixed | 25 Oct, BE `80fb344`. Primary 1 on QPM-402 has QA Tuition 400 (due 15 Nov, penalty 20) and PTA Levy 50 (due 1 Nov, penalty 5). Generating with no due date gave every bill due 2026-11-01, and the public JSON has `latePenalty: 25`. A Notes section prints "A late payment penalty of GH¢25.00 applies after the payment deadline.", and no design code has a fixed 10%. Nit: a fully discounted (GHS 0, PAID) bill still prints the penalty line. Earlier note: due date from the Generate form, structure penalty unused; the 10% note is now an editable default |
| QA-086 | Open | modal can still close while saving; 409 shows a generic error; key regenerated on reopen; no timeout |
| QA-087 | Open | discounts tab not module-gated, description can't be cleared, exact-match names, no @Max |
| QA-206 | Fixed | re-tested 22 Oct (backend bcb2e0b) |
| QA-212 | Fixed | re-tested 22 Oct |
| QA-213 | Open | ward-link messages still generic; no attempts left or "Start again" |
| QA-215 | Fixed | 25 Oct, BE `80fb344`. Seed01 has a 100% discount, so the bill is 450 − 450 = 0. It shows PAID in the public JSON and the staff view. "Send bill links" for Primary 1 queued 15 and said "1 bill(s) with nothing to pay were not sent." |
| QA-216 | Open | transaction reference unique per school, so one MoMo transfer can't cover siblings |
| QA-217 | Open | summary not re-fetched on Refresh or after recording a payment (FeesPage.tsx:198-248) |
| QA-218 | Fixed | 25 Oct, BE `80fb344`. For Seed03, QA Excursion extra bills "Kakum excursion" and "Museum trip" both get 201. For Seed05, " KAKUM EXCURSION " and "kakum excursion" after "Kakum excursion" get 409 "These pupils already have an extra bill … Use a different title for a separate charge." Nit: doubled spaces inside a title aren't collapsed, so "  kakum   EXCURSION " was accepted as different. |
| QA-219 | Partly fixed | "Bal B/f" became "Balance from previous bills" and figures are frozen (eb0f25c); extra bills still lumped into that line, not listed by title |
| QA-220 | Closed (by design) | 25 Oct: the user decided credit isn't applied to extra bills, so they stay payable in full. |
| QA-221 | Open | Record Payment still pays only the latest bill; no bill picker |
| QA-223 | Open | promotion still accepts a past, already-billed term |
| QA-224 | Open | exit dialog still shows no outstanding balance |
| QA-225 | Open | attendance rosters still use the current class, not enrolment history |
| QA-226 | Open | design preview still needs the invoice UUID |
| QA-228 | Fixed | public bill renders through the document renderer with the school's published design (public-invoices.controller.ts:53-58; live link checked); likely 326ee64 |
| QA-229 | Open | checkout still uses the login email; raw Paystack error; no fallback |
| QA-230 | Open | parent home still takes the first 3 events; no parent calendar |
| QA-231 | Open | design samples still hard-coded to Fastrack International School |
| QA-232 | Open | no run/batch id on invoices |
| QA-233 | Partly fixed | Re-tested 25 Oct on QPM-402. Setup → Subjects → Class: Primary 1 → Edit opens "Subjects for Primary 1" with "Teachers for Mathematics" (options: Academic Qpm, Secy Qpm, Tete Qpm). Choosing Tete Qpm and saving gives "Subjects saved". `GET /classes/:id/subjects` returns teachers ["Tete Qpm"]. As teacher@qpm.test, `GET /teaching-assignments` returns Primary 1 · Mathematics, the Mark sheets list shows that sheet with "Tete Qpm", and the sheet is editable (18 cells, Add test). The Academic Head's assignments are []. Still open: `timetable_slots` has no API, and attendance is still taken only by the class teacher. Minor: the picker offers any active staff, including the Secretary. |
| QA-234 | Open | still one homeroom teacher per class |
| QA-235 | Open | no class-teacher history per term |
| QA-236 | Fixed | 25 Oct, BE `f6cf1d2` + `8abbe07` (re-tested: an undated current year now gives 404, not another year's term). Making a year current now moves the term flag: dating 2027/28 Semester 1 made it current, and switching back to 2026/27 restored its Semester 2. But when an **undated** year (2028/29) was made current, the DB rightly had no current term, yet `GET /academic-terms/current` returned 2027/28 Semester 1, a term in another year. Pages that open on the current term (billing, attendance, calendar) would use that year. The fallback should stay inside the current year, or return none. <br>Re-test 25 Oct (BE `8abbe07`): **fixed**. With the undated 2028/29 current, `GET /academic-terms/current` gets 404 "No active or current academic term found". Dating its Semester 1 makes that the current term (in 2028/29), and switching back to 2026/27 returns its Semester 2. |
| QA-237 | Fixed | 25 Oct, BE `f6cf1d2`: unticking the current term gets 400 "Semester 2 is the current term. Make another term current instead." |
| QA-244 | Fixed | 24 Oct, FE `01ce719`; re-tested in the browser (credit bill reads "GHS 200.00 credit · Nothing to pay") |
| QA-263 | Fixed | 25 Oct, FE `7558121` (Turbopack dev, no dev badge); :3001 restarted on Turbopack with the user's approval and re-timed (first visits 0.47–0.84 s, was 1.3–3.6 s) |
| QA-264 | Fixed | 25 Oct, FE `2bdcb1f` and `7558121`; re-tested on a production build |
| QA-265 | Fixed | 25 Oct, FE `2bdcb1f`; re-tested on a production build (no fee-types call without fees) |
| QA-266 | Fixed | 25 Oct, FE `f9162ee`; re-tested with real drags into empty Right and Middle columns |
| QA-267 | Fixed | 25 Oct, FE `3cdfbf6`. An unmarked test is removed at once. A marked one asks "Remove Marked Quiz? Marked Quiz and its 3 marks will be deleted. This can't be undone." "Keep it" keeps the test and its 3 marks; "Remove test and marks" deletes them (DB 0). |
| QA-268 | Fixed | 25 Oct, BE `8abbe07`. On QRG-501 2028/29 (both semesters undated), dating Semester 2 first gets 400 "Set Semester 1's dates first: terms are dated in order". Semester 1, then Semester 2, saves. |
| QA-269 | Fixed | 25 Oct, FE `78939e7`, re-tested on QRG-501. "Set the dates of Semester 2, 2027/28" (undated) and "Edit Semester 1, 2027/28" (dated) both say "This is the current term". "Edit 2026/27" (the current year) says "This is the current academic year", with the switch locked: "To change it, make another year current instead." |

| QA-254 | Fixed | dev email preview moved to 127.0.0.1:4080 (5af0b93); re-tested 24 Oct |
## Results phase 0: subjects (tested 24 Oct 2026)

Backend `main` 9141452 (migration 1792600001300) and frontend `5005d17`/`54dc651` (School setup → Subjects tab). The test used a new throwaway school, **QAS-300 "QA Subjects Test School"**. It has principal@qas.test, t1@qas.test and t2@qas.test (Teachers), sec@qas.test and ao@qas.test, all with password `Qas!Pass2026`, and classes Basic One and Basic Two (Lower Primary) and JHS One (JHS). Isolation used PRM-001, where one subject, "PRMX", was added. **All 22 API checks pass, and the browser and AdminJS checks pass. There are no new findings.**

| Area | Result |
|---|---|
| Codes | " rob-1 " is saved as ROB-1. "E/1" gets 400 "Subject code must be 2–20 letters, digits or hyphens". A duplicate code in other capitals gets 409 "Subject code ROB-1 is already used." A duplicate name gets 409 'A subject named "ROBOTICS" already exists.' The form shows the same messages under the field. |
| Apply | Maths and English applied to Lower Primary: `{added: 4, alreadyThere: 0}`. A repeat gives `{added: 0, alreadyThere: 4}`, and JHS One is untouched. In the UI, "Add subjects to several classes" by chosen class gives "1 added", and by department gives "0 added; 2 were already there". |
| Class list (PUT) | Order, report labels ("English", "Maths") and teachers persist. A subject left out disappears, and its teacher's `teaching-assignments` go from 2 to 0. A teacher from another school gets 400 "Teachers must be active staff of this school". |
| Inactive subjects | Hidden from `GET subjects` unless `includeInactive=true`. A class already taking one can still be saved (the 9141452 fix). Adding it to another class gets 400 "Mathematics is inactive. Reactivate it before giving it to a class." |
| Delete | 409 "English Language is used by a class. Deactivate it instead." while in use; 204 when unused. |
| Roles | A Teacher can read subjects, class subjects and their own assignments. A Teacher gets 403 on all 5 writes and on another teacher's assignments. The Secretary and the Account Officer get 403 on reads and writes. |
| Isolation | PRM-001's subject and class ids from QAS-300 get 404 or 400 on every route, and PRMX is unchanged. |
| UI | The Subjects tab lists subjects with code, short name, category and class count. "Add subject" works. "Subjects by class" and "Subjects for Basic One" show order, teachers, report names and options. No failed requests or page errors. Screenshot: `qas-subjects-class-modal.png`. |
| AdminJS | The Subject list (19 records) shows School, Code, Name, Short Name, Category and Is Active with no errors, and the record page opens. |

Nit, not logged: when nothing new was added, the toast title still reads "Subjects added" ("0 added; 2 were already there").


## Results phase 1: grading setup (tested 24 Oct 2026)

Backend `main` 347d1be (migration 1792600001400) and frontend `d6c494d` (local; wizard at `/school-admin/results/setup`, sidebar "Grading setup"). The test used throwaway schools **QAS-300**, which also got ah@qas.test (`Qas!Pass2026`) and a class with no department, and **QAR-301** "QA Results Test School" (principal@qar.test / `Qar!Pass2026`), with the `results` module on. PRM-001 was used only for isolation. **API: 33 of 34 checks pass. The one failure was my test's assumption about which year copies, and the correct case passes on QAR-301. Three new findings: QA-255, QA-256, QA-257.**

| Area | Result |
|---|---|
| Gate and roles | Without the module, 403. Principal and Academic Head can read and write. A Teacher gets 200 on all 9 GETs and 403 on all 7 writes. Secretary, Account Officer and a parent get 403. |
| Permissions in the login payload | PR and AH have `grading:manage`. TE has `marks:read`, `marks:enter`, `reports:read` and `reports:remark`. SE has `reports:read`. |
| Presets | 7 keys, as listed, with components, bands and suggested departments. |
| Apply | Default `ges_basic_30_70`, JHS `bece_jhs`, Lower Primary with a 40/60 override, Upper Primary `cambridge_style`: 200 `{schemesCreated:4, scalesCreated:3, assignments:4}`. A re-run gives 0 and 0. Weights 95 get 400 "Lower Primary: Weights add up to 95, not 100." A weight on a descriptor preset gets 400 "Pre-School: Component \"communication\": a descriptor scheme has no weight." With `subjects:true` on QAR-301: 10 subjects, 10 per Lower Primary class, nothing for Upper Primary (no classes); the re-run gives existing 10 and alreadyThere 20. On QAS-300, `subjects:true` gets 500 (QA-255). |
| Resolve | A Lower Primary class gives scheme and scale scope `department`. The class with no department gives `school`. A 2025/26 year with no setup gives 409 "Results aren't set up for 2025/26." |
| Policy PUT | Without the school row: 400 "Give exactly one school row, with both a scheme and a scale." A class_subject with a descriptor scheme over a numeric scale: 400 "In Basic One, English Language: The \"A*–U\" scale can't be used with \"QA Descriptor\", a scheme that uses descriptors." |
| Schemes and scales | Weights 90 get 400 "Weights add up to 90, not 100." No band at 0 gets 400 "The lowest band must start at 0." A repeated key gets 409 'Component key "class" is used twice.' PUT edits in place (`newVersion:false`, version 1). Changing the mode gets 400 "A scheme's mode can't change. Create a new scheme instead." |
| Settings | Defaults: classPositionVisibility `show` and subjectPositionVisibility `staff_only`, with scoreDecimals 0, averageDecimals 1, minCountedWeight 50 and rankBy `average`. scoreDecimals 3 gets 400. A partial PATCH keeps the rest. |
| Remark bank | Create, update, list and delete give 201, 200, 200 and 204. min above max gets 400 "The lowest average must not be above the highest." A Teacher can read (200) but not create (403). |
| New year | A later 2027/28 created after setup gets the same 4 rows. On QAR-301, a 2027/28 created **before** setup had 0 rows and got 3 when made current. Copying is forward-only by design: an earlier year has nothing to copy from. |
| Isolation | From PRM-001, QAS-300's scheme (GET and PUT), policy year and scale all get 404. |
| Wizard (browser) | The sidebar shows "Grading setup". The summary lists what applies where. "Run setup again" walks Presets, Weights (with a worked example), Grades ("Try a score"), Positions and Review, then "Set up grading". With subjects unticked: "Grading is set up · 2 weightings and 2 grade scales created". A Teacher is redirected to the dashboard. Issues: QA-255 (500 with subjects ticked) and QA-257 (a re-run replaces the setup). Screenshot: `qas-results-wizard-weights.png`. |

## Results phase 2: mark sheets (tested 24 Oct 2026)

Backend `main` 9d9afb3 (migration 1792600001800) and frontend `5e7c530` + `6e399ae` (local; `/school-admin/results/marks`, sidebar "Mark sheets"). The test used throwaway **QAR-301**, which got the students module, t1@qar.test (assigned Mathematics in Basic One), t2@qar.test (Basic One's class teacher), sec@qar.test and ao@qar.test (all `Qar!Pass2026`), and pupils Pupilone, Pupiltwo, Pupilthree and Latejoiner (admitted 15 Oct) in Basic One, plus Mover in Basic Two. QAS-300 was used for isolation. **All 34 API checks pass, the grid works in the browser, and there are no new findings.**

| Area | Result |
|---|---|
| Who sees what | t1 `mine=true` lists only Basic One Mathematics. t2 `mine=true` lists Basic One's 9 unassigned subjects, not Mathematics. `mine=false` lists all 20. Secretary, Account Officer and a parent get 403. |
| Open | t2 on Mathematics (assigned to t1) gets `sheet:null`, `canEdit:false`, and no sheet is created. t1 creates it with an "Exam /100" item. Any teacher opens an unassigned subject (English) with `canEdit:true`. |
| Roster | Latejoiner has `flags.joinedOn 2026-10-15`, and Test 1 (1 Oct) is in `notRequired`. Mover, marked in Basic Two and then moved through the normal promote flow, shows on Basic One only, with `flags.movedFrom {Basic Two, 2026-10-24}` and the earlier mark (stored as entered in Basic Two). Pupilthree, withdrawn by exit (Stopped), keeps `flags.leftOn` and isn't listed as missing on submit. |
| Marks | 25/20, −5 and a scored cell with no raw score give 422 with `details.cells` (3 messages), and nothing is saved. A stale rowVersion gives 409 "Someone else changed this sheet. Reload to see their changes." with `details.rowVersion`. `status:null` clears a cell. The preview for 15/20 and 80/100 on 30/70 is **79, B**. |
| Items | Test 1 and Test 2 get indexes 1 and 2. A second Exam item gets 400 "Exam is entered once; it has no extra items." Lowering Test 1 to 10 gets 422 "1 pupil has a mark above 10." Deleting Test 2 with marks gets 409 "Test 2 has marks. Remove them first."; a head with `force=true` gets 200, with `marks.item_deleted` audited. |
| Status | Submit with gaps gives 422 `details.missing` (Latejoiner, Pupiltwo). Submit when complete gives `submitted`. A teacher editing then gets 403 "This sheet has been submitted. Ask a head to return it." A head's edit is 200 with a `marks.updated` audit row. Return with "Check Mover exam" sends it back to `draft` with `returnReason`, and the teacher can edit. `notAssessed:true` lets the empty English sheet submit. Reopen on a non-approved sheet gets 409 "Only an approved sheet can be reopened." (a reason is required). |
| Versions | Editing GES 30/70 (now 40/60) gives `newVersion:true`. The empty French draft moves to the new version, while Mathematics keeps the old one until `apply-latest`. Afterwards 15/20 + 80 gives 78 B. |
| Descriptors | Basic One × Creative Arts on a descriptor scheme and scale has `scale.bands` with ids, and a mark is saved with `descriptorBandId` (Secure). |
| Subjects | Deleting Mathematics gets 409. Removing Creative Arts (with marks) from Basic One takes it off the class list, keeps the `class_subjects` row with `is_active:false`, and keeps the mark. |
| Isolation | QAS-300's principal gets 404 on PUT marks, submit, items, PATCH and return for a QAR-301 sheet. |
| Grid (browser) | t1 sees "Mark sheets" with "Basic One · Mathematics · IN PROGRESS · 7 of 7 marks". The grid shows "Class score (40%, best 4)" and "Exam (60%)", flags "JOINED 15 OCT", "FROM BASIC TWO" and "LEFT 24 OCT", and totals and grades. Typing 84 autosaves ("All changes saved"; DB 84.00). "Submit marks" gives "Submitted". t2 sees the same sheet read-only, with no editable cells and no Submit. No failed requests. Screenshots: `qar-results-mark-grid.png`, `qar-results-mark-submitted.png`. |

Observation, not logged: a moved pupil's marks are matched to the new class's tests by item number. Mover's Basic Two "Test 1" (2 Oct) shows as Basic One's "Test 1" (1 Oct). Both are out of 20 here; untested is a carried mark above the new test's maximum.


## Results phase 3: term reports (tested 24 Oct 2026)

Backend `main` 101af33 (migration 1792600001900) and frontend `3e58f4d` + `4bb6012` (local; `/school-admin/results/reports`, sidebar "Term reports"). The test used throwaway **QAR-301** Basic One (5 on roll: Pupilone, Pupiltwo, Latejoiner (joined 15 Oct), Mover (moved from Basic Two), Pupilthree (left)), with Mathematics and Science marked, the other subjects not assessed, registers on 22 and 23 Oct, and parent@qar.test (`Qar!Pass2026`) linked to Pupilone. PRM-001 Class C was used for the earlier-term check and QAS-300 for isolation. **API: 33 of 34 checks pass; the failure is QA-258. Four new findings: QA-258 to QA-261.**

| Area | Result |
|---|---|
| Roles | The Secretary reads the board and view, computes and prints. A Teacher reads, previews one report (200) and gets 403 on compute and print. Teacher and Secretary get 403 on approve, publish, withhold and reopen. Account Officer and a parent get 403. |
| Before compute | The view is `{batch:null, pupils:[]}`. The board shows `not_started`, sheets 8 of 9, and blockers [RME not submitted]. |
| Compute | Every pupil gets a report. Averages are 85, 74, 74 and 55, with places 1, 2, 2 and 4 (the tie shares 2nd). Subject positions are right (Maths 80, 78, 74, 60; Science 90, 74, 70, 50). The 6 not-assessed subjects are listed and not counted. Pupilthree is `left`, withheld "Left the school", with no position. A recompute keeps the remarks, the typed attendance and the promotion. |
| Attendance | From registers with `source:"register"`, present + late counted, but the total is all 39 term days (**QA-258**). A typed 3 of 4 survives a recompute. 5 of 4 gets 400 "Days present can't be more than the school days." |
| Promotion | Last term (`isLastTerm`): the default is "promoted to Basic Two", and changing it to repeated works. On PRM-001's Term 1 of 3: 400 "Promotion is only set on the last term of the year." |
| Remarks | The class teacher writes the class teacher remark, conduct, attitude, interest, promotion and attendance. Partial updates work, and null clears. Bulk remarks work. Another teacher gets 403. The head remark is heads only (teacher 403, principal 200). |
| Approve | With RME unsubmitted: 422 `details.blockers`. Once it's not assessed and submitted, approve gives 200, the sheets show `approved`, and the teacher's canEdit is false. After approval, remarks and compute get 409. Publish before approve gets 409 "Approve these reports before publishing them." |
| Publish and emails | Revision 1, with `publishedRevision` 1 on every row. The linked parent gets a "report is ready" email (dev preview on 127.0.0.1:4080). Reopen (heads only, with a reason), then edit a remark, approve and publish: revision 2 and an "updated" email. With Pupilone withheld, revision 3 sends no email. |
| Withhold and release | Withheld Pupilone and the left Pupilthree are missing from the class print. Releasing Pupilthree keeps `left` and adds them to the print. |
| Documents | The print shows "Class Score (40%)", "Exam Score (60%)", totals, grades with remarks ("Very good"), the class teacher's remark, "Attendance: 2 out of 39", "Next Term Begins:" (blank, since QAR-301 has no next term), the promotion and the grading scale. Subject positions are hidden (staff_only), and the overall position is shown ("2nd out of 5", see **QA-260**). |
| Isolation | From QAS-300: the view, compute, remarks, document and withhold for QAR-301 ids all get 404. |
| UI | The board lists Basic One (PUBLISHED, 9 of 9 submitted, 3 of 5 remarks, "1 remark to write") and Basic Two (NOT STARTED). The class view shows average, position ("2nd of 4"), attendance, remark and View for each pupil. The principal gets Reopen and Print all; the Secretary gets only Print all. The Secretary's page gets 403 on the remark bank (**QA-261**). Screenshot: `qar-term-reports-class.png`. |


## Three-column sections in the designer (tested 25 Oct 2026)

Frontend `f2006b1` (doc `80275f2`) and backend `e10fc96`, tested on the throwaway school QPM-402 as principal@qpm.test and as Super Admin. For a real bill, fees was turned on there: fee type "QA Tuition", GHS 500 for Primary 2, and bill INV/QPM-402/2026/0001 for Yaa, whose parent is parent@qpm.test. **Result: works end to end. One new Medium finding, QA-266, about dragging into an empty column.**

| Check | Result |
|---|---|
| Palette and widths | The palette lists "Columns". Column widths offers Equal, Left wider, Right wider, Three equal, Three middle wider, Three left wider and Three right wider. |
| Three columns | "Three, middle wider" shows Left, Middle and Right zones, each with "Add here". Text added to the middle saved as `middle:["text"]` with ratio `25-50-25`, and the preview has `flex:25`, `flex:50` and `flex:25`. |
| Image in the middle | An Image added to the middle and uploaded with "Upload image" (POST /media 201) saved its id. The preview, the published bill and the image URL (200 image/png) all show it. |
| Three to two | Switching to Equal moved the middle's Text and Image into the left column (ratio `50-50`, no middle). The PATCH returned 200, and the preview showed `flex:50` twice. |
| Undo and redo | Undo went back to `25-50-25` with the middle's contents restored. Redo went back to `50-50` with them in the left column. Both saved. Minor: the Undo and Redo icon buttons have only a tooltip, with no aria-label. |
| Duplicate | Duplicating a three-column section gave two `25-50-25` sections, with no repeated block id anywhere in the layout. |
| No nesting | "Add here" inside a column doesn't offer Columns. The API refuses Columns inside the middle (400 "columns can't be placed inside columns"). Minor: that message says "Section 1" without naming the parent section. |
| Real bill | v15 (two `25-50-25` sections, with Text and an Image in the middle) published. The parent's printable bill (`GET /parents/me/wards/:id/invoices/:id/document`, and "View printable bill" in the parent app) renders `flex:25`, `flex:50` and `flex:25`, the image, and "Dear Parent, please find below the bill for Yaa RetestP2." Screenshot: `qpm-bill-three-columns.png`. |
| Report kind | A Terminal report preview with a `33-33-33` section renders `flex:33` three times. |
| Server checks | A three-column section saves whether filled or with no middle key. Two columns with an empty middle saves. Two columns with content in the middle get 400 "move the sections out of the middle column first, or choose three columns". Ratios `10-10-80` and `25-25-25-25` get 400 "Column widths: is not one of the choices". Minor: an unknown column key (`extra`) is accepted and its contents silently dropped. The builder never sends one. |
| Drag between columns | Dropping onto a column that already has a section works. Dropping onto an **empty** column moves the section above the Columns section (QA-266). |
| Advanced (code) editor | As Super Admin, Platform → QPM-402 → Designs → Advanced opens "Advanced: design code (Fastrack staff only)" on the three-column draft. The stored code contains all three columns (`flex:33`, MIDDLE-B), and opening it changed nothing. Not tested: editing the code and returning to the visual builder (QA-069). |

## Code clean-up regression pass (tested 25 Oct 2026)

Frontend `b4efb3a`, `ff93ba7`, `567c20e`, `901aa6b`, `2eb998f` and `98951e8` were meant to change no behaviour. Backend `ebd0e24` covered the two column notes from the three-column test. **Result: no regressions.**

| Check | Result |
|---|---|
| Static | `tsc --noEmit` is clean, `eslint src --quiet` is clean, and `node scripts/check-dashboard.cjs` passes 38 checks, including "shared formatting: ordinals and shared places" (2nd=). |
| Students (QPM-402, principal) | The list and KPIs load. Admitting "Smoke Cleanup" through the four-step form gave the toast "Smoke Cleanup enrolled with code: QPM-402/STD/2026/006". A bad mother email shows "Admission Form Alert · motherEmail must be an email", the same server text as before. With the classes call forced to fail, the page now says "Could not load the classes and current term" (it used to fail silently). |
| Platform console (Super Admin) | The school list, KPIs and Analytics load with no page errors. Money reads "GHS 101,250.00" and "GHS 22,770.50 collected", matching `/super-admin/analytics/overview`, with no "$". Dates read "24 Oct 2026" (en-GB). On QPM-402: the modules drawer turned Attendance on (toast "Module enabled…", DB true) and off again. Deactivate gave "School Deactivated"; the principal's sign-in then got 403 "This school account is suspended", and Activate restored it. Provisioning with code "qpm-402" shows "Provisioning Failed · School code already exists" (409). A new throwaway school, "QA Regression School" (QRG-501), was created. The row menu is named "More actions for QA Promotion Retest School", and Refresh and Sign out are named. |
| Backend `ebd0e24` | A nested section gets 400 "Section 5 (Columns) → middle column → Section 1: columns can't be placed inside columns". A bad prop inside a column gets "Section 5 (Columns) → left column → Section 1 (Text) → Text size: is not one of the choices". An unknown column key gets 400 "Section 5 (Columns): unknown column 'extra'". A valid three-column layout gets 200. |
| Not checked live | The parent report "2nd=" and the class review positions: every school with published reports was deleted in the 24 Oct clean-up. The shared helper passes the check script above. |
| Accessibility left (minor) | The module drawer's switches (`role=switch`) have no accessible name, and neither does the drawer's close button or one icon button at the top left of the console. Deactivate is still one click with no confirmation (QA-040). |
| Second pass (`ed2032d`, `724016b`, `4de6f75`, `24e4084`, `9b6deb6`, `e2a3620`, `cce7d08`) | **No regressions; one older issue logged (QA-267).** **Students:** 20 rows per page. 15 seeded pupils on QPM-402 made 21, and page 2 shows the last one. Search "Seed07" sends one call and shows 1 row. The class filter works. The active card reads 18 against the DB's 18. Admissions through `AdmitStudentModal` saved "Fieldset Quick Typing" and "Modal Fast Component" with every typed field. **Fast edits (fieldSetter):** the Profile tab (Undo restores; Save keeps Other name, Religion and Residence), Guardians (four fields), staff edit (phone and first name), school profile, the platform school form, the Correct bill amount (the total updates to GHS 450; Cancel leaves 500) and the landing contact and waitlist forms all keep every quickly typed value. Minor: the "Student updated" toast shows the name from before the save. **Module switches** are named "<module> for <school>", and the close button is "Close modules". A toggle that fails on the server (forced 500) stays as it was and shows "Update Failed". **Provisioning:** blank optional fields are left out of the request (keys name, code and email only, and the DB has NULLs). A duplicate code keeps the dialog open with "School code already exists", and reopening gives an empty form. A throwaway school, QPB-601, was created. **Mark grid** (Primary 1 Mathematics): add and edit a test; Enter and ArrowDown move down, ArrowUp moves up; "a" and "x" become ABS and EX; a pasted column (71/72/73, then full columns) fills downwards; over the maximum marks the cell `aria-invalid` and isn't saved. In a two-tab clash the first save wins (40) and the other tab's cell gets an orange border. Submit stays disabled while "25 marks still to enter" and works once every mark is in. As a head, Return asks "What needs changing" and the reason shows on the sheet. Not assessed on lets Submit, and off reverts. Not tested: descriptor cells. **Parent app:** works for Rita. The production build keeps the sample data only in a lazily loaded chunk (`7553…`), not in the parent pages' first load. |

## Academic calendar and bill Dates (tested 25 Oct 2026)

Backend `f6cf1d2` (term pattern, undated periods, archived years) and `16b2d78` (bill Dates), frontend `70a60f0`, `4d38ca3` and `6a41002`. Tested on throwaway schools QRG-501 (head@qrg.test) and QPM-402.

| Area | Result |
|---|---|
| Term pattern | `GET /term-pattern` returned "Term ×3". `PUT` with Semester ×2 gets 200. Setup shows "2 semesters a year. New years get these periods without dates." with **Change**, which opens "How the school divides a year" (terms or semesters, or the whole year). |
| New years | Adding 2026/27 (current) created Semester 1 and 2 undated (`datesSet: false`). With no period dated, `GET /academic-terms/current` gets 404. Setup shows "DATES NOT SET" with **Set dates**. Admitting into an undated period gets 400 "Semester 1, 2027/28 has no dates yet. Set its dates in School setup first." |
| Date rules | Covered under QA-076: end before start, outside the year, out of order, overlapping years and a shortened year are all refused with clear messages. Gap: QA-268. |
| Current year and term | QA-077 and QA-237 are fixed; QA-236 is partly fixed (the current-term fallback crosses years). |
| Archive | Archiving the current year gets 400 "Make another year current before archiving it". Archiving 2027/28 gets 200: it drops out of the list (1 year) but shows with `includeArchived=true` (2), and its label can be reused. Restore gets 200. `academic_year.archived` and `.restored` are audited. In the UI, "Archive 2027/28?" explains that it hides the year and that a year with bills, pupils or marks can't be archived. "Show archived years" lists them with Restore. |
| Term pickers | The calendar and promotions "Start in term" list undated periods as "2027/28 · Semester 2 · dates not set", disabled, and the current one as "(current)". |
| Payment dates (QA-018) | A future `paymentDate` gets 400 "The payment date can't be in the future". A 1990 payment date on a 2026 bill is still accepted (201, RCT/QPM-402/2026/0001, GHS 1 on Yaa's throwaway bill). QA-018 stays partly fixed. |
| Bill Dates section | With Yaa's bill (term 1 Sep to 18 Dec 2026, no due date): the term period prints "SEPT. 2026 – DEC. 2026", vacation "18th December, 2026" (term end) and reopening "8th January, 2027" (next term's start). With "hide", the missing deadline is left out; with "tba", it prints "Payment Deadline: To be announced". The formats longUpper ("18th DECEMBER, 2026"), short ("18 Dec 2026") and numeric ("18/12/2026") all render. Reordering, relabelling, an override text ("Friday 18 Dec"), a hidden line and a colour (`#c00000`) all apply. A colour that tries to break out of the attribute gets 400 "colour must be like #1e3a8a", label markup is escaped, and an unknown format gets 400. In the editor (v22), each line has named "Move … up/down" buttons and moving one saves the new order. "Text colour" is in the Footer's settings. |
| Existing designs unchanged | All 19 QPM-402 designs saved before `16b2d78` were copied with their layouts unchanged and compared. 18 compile to identical HTML and CSS. v12 (which has a Dates section) changes `long_date` to `doc_date: 'longUpper'`, which prints the same "14th OCTOBER, 2026" format. The copies are drafts "QA bytecheck vN" (v23 to v41), throwaway. |

## Results phase 4: parent report routes (tested 24 Oct 2026)

Backend `main` a0220a2 (no DB change). The test ran as parent@qar.test (`Qar!Pass2026`), linked to Pupilone (QAR-301 Basic One). **Backend: all 12 checks pass. One new Low finding, QA-262, which is now fixed. Parent Reports in the portal was switched on in frontend `c98d2c4` and re-tested; see the last row.**

| Area | Result |
|---|---|
| List and detail | `GET /parents/me/wards/:studentId/reports` returns revision 4 (average 85, grade A, position 1, classSize 5). The detail has subjects (class 30, exam 50, total 80, grade A, remark "Excellent", subject position null), attendance, remarks, promotion and nextTermBegins. The document returns HTML ("Overall Position: 1st out of 5", "Attendance: 2 out of 2"). |
| Revisions | While reopened and edited, the parent still sees revision 4 and the old remark. After republishing, revision 5 has the new remark ("Revised: excellent all round."). |
| Withhold | While withheld, the list is `[]` and the detail and document get 404. Release brings it back. |
| Positions | The class position is shown by default; subject positions are null (staff_only). With `classPositionVisibility: hide`, the published report's position is null in the list and detail and there's no position line in the document. Set back to `show`. |
| Access | Unlinked ward (Pupiltwo), and PRM-001's report id on this ward: 404. Principal, teacher and secretary tokens: 403. Results turned off for QAR-301: 403 on the list and detail (turned back on). |
| Parent portal screens (re-test 24 Oct, FE `c98d2c4` + `e85bd47`, BE `83aa165` + `e6616cb`, phone width) | **QAR, Pupiltwo:** list "74% · 2nd= of 5 · B". Detail: average 74%, grade B, position "2nd= / 5", attendance 3 / 3, "The school corrected this report on 24 Oct 2026.", CS 40% / EX 60% columns, class teacher remark, "Promoted to Basic Two.", and "View report card" opens the document ("Overall Position: 2nd= out of 5"). **Pupilone:** "1st of 5" with the head teacher's remark. **PRM-001, Bekoe (parent-bekoe@prm.test, revision 2):** "1st of 6", attendance 57 / 60, the corrected notice, "Next term begins 8 Jan 2027." JSON: `positionTied` is true for the tied row and false otherwise (subjects too); `promotion.status` is lower case ("promoted"). Screenshots: `qar-parent-report-detail.png`, `prm-parent-report-corrected.png`. |
| Staff "Academic performance" page (re-test 24 Oct, FE `7c9e141`, browser) | **Pass.** Results was turned on for the throwaway school QPM-402, and its staff were checked. **Teacher** (teacher@qpm.test): the sidebar has "Term reports" in place of "Academic performance", and `/dashboard/performance` redirects to `/school-admin/results/reports`. **Academic Head and Principal:** "Academic performance" is gone from the sidebar (Term reports, Mark sheets and Grading setup are there), and `/dashboard/performance` goes to the Overview. **Results off (BIS-001):** kofi.boateng@bis.test and principal@bis.test still see "Academic performance" as the "UI PREVIEW · Sample data" page. All five logins see the banner "Sample data · Changes last until you switch term, or reload.", which no longer mentions "child". No API errors. Copy nit: a teacher's Term reports page read "Check each class's marks and remarks, then approve and publish its reports", but teachers can't approve or publish. Fixed in FE `1176fe2` and re-tested: the teacher now sees "See how each class is doing, and write remarks for your own class.", and the Academic Head and Principal keep the approve-and-publish line. The secretary (sec@qpm.test, added later) sees "See how each class is doing, and print reports once they're worked out." and a single "Term reports" sidebar entry. |
| Regression after the push (24 Oct, origin `462f3d9`) | **Pass.** As Rita Ansah (FIS-001), the tabs are Home, Fees, Attendance and More, and bill 0039 reads "GHS 200.00 credit · Nothing to pay". Home, Fees, Attendance and More make no refused requests. Observation, not logged: opening `/parent/reports` by its address shows "Not offered by this school" correctly, but the page still calls `GET /parents/me/wards/:id/reports` twice and gets 403 "This isn't turned on for parents at your child's school". It could skip the call when the ward's modules don't include results. Fixed in FE `b60213d` and re-tested at phone width. **Rita (FIS-001, results off):** `/parent/reports` and a report link show "Not offered by this school" with only `/auth/profile` and `/parents/me/wards` called. Fees, a bill and Attendance load as before, with no 4xx. **New parent parent@qpm.test** (linked to Yaa on QPM-402 by Super Admin; results on, fees and attendance off): the tabs are Home, Reports and More, and Reports loads ("No reports yet"). `/parent/fees`, a bill, a receipt and `/parent/attendance` all show "Not offered" with no area call. Screenshot: `qpm-parent-fees-not-offered.png`. |
