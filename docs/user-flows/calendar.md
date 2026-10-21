# Flow: School calendar (staff)

Code: `src/features/calendar/*` (`CalendarPage.tsx` orchestrates; `EventModal.tsx` is the add/edit form; `MonthGrid.tsx` draws the month; `dates.ts` does date arithmetic; `api.ts` holds every call). Route: `/school-admin/calendar` (`src/app/school-admin/(app)/(school)/calendar/page.tsx`).

**Status: Live** for school staff (commit `2fca758`). Parents still get the sample-data preview at `/school-admin/dashboard/calendar` until their ward calendar page is built. The backend's `GET /parents/me/wards/:studentId/calendar` already exists.

> **Snapshot note (21 Oct 2026):** this page describes the **working tree**. `CalendarPage.tsx`, `api.ts`, `src/lib/rbac/permissions.ts` and `src/lib/rbac/routes.ts` have uncommitted changes:
>
> - Load failures now show a red Alert with "Try again". In `2fca758` they showed a toast, and the page then looked like an empty calendar.
> - Classes are now fetched page by page through `setupApi.allClasses()`. In `2fca758` it was one `GET /schools/me/classes`, which returns only the default 10.
> - The RBAC diffs add unrelated permissions and routes (`school_profile:manage`, service requests, setup, account). The calendar's own permission entries were already committed in `2fca758`.
>
> The backend was checked against `fastrack-space/fastrack-backend` on branch `fix/invoice-run-class-label`. That branch contains `c6227a5 feat(calendar)` (from `feat/school-calendar`, also on `main`) and the `GrantCalendarPermissions1792600000100` migration.

**Who:**
- Viewing needs `calendar:read`, and the route allows the `staff` audience only (`src/lib/rbac/routes.ts:71-75`). No module is required on either side.
  - The backend grants `calendar:read` to Principal, Academic Head, Secretary, Account Officer, Teacher and Parent (`role-permissions.matrix.ts`; migration `1792600000100` backfills stored users).
  - The staff endpoints also need `@Role(PRINCIPAL, ACADEMIC_HEAD, TEACHER, ACCOUNT_OFFICER, SECRETARY)`. Super Admin is excluded on both sides.
- Add, edit and remove need `calendar:manage`: Principal, Academic Head and Secretary. The backend additionally requires `@Role(PRINCIPAL, ACADEMIC_HEAD, SECRETARY)`.
- Without `calendar:manage` the page is read-only. There is no Add button, day numbers are not clickable, chips are plain text, and the list has no Edit or Remove buttons.

## Backend endpoints

All of these exist in the backend checked above.

| UI | Call | Notes |
| --- | --- | --- |
| Term picker | `GET /schools/me/academic-years`, then `GET /schools/me/academic-years/:id/terms` for each year | No `limit` is sent, so the backend default of **10** applies to both: at most 10 years (`yearLabel DESC`) and 10 terms per year (`termSequence ASC`) |
| Default term | `GET /schools/me/academic-terms/current` | A 404 is treated as "no current term", and the page falls back to the first listed term |
| Class picker | `GET /schools/me/classes?page=N&limit=100` until `meta.hasNext` is false | All classes |
| Events | `GET /schools/me/calendar/events?termId&classId?` | Not paginated. Sorted by `startDate`, then `startTime` (all-day first), then `title`. With a `classId`, returns every non-CLASS event plus that class's own events |
| Stat cards | `GET /schools/me/calendar/school-days?termId&classId?` | `{weekdays, closedDays, schoolDays}`. Counts only ACTIVE `HOLIDAY` and `MID_TERM_BREAK` closures; class closures count only when that class is chosen |
| Add | `POST /schools/me/calendar/events` | Null fields are left out of the body |
| Edit | `PATCH /schools/me/calendar/events/:id` | Sends the whole form. `null` clears the times (making the event all-day), the location, the description and the class |
| Remove | `DELETE /schools/me/calendar/events/:id` | Soft delete |
| (unused) | `GET /schools/me/calendar/events/:id`; `type` and `status` filters on the list | |

## Diagram

