# Roles and access

The 7 roles are `SUPER_ADMIN`, `PRINCIPAL`, `ACADEMIC_HEAD`, `TEACHER`, `ACCOUNT_OFFICER`, `SECRETARY` and `PARENT`. This page describes what each role sees and can do in the frontend, and where the frontend and the backend disagree.

## How access is decided

1. **Role and audience** (`src/lib/rbac/roles.ts`):
   - `SUPER_ADMIN` is the `platform` audience.
   - The five school staff roles are the `staff` audience.
   - `PARENT` is the `parent` audience.
2. **Backend permissions.** The `user.permissions` array from `/auth/login` is filtered to the keys in `src/lib/rbac/permissions.ts`. Two backend keys are **not** in the frontend list and are silently dropped: `school_profile:manage` and `student_fee_preferences:manage`.
3. **Frontend feature grants** (`src/lib/rbac/feature-permissions.ts`). These are keys the backend does not issue, granted by role in the browser. They gate only preview features.
4. **Modules.** These come from `GET /schools/me/modules` for staff. They are unknown for parents and the Super Admin, so the frontend defers to the backend for them.
5. **Route rules** (`APP_ROUTES`, `src/lib/rbac/routes.ts`) and **area rules** (`roleConfig`, `areaPermission`, `areaModule`, `areaPages` in `src/features/dashboard/model.ts`).
6. **Read-only.** In a closed **sample** term (`2025-3`), `can()` allows only `*:read` and `*:export`. This affects preview areas only. The backend has **no** closed-term concept: `academic_terms` has no status column, and invoices and payments can be written to any term.

### Backend default permissions per role

Source: `fastrack-backend/src/common/auth/role-permissions.matrix.ts`. A user's stored `users.permissions` replaces these defaults when it is non-empty. The Principal can edit those stored lists with `PATCH /users/:id/permissions`.

| Key | SA | PRIN | AH | TEACH | AO | SEC | PARENT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| schools:read / schools:manage | ✓/✓ | ✓/– | ✓/– | ✓/– | ✓/– | ✓/– | – |
| modules:*, school_modules:manage | ✓ | – | – | – | – | – | – |
| school_modules:read | ✓ | ✓ | ✓ | – | ✓ | ✓ | – |
| academic_years / academic_terms :read | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| academic_years / academic_terms :manage | ✓* | ✓ | ✓ | – | – | – | – |
| classes:read / classes:manage | ✓* | ✓/✓ | ✓/✓ | ✓/– | ✓/– | ✓/– | ✓/– |
| staff:read / staff:manage | ✓/✓* | ✓/✓ | ✓/✓ | – | ✓/– | ✓/– | – |
| students:read | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| students:create / update | ✓* | ✓ | ✓ | – | – | ✓ | – |
| students:delete / exit | ✓* | ✓ | ✓ | – | – | – | – |
| enrollment:read / enrollment:manage | ✓* | ✓/✓ | ✓/✓ | – | ✓/– | ✓/✓ | – |
| attendance:read / attendance:mark | ✓* | ✓/✓ | ✓/✓ | ✓/✓ | – | ✓/✓ | ✓/– |
| fee_types, fee_structures :read/manage | ✓* | ✓ | – | – | ✓ | – | – |
| invoices:read / invoices:generate | ✓* | ✓/✓ | – | – | ✓/✓ | – | ✓/– |
| payments:read / payments:collect | ✓* | ✓/✓ | – | – | ✓/✓ | – | ✓/– |
| discounts:read/manage, other_income, expenses | ✓* | ✓ | – | – | ✓ | – | – |
| subjects:read / timetable:read | ✓* | ✓ | ✓ | ✓ | – | – | ✓ (timetable) |
| analytics:read | ✓ | ✓ | ✓ | – | ✓ | – | – |
| audit_logs:read | ✓ | – | – | – | – | – | – |

\* The Super Admin passes every `PermissionsGuard` check, but most `/schools/me/*` routes do not list `SUPER_ADMIN` in `@Role`, so it uses `/super-admin/schools/:schoolId/*` instead.

### Results keys (issued by the backend since results phase 1, 24 Oct)

These were frontend-only grants until the backend's results phase 1 grant migration; they now come from the backend (`src/lib/rbac/permissions.ts`).

