# Flow: Results and term reports

**Status (24 Oct 2026):** being built in phases. See [`docs/api/results.md`](../api/results.md) for the contract, the rules the product owner set, and the calculation.

| Part | Where | Status |
| --- | --- | --- |
| Subjects and what each class takes | School setup → Subjects | Live (phase 0); see [school-setup.md](./school-setup.md#subjects-tab-added-24-oct-results-phase-0) |
| Grading setup (weights, grades, positions) | `/school-admin/results/setup` | Live (phase 1; backend `99e912b`, not pushed yet), tested on PRM-001 on 24 Oct |
| Mark entry | — | Phase 2 |
| Term reports: review, remarks, publish | — | Phase 3 |
| Parent reports | Parent portal → Reports | Built earlier on sample data; goes live in phase 4 |

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
