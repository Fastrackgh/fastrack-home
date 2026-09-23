# Dashboard integration handoff

Updated 23 September: the six role-review PDFs are implemented in the [phase-one feature](./phase-one/README.md). That coverage document supersedes the original notes below for finance, enrollment, grading, calendar, archives, uploads and local form behavior. There are now seven preview roles, including Administrative Secretary (`SECRETARY`). Both `SECRETARY` and `ACADEMIC_HEAD` need backend role support. Future-update modules listed in the PDFs are excluded.

The UI is available at `/school-admin/dashboard`. It is an explicitly labelled preview, not an authenticated application. All six roles can be reviewed with the preview selector. The existing login screen now links to the preview without implying authentication.

## Role mapping

| Workspace                 | Backend role          | Scope                                                                         |
| ------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| Parent                    | `PARENT`              | Linked children only; selected child for fees, results, attendance, timetable |
| Principal / Administrator | `SCHOOL_HEAD`         | School financial, enrollment, attendance, academic, communication oversight   |
| Teacher                   | `TEACHER`             | Assigned classes and subjects only; attendance, marks, resources              |
| Academic Head             | `ACADEMIC_HEAD` (new) | School academics, faculty workload, attendance, enrollment; no finance        |
| Account Officer           | `ADMIN`               | School collections, debt, expenses, enrollment                                |
| Super Admin               | `SUPER_ADMIN`         | Platform schools, subscriptions, users, audit activity                        |

These are the requested UI responsibilities, not the existing backend permission matrix. In particular the current backend `ADMIN` permissions are broader than Account Officer. Agree on and update backend permissions before live rollout. Add Academic Head to the backend enum, database enum migration, auth serialization, guards, and default permission matrix. Do not alias Academic Head to `ADMIN`.

## Files and data boundary

- `model.ts`: roles, navigation policies, `DashboardUser`, `DashboardQuery`, `DashboardData`, and `DashboardRepository`.
- `fixtures.ts`: asynchronous, abortable preview repository with role and child scoped sample data. Historical term intentionally returns empty tables. No credentials or network calls.
- `Dashboard.tsx`: preview composition, loading/error/retry, navigation, filters, details, notifications and CSV export.
- `Workflow.tsx`: local draft forms and role-specific action gates. Money validation, CA 0–40 / exam 0–60, attendance options, resource size validation.
- `SectionInsights.tsx`: sample capacity, budget, aging, academic and report progress summaries, plus daily/weekly timetable. Replace these sample aggregates when implementing the live repository.

The repository returns display view models. Keep backend entity IDs and numeric money/marks in live DTOs and mutation payloads; never parse formatted table cells to make API calls. Sample forms are not wire DTOs. The CA/exam split is a sample school policy and must become configurable during integration.

## Existing API candidates (global prefix `/api`)

| UI                                                           | Existing source endpoints / capability                                                                   | Work still required                                                                           |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Session                                                      | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`; auth user has role, schoolId, permissions | Session provider, secure token handling, expiry and 401 handling, verified role-based landing |
| School directory                                             | `/schools` and `/schools/:id`                                                                            | Bind list/create forms and school selector                                                    |
| Enrollment                                                   | `/schools/me/students`, `/schools/me/classes`                                                            | Aggregate admissions, withdrawals, capacity and leads                                         |
| Academic context                                             | `/schools/me/academic-terms/current`, `/schools/:schoolId/academic-years`                                | Use real term IDs and school timezone                                                         |
| Faculty                                                      | `/schools/me/staff`                                                                                      | Workload, syllabus status, assigned-class scope                                               |
| Finance                                                      | Existing fees-management invoices, payments, discounts and fee-structures controllers                    | Typed form mapping, server totals, aging and collection aggregates; transactional posting     |
| Subscriptions                                                | `/schools/:schoolId/modules` for module flags                                                            | Paid plan and renewal billing contracts are separate                                          |
| Academics / timetable / resources / communications / budgets | UI contracts represented in preview                                                                      | Confirm or add application APIs; do not assume entity existence provides a usable endpoint    |

## Production wiring

1. Split preview entry from the authenticated dashboard entry. Only the preview should bundle fixtures or show the role selector. The current `Dashboard` component always creates a sample user; supplying a different repository alone does **not** make it production ready.
2. Derive user identity from verified authentication, reject unknown roles, and redirect unauthenticated sessions to login. Never accept role/school/child ownership from a client selector as authority.
3. Pass a scoped repository using the authenticated identity, real term ID, assigned classes, linked children, and enabled modules. Enforce authorization on the API too. Gate UI actions with both role and effective permission.
4. Implement typed domain mutation services for payment collection, expenses, attendance batches, mark entry, message drafts, resource uploads, invitations and schools. Replace local draft updates with pending/error/success states and invalidate relevant aggregates after confirmed saves. Use integer minor units or decimal strings for money.
5. Confirm receipts and invoices from the server; no payment gateway or message delivery happens in this preview. Resource attachment currently records the filename only, and does not retain or upload file contents.
6. Move `SectionInsights` sample aggregates and term/child selectors into the live data contract. Preview changes deliberately do not recompute overview metrics and are discarded on reload or scope change.

## Review coverage

Each workspace includes an overview and all role navigation sections. Tables support search (including risk-factor notes), status filtering, empty states, record details and filtered CSV export. Parent child switching updates child-specific fees/results/attendance/timetable. Teacher timetable supports daily and weekly views. Role switching resets open dialogs and local records. Loading/error/retry is implemented at the repository boundary.

Browser review checklist: all six roles; every navigation item; keyboard opening/closing dialogs; payment and expense validation; attendance save; grade validation and comments; message/resource drafts; search and status together; CSV; parent child changes; archived term empty state; mobile drawer at 390px; desktop at 1440px. Real authorization and tenancy require backend integration tests, not only UI checks.