| Key | PRIN | AH | TEACH | AO | SEC | PARENT | SA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| grading:manage | ✓ | ✓ | – | – | – | – | – |
| marks:read / marks:enter | ✓/✓ | ✓/✓ | ✓/✓ | – | ✓ (requested)/– | ✓/– | – |
| reports:read / remark | ✓/✓ | ✓/✓ | ✓/✓ | – | ✓/– | – | – |
| reports:generate / approve | ✓/✓ | ✓/✓ | – | – | ✓ (requested)/– | – | – |

The Principal now has `grading:manage` too. The Secretary's `marks:read` and `reports:generate` follow the 18 Oct product decision and were requested from the backend on 24 Oct; the phase 1 grants gave secretaries `reports:read` only.

### Frontend-only feature grants

| Key | PRIN | AH | TEACH | AO | SEC | PARENT | SA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| budgets:read / manage | ✓/✓ | – | – | ✓/✓ | – | – | – |
| payment_plans:read / manage | ✓/✓ | – | – | ✓/✓ | – | – | – |
| enquiries:read / manage | ✓/✓ | – | – | – | ✓/✓ | – | – |
| question_bank:read / manage | ✓/✓ | ✓/✓ | ✓/✓ | – | – | – | – |
| calendar:read / manage | ✓/✓ | ✓/✓ | ✓/– | ✓/– | ✓/✓ | ✓/– | – |
| meals:read / manage | ✓/✓ | – | ✓/– | – | ✓/✓ | ✓/– | – |
| gallery:read / manage | ✓/✓ | ✓/– | ✓/– | – | ✓/✓ | ✓/– | – |
| documents:read / manage | ✓/✓ | ✓/– | ✓/✓ | ✓/– | ✓/✓ | ✓/– | – |
| messages:read / send | ✓/✓ | ✓/✓ | – | – | – | ✓/✓ | – |
| data:export | ✓ | ✓ | – | ✓ | ✓ | – | ✓ |

These keys gate preview screens only. None of them is checked by a server.

### Module gating

| Module | Frontend hides | Backend enforces (`@RequireModule`) |
| --- | --- | --- |
| `students` | `/students`, `/admissions`; areas enrollment, enquiries, admissions | Yes (students controller) |
| `fees` | `/fees`; areas finance, debts, plans | Yes (fee types, fee structures, invoices, payments) |
| `attendance` | `/attendance`; area attendance | No controller exists |
| `timetable` | area schedule | No controller exists |
| `expenses` | area budgets | No controller exists |
| `discounts` | nothing (no UI) | Yes (discounts controller) |
| `other_income`, `payroll` | nothing | No controller exists |

The frontend reads modules once, at login or on reload. If the request fails, `modules` stays `undefined` and every module-gated page is **shown** (fail-open), leaving the backend to refuse it. Parents never load modules.

---

## Per role

Legend for actions: **Live** calls the backend; *Preview* changes browser memory only.

### SUPER_ADMIN: Fastrack platform operator

- **Landing page:** `/school-admin/platform`.
- **Sidebar:** none; the console has its own top bar (Refresh, user, Sign out) and no AppShell.
- **Routes:** `/school-admin/platform` and `/school-admin/platform/schools/:id`. Every other `/school-admin/*` route redirects to the platform page.
- **Actions:**

  | Page | Action | Gate (frontend) | Backend |
  | --- | --- | --- | --- |
  | Platform | View analytics, schools (first 50), module catalogue | route `schools:manage` | `GET /super-admin/analytics/overview` (analytics:read), `GET /super-admin/schools` (schools:read), `GET /super-admin/modules` (modules:read) |
  | Platform | Provision school | route only | `POST /super-admin/schools` (schools:manage) |
  | Platform | Activate or deactivate school | route only | `PATCH /super-admin/schools/:id/activate\|deactivate` (schools:manage) |
  | Platform, school detail | Toggle module | route only | `POST /super-admin/modules/schools/:id/toggle` (school_modules:manage) |
  | School detail | Edit profile | route only | `PATCH /super-admin/schools/:id` |
  | School detail | List students (20 per page, search) and staff (teachers only, up to 100) | route only | `GET /super-admin/schools/:id/students\|staff` |
  | — | **Assign the school's Principal** | no UI | `POST /super-admin/schools/:id/school-head` exists |

