# Results and term reports: API contract

**Status (24 Oct 2026): design agreed with the product owner. Phase 0 subject routes agreed with the backend session (below); nothing built on the backend yet. The frontend Subjects tab is built against them.**
- The frontend builds against this contract.
- The calculation's worked answers are in [`results-fixtures.json`](./results-fixtures.json). `src/features/results/engine.ts` passes them (`node scripts/check-dashboard.cjs`). The backend engine must pass them too.
- The full design, with the reasons behind it, is in the approved plan. The user-facing flow will go in `docs/user-flows/results-and-reports.md` once screens exist.

Conventions follow the rest of the API:
- `X-Api-Contract: 2` envelope.
- Staff routes under `/api/schools/me`.
- Uuid ids.
- Scores as JSON numbers with at most 2 decimal places, stored as `decimal(6,2)`.

## Rules the product owner set

1. **Subjects are standing per class.**
   - A class's subject list carries through every term and into later years until someone changes it. It is not set up per term.
   - English and Mathematics are each one catalogue subject, offered by every class from P1 to JHS 3.
2. **A pupil's subjects are their current class's subjects.**
   - There is no per-pupil subject list, and no new enrolment record per term or after a mid-term.
   - When a pupil moves class or is promoted, the new class's subjects become theirs.
   - A pupil who doesn't sit a subject is marked *exempt* on the marks.
3. **Who enters marks:**
   - the subject's assigned teacher(s);
   - **any teacher, when no teacher is assigned to that class's subject**;
   - heads, always (audited).
4. **Remarks and approval.** The class teacher writes the remarks. A head approves before parents see anything.
5. **Positions.** Each school chooses: shown, hidden, or staff only. Staff-only positions are removed **on the server** from parent responses and documents.
6. **Descriptors.** Descriptor assessment (e.g. Emerging / Developing / Secure) works from day one, alongside marks.

## Module and permissions

- New school module **`results`**. Results routes use `@RequireModule('results')`. Parent routes use `WardAccessService.resolve(studentId, 'results')`.
- Subject routes need no module, because the timetable uses subjects too.

| Permission | Principal | Academic Head | Teacher | Secretary | Parent |
| --- | --- | --- | --- | --- | --- |
| `subjects:read` / `subjects:manage` (exist) | ✓ / ✓ | ✓ / ✓ | ✓ / – | – | – |
| `grading:manage` | ✓ | ✓ | – | – | – |
| `marks:read` | ✓ | ✓ | ✓ | – | ✓ (own children, via parent routes) |
| `marks:enter` | ✓ | ✓ | ✓ | – | – |
| `reports:read` | ✓ | ✓ | ✓ | ✓ | – |
| `reports:remark` | ✓ | ✓ | ✓ (own homeroom class only) | – | – |
| `reports:generate` | ✓ | ✓ | – | – | – |
| `reports:approve` | ✓ | ✓ | – | – | – |

- **Grant migration.** Stored permissions override role defaults, so the new keys need a grant migration, following `1792600000100-GrantCalendarPermissions.ts`.
- **Frontend keys.** The frontend already uses `marks:read`, `marks:enter`, `grading:manage` and `reports:generate` as frontend-only keys (`src/lib/rbac/feature-permissions.ts`). They move to `permissions.ts` once the backend issues them.

## Calculation

The definitions behind every number on a report. The fixture file has a worked case for each rule.

- **Notation:**
  - component *c* has weight *w_c*, and a scheme's weights total exactly 100;
  - item *i* scores *r_i* out of *m_i*;
  - *D* = `scoreDecimals`;
  - **R** = round half away from zero, after dropping binary noise at 12 significant digits. Not `roundCurrency`: 79.49999999999999 must round to 80.
1. **Items → component.**
   - Each item counts as *f_i = r_i / m_i*.
   - *Absent* counts as 0, or is skipped when `absentCountsAsZero` is false. *Exempt* is skipped.
   - Keep the best `bestOf` (all of them if there are fewer), then take the **average of the fractions**, so every test counts equally whatever it was marked out of.
   - Printed component score: *s_c = R(p_c × w_c, D)*.
