# Results and term reports: API contract

**Status (24 Oct 2026):**
- Phase 0 (subjects) is live on the backend (`4df1e64`, `9141452`, not pushed) and in the Subjects tab, re-tested on PRM-001.
- Phase 1 (grading setup) is agreed with the backend session (confirmed at `c2a0eb5`) and the product owner (below), but not built yet.
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
7. **Grading can be set at any level** (decided 24 Oct). A scheme or scale can be set for:
   - the whole school;
   - a department;
   - one subject in every class (e.g. French on descriptors school-wide);
   - one class;
   - one subject in one class.

   The most specific setting wins. Most schools only ever set the school and department levels.
8. **A mid-term change of scheme** (decided 24 Oct) applies by itself to mark sheets that have no marks yet. Sheets with marks keep the version they started with, until a head uses "Apply latest scheme".
9. **Setup always starts from a school-wide default** (decided 24 Oct). The wizard asks for it first.
10. **A new academic year copies the previous year's grading** (decided 24 Oct), unless the school changes it for the new year.
11. **A pupil moved mid-term** (decided 24 Oct) appears only on the new class's sheet, flagged `movedFrom`, with their earlier marks carried. The old class no longer lists or counts them.
12. **Heads can change marks at any time** (decided 24 Oct), on submitted and approved sheets too, and every such change is audited. Teachers change draft sheets only. A published report changes only after reopen and republish (rule 7).
13. **A pupil who leaves mid-term stays on the term's sheets** (decided 24 Oct), flagged `leftOn`. Their marks aren't required and never block submitting, and marks already entered are kept.

## Module and permissions

- New school module **`results`**. Results routes use `@RequireModule('results')`. Parent routes use `WardAccessService.resolve(studentId, 'results')`.
- Subject routes need no module, because the timetable uses subjects too.

| Permission | Principal | Academic Head | Teacher | Secretary | Parent |
| --- | --- | --- | --- | --- | --- |
| `subjects:read` / `subjects:manage` (exist) | ✓ / ✓ | ✓ / ✓ | ✓ / – | – | – |
| `grading:manage` | ✓ | ✓ | – | – | – |
| `marks:read` | ✓ | ✓ | ✓ | ✓ (requested 24 Oct) | ✓ (own children, via parent routes) |
| `marks:enter` | ✓ | ✓ | ✓ | – | – |
| `reports:read` | ✓ | ✓ | ✓ | ✓ | – |
| `reports:remark` | ✓ | ✓ | ✓ (own homeroom class only) | – | – |
| `reports:generate` | ✓ | ✓ | – | ✓ (requested 24 Oct) | – |
| `reports:approve` | ✓ | ✓ | – | – | – |

- **Secretary:** per the product decisions of 18 Oct, secretaries generate and print terminal reports, so they need `marks:read` and `reports:generate`. The phase 1 backend grants gave them `reports:read` only; adding these was requested on 24 Oct.
- **Grant migration.** Stored permissions override role defaults, so the new keys need a grant migration, following `1792600000100-GrantCalendarPermissions.ts`.
- **Frontend keys.** All seven keys come from the backend since phase 1, in `src/lib/rbac/permissions.ts`. They are no longer frontend-only grants.

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
   - The core count is the number of the class's subjects marked `core`. A class with no `core` or `pool` subjects (a primary class, say) has no aggregate.
6. **Positions.**
   - Competition ranking (1, 2, 2, 4) on the printed value, with no tie-breaks.
   - Rank by `average`, `total` or `aggregate` (ascending).
   - With `rankBy: aggregate`, a class with no aggregate subjects is ranked **by average** instead (decided 24 Oct), so a school ranking JHS by aggregate still ranks its primary classes. The engine's `classPositions` takes `classHasAggregate` for this.
   - A pupil is ranked only with results in at least `minSubjectsForRankingPct`% of the class's assessed subjects.
   - "Number on roll" counts everyone in the class for the term, ranked or not.
   - Subject positions rank among the class's pupils with a result in that subject.
7. **Freezing.**
   - A mark sheet keeps the scheme and scale versions it was created with, except that draft sheets with no marks move to a new version automatically (rule 8).
   - A published report is a snapshot. Corrections go through reopen and republish, which makes a new revision.

## Data the backend stores

All tables have `school_id`, a uuid primary key and timestamps.