- **Feature grants:** `data:export`, which no Super Admin page uses.
- **Module gating:** not applicable.
- **Closed term:** not applicable.

### PRINCIPAL

- **Landing page:** `/school-admin/dashboard` (preview Overview).
- **Sidebar, in role order after Overview:**
  - Fees & Billing (live)
  - Students (live)
  - Attendance (preview page)
  - Faculty & workload\*
  - Academic performance\*
  - Reports & results\*
  - Communication\*
  - Budgets & expenses\*
  - Payment plans\*
  - Online admissions\*
  - Enquiries\*
  - Staff (live)
  - Weekly meal menu\*
  - Photo gallery\*
  - School calendar\*
  - Documents & archive\*
  - Question bank\*

  \* = preview at `/dashboard/<area>`.
- **Routes:** dashboard, students, attendance, fees, staff, admissions.
- **Live actions:**

  | Page | Action | Permission |
  | --- | --- | --- |
  | Students | Admit New Student | `students:create` |
  | Fees | Record Payment, receipt | `payments:collect` |
  | Fees | Generate Term Invoices | `invoices:generate` |
  | Fees | Payments tab | `payments:read` |
  | Fees | Fee Structures tab (read-only) | `fee_structures:read` |
  | Fees | Invoice breakdown, copy parent link | route (`invoices:read`) |
  | Staff | Invite user, resend, revoke, see invitations | `staff:manage` |
  | Attendance | Change marks (no save) | `attendance:mark` |

- **Preview actions:** export CSV (`data:export`), compose message (`messages:send`), budgets, payment plans, enquiries, calendar, meals, gallery, documents, question bank and reports (feature keys).
- **Allowed by the backend but missing from the UI:**
  - edit, promote and exit students; link parents
  - manage fee types and fee structures; discounts; modify invoices (Principal-only); broadcast invoice links
  - academic year, term and class setup; departments
  - edit the school profile and logo
  - change staff permissions; deactivate users
  - change password
- **Closed term:** applies to preview areas only.

### ACADEMIC_HEAD

- **Landing page:** `/school-admin/dashboard`.
- **Sidebar:**
  - Academic performance\*
  - Faculty & workload\*
  - Staff (live)
  - Attendance (preview page)
  - Reports & results\*
  - Students (live)
  - Photo gallery\*
  - School calendar\*
  - Documents & archive\*
  - Question bank\*
  - Communication\*
  - Timetable\*
  - Grading configuration\*
- **Routes:** dashboard, students, attendance, staff, admissions. Admissions is reachable by URL only (`enrollment:manage`); it is not in the role layout.
- **Live actions:**
  - Admit New Student (`students:create`)
  - Invite, resend and revoke staff (`staff:manage`). The invite role list offers Academic Head, Teacher, **Account Officer** and Secretary, and `POST /users` accepts them all, so an Academic Head can create finance users.
  - Attendance marks (`attendance:mark`, no save)
- **Feature grants used:** marks, grading:manage, reports, question bank, calendar:manage, messages:send, data:export.
- **Not available:** Fees (no `invoices:read`), which matches the backend.

### TEACHER

- **Landing page:** `/school-admin/dashboard`.
- **Sidebar:**
  - Attendance (preview page)
  - Gradebook\*
  - Timetable\*
  - Academic performance\*
  - Weekly meal menu\*
  - Photo gallery\*
  - School calendar\*
  - Documents & archive\*
  - Question bank\*
- **Routes:** dashboard, attendance, and **students by URL** (`students:read`; not in the sidebar).
- **Live actions:** none besides viewing. On `/students` a Teacher sees the **whole school's** students, guardian contacts and national IDs: the backend list is not scoped to assigned classes, and teacher assignment is not implemented. The frontend's "assigned_classes" data scope applies only to sample data (the sample class "Primary 2").
- **Preview:** gradebook entry (`marks:enter`), question bank management, documents upload.

### ACCOUNT_OFFICER

- **Landing page:** `/school-admin/dashboard`.
- **Sidebar:**
  - Fees & Billing (live; finance and debts merged)
  - Budgets & expenses\*
  - Students (live, read-only)
  - Payment plans\*
  - School calendar\*
  - Documents & archive\*