2. **Subject total.**
   - All components counted: *T = R(Σ s_c, D)*. The printed parts always add up to the printed total.
   - Exemptions leave weight *W < 100*:
     - if *W < `minCountedWeight`*, the status is `incomplete`: no total, no grade, not averaged or ranked;
     - otherwise *T = R(Σ p_c·w_c × 100 / W, D)*, with `reweighted: true`.
   - Every component exempt: status `exempt`.
   - Any item without a mark, or a component with no items: status `missing`, which blocks submitting the sheet.
3. **Grade.**
   - The highest band whose `minScore` the **printed** total reaches. The lower bound is inclusive.
   - The lowest band starts at 0, so there are no gaps.
   - At D = 0, 79.5 prints as 80 and is an A when A starts at 80. At D = 1 it stays 79.5, a B.
4. **Average and total.**
   - Count subjects with a numeric result and `countsInAverage`; with `averageBasis: core_only`, core subjects only.
   - Average = *R(ΣT / n, averageDecimals)*. Total = ΣT out of 100·n.
   - With no subjects counted there is no average and no rank.
5. **Aggregate** (BECE / WASSCE style, lower is better, optional):
   - Add the points of the `core` subjects, then the lowest `bestOtherCount` points from the `pool` subjects.
   - A core subject without points, or too few pool subjects, gives `null`.
6. **Positions.**
   - Competition ranking (1, 2, 2, 4) on the printed value, with no tie-breaks.
   - Rank by `average`, `total` or `aggregate` (ascending).
   - A pupil is ranked only with results in at least `minSubjectsForRankingPct`% of the class's assessed subjects.
   - "Number on roll" counts everyone in the class for the term, ranked or not.
   - Subject positions rank among the class's pupils with a result in that subject.
7. **Freezing.**
   - A mark sheet keeps the scheme and scale versions it was created with.
   - A published report is a snapshot. Corrections go through reopen and republish, which makes a new revision.

## Data the backend stores

All tables have `school_id`, a uuid primary key and timestamps.

| Table | Key columns | Notes |
| --- | --- | --- |
| `subjects` (existing) | `subject_code`, `subject_name`, + `short_name`, `category`, `is_active` | Becomes the school-wide catalogue. `class_id` is retired: migrate existing rows to `class_subjects`, merge duplicate names, and repoint `staff_subjects`, `timetable_slots.subject_id` and `users.primary_subject_id`. |
| `class_subjects` | `class_id`, `subject_id`, `sequence_order`, `report_label?`, `counts_in_average`, `aggregate_role` (none/core/pool), `is_active` | Unique on (class, subject). **No term or year column.** |
| `subject_teacher_assignments` | `class_id`, `subject_id`, `staff_id`, `assigned_at`, `ended_at?` | Standing; ended rows keep the history. |
| `assessment_schemes` / `assessment_components` | scheme: `mode` (numeric/descriptor), `family_id`, `version`; component: `key`, `label`, `short_label`, `weight`, `default_max_raw`, `entry` (single/items), `best_of?`, `report_group` (continuous/exam) | A version in use is never edited; saving creates a new version. |
| `grading_scales` / `grade_bands` | band: `label`, `remark`, `min_score?`, `points?`, `is_pass`, `description?` | Versioned the same way. Descriptor scales have no `min_score`. |
| `results_policy_assignments` | `academic_year_id`, scope school / department / class / class+subject, scheme family, scale family | The most specific scope wins; the school-level row always exists. |
| `assessment_sheets` | `term_id`, `class_id`, `subject_id`, frozen `scheme_id` and `grading_scale_id`, `status` (draft/submitted/approved), `not_assessed`, `row_version` | One per term, class and subject. Created the first time it is opened. |
| `assessment_sheet_items` | `sheet_id`, `component_key`, `item_index`, `label`, `max_raw`, `taken_on?` | Teachers add class tests as the term goes. |
| `assessment_marks` | `term_id`, `school_student_id`, `subject_id`, `component_key`, `item_index`, `status` (scored/absent/exempt), `raw_score?`, `descriptor_band_id?`, `entered_by` | Unique on the pupil, not the sheet, so marks follow a pupil who moves class. |
| `report_batches` | `term_id`, `class_id`, `status` (open/in_review/approved/published/reopened), `policy_snapshot` | |
| `term_reports` / `term_report_revisions` | remarks, conduct/attitude/interest, `promotion?`, `status` (incl. `withheld`), `snapshot_data`, `published_revision` | Parents see the latest published revision. |
| `remark_bank` | `kind`, `text`, `min_average?`, `max_average?` | |
| `results_settings` | the settings in the fixtures' `defaults.settings`, plus class/subject position visibility (show/hide/staff_only) | One row per school. |

