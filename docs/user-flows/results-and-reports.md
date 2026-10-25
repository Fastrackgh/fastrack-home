# Flow: Results and term reports

**Status (24 Oct 2026):** being built in phases. See [`docs/api/results.md`](../api/results.md) for the contract, the rules the product owner set, and the calculation.

| Part | Where | Status |
| --- | --- | --- |
| Subjects and what each class takes | School setup → Subjects | Live (phase 0); see [school-setup.md](./school-setup.md#subjects-tab-added-24-oct-results-phase-0) |
| Grading setup (weights, grades, positions) | `/school-admin/results/setup` | Live (phase 1; backend `99e912b`, not pushed yet), tested on PRM-001 on 24 Oct |
| Mark entry | `/school-admin/results/marks` | Live (phase 2; backend `6b0e07d` and `6e673c7`, not pushed yet), tested on PRM-001 on 24 Oct, with marks and with descriptors |
| Term reports: review, remarks, publish | `/school-admin/results/reports` | Live (phase 3; backend `101af33`, not pushed yet), tested on PRM-001 on 24 Oct |
| Parent reports | Parent portal → Reports | Live (phase 4; backend `a0220a2`, not pushed yet), tested on 24 Oct as Bekoe's parent on PRM-001 and QA's parent on QAR |

## Grading setup

Code: `src/features/results/SetupWizardPage.tsx`, with its logic in `setup-model.ts` (checked in `scripts/check-dashboard.cjs`).

**Who:** `grading:manage` (Principal and Academic Head), with the school's `results` module on. Teachers, secretaries, accountants and parents can't open it. The Grading configuration area links here.

```mermaid
flowchart TD
  A[Open Grading setup] --> B{Current academic year?}
  B -->|no| B1["'No current academic year': link to School setup"]
  B -->|yes| C{Policy rows for the year?}
  C -->|yes| D["Summary: who uses which weights and grades; 'Run setup again'"]
  C -->|no| E[1 Presets]
  D -->|"Run setup again: starts from the current setup"| E
  E --> F[2 Weights]
  F -->|total not 100| F1[Next disabled, 'The weights add up to 95, not 100.']
  F --> G[3 Grades]
  G -->|bands out of order or no 0| G1[Next disabled, e.g. 'B must start below A (85).']
  G --> H[4 Positions and rounding]
  H --> I[5 Review]
  I -->|Set up grading| J["POST /results-setup/apply"]
  J -->|ok| K["'Grading is set up': counts, link to class subjects"]
  J -->|400| L[Red toast with the backend's message, stays on Review]
```

**The steps:**
1. **Presets.** A preset for the whole school, which is required (rule 9), and optionally one per department.
   - Each department suggests one from its code: Pre-School gets Montessori or early years, primary gets GES, JHS gets BECE.
   - The school default starts as the suggestion for the department with the most classes.
2. **Weights.** For each preset in use: the parts (class score, exam…), their weights, and "best N" for class tests.
   - A running total shows, and **Split evenly** gives 33.33 / 33.33 / 33.34.
   - A worked example shows a made-up pupil's marks becoming a total and a grade, using the same engine as reports.
   - Descriptor presets list their strands instead; they have no weights.
3. **Grades.** Each grade's label, where it starts, its remark, and points where the preset has them (BECE). The lowest grade is fixed at 0.
   - **Try a score** shows how a total prints and grades at the chosen rounding, e.g. 79.5 → 80 → A at whole numbers.
4. **Positions and rounding.**
   - Class and subject positions: shown to parents, staff only, or not worked out.
   - Score and average decimals.
   - Rank by average, total or aggregate; aggregate is offered when a BECE-style preset is in use.
   - Whether absence counts as 0.
   - The BECE "best other subjects" count.
5. **Review.** A plain summary per level, and a box (ticked by default) to also add each preset's usual subjects to its department's classes.

**Running setup again (QA-257, fixed 24 Oct).** The wizard starts from the school's current setup, not from the suggestions:
- **What it reads:** the presets at each level, the stored weights and grades, and the stored settings.
- **Review step:** it says "No change to weights or grades", or lists each level that would change, e.g. "Junior High School: JHS 30/70 with BECE grades 1–9 → same as the whole school".
- **Warning:** settings it can't show (one class, one subject, or a department overriding only its grades) are counted in a red warning, because applying replaces the year's rows.
- **Re-tested on PRM-001:** a re-run applied unchanged created nothing and left the summary as it was. Changing JHS to the school default was listed before applying.
- **Before the fix:** the re-run started from the suggestions, so applying it could quietly replace departments' settings (QA found this on QAS-300).
- **Partly fixed, then finished 24 Oct:** the first fix kept one working copy per preset. So a department on the school's preset but with its own weights (QAS-300's Lower Primary at 40/60) was merged into the school default. Each distinct stored setup is now its own copy, offered in the pickers as e.g. "GES basic (30% class, 70% exam): your current (Class score 40 / Exam 60, GES A–F (edited))", with its own Weights and Grades cards.
- **Re-tested on PRM-001:** with the school on its 40/60 copy and Lower Primary on the plain preset, a re-run prefilled both separately and said "No change to weights or grades", with no removal warning.