- **Routes:** dashboard, students, fees, and staff (by URL; `staff:read`).
- **Live actions:** Record Payment (`payments:collect`), Generate Term Invoices (`invoices:generate`), Payments tab, Fee Structures tab. No admit button (no `students:create`).
- **Allowed by the backend but missing from the UI:** fee type and structure management, discounts, other income, expenses, optional-fee preferences, invoice link broadcast, async generation.

### SECRETARY

- **Landing page:** `/school-admin/dashboard`.
- **Sidebar:**
  - Students (live)
  - Enquiries\*
  - Online admissions\*
  - Staff (live, read-only)
  - Reports & results\*
  - Weekly meal menu\*
  - Photo gallery\*
  - School calendar\*
  - Documents & archive\*
- **Routes:** dashboard, students, admissions, staff, and attendance (by URL only; `attendance:read` but not in the layout).
- **Live actions:** Admit New Student (`students:create`). Staff page is read-only (no `staff:manage`). Attendance marks on the preview page.
- **Preview:** enquiries (create, edit, enrol), calendar, meals, gallery and documents management, report generation, export.

### PARENT

- **Landing page:** `/school-admin/dashboard`.
- **Sidebar ("My family"):**
  - My children
  - Fees & revenue
  - Attendance
  - Reports & results
  - Communication
  - Timetable
  - Weekly meal menu
  - Photo gallery
  - School calendar
  - Documents & archive

  These areas now only exist in the old staff dashboard model. Parents can no longer reach that dashboard.
- **Routes:** the parent portal only (`/parent/*`; see [Parent portal](./user-flows/parent-experience.md)). Landing is `/parent`; `/school-admin/*` is denied.

  | Route | Needs |
  | --- | --- |
  | `parentHome`, `parentMore` | audience only |
  | `parentWards` | `students:read` |
  | `parentFees` | `invoices:read` |
  | `parentReceipts` | `payments:read` |
  | `parentAttendance` | `attendance:read` |
  | `parentReports` | `marks:read` (from the backend since results phase 1) |

- **Live actions:** register, link a child (code plus OTP) and unlink. Online payment needs the frontend grant `payments:make` (PARENT only) and the proposed checkout endpoint.
- **Backend reality:**
  - Parents hold `invoices:read` and `payments:read`, but `/schools/me/*` returns 403 for them, because `schoolId` is null.
  - The portal therefore uses ward-scoped routes, `/parents/me/wards/:studentId/*`. Only list, link and unlink exist today. The rest is proposed in [docs/api/parent-portal.md](./api/parent-portal.md).
- **Module gating:** in the backend, against the ward's school (proposed). The frontend doesn't know a parent's modules.

---

## Frontend vs backend gating mismatches

| # | Direction | Detail |
| --- | --- | --- |
| 1 | Frontend shows, backend ignores | "Deactivate School" reports success, but the backend never checks `schools.is_active`. Users of a suspended school keep logging in and working. |
| 2 | Frontend shows, backend 404 | The parent portal's fees, reports, attendance and ward-profile screens call proposed `/parents/me/wards/:id/*` endpoints that don't exist yet. They show "This is not available yet…". |
| 3 | Frontend hides, backend allows | Student edit, promote, exit and parent links; fee types and structures; discounts; invoice modify and broadcast; school profile; academic setup (years, terms, classes, departments); permissions and deactivation; change password; assign Principal (Super Admin); ~~parent self-registration and ward linking~~ (now in the parent portal). |
| 4 | Frontend allows, backend allows, but questionable | Teacher can read every student in the school (backend not scoped). Academic Head can invite Account Officers. |
| 5 | Inconsistent menus | Secretary and Academic Head can open `/attendance` or `/admissions` by URL although their sidebars omit them. Teacher can open `/students` by URL only. |
| 6 | Read-only terms | The frontend enforces read-only only for the sample archived term. The backend has no closed-term state, and live pages have no term awareness beyond "current". |
| 7 | Permission drift | `permissions.ts` lacks `school_profile:manage` and `student_fee_preferences:manage`. `scripts/check-dashboard.cjs` keeps its own copy of the backend matrix. Stored per-user permission lists override role defaults on the server, but the frontend uses whatever it cached at login until the user logs in again. |