## Endpoints

All are under `/api/schools/me` unless marked as a parent route.

### Subjects (`subjects:read` / `subjects:manage`)

| Method & path | Body / query | Returns |
| --- | --- | --- |
| `GET /subjects` | `?search&includeInactive`; a plain v2 array, not paged | `[{id, subjectCode, subjectName, shortName, category, isActive, classCount}]` |
| `POST /subjects`, `PATCH /subjects/:id` | `{subjectCode, subjectName, shortName?, category?}` (PATCH also `isActive`) | the subject. `subjectCode` is trimmed and upper-cased, 2–20 letters, digits or hyphens. `category` is free text, at most 50 characters. Code and name are unique per school, ignoring case: 409 on a clash. |
| `DELETE /subjects/:id` | | 409 if any class or mark uses it; deactivate instead. |
| `GET /classes/:classId/subjects` | | `[{subjectId, subjectName, sequenceOrder, reportLabel, countsInAverage, aggregateRole, teachers: [{staffId, name}]}]` |
| `PUT /classes/:classId/subjects` | the full list, in that shape (`teacherIds` instead of `teachers`) | the saved list. A subject left out is removed from the class, or kept inactive if it already has marks. `teacherIds` must be active staff of the school, of any role (heads teach too). |
| `POST /class-subjects/apply` | `{subjectIds, classIds?, departmentId?}` | `{added, alreadyThere}`, e.g. English for every class in Lower Primary. |
| `GET /teaching-assignments` | `?staffId=me`; heads may pass another staff id | `[{classId, className, subjectId, subjectName}]` |

### Grading setup (`grading:manage`; GETs also allowed with `marks:read`)

- `GET /results-presets` returns the presets, each with its scheme, scale, settings and suggested subjects:
  - `ges_basic_30_70`, `ges_standards_based`, `bece_jhs`, `waec_shs`, `cambridge_style`, `montessori_descriptors`, `early_years_descriptors`.
- `POST /results-setup/apply` with `{departments: [{departmentId, presetKey, overrides?}], settings?, subjects?}` applies them in one transaction.
- Schemes:
  - `GET /assessment-schemes` and `POST /assessment-schemes`.
  - `GET /assessment-schemes/:id` and `PUT /assessment-schemes/:id`. The PUT returns `{scheme, newVersion}`.
  - Errors: 400 if the weights don't total 100; 409 on duplicate component keys.
- Scales:
  - `GET /grading-scales`, `POST /grading-scales`, `GET /grading-scales/:id` and `PUT /grading-scales/:id`.
  - Errors: 400 if no band starts at 0, or two bands share a minimum.
- Policy:
  - `GET /results-policy?academicYearId` returns the assignment tree.
  - `PUT /results-policy/assignments` saves assignments.
  - `GET /results-policy/resolve?termId&classId&subjectId` returns `{scheme, scale, source}`.
- `GET /results-settings` and `PATCH /results-settings`.
- `/remark-bank`: `GET`, `POST`, `PATCH` and `DELETE`.

### Mark sheets (`marks:read` / `marks:enter`; teachers limited per rule 3)

| Method & path | Notes |
| --- | --- |
| `GET /mark-sheets?termId&mine=true` | Cards: `{sheetId?, classId, className, subjectId, subjectName, status, entered, expected, anyTeacher}`. `anyTeacher` is true when nobody is assigned to the subject. |
| `GET /mark-sheets/open?termId&classId&subjectId` | Creates the sheet if needed. Returns `{sheet, scheme, scale, items, roster: [{schoolStudentId, studentCode, fullName, flags: {joinedOn?, movedFrom?}, marks, preview}]}`. `preview` is the subject result (calculation step 2). |
| `PUT /mark-sheets/:id/marks` | `{rowVersion, marks: [{schoolStudentId, componentKey, itemIndex, status, rawScore?, descriptorBandId?}]}`. Returns the changed rows with previews and the new `rowVersion`. 409 when `rowVersion` is stale; 422 when a mark is above `max_raw` or below 0. |
| `POST /mark-sheets/:id/items`, `PATCH /mark-sheets/:id/items/:itemId`, `DELETE /mark-sheets/:id/items/:itemId` | Add, rename or re-maximum a class test. Lowering a maximum below an existing mark is refused (422). |
| `POST /mark-sheets/:id/submit` | 422 with `details.missing` lists the pupils whose marks are not all entered. |
| `POST /mark-sheets/:id/return` `{reason}`, `POST /mark-sheets/:id/reopen` `{reason}` | Need `reports:approve`. |
| `PATCH /mark-sheets/:id` `{notAssessed}` | Needs `reports:approve`. Leaves the subject off this term's reports. |