**What is sent:**
- Only changes from the preset go as overrides.
- An edited copy is named after what it now holds, so the preset's name doesn't describe old numbers: "Class score 40 / Exam 60" when weights change, "GES A–F (edited)" when grades change. A renamed part alone keeps the preset's names.
- Departments on the school's preset are left out, because they inherit it.
- The full settings are always sent.

**States:**

| | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Page | `Loader` | "No current academic year" alert | Alert + Try again | — |
| Steps | — | — | Red alert listing what to fix; Next disabled | — |
| Apply | Button loading | — | Red toast with the backend's message (stays open) | Green alert with counts; Done shows the summary |

**Tested live (24 Oct, PRM-001, results module turned on there by the backend session):**
- **First apply:** GES as the school default, changed to 40/60 with A from 85; BECE for JHS; Montessori for Pre-School, as suggested; WASSCE for SHS, as suggested. It created 4 weightings and 4 grade scales. The summary lists the school and the three departments.
- **Re-runs:** a re-run with the same choices created nothing (families reused). Before the naming fix, the edited copy was still called "GES 30/70"; afterwards it is "Class score 40 / Exam 60" and "GES A–F (edited)". PRM-001 keeps two unused families from that first run.
- **A bad apply** (weights adding to 95, sent to the API) gets 400 "School default: Weights add up to 95, not 100."

**Not yet:** advanced editing of a single class's or subject's grading, the remark bank, and per-version history. These come with the "Advanced" tabs after phase 1 is live.

## Mark entry

Code: `src/features/results/MarkSheetsPage.tsx` and `MarkGridPage.tsx`. Loading and autosave (409 rebase, 422 cells, retry) are in `useMarkSheet.ts`, the cells in `MarkCells.tsx` and the add-test and return modals in `MarkSheetModals.tsx`. The grid's logic is in `marks-model.ts`, checked in `scripts/check-dashboard.cjs`.

**Who:** `marks:enter` with the `results` module on: Principal, Academic Head and Teacher. Secretaries can read results for reports but don't open mark sheets. The Gradebook area opens this page.

**Mark sheets list.**
- A term picker, defaulting to the current term.
- Cards grouped by class, one per subject, each showing its status (not started, in progress, submitted, approved), "n of m marks", and the teachers or "Any teacher can mark".
- Teachers see their own subjects plus unassigned ones in their own class. **All classes** shows every class, so a teacher can find a subject nobody teaches yet. Heads start with all classes.

**The grid** (`/school-admin/results/marks/sheet?termId&classId&subjectId`).
- **Layout:**
  - one row per pupil;
  - columns grouped by part (class score, exam…), one per test;
  - the total and grade beside each pupil, worked out with the school's own rounding.
- **Typing:**
  - a mark, **a** for absent or **x** for exempt; clearing a cell removes the mark;
  - Enter or ↓ moves down the column, ↑ moves up;
  - pasting a column or a block from a spreadsheet fills down, and across.
- **Saving:**
  - changes save on their own after a moment ("Saving…", "All changes saved");
  - leaving with unsaved changes asks first;
  - a refused cell is outlined red with the reason, e.g. "The most is 10.".
- **Pupil flags:**
  - **Joined <date>:** tests taken before then show "n/a" and aren't needed.
  - **From <class>:** marks came with the pupil.
  - **Left <date>:** greyed; never needed.
  - **+n kept:** carried marks with no matching test here.
  - **A carried mark out of a different total** fills the test with the same number and shows as e.g. "40/50" under a "/20" test, with the hint "Marked out of 50 in Basic Two…". It counts as 40 of 50. Leaving the cell alone keeps it, and typing replaces it (QA, phase 2).
- **Tests:**
  - **+** in a part's header adds a test (name, marked out of, date taken). The date decides who doesn't need it.
  - Each test's menu edits or removes it.
  - A part with no tests shows "Add the first class test", because no pupil can be complete without one.
