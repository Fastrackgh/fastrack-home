# Fastrack EduSuite: PM and QA summary

20 Oct 2026. Full detail: [findings.md](./findings.md) (126 findings; QA-060 to QA-088 and QA-200 to QA-237 added 21 Oct), [test-matrix.md](./test-matrix.md), [live-test-log.md](./live-test-log.md) (API probes plus a browser walk-through of every staff role).

## Verdict

The **foundations are strong**:
- **School isolation holds.** No cross-school read or write by id worked.
- **The role → permission → module guard chain is consistent** and covered by contract tests (backend: 500 tests passing).
- **The frontend access layer mirrors it closely.**

The product is **not ready for paying schools**, for three reasons:
1. **Money:** the fee ledger can be wrong (lost credits under concurrent payments, arrears counted twice, double-submits), and the payment form can record a different amount from the one typed.
2. **Broken journeys:** core paths dead-end (invited staff can't get in, parents can't use anything, no password reset, a new school can't be set up from the UI).
3. **Platform controls that don't work:** suspending a school does nothing, and an Academic Head can mint a finance account.

## Top risks (fix before any real school goes live)

| # | Risk | Why it matters | ID |
|---|---|---|---|
| 1 | Concurrent payments overwrite each other | Paid fees vanish from bills; disputes with parents; reconciliation breaks | QA-001 |
| 2 | Arrears double-counted | Parents are billed for money already paid | QA-002 |
| 2a | Record Payment replaces the typed amount with the full balance when the lookup finishes late | A cashier types GHS 50 and issues a GHS 1,450 receipt | QA-055 (**fixed** 41eeb3b) |
| 3 | School suspension has no effect | Fastrack can't cut off a non-paying school; the product reports success | QA-003 |
| 4 | Academic Head can create an Account Officer with a password | Finance access outside the role design | QA-013 |
| 5 | Teachers see the whole school's children (national IDs, guardian contacts, medical notes) | Data Protection Act 2012 exposure | QA-016 |
| 6 | Double-submitted payments; AdminJS can edit the ledger with no audit trail | Duplicate receipts; untraceable changes to money | QA-004, QA-005 |
| 7 | OTPs and invite tokens in logs and on a LAN port | Account takeover | QA-006 |

## Friction themes

1. **Dead-end journeys.** Invite → 404 (QA-015, partly fixed). No password reset (QA-027, in progress). Parents: 403 everywhere (QA-026). No school setup wizard (QA-033, partly fixed, uncommitted). Waitlist leads discarded (QA-020, mostly fixed).
2. **The UI looks finished but isn't.** The Overview, attendance, admissions and parent pages run on sample data that looks real (QA-034). Marketing promises MoMo integration, SMS, payroll and 260+ schools (QA-044).
3. **Silent wrongness.** A typed payment amount gets replaced (QA-055). KPI cards add up one page (QA-031). Staff counts on the platform are off (QA-056). Lists cut off at 10, 50 or 100 (QA-030). Invented medical defaults are saved (QA-032). An "undefined" toast after generating invoices (QA-028). Failures show as empty tables (QA-039).
4. **Session fragility.** Multi-tab refresh logs everyone out, and signing in as a different user in another tab changes which account an already-open tab acts as (QA-008). A network blip logs you out and the draft is lost (QA-037). Logout doesn't end the session (QA-009).
5. **Staff management gaps.** Only teachers appear in the directory. Academic Head, Account Officer and Secretary can't be edited or re-activated (QA-036). Invites can bring back deactivated users (QA-007).

## Where frontend and backend disagree

| Topic | Frontend | Backend | ID |
|---|---|---|---|
| Invite acceptance | No page | Endpoints exist | QA-015 |
| Generate-invoices response | `totalInvoicesGenerated` | `generatedCount` | QA-028 |
| List envelope (fees work in progress) | `data[]`+`meta` | `data.items` (unless `X-Api-Contract: 2`) | QA-053 |
| Closed-term read-only | Enforced in the preview | Not enforced; no term status | QA-018 |
| Teacher scope | Route allows `/students` | No class scoping | QA-016 |
| Parent | Sample screens | 403 on every school route | QA-026 |
| School suspended | "Inactive" badge | Not enforced | QA-003 |
| Permissions/modules mid-session | Cached until the page reloads | Re-read on every request | QA-035 |
| Logout | Local only | `/auth/logout` exists, unused | QA-009 |
| Class list | No `limit` (gets 10) | Default 10, max 100 | QA-030 |

## Roadmap

**Now (this sprint): stop the bleeding**
- QA-001, QA-002, QA-004: payment row locking, a single arrears model, an idempotency key, server-only receipt numbers. Then run a reconciliation script over any real data.
- QA-003: enforce `school.isActive` in the JWT strategy, login, refresh and jobs.
- QA-013, QA-024, QA-025: a user-creation policy; strip `status`/`classId` and `studentIds` from the general DTOs.
- QA-005, QA-006, QA-012: AdminJS off in production by default, patch the notification client, add helmet, gate Swagger, require CORS and `NODE_ENV`.
- QA-055: don't overwrite a typed payment amount; lock the form while the balance loads.
- QA-015, QA-020, QA-028: the setup-password page, a real waitlist submission, the invoice toast fix.
- QA-057, QA-058 (in-progress work): add the `layout` migration and grant `calendar:read` before those features ship.

**Next (2-4 weeks): finish the core journeys**
- QA-027 password reset
- QA-033 school setup checklist
- QA-016 teacher scoping
- QA-009, QA-008 session hardening (HttpOnly cookie, cross-tab lock, logout)
- QA-030, QA-031 server search and a fee summary endpoint
- QA-032 admission defaults
- QA-036 all staff roles
- QA-007 invite rules
- QA-018 term close

**Later**
- The parent product (QA-026): ward-scoped APIs plus UI.
- Attendance, timetable, expenses and payroll backends (QA-034).
- Copy review (QA-044).
- Consistency, accessibility and dark mode (QA-050).
- Doc refresh (QA-052).
- Generate the frontend permission list from the backend (QA-051).

## Test gaps to close

There are no automated tests for:
- final balances after concurrent payments
- the arrears roll-forward balance
- school suspension
- payment idempotency
- invitation edge cases
- AdminJS
- the public invoice token
- cross-school job status
- production config

The frontend has no tests of flows, only access-rule checks.

## 21 October end-to-end run: Bismark International School

A brand-new school was set up from nothing and taken through every built feature in the web frontend, in a visible browser. It covered provisioning, staff, students, parents and linking, fees, discounts, payments, extra bills, two term rollovers, promotion and exits, the calendar, attendance, bill designs, the parent app and a Paystack payment. Log: [e2e-bismark-international.md](./e2e-bismark-international.md). New findings: QA-200 to QA-235 (3 Critical, 8 High, 21 Medium, 4 Low).

**Good news:** the money is right. At the end of the run, payments, invoices and student accounts reconcile to the pesewa (GHS 8,870.50 paid; GHS 35,789.50 open). This held across partial, exact, over- and under-payments, discounts, corrections, extra bills, two rollovers, promotion and an online payment. Several earlier findings are fixed in the browser: QA-002, QA-003, QA-009, QA-028, QA-032, QA-036, QA-055 and QA-057.

**Blockers for a real school (fix before onboarding anyone):**
1. **QA-204:** invite links crash. No principal or staff member can activate an account (the QA-015 fix never worked at runtime). **Fixed 22 Oct** and re-tested in the browser.
2. **QA-212:** parent sign-up crashes on the first keystroke. No parent can join. **Fixed 22 Oct** and re-tested in the browser.
3. **QA-206:** making a year or term current returns 500 and leaves **two current terms** (and two current years). Every rollover hits this. **Fixed 22 Oct** (backend bcb2e0b); re-tested by API. Re-tested in the browser on BIS-001 22 Oct: switching terms works. Two edge cases remain: making a year current doesn't move the term (QA-236), and the current term can be unticked to leave none (QA-237).

**High-risk in real use:**
- **Linking families:**
  - Guardian contacts can't be corrected after admission (QA-211).
  - Unlinking a parent doesn't stick, which is a safeguarding problem (QA-214).
  - A revoked invite locks a staff member out for good (QA-208). **Fixed 22 Oct:** "Resend invite" now works for anyone who never set a password.
- **What parents see about money:**
  - The parent app's "paid of" total inflates every term (QA-222).
  - Old "tamper-proof" bill links change later (QA-227).
  - "Bal B/f" mislabels this term's extra bills (QA-219).
  - GHS 0 bills are marked unpaid (QA-215).
- **Daily school work:**
  - The admission form skips Health & Safety (QA-210).
  - Promotion is one pupil at a time with no class order (QA-207).
  - Login fails if a phone capitalises the email (QA-201).
- **Structure gaps found in review:**
  - Billing runs have no ID, so a mistaken run can't be undone or audited as a unit (QA-232).
  - Only class teachers can be assigned; subject teachers have no link to classes (QA-233). There's one teacher per class (QA-234) and no per-term history (QA-235).
- **Cashier flow:**
  - KPI cards don't update (QA-217).
  - Extra bills can't be paid on their own (QA-221).
  - One MoMo transfer can't cover siblings (QA-216).
  - Credit isn't applied to new extra bills (QA-220).

## 21 October edge-case pass

A code-reading pass over the features built after the audit added QA-064 to QA-088: 3 High, 14 Medium, 8 Low. Full detail is in [findings.md](./findings.md#edge-case-pass-on-the-newer-features-21-october-2026).

- **Fix first: the design builder's autosave** (QA-064 to QA-066). Switching version can save one design onto another, recent edits are lost, and Publish can push an older design. All three come from the 1.2 s debounce not being tied to the template being edited.
- **Money and data.**
  - Renaming a fee type rewrites issued invoices (QA-084).
  - The bill prints a hard-coded 10% penalty, ignoring the structure's penalty (QA-085).
  - A cash payment can still be recorded twice after a closed modal (QA-086).
  - Calendar closures added to past terms change attendance totals (QA-072).
- **Setup integrity.**
  - Years, terms and classes can't be deleted (QA-075).
  - Term and year dates aren't cross-checked (QA-076).
  - The current year and current term can disagree (QA-077), which is the root of QA-061.
- **Shipping risk.** Several features only work with uncommitted changes:
  - the school setup page
  - the optional-requests route rule (QA-080)
  - the frontend password-reset pages
  - `src/app/auth/AuthShell.tsx`, which the setup-password page imports

  Commit each feature together with its rbac and route changes. Parent sample-data mode has no production guard (QA-081).
- **Resolved since the audit:** QA-055, QA-057, QA-060, QA-063. Partly: QA-004 (frontend), QA-015, QA-020, QA-033, QA-058 (needs migration and re-login).

## Process notes

- Both repos changed while the audit ran (frontend fees refactor `2cfc910`/`141f575`; backend phases 7-10 up to `173bb33`). Findings are recorded against the code as of those commits.
- Backend commit `173bb33` (pushed to `origin/feat/phase-10-api-contract-v2`) includes first drafts of `api-reference.md`, `rbac-matrix.md` and `adminjs.md` from this audit; the final versions sit as uncommitted changes.
- QA-054: something is repeatedly writing test schools into the **dev** database.
- The browser walk-through (afternoon of 20 Oct) re-checked the frontend findings by clicking through as each staff role. It confirmed 14 earlier findings in the UI, softened two (QA-035 needs a reload, not a re-login; QA-039 does show a toast) and added five (QA-055 to QA-059). Parent pages weren't walked because there's no seeded parent.
