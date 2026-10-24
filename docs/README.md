# Fastrack EduSuite: frontend product documentation

These docs cover the Next.js frontend in this repository and check it against the NestJS backend (`fastrack-space/fastrack-backend`, whose API reference is in its `docs/architecture/`). They were written on 20 October 2026 from a code review, then checked against a running backend and walked through in a browser as each staff role; see [qa/live-test-log.md](./qa/live-test-log.md).

## Contents

| Document | What it covers |
| --- | --- |
| [product-overview.md](./product-overview.md) | What EduSuite is, who uses it, Fastrack's other services, the module (subscription) model, the marketing-to-waitlist funnel, which features are live and which are preview, and marketing claims compared with reality |
| [roles-and-access.md](./roles-and-access.md) | The 7 roles: landing page, sidebar, routes, actions and their permission keys, frontend-only grants, module gating, closed-term behaviour, and where the frontend and backend disagree |
| [frontend-architecture.md](./frontend-architecture.md) | Route groups, the AuthProvider → RouteGuard → AppShell chain, guard logic, the API client (refresh and 401 handling), session storage, theming, the sample-data vs live-API boundary, and testing |

### User flows

Each flow has a Mermaid diagram, its loading, empty, error and success states, its validation rules, and the backend endpoints it calls.

| Flow | Status |
| --- | --- |
| [Login and session](./user-flows/login-and-session.md) (login, restore, refresh, logout, `?next`) | Live |
| [Student admission](./user-flows/student-admission.md) (4-step modal) | Live |
| [Fees: invoices, payments, receipts, fee setup (types, structures, discounts)](./user-flows/fees-invoices-payments.md) | Live (fee setup screens partly uncommitted) |
| [Optional-service requests](./user-flows/optional-service-requests.md) (parent asks to start or stop a service, staff approve) | Live on backend `main`; staff page needs uncommitted route rule (QA-080) |
| [Bill and report designs](./user-flows/document-templates.md) (visual builder) | Bills live; report designs preview |
| [Calendar](./user-flows/calendar.md) (term events and closures) | Live |
| [School setup](./user-flows/school-setup.md) (years, terms, departments, classes, profile, checklist) | Built, uncommitted |
| [Staff invitation](./user-flows/staff-invitation.md) | Live |
| [Platform provisioning](./user-flows/platform-provisioning.md) (Super Admin) | Live |
| [Parent portal (PWA)](./user-flows/parent-experience.md) | Live: account, wards and profile, fees and payments, optional services, attendance, calendar. Reports are "coming soon" (no backend yet) |
| [Online admissions](./user-flows/online-admissions-preview.md) | Preview only |
| [Attendance](./user-flows/attendance.md) (daily register, term totals, parent month view) | Live (backend on `feat/attendance`) |
| [Password reset and invite acceptance](./user-flows/password-reset-and-invite-acceptance.md) | Invite acceptance live; password reset backend live, frontend uncommitted |
| [Results and term reports](./user-flows/results-and-reports.md) ([API contract](./api/results.md), calculation and [worked answers](./api/results-fixtures.json)) | Subjects live; grading setup built, backend in progress; marks and reports to come |

## Key facts at a glance

- **Live pages:** Login, Students, Fees & Billing, Staff, Attendance, Calendar, School setup, and the Super Admin Platform console and school detail.
- **Preview pages:** the role Overview (every school user's landing page), every `/dashboard/<area>` workspace, and Online admissions. The parent portal at `/parent` is live except Reports, which say "coming soon" until the backend has a grading domain.
- **Access** is decided in the browser from the backend-issued `permissions`, frontend feature grants, enabled modules and `APP_ROUTES`. The backend re-checks every call. There is no Next middleware.
- **Session:** access and refresh tokens and the user live in `localStorage`. The access token lasts 15 minutes. Refresh tokens rotate and last 14 days (staff), 30 days (Super Admin) or 60 days (parents).
- **Tests:** `pnpm test:dashboard` (31 Node checks for access rules, scoping and fee maths). There are no component or end-to-end tests.

## QA and product review

| Document | What it covers |
| --- | --- |
| [qa/pm-summary.md](./qa/pm-summary.md) | Verdict, top risks, friction themes, frontend/backend disagreements, roadmap (start here) |
| [qa/findings.md](./qa/findings.md) | All 151 findings (QA-001 to QA-088, QA-200 to QA-262) with severity, evidence, reproduction steps and fixes |
| [qa/e2e-bismark-international.md](./qa/e2e-bismark-international.md) | 21 Oct end-to-end UI run: a new school (BIS-001) set up and taken through every feature, step by step, with a ledger reconciliation |
| [qa/test-matrix.md](./qa/test-matrix.md) | Role × route/endpoint, security, money and lifecycle scenarios with results |
| [qa/live-test-log.md](./qa/live-test-log.md) | How the live run was set up, every request made and response received, and the browser walk-through ([scripts](./qa/browser-walkthrough/), [screenshots](./qa/screenshots/)) |

Backend references (in `fastrack-backend/docs/architecture/`): `api-reference.md` (all 210 endpoints), `rbac-matrix.md` (role × permission × endpoint), `adminjs.md`.

## Top findings

See [qa/pm-summary.md](./qa/pm-summary.md). The five Critical findings are:

1. **QA-001:** concurrent payments lose credits on the invoice and the fee account (reproduced live).
2. **QA-002:** carried-forward arrears are counted twice (reproduced live).
3. **QA-003:** suspending a school has no effect (reproduced live).
4. **QA-015:** invited staff can't accept their invitation, because the frontend has no setup-password page. *Fixed: page in 41eeb3b; crash fixed 22 Oct (QA-204).*
5. **QA-020:** waitlist and contact forms send nothing. *Mostly fixed in 41eeb3b.*

The browser walk-through also found **QA-055** (High): the Record Payment form can replace the amount the cashier typed with the full balance, so a GHS 50 payment was recorded as GHS 1,450. *Fixed in 41eeb3b.*

The 21 October edge-case pass (QA-064 to QA-088) found three new High issues, all in the design builder's autosave: switching version can save one design onto another (QA-064), recent edits are lost on switch or leave (QA-065), and Publish can push an older design (QA-066).
