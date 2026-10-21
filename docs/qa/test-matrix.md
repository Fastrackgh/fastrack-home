# Test matrix

**Legend**
- ✅ Behaves as intended (tested live)
- ❌ Fails (finding id)
- 🔎 Confirmed in code only
- — Not applicable
- ⬜ Not tested
- 🟡 Works, but inconsistent (see the note under the table)

The **expected** result follows the role design in [roles-and-access.md](../roles-and-access.md) and the backend matrix in `fastrack-backend/docs/architecture/rbac-matrix.md`. The full list of 210 endpoints, and which roles can call each, is in that backend document. This matrix covers the scenarios that carry risk.

## 1. Frontend routes × role (can the role open the page?)

Walked in the browser. "→ dash" means the page redirected to the dashboard (correct when the role isn't meant to have it). "URL-only" means the page opens by typing the address but isn't in that role's menu.

| Route | SA | Principal | Academic Head | Teacher | Account Officer | Secretary | Parent |
|---|---|---|---|---|---|---|---|
| Landing after login | `/platform` ✅ | `/dashboard` ✅ | `/dashboard` ✅ | `/dashboard` ✅ | `/dashboard` ✅ | `/dashboard` ✅ | ⬜ no seeded parent |
| `/school-admin/platform` | ✅ | → dash ✅ | → dash ✅ | → dash ✅ | → dash ✅ | → dash ✅ | ⬜ |
| `/school-admin/dashboard` | → platform ✅ | ✅ (sample data ❌ QA-034) | ✅ | ✅ | ✅ | ✅ | ⬜ |
| `/school-admin/students` | → platform ✅ | ✅ | ✅ | URL-only, whole school ❌ QA-016 | ✅ (read-only) | ✅ | ⬜ |
| `/school-admin/fees` | → platform ✅ | ✅ | → dash ✅ | → dash ✅ | ✅ | → dash ✅ | ⬜ |
| `/school-admin/staff` | → platform ✅ | ✅ (teachers only ❌ QA-036) | ✅ | → dash ✅ | URL-only 🟡 QA-051 | ✅ | ⬜ |
| `/school-admin/attendance` | → platform ✅ | ✅ (mock ❌ QA-034) | ✅ | ✅ | → dash ✅ | URL-only 🟡 QA-051 | ⬜ |
| `/school-admin/admissions` | opens 🟡 | ✅ (preview) | URL-only 🟡 | → dash ✅ | → dash ✅ | ✅ | ⬜ |
| `/school-admin/templates` | → platform ✅ | 500 ❌ QA-057 | → dash ✅ | → dash ✅ | → dash ✅ | → dash ✅ | ⬜ |
| `/school-admin/calendar` | → platform | → dash ❌ QA-058 | → dash ❌ | → dash ❌ | → dash ❌ | → dash ❌ | ⬜ |
| `/auth/setup-password` (invite link) | 404 ❌ QA-015 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Forgot password | none ❌ QA-027 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

🟡 = works, but the menu and the route rules disagree. Steps and results are in [live-test-log.md](./live-test-log.md#browser-walk-through).

## 2. Backend: role scenarios (live)

| Scenario | SA | Principal | Academic Head | Teacher | Account Officer | Secretary | Parent |
|---|---|---|---|---|---|---|---|
| Record payment | ⬜ | ✅ 201 | ✅ 403 | ✅ 403 | ✅ 201 | ✅ 403 | 🔎 403 (QA-026) |
| Generate invoices | ⬜ | ✅ 201 | ⬜ | ⬜ | ✅ 201 | ⬜ | — |
| List students | ⬜ | ✅ | ⬜ | ❌ whole school + PII (QA-016) | ⬜ | ⬜ | — |
| Exit student via `/exit` | — | ✅ 201 | ⬜ | ⬜ | ⬜ | ✅ 403 | — |
| Exit student via `PATCH` | — | ⬜ | ⬜ | ⬜ | ⬜ | ❌ 200 (QA-024) | — |
| Create Account Officer (`POST /users`) | ⬜ | 🔎 allowed | ❌ allowed + password (QA-013) | ⬜ | — | — | — |
| Read invoices and receipts of own child | — | — | — | — | — | — | 🔎 ❌ 403 (QA-026) |
| Super Admin console: suspend/activate, modules | ✅ | — | — | — | — | — | — |

## 3. Cross-cutting security scenarios

| Scenario | Result | ID |
|---|---|---|
| Read another school's invoice, student or latest invoice by id | ✅ 404 | — |
| Pay another school's student | ✅ 404 | — |
| Body `schoolId` for another school | ✅ 403 | — |
| Read another school's background job | ❌ 200 | QA-011 |
| Public invoice by UUID, no auth | ❌ 200 | QA-010 |
| Suspended school: login, refresh, write | ❌ all succeed | QA-003 |
| Module disabled mid-session (gated routes) | ✅ 403 next request | — |
| Module disabled: public invoice | ❌ 200 | QA-022 |
| Refresh-token reuse | ✅ family revoked | (multi-tab impact QA-008) |
| Refresh after frontend logout | ❌ 200 | QA-009 |
| Password change revokes sessions | 🔎 ❌ | QA-009 |
| Deactivated user + pending invite | 🔎 ❌ reactivates | QA-007 |
| AdminJS brute force (30 tries) | ❌ no lockout | QA-005 |
| Login and register-parent enumeration | ❌ 409 for staff email | QA-014 |
| Pagination `limit=100000` | ✅ 400 | — |
| Security headers, Swagger, CORS | ❌ | QA-012 |
| Media path traversal, cross-school media | 🔎 ✅ | — |

## 4. Money edge cases (live)

| Scenario | Result | ID |
|---|---|---|
| 5 concurrent payments on one invoice | ❌ invoice credited 100 of 500 | QA-001 |
| Arrears carried into Term 2, then full payment | ❌ Term 2 still owes 1050 | QA-002 |
| Same payment posted twice | ❌ double credit | QA-004 |
| Double-click Record Payment in the UI | ✅ one request | QA-004 |
| Type an amount while the balance is loading (UI) | ❌ typed GHS 50, recorded GHS 1,450 | QA-055 |
| Reused client `receiptNumber` | ❌ 500 | QA-004 |
| Negative amount | ✅ 400 | — |
| Amount 99,999,999,999 | ❌ 500 | QA-019 |
| Overpayment ×34 | ❌ accepted silently | QA-029 |
| Future `paymentDate` (2030) | ❌ accepted | QA-018 |
| Re-generate the same term | ✅ skipped, no duplicates | — |
| Pay an exited student | ❌ accepted | QA-017 |
| Bill an exited student (generate) | ✅ 400 | — |
| Discount stacking >100% | 🔎 capped at gross; silent overwrite | QA-043 |

## 5. Lifecycle

| Event | Expected | Actual | ID |
|---|---|---|---|
| School suspended | Users locked out, jobs stop | Nothing changes | QA-003 |
| Module disabled | Pages hidden, API 403 | API ✅; an open page keeps its buttons until reloaded (browser) | QA-035 |
| User deactivated | Locked out | ✅, except through a pending invite | QA-007 |
| Student exits | Billing stops, balance settled | Payments still accepted, invoice stays open | QA-017 |
| Term rollover | Old term closed, arrears carried once | No close; arrears double-counted | QA-018, QA-002 |
| New school onboarded | Guided setup | No UI for Principal, terms, classes | QA-033 |
| Staff invited | Sets password, signs in | Invite sent ✅; the link 404s (browser) | QA-015 |
