# School workspace: structure and integration

Every school user (staff and parents) signs in and lands on `/school-admin/dashboard`. Pages are guarded by the access rules in `src/lib/rbac`; the backend repeats every check, and the frontend guards exist so users never see what they cannot use.

## Routes

| Route                            | Rendered by                                      | Data                 |
| -------------------------------- | ------------------------------------------------ | -------------------- |
| `(app)/layout.tsx`               | `RouteGuard`: session and route rule required    | —                    |
| `(app)/(school)/layout.tsx`      | `AppShell`: one sidebar and header for all pages | Live session, school |
| `/school-admin/dashboard`        | `Overview`                                       | Sample (UI preview)  |
| `/school-admin/dashboard/<area>` | `AreaView`                                       | Sample (UI preview)  |
| `/school-admin/students`         | Students page                                    | Live API             |
| `/school-admin/fees`             | Fees & Billing page                              | Live API             |
| `/school-admin/attendance`       | Attendance page                                  | Sample (UI preview)  |
| `/school-admin/staff`            | Staff page: directory and invitations            | Live API             |
| `/school-admin/admissions`       | `AdmissionPortal` (applicant-facing preview)     | Sample (UI preview)  |
| `/school-admin/platform/...`     | Super Admin console (own layout)                 | Live API             |

A page under `(app)` must be registered in `APP_ROUTES` (`src/lib/rbac/routes.ts`) or it is denied to everyone.

## Access model

- **Roles** come from the backend: `SUPER_ADMIN`, `PRINCIPAL`, `ACADEMIC_HEAD`, `TEACHER`, `ACCOUNT_OFFICER`, `SECRETARY`, `PARENT` (`src/lib/rbac/roles.ts`). A session with any other role is rejected at sign-in.
- **Permissions** are the `resource:action` keys the backend issues with the user (`permissions.ts`). Preview features the backend does not cover yet use frontend keys granted per role (`feature-permissions.ts`); move a key to `permissions.ts` once the backend issues it.
- **Tenancy**: staff sessions without a `schoolId` are denied, and the school profile must match the session's school.
- **Navigation** (`src/features/workspace/navigation.ts`): the role's area layout (`roleConfig` in `model.ts`), filtered by permission. Areas with a live page (`areaPages` in `model.ts`: fees, debts → Fees & Billing; enrollment → Students; attendance → Attendance; staffing → Staff) open that page for staff and are hidden when the page is not permitted. Parents keep the preview for their own children.
- **Actions** check `can(permission)`, never a role name.
- **Modules**: the school's enabled modules (`GET /schools/me/modules`) load with the session; a disabled module hides its pages (`module` on the route rule) and areas (`areaModule` in `model.ts`). Parents don't receive the module list, so for them the backend decides.
- **Closed terms**: in an archived term the workspace's `actor` is read-only, and `can()` then allows only `read` and `export` keys. Use `actor` for every action and `viewer` for deciding which areas open.

## Preview workspace

- `WorkspaceProvider` (mounted by `dashboard/layout.tsx`) holds the sample term, selected child, loaded data and the phase-one store, so they survive moving between dashboard routes.
- `fixtures.ts` is the preview `DashboardRepository`: asynchronous, abortable, and returns panels only for the viewer's preview areas. The archived term returns empty tables.
- `phase-one/` holds the richer preview workspaces (budgets, payment plans, enquiries, calendar, meals, gallery, archive, question bank, timetable, grading, reports). See its [README](./phase-one/README.md).
- `Workflow.tsx` is the only summary-panel action today: composing a message.

To connect an area to the backend, give it a live page and add it to `areaPages`, or replace the repository behind it. Keep backend IDs and numeric money (integer pesewas) in DTOs; never parse formatted table cells.

## Not yet connected

- Overview metrics and every preview area use sample data, filtered in the browser by the viewer's data scope. The backend should return only the viewer's school, classes or children.
- Attendance, enquiries, online admissions, budgets, payment plans and academics have no backend endpoints yet.
- Teacher scope is a sample class ("Primary 2") until teacher assignments come from the backend.

## Checks

`pnpm test:dashboard` covers fee calculations, scheduling, grading, data scoping, route rules per role, session parsing and navigation. `pnpm exec tsc --noEmit` checks types.