```mermaid
sequenceDiagram
  actor U as Staff (calendar:read)
  participant C as CalendarPage
  participant API as Backend
  par setup
    C->>API: GET academic-years (+ terms per year)
    C->>API: GET academic-terms/current (404 -> null)
    C->>API: GET classes (all pages)
  end
  alt any setup call fails
    C->>U: red Alert "Unable to load the calendar" + Try again
  else no terms
    C->>U: "This school has no academic terms yet…"
  else
    C->>C: term = current ?? first; month = today's month if inside term, else first month
    par
      C->>API: GET calendar/events?termId&classId
      C->>API: GET calendar/school-days?termId&classId
    end
    alt fails
      C->>U: red Alert + Try again
    else
      C->>U: 3 stat cards + Month grid (or List)
    end
  end
  U->>C: change term / class -> refetch both (no stale-response guard)
  U->>C: prev / next month -> client-only, limited to the term's months
  opt calendar:manage
    U->>C: Add event / click a day / click a chip / list Edit
    C->>U: EventModal (client checks; errors as a red "Check the form" toast)
    C->>API: POST or PATCH
    alt 4xx
      C->>U: red toast "Could not save the event: <msg>" (modal stays open)
    else ok
      C->>U: green toast, modal closes, refetch
    end
    U->>C: list Remove -> confirm modal "Remove this event?"
    C->>API: DELETE
    C->>U: toast "Event removed" + refetch, or a red toast (confirm modal stays open)
  end
```

## States

| State | UI |
| --- | --- |
| Loading | A loader inside the calendar card. The term, class and view controls stay visible. The stat cards show "—" on first load, then **the previous values** while a new term or class loads |
| No terms | Card: "This school has no academic terms yet. Once a term is set up, its calendar appears here." |
| No events | List view: "No events in this term yet." The month view simply shows empty days |
| Error | A red Alert replaces the whole body. "Try again" re-runs setup when no terms loaded, otherwise the event and school-day load |
| Saving | The Save button shows `loading` and Cancel is disabled. The modal's X and Esc still close it, and the save then finishes in the background |
| Removing | "Remove event" shows `loading` and "Keep it" is disabled |
| Postponed or cancelled | Still shown. A status badge appears in the list. Cancelled events are faded and struck through. Neither counts towards closures |
| Narrow screens | The month grid has `min-width: 700px` inside a horizontal scroller (`MonthGrid.module.css:1-9`). The term and class selects are fixed at 260px and 220px and wrap |

## Validation

| Rule | Client (`EventModal.tsx:83-93`) | Server (`calendar.service.ts:243-288`, DTOs) |
| --- | --- | --- |
| Title | Non-blank, maxLength 150 | `IsNotEmpty`, ≤150, trimmed |
| Dates | Both set; end ≥ start; inside the term (`min`/`max` on the inputs as well) | `YYYY-MM-DD` strict; end ≥ start; inside the term |
| Times | All-day switch; otherwise both are needed and end > start | Both or neither; `HH:MM` 24-hour; end > start (also on multi-day events) |
| Closures (holiday, mid-term) | Audience limited to Whole school / One class; forced to all-day (switch disabled) | Audience must be `WHOLE_SCHOOL` or `CLASS`. **All-day is not enforced** |
| Class | Required when the audience is One class; cleared otherwise | Required for CLASS and refused for other audiences; must belong to the school |
| Description and location | ≤2000 and ≤150 | Same |
| Status | Only on edit (Active / Postponed / Cancelled) | Enum; defaults to ACTIVE |

**Dates and time zones:** dates are plain strings, and all arithmetic in `dates.ts` is done in UTC, so a browser outside Ghana does not shift a day. "Today" is the UTC date (`dates.ts:65`), which is correct for Accra (UTC+0, no daylight saving). Month and year ends, plus leap years, are covered by `scripts/check-dashboard.cjs`.

## Known gaps

See `docs/qa/findings.md`.

- **QA-058 (calendar can't be opened) appears fixed in code, not yet re-tested in a browser.** The frontend lists `calendar:read` and `calendar:manage` in `PERMISSIONS`. The backend matrix grants them, and migration `1792600000100` backfills stored users. Existing sessions must sign in again (or refresh their token) to pick up the new permission.
- Switching term or class quickly has no stale-response guard (`CalendarPage.tsx:90-110`). An older response can overwrite a newer one.
- Events can be added, edited and removed in **past terms**. Closures there change school-day counts and attendance totals after the fact (`attendance-days.ts` uses the same closures).
- An overnight or multi-day timed event (e.g. 18:00 Friday to 08:00 Saturday) is rejected, because end time must be later than start time even across different days.
- In the month grid, "+N more" is not clickable. The 4th and later events on a day can only be opened from the List view.
- Removing an event that someone else already removed returns 404 ("Calendar event not found"). The confirm modal stays open and the list is not refreshed.
- The List view groups events by the month they start in, so a closure from 30 Mar to 3 Apr appears under March only.
- Only 10 academic years and 10 terms per year are listed. If the current term falls outside that set, the page shows a loader forever.
- The Add/Edit buttons follow `calendar:manage`, but the backend also requires the role to be Principal, Academic Head or Secretary. A Teacher or Account Officer given `calendar:manage` as a custom permission sees the buttons and gets 403.