| Table | Key columns | Notes |
| --- | --- | --- |
| `subjects` (existing) | `subject_code`, `subject_name`, + `short_name`, `category`, `is_active` | Becomes the school-wide catalogue. `class_id` is retired: migrate existing rows to `class_subjects`, merge duplicate names, and repoint `staff_subjects`, `timetable_slots.subject_id` and `users.primary_subject_id`. |
| `class_subjects` | `class_id`, `subject_id`, `sequence_order`, `report_label?`, `counts_in_average`, `aggregate_role` (none/core/pool), `is_active` | Unique on (class, subject). **No term or year column.** |
| `subject_teacher_assignments` | `class_id`, `subject_id`, `staff_id`, `assigned_at`, `ended_at?` | Standing; ended rows keep the history. |
| `assessment_schemes` / `assessment_components` | scheme: `name`, `mode` (numeric/descriptor), `preset_key?`, `family_id` (the first version's id), `version`; component: `key`, `label`, `short_label`, `weight` `decimal(5,2)`, `default_max_raw`, `entry` (single/items), `best_of?`, `report_group` (continuous/exam) | One row per version, unique on (school, family_id, version); components belong to a version. See **Versions** below. |
| `grading_scales` / `grade_bands` | scale: `name`, `mode`, `preset_key?`, `family_id`, `version`; band: `label`, `remark`, `min_score?`, `points?`, `is_pass`, `description?` | Versioned the same way. A numeric scale has a `min_score` on every band, one of them 0, and no two the same. A descriptor scale has none. |
| `results_policy_assignments` | `academic_year_id`, `scope` (school / department / subject / class / class_subject), `department_id?`, `class_id?`, `subject_id?`, `scheme_family_id?`, `scale_family_id?` | A CHECK makes sure each scope fills exactly its own columns. A partial unique index allows one row per scope target per year. Null scheme or scale means "inherit". See **Which settings apply** below. |
| `assessment_sheets` | `term_id`, `class_id`, `subject_id`, frozen `scheme_id` and `grading_scale_id`, `status` (draft/submitted/approved), `not_assessed`, `row_version` | One per term, class and subject. Created the first time it is opened. |
| `assessment_sheet_items` | `sheet_id`, `component_key`, `item_index`, `label`, `max_raw`, `taken_on?` | Teachers add class tests as the term goes. |
| `assessment_marks` | `term_id`, `school_student_id`, `subject_id`, `component_key`, `item_index`, `status` (scored/absent/exempt), `raw_score?`, `max_raw`, `descriptor_band_id?`, `entered_by` | Unique on the pupil, not the sheet, so marks follow a pupil who moves class. `max_raw` is copied from the item when the mark is entered, so a carried mark keeps its fraction (another class's "Test 2" may be out of a different total). |
| `report_batches` | `term_id`, `class_id`, `status` (open/in_review/approved/published/reopened), `policy_snapshot` | |
| `term_reports` / `term_report_revisions` | remarks, conduct/attitude/interest, `promotion?`, `status` (incl. `withheld`), `snapshot_data`, `published_revision` | Parents see the latest published revision. |
| `remark_bank` | `kind`, `text`, `min_average?`, `max_average?` | |
| `results_settings` | the settings in the fixtures' `defaults.settings`, except `aggregate` is `{bestOtherCount}` or null; plus `classPositionVisibility` (default `show`) and `subjectPositionVisibility` (default `staff_only`), each show/hide/staff_only | One row per school, created with the defaults on the first GET. The aggregate's core count is the number of the class's subjects with `aggregate_role = core`, passed to the engine as `coreCount`. |

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

### Grading setup (`grading:manage`; the GETs also allow `marks:read`)

The backend adds an any-of permission decorator for the GETs, because its permission guard requires all listed permissions.

**Presets.** `GET /results-presets` returns static backend data; the backend is the source of truth.
- Keys: `ges_basic_30_70`, `ges_standards_based`, `bece_jhs`, `waec_shs`, `cambridge_style`, `montessori_descriptors`, `early_years_descriptors`.
- Each preset has this shape:

  ```ts
  { key, name, description, suggestedForDepartmentCodes: string[],
    scheme: { name, mode: 'numeric' | 'descriptor',
              components: [{ key, label, shortLabel, weight, defaultMaxRaw, entry: 'single' | 'items', bestOf: number | null, group: 'continuous' | 'exam' }] },
    scale:  { name, mode, bands: [{ label, remark, minScore: number | null, points: number | null, isPass, description: string | null }] },  // highest first
    settings: Partial<Settings>,
    subjects: [{ subjectCode, subjectName, shortName?, category? }] }
  ```

  In a descriptor scheme the components are strands: every weight is 0 and `defaultMaxRaw` is null. The "weights total 100.00" rule is for numeric schemes; a descriptor scheme must have every weight at 0, here and on the scheme routes.
- The wizard pre-picks a preset per department from `suggestedForDepartmentCodes`, e.g. PRE_SCHOOL → Montessori or early years, JHS → `bece_jhs`.

**Apply.** `POST /results-setup/apply` runs in one transaction.
- Body: `{academicYearId, defaultPresetKey, defaultOverrides?, departments?: [{departmentId, presetKey, overrides?}], settings?, subjects?: boolean}`.
- The overrides shape (all optional):

  ```ts
  { schemeName?, scaleName?,
    components?: { [componentKey]: { label?, shortLabel?, weight?, bestOf? } },  // matched by key
    bands?: [{ index, label?, remark?, minScore?, points?, isPass? }] }          // index = position in the preset's bands
  ```

  The frontend sends only what the school changed, and leaves out departments that use the school's preset. Because the preset's name would describe the old numbers, it names an edited copy itself: `schemeName` like "Class score 40 / Exam 60" when weights change, and `scaleName` like "GES A–F (edited)" when bands change.
- `defaultPresetKey` is required: it becomes the school row (rule 9).
- **Families.** Apply creates school-owned copies tagged with `preset_key`. For the default and each department, the backend works out the content (the preset plus its overrides). It reuses a school family whose latest version has the same `preset_key` and identical content; otherwise it creates one.
  - The rule is the same within one call and across calls. So the default and departments with identical overrides share one family, and a re-run reuses it.
  - An edited copy without `schemeName` or `scaleName` is named after its content (backend QA-256, matching the wizard): a numeric scheme "<label> <weight> / …" (e.g. "Class score 40 / Exam 60"), a descriptor scheme "<preset name> (edited)", a scale "<scale name> (edited)". Names needn't be unique.
- **Overrides allowed:**
  - scheme and scale `name`;
  - component `label`, `shortLabel`, `weight` and `bestOf`, but not `key` or `group`. `weight` and `bestOf` are numeric-only and get 400 on a descriptor preset;
  - band `label`, `remark`, `minScore`, `points` and `isPass`. An `index` outside the preset's bands gets 400.

  Overrides carry no settings; those go in `settings`.
- **Validation.** Overrides pass the same checks as the normal routes. Bands are checked again after the overrides are applied (one at 0, no repeated minimums) and stored highest first. A 400 names where the problem is, e.g. "Lower Primary: weights add up to 95, not 100." or "School default: …". Components and bands are added or removed afterwards, on the scheme and scale routes.
- **Settings.** The order is built-in defaults < the default preset's settings < apply `settings`. Department presets' settings are ignored, because there is one settings row per school. The wizard pre-fills from them (e.g. an aggregate when a department uses `bece_jhs`) and always sends the full settings.
- **Re-running** apply for a year replaces that year's policy rows in one transaction, like the PUT, and reuses families by the rule above. `settings` merges like a PATCH. `subjects: true` only adds subjects, never removes them. Other years and sheets already frozen are untouched.
- **Subjects.** With `subjects: true`, each preset's subjects are matched to the catalogue by code or name (ignoring case), created if missing, and added to that department's classes, as `/class-subjects/apply` does. A department (or the school default) with no classes is skipped, so it adds nothing to the catalogue; `subjects.created` and `existing` count only targets that have classes.
- Returns `{schemesCreated, scalesCreated, assignments, subjects: {created, existing}, classSubjects: {added, alreadyThere}}`.

**Schemes and scales.**
- `GET /assessment-schemes` and `GET /grading-scales` list the **latest version of each family**, with `version` and `versionCount`. `GET /…/:id` returns any version, so a frozen sheet can show its own.
- Create with `POST /assessment-schemes` and `POST /grading-scales`.
- `PUT /…/:id` works on the family's latest version only; an older version gets 409.
  - If the version is not in use, it is edited in place: `{scheme, newVersion: false}`.
  - If it is in use, version + 1 is created in the same family: `newVersion: true`.
- Scheme errors: 400 if the weights don't total exactly 100.00 (thirds are 33.33/33.33/33.34); 409 on duplicate component keys.
- Scale errors: 400 if a numeric scale has no band at 0, or two bands share a minimum.

**Versions.**
- A version is **in use** once it is frozen on an assessment sheet or appears in a published report snapshot.
- A sheet freezes the family's latest version when it is created.
- When a new version is made, draft sheets with no marks move to it automatically. Sheets with marks keep theirs until "Apply latest scheme" (rule 8).
- Until phase 2 there are no sheets, so nothing is in use and every PUT edits in place (`newVersion: false`). The version logic is built and tested now, against a stub "in use" check.
- So one class can mix versions across its subjects. The reports board says so ("Mathematics uses an earlier version of the scheme").

**Which settings apply.**
- Policy rows point at families, never at versions.
- Scheme and scale resolve separately, most specific first: **class_subject > class > subject > department > school**. A class can therefore override only its scale.
- A class with no department skips the department level. The school row must set both a scheme and a scale.
- The scheme's mode must match the scale's: numeric with numeric, descriptor with descriptor. This is checked when assignments are saved and again in resolve. The 400 names both, e.g. 'The "Montessori descriptors" scale can't be used with a scheme that has marks.'
- **Mismatched pairs from different levels.** Rows can combine into a bad pair, e.g. a descriptor scheme for French everywhere over a numeric scale on P4. So saving resolves the effective pair for every class × subject the school's classes take, and returns 400 on the first mismatch: 'In P4, French: the "GES 30/70" scale can't be used with a scheme that uses descriptors.'
- A class_subject row for a subject the class doesn't take is accepted and never applies. It doesn't block anything if the subject is later removed.
- `GET /results-policy?academicYearId` returns the year's rows.
- `PUT /results-policy/assignments` takes `{academicYearId, assignments[]}` and replaces the year's list in one transaction. It returns 400 when the school row is missing, a scope target repeats, or the modes don't match.
- `GET /results-policy/resolve?termId&classId&subjectId` returns `{mode, scheme, scale, source: {scheme: {scope, id}, scale: {scope, id}}}`.
- **A new year** copies the previous year's rows when the year is created, or when it is first made current if it was created earlier, unless it already has rows (rule 10). "Previous year" means the most recent earlier year, by start date, that has rows. The copies keep the family ids, so they follow those families' latest versions. Resolve for a year with no rows and nothing to copy returns 409 "Results aren't set up for <year>."

**Settings and remarks.**
- `GET /results-settings` and `PATCH /results-settings`. PATCH checks ranges: decimals 0–2, percentages 0–100.
- `/remark-bank`: `GET`, `POST`, `PATCH` and `DELETE`.

**Module and permissions.**
- The `results` module is seeded and off by default. A school without it sees "Ask Fastrack to turn on Results" in the wizard.
- One phase 1 grant migration adds every new key: `grading:manage`, `marks:read/enter` and `reports:read/remark/generate/approve`. Keys for phases 2 and 3 are marked "no route yet" in the backend's rbac-matrix.

**Fixtures.** The backend keeps a copy of `results-fixtures.json` in `test/fixtures/`, with its sha256 pinned in the spec. When the frontend changes the file, it sends the new hash and the changed cases.

### Mark sheets (`marks:read` / `marks:enter`; teachers limited per rule 3)

Agreed with the backend session on 24 Oct, including the shapes the frontend proposed.

**Who is on a sheet.**
- A pupil is in class C for term T if their latest `enrollment_history` row dated on or before min(term end, today) is C. Promotions are dated from the next term's start, so a Term 3 sheet keeps the pupils as they were.
- A pupil who left during T (exit date inside T) is listed under the class they left from, flagged `leftOn` (rule 13).
- `joinedOn` is set for a pupil admitted or moved in after the term started. `movedFrom {classId, className, on}` is set for a pupil moved in during the term (rule 11).
- **Not required:** an item taken (`takenOn`) before the pupil's `joinedOn` or `movedFrom.on`. Unless it has a mark, it's listed in the row's `notRequired` and counted as exempt, so the rest is reweighted. Every other item needs a mark: scored, absent or exempt.

**Carried marks.**
- After a move, a carried mark fills the new class's item with the same `componentKey` and `itemIndex`.
- Carried marks with no matching item, or for a component key the new scheme doesn't have, are kept but not counted. The row lists them in `carried: [{componentKey, itemIndex, rawScore, maxRaw, status, fromClass: {classId, className}}]`.
- New items the pupil hasn't sat need a mark, unless they're not required (above).

**Items.**
- A `single` component gets item 1 when the sheet is created, labelled with the component's label and out of `defaultMaxRaw`. Descriptor strands are `single` components.
- An `items` component starts with no items, so it is missing until the teacher adds a test. The grid shows "Add the first class test" there. To skip a test, add it and mark the class exempt.
- A `single` component (and a descriptor strand) has exactly one item: adding or deleting one gives 400 "Exam is entered once; it has no extra items.". Its label, `maxRaw` and `takenOn` can still be changed (`maxRaw` only on numeric items; it's null on descriptor items).
- Deleting an item that has marks gives 409 "Test 2 has marks. Remove them first.", unless `?force=true`, which only heads may send (audited).
- Lowering a maximum below an existing mark gives 422 with `details.cells` listing those pupils.

**Status.** Phase 2 has `draft` and `submitted`; `approved` comes with batch approval in phase 3.
- `submit`: draft → submitted. It gives 422 with `details.missing [{schoolStudentId, fullName, missing}]` unless every required mark is in, or the sheet is `notAssessed`.
- `return {reason}`: submitted → draft, keeping `returnReason`.
- `reopen {reason}`: approved → draft (phase 3).
- `rowVersion` goes up on every write (marks, items, status, apply-latest). A stale one gives 409 on marks and item routes.

**Who may enter marks** (rule 3). A teacher may if they hold an open assignment for the class and subject, or nobody does (`anyTeacher`). Heads always may (rule 12).
- `mine=true` for a teacher lists their assigned pairs, plus the unassigned pairs in the class they are class teacher of.
- `mine=false` (heads, and teachers with `marks:read`) lists every pair. The grid's "All classes" switch uses it.

**Scheme versions** (rule 8).
- A version is in use once a sheet using it has a mark or isn't a draft. An empty draft doesn't count, and moves to a new version automatically.
- `POST /mark-sheets/:id/apply-latest` (`reports:approve`) moves a sheet that has marks to the family's latest scheme and scale. Marks are matched by `componentKey`, and unmatched ones are kept unused, as for carried marks.

**Shapes**
- sheet = `{id, termId, classId, subjectId, status, notAssessed, returnReason, rowVersion, schemeId, scaleId, submittedAt, submittedBy}`
- item = `{id, componentKey, itemIndex, label, maxRaw, takenOn}`
- mark = `{componentKey, itemIndex, status, rawScore, maxRaw, descriptorBandId, enteredBy: {id, name}, enteredAt}`. `enteredAt` and `enteredBy` are the last change and who made it.
- roster row = `{schoolStudentId, studentCode, fullName, flags: {joinedOn?, movedFrom?, leftOn?}, marks: mark[], notRequired: [{componentKey, itemIndex}], carried: [...], preview}`
  - `preview` is the engine's subject result: `{status, componentScores: [{key, score}], total, grade, points, reweighted}`.
  - A `leftOn` pupil with missing marks shows `missing` but doesn't block.
- card = `{sheetId | null, classId, className, subjectId, subjectName, status | 'not_started', entered, expected, anyTeacher, teachers: [{staffId, name}]}`. `expected` counts required marks of pupils not flagged `leftOn`. A `leftOn` pupil's marks still count in `entered` when present.

| Method & path | Notes |
| --- | --- |
| `GET /mark-sheets?termId&mine=true\|false` | cards |
| `GET /mark-sheets/open?termId&classId&subjectId` | `{sheet \| null, canEdit, scheme, scale, settings, items, roster}`. Creates the sheet only when the caller may enter marks there; otherwise `sheet: null`, `items: []` and the roster, read-only. `settings` is the school's results settings, so previews use the same rounding. |
| `PUT /mark-sheets/:id/marks` | `{rowVersion, marks: [{schoolStudentId, componentKey, itemIndex, status \| null, rawScore?, descriptorBandId?}]}`. `status: null` removes a mark. Descriptor marks are `scored` with `descriptorBandId` and no `rawScore`. The backend fills `maxRaw` from the item. Returns `{rowVersion, rows}` with the changed pupils only. A stale version gives 409 with `details.rowVersion`. A bad cell gives 422 with `details.cells [{schoolStudentId, componentKey, itemIndex, message}]`, and nothing is saved. |
| `POST /mark-sheets/:id/items` | `{rowVersion, componentKey, label, maxRaw, takenOn?}`. `itemIndex` is the next free one. Returns `{rowVersion, items}`. |
| `PATCH /mark-sheets/:id/items/:itemId` | `{rowVersion, label?, maxRaw?, takenOn?}`. Returns `{rowVersion, items}`. |
| `DELETE /mark-sheets/:id/items/:itemId?rowVersion=&force=` | Returns `{rowVersion, items}`. |
| `POST /mark-sheets/:id/submit` | See Status. |
| `POST /mark-sheets/:id/return` `{reason}`, `POST /mark-sheets/:id/reopen` `{reason}` | `reports:approve`. |
| `PATCH /mark-sheets/:id` `{notAssessed}` | `reports:approve`. Leaves the subject off this term's reports. |
| `POST /mark-sheets/:id/apply-latest` | `reports:approve`. Returns the same shape as open. |

**Phase 0 rules finished in phase 2:**
- `DELETE /subjects/:id` gives 409 when any mark uses the subject.
- `PUT /classes/:id/subjects` keeps a removed subject that has marks this year as inactive: it is no longer returned, but its marks stay.

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
