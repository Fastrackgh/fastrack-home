# Flow: Overview dashboard (staff)

Code: `src/features/dashboard/Overview.tsx` (the page) and `OverviewTiles.tsx` (the figures and the calls behind them). Route: `/school-admin/dashboard`.

**Status: Live** (26 Oct 2026, QA-034). The Overview shows only real figures. A tile is left out when the school's module is off or the viewer may not read it; it never shows a sample or a false zero. The preview areas under `/school-admin/dashboard/[area]` still run on sample data and keep their own notice.

## Tiles

Each tile loads on its own call, so one failure doesn't hide the others. The current term comes from `GET /schools/me/academic-terms/current`, and its label is shown in the subtitle.

| Tile | Shown when | Call | Notes |
|---|---|---|---|
| Active pupils / My pupils | `students` module and `students:read` | `GET /schools/me/students?status=Active&limit=1` (`meta.total`) | Teachers get the pupils of the classes they teach (QA-016 scoping). |
| Fees collected, Outstanding fees | `fees` module, `invoices:read` and a current term | `GET /schools/me/invoices/summary?termId=` | With no bills for the term, one tile reads "No bills yet". The backend allows only Principal and Account Officer. |
| Present today (school-wide) | `attendance` module and `attendance:read` | `GET /schools/me/attendance/register?classId&date` for every class | Present counts present, late and half day, out of the pupils marked so far, with "x of y registers taken". A closed day shows "No school" and the reason. |
| {Class} register (teacher) | the same, for a teacher with a homeroom class | the homeroom's register for today | Before marking is finished: "x/y marked" or "Not taken yet". After: present out of the class. Teachers without a homeroom get no tile. |
| Mark sheets submitted | `results` module, `marks:enter` and a current term | `GET /schools/me/mark-sheets?termId&mine=` | Teachers see only their own sheets (`mine=true`). The gate matches the Mark sheets page, since the backend refuses the list to Secretary. |

**Failure:** a failed tile shows "Couldn't load {figure}", the backend's message and a Retry button (QA-039: never GHS 0).

**Below the tiles:** the phase-one shortcuts, and the role's featured areas that open a live page.

## Removed (sample only)

- the revenue/expense and class-performance charts;
- "Your focus today" and "Students needing support";
- the teacher's sample timetable;
- "Expenses this term" (no expenses API yet);
- the sample record tables;
- the sample term picker;
- the PREVIEW banner.

## Not covered yet

- The school-wide attendance tile makes one register call per class. A day-summary endpoint would make it one call.
- There are no expenses, timetable or performance figures until those features have APIs.