### Term reports

| Method & path | Permission | Notes |
| --- | --- | --- |
| `GET /report-batches?termId` | `reports:read` | Per class: `{classId, status, sheetsSubmitted, sheetsTotal, remarksDone, pupils, blockers[]}` |
| `GET /report-batches/:termId/:classId` | `reports:read` | The pupils with average, position, status and remarks |
| `POST /report-batches/:termId/:classId/compute` | `reports:generate` | Idempotent; remarks already written are kept |
| `PUT /term-reports/:id/remarks` | `reports:remark` (head remark: `reports:approve`) | `{classTeacherRemark?, headRemark?, conduct?, attitude?, interest?, promotion?}`. The same body in bulk goes to `/report-batches/:termId/:classId/remarks`. |
| `POST /report-batches/:termId/:classId/approve`, `.../publish`, `.../reopen` `{reason}` | `reports:approve` | Approve is refused with `details.blockers` while sheets are unsubmitted |
| `POST /term-reports/:id/withhold` `{reason}`, `POST /term-reports/:id/release` | `reports:approve` | A withheld report is hidden from parents but still ranked |
| `GET /term-reports/:id/document`, `GET /report-batches/:termId/:classId/documents` | `reports:read` | `{html}` from the school's published `exam.report` design. The batch route gives the whole class in one printable document. |

### Parent routes

The routes already in [`parent-portal.md`](./parent-portal.md#reports) (`/api/parents/me/wards/:studentId/reports[/:id[/document]]`):
- **Visibility.** They return only published, non-withheld reports. Positions are removed when the school's setting is `hide` or `staff_only`.
- **New optional fields, all additive:**
  - `components[] {key, label, weight}`;
  - per subject: `status`, `componentScores[] {key, score, display}`, `descriptor`, `strands[]`;
  - `aggregate`, `revision`, `updatedAt`.

## Report document (`exam.report`), contract version 2

Additive only. The v1 fields stay filled, so published designs keep working:
- `classScore` is the sum of the `continuous` group's components.
- `examScore` is the sum of the `exam` group's.
- `scoreLabels` are worked out from the group weights.

New fields:
- `components[] {key, label, shortLabel, weight, group}`.
- Per subject: `mode`, `status` (ok/incomplete/exempt), `isCore`, `componentScores[] {key, score, display: '24' | 'ABS' | 'EX' | '—'}`, `points`, `descriptor`, `strands[] {label, descriptor}`, `classAverage`, `highest`, `lowest`, `teacherName`.
- `summary`: `overallGrade`, `aggregate`, `subjectsCounted`, `rankedCount`.
- `gradingScale[]` gains `points` and `isPass`.
- `descriptorScale[]` is added.
- `meta {revision, publishedAt, reweightNotes[]}`.

## Delivery order

| Phase | Backend | Frontend |
| --- | --- | --- |
| 0 | Subject catalogue migration, `class_subjects`, teacher assignments, subject routes | This contract and its fixtures (done); a Subjects tab in School setup |
| 1 | Engine passing the fixtures; schemes, scales, policy, settings, presets, setup apply; `results` module and permission grants | Results setup wizard |
| 2 | Mark sheets, items, marks, submit/return, teacher scoping, carry-over on a class move | My mark sheets and the mark-entry grid |
| 3 | Batches, compute, remarks, approve/publish/reopen, revisions, `exam.report` v2, documents | Reports board, class review, print |
| 4 | Parent report routes | Parent report screens on live data; `parentAreaReady.reports` turned on |