- **Someone else saved first** (409): the sheet reloads, your other changes are re-applied, and any cell they also changed is outlined orange with "Someone else changed this sheet".
- **Submit:**
  - enabled once every needed mark is in;
  - the backend's missing list is shown if it disagrees;
  - after submitting, a teacher can't change marks ("Ask a head to return the sheet").
- **Heads:**
  - can change marks on a submitted or approved sheet, with a yellow note that changes are recorded against them;
  - can **Return to teacher** with a reason, which the teacher sees;
  - can mark the subject **Not assessed this term**.
- **Descriptor subjects** use a picker per strand (the scale's descriptors, Absent, Exempt) and have no total.

**Checked with simulated responses (24 Oct, PRM-001, signed in as teacher@prm.test):**
- 8 and 56 saved in one request and showed 80 A;
- "71" out of 70 was refused in the cell;
- pasting 63 and 40 down the Exam column filled Kofi and Esi;
- a simulated 409 kept the other person's 9 and outlined it;
- "Test 2" was added and had to be filled;
- submit was disabled until every mark was in, then the sheet showed as submitted and read-only.

**Tested live (24 Oct, PRM-001, backend `6b0e07d`):**
- **Setup for the test:** Pre-School was switched to the school's GES 40/60, so its classes are marked numerically. The re-run's ticked "add subjects" also gave those classes the GES subjects.
- **Class C Science, teacher@prm.test:**
  - the page showed "Science, Class C · Term 1, 2026/27 · Class score 40 / Exam 60 · grades: GES A–F (edited)" and "Add the first class test";
  - Test 1 was added (out of 20);
  - Bekoe's 8 and 50 saved as 46 E (16 + 30).
- **Both editing at once:** the principal changed Bekoe's Test 1 to 6 while the teacher entered 55 for the exam on a stale version. The teacher's save got 409, the grid reloaded and re-sent only the exam mark, and there was no false conflict: 12 + 33 = 45.
- **Too high a mark** (99 out of 20, sent straight to the API): 422 "Above the maximum of 20." in `details.cells`.
- **Submit and after:** the teacher filled the rest and submitted. As the principal, the banner read "Submitted: changing marks as a head", the exam changed to 60 (48 E), and **Return to teacher** worked. The teacher then saw "Returned by a head: Check the exam marks." and could edit again.
- **Descriptor sheet** (Class A English, Montessori areas): the live scale bands had no `id`, so a descriptor choice can't be saved. The grid crashed ("Each option must have value property"); it now says "This sheet can't be marked yet" instead. Band ids were added by the backend (`6e673c7`). Re-tested: Akwasi's five strands (four descriptors and one Absent) saved in one request; the teacher submitted; the principal returned it with "Please check Sensorial for Akwasi.", which the teacher then saw.
- **Fixed during the run:** submit, return and not-assessed now send `rowVersion`, as the backend requires.

## Term reports

Code: `src/features/results/ReportsBoardPage.tsx` and `ClassReportPage.tsx`.

**Who:**
- **Viewing:** anyone with `reports:read` and the `results` module (Principal, Academic Head, Teacher, Secretary). The Reports & results area opens it.
- **The old sample "Academic performance" page:** when the school has `results` on, it gives way to Term reports. Teachers, who have no Reports area, see "Term reports" in its place. For heads it's hidden, since Reports & results already opens the board. Without `results`, it stays a labelled preview. The dashboard's sample banner no longer mentions "child" to staff (QA note, 24 Oct).
- **Working out and printing:** `reports:generate` (heads and secretaries).
- **Remarks:** the class's own class teacher, or a head.
- **Head's remark, approve, publish, reopen, withhold:** heads only.

**Board.** A term picker, then one row per class:
- its status: not started, marking, ready to approve, approved, published, reopened;
- "n of m submitted" mark sheets and "n of m" remarks;
- what it's waiting on ("Marks: English Language · 3 remarks to write").

**Class review** (`/school-admin/results/reports/class?termId&classId`).
- **Before the first compute:** "Work out reports". After it, "Update from the marks", until approved.
- **Pupil table:**
  - columns: average, position ("1st of 2", among ranked pupils), attendance ("58 of 60" or "Not recorded") and the class teacher's remark;
  - a status badge for each pupil: Ready, Incomplete or Left, and Withheld where it applies.
- **Waiting on mark sheets:** a yellow alert names the unsubmitted subjects. Reports can still be worked out and previewed, but **Approve** is refused, with the backend's blockers.
- **A pupil's drawer:**
  - their subjects with total, grade and position, or "Marks missing", "INC", "EX" or "Not assessed";
  - the class teacher's remark, with saved remarks from the remark bank that suit the pupil's average;
  - conduct, attitude and interest, with suggestions;
  - the head's remark (heads only);
  - on the year's last term, promotion: promoted to a class, repeats, or graduates;
  - days present and school days, typed in only when the register has none (present can't exceed school days).
- **Saving** sends only the fields that changed.
- **Preview report** shows the school's report design in a sandboxed frame, with "Open to print".
- **Shared places** show as "2nd=" in the list and the drawer, as on printed reports (QA-260). "of N" is the number on roll, left pupils included.
- **The remark bank** is loaded only for people who write remarks. A secretary's view used to get 403 from it (QA-261).
- **Withholding (heads):** a head can withhold a report with a reason. A left pupil's report starts withheld, and **Issue report anyway** releases it.
- **Approve → Publish to parents → Reopen (with a reason):**
  - after approval, remarks are read-only;
  - after publishing, a green note explains that parents see this version until it's published again;
  - a reopen shows its reason.
- **Print all** opens the whole class's reports in a new tab.

**Checked with simulated responses (24 Oct, PRM-001, principal@prm.test, Class C):**
- **The happy path:** the board, then working out the reports (Ready, Incomplete, and a Left pupil withheld), then an approval refused while English wasn't submitted.
- **Remarks for Benewaa:** a saved remark matching her 61 average was offered. 70 of 60 days was refused. The save sent only the changed fields: remark, conduct, head's remark and attendance 55/60.
- **Kweku (left):** "Issue report anyway" released his report, and the preview rendered.
- **Approve, publish, reopen:** publishing locked remarks, and reopening showed the reason. Print all opened the class's reports.
- **Found and fixed during the run:**
  - the remark boxes crashed on typing, the same mistake as QA-212: reading the value after React cleared it;
  - error details weren't read correctly, because `ApiError.details` holds the whole error body. The new `errorDetails()` in `src/lib/api-client.ts` fixes this for the mark grid's refused cells and submit list, and for the approve blockers.

**Tested live (24 Oct, PRM-001 Class C, backend `101af33`):**
- **Setup:**
  - Tina Teacher was made Class C's class teacher through School setup → Classes.
  - Eight subjects were marked not assessed through the API (test setup), and the teacher submitted Science in the grid.
  - The board then showed "9 of 9 submitted".
- **Working out the reports:** "6 on roll, 6 ranked". Bekoe has 48 (1st), and the other five have 18 each, sharing 2nd. Only Science counts.
- **Attendance:** "Not recorded", because PRM-001 doesn't use attendance.
- **As the teacher:** there were no compute, approve or print buttons and no head's-remark field. Their remark, conduct "Very good" and attendance 57/60 saved.
- **As the principal:**
  - the head's remark "Keep it up, Bekoe." saved;
  - Approve worked, and after it the teacher's remark save got 409 "These reports are approved. Reopen them to change remarks.";
  - publishing produced "Published version 1".
- **The preview document** (the school's design):
  - columns "Class Score (40%)" and "Exam Score (60%)";
  - Science 12 + 36 = 48, an E, with no subject position (staff only);
  - "Overall Position: 1st out of 6", attendance "57 out of 60", the remarks, and the grading scale with A from 85.
- **Reopen** showed "Check Bekoe’s attendance", and Print all opened the class's reports.
- **Publish email:** none was sent, because no parent is linked to a Class C pupil on PRM-001. The backend's e2e test covers the emails: a linked parent is emailed, withheld reports send nothing, and a republish is marked updated. In dev, emails appear on a local preview from 127.0.0.1:4080, and the backend log prints its URL.

## Parent reports (phase 4)

The parent screens are described in [parent-experience.md](./parent-experience.md). Tested live on 24 Oct, on an iPhone-sized screen:
- **Bekoe's parent (PRM-001):**
  - home showed "Latest report 48% E";
  - the list showed "Class C · Updated 24 Oct 2026 · 48% · 1st of 6 · E";
  - the report showed "CS 40% / EX 60%" with Science 12 and 36, total 48, E, attendance 57/60, both remarks, "Next term begins 8 Jan 2027" and "The school corrected this report on 24 Oct 2026";
  - the report card rendered the school's design.
- **QA's parent at QAR** (no fees module) saw report 85% A. Fees said "Not offered by this school", and there was no fees tile.
- **FIS-001's parent** (no results module) saw "Not offered by this school" on Reports, and no report tile.

