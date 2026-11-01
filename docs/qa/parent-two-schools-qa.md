# Parent with children in two schools: switching children

Tested on 1 Nov 2026 **through the UI** in a visible browser (plus API spot checks).

## Question

A parent has two children in two different Fastrack schools, and the schools have different areas turned on. What does the parent portal do when the parent switches between the children?

## Short answer

Each child gets only the areas their own school offers:
- **The tabs and home tiles change** with the selected child.
- **A page the other school doesn't offer** shows "Not offered by this school" instead of the previous child's data.
- **An open bill or report** goes back to its list.
- **The backend enforces the same rules** with 403.

All 13 checks passed.

## Setup

| | Yaa RetestP2 | Abena Osei |
| --- | --- | --- |
| School | QPM-402 (QA Promotion Retest School) | FIS-001 (Fastrack International School) |
| Fees | on | on |
| Results (Reports tab) | **on** | not enabled |
| Attendance | **off** | **on** |

- **Parent:** parent@qpm.test, already linked to Yaa.
- **Linking Abena:** the FIS-001 head opened Abena's record, then **Guardians**, set the mother's email to parent@qpm.test, saved, and used **Link parent account**. The parent's own "Link another child" flow sends a real one-time code, and the test copy has no email service, so the staff route was used.
- **Registers:** the head took three Primary 1 registers for Abena: 27 Oct Present, 28 Oct Absent, 29 Oct Late.
- **Environment:**
  - Database: a copy of `fastrack` (`fastrack_qaward`) with the offline-sync migrations applied.
  - Backend: `feat/offline-sync` 9c8c6d1, which contains `main`.
  - Frontend: `feat/rbac-workspace` 9af02b7.
  - The shared `fastrack` database wasn't changed.
- **Script:** `pw2-live.js` in the QA scratchpad. Screenshots: `shots-pw2/`.

## Results

| # | Check | Result |
| --- | --- | --- |
| 1 | Child switcher | Lists both: "Yaa RetestP2 · QA Promotion Retest School" and "Abena Osei · Fastrack International School" |
| 2 | Yaa selected | Tabs **Home, Fees, Reports, More**: no Attendance. Home: Fees owed GHS 1,110.00, Latest report "None published yet", no attendance tile. |
| 3 | Switch to Abena | Tabs **Home, Fees, Attendance, More**: no Reports. Home has an Attendance tile. Attendance for October shows **1 present, 1 late, 1 absent** (67%), matching the registers. |
| 4a | On Attendance, switch to Yaa | **"Not offered by this school"**. The Attendance tab disappears, and nothing of Abena's remains on screen. |
| 4b | On Reports (Yaa, "No reports yet"), switch to Abena | **"Not offered by this school"**, and the Reports tab disappears |
| 5a | Fees follow the child | Abena: GHS 3,600.00 owed, INV/FIS-001/… bills. Yaa: GHS 1,110.00 owed, INV/QPM-402/… bills. Nothing mixed. |
| 5b | A bill of Yaa's open, switch to Abena | Returns to `/parent/fees`, showing Abena's bills |
| 6 | Typing `/parent/attendance` with Yaa selected | "Not offered by this school" |
| 7a | Reload | The chosen child (Abena) is kept |
| 7b | Sign out, and another parent (rita.ansah@gmail.com) signs in on the same browser | She sees only her child (Efua Ansah). No localStorage key or value holds Yaa's or Abena's ids. |
| 8 | Offline, switching children | Each child shows **their own saved bills** with "Showing a saved copy from this minute". Nothing mixed. |
| 9 | QPM-402 turns Attendance on during the session (on the copy database) | After a refresh Yaa gets the Attendance tab (Home, Fees, Reports, Attendance, More), and the page opens with an empty month, no error. It was turned off again afterwards. |

**API (the same rules on the server)** for the parent's token:

| Request | Result |
| --- | --- |
| `GET /parents/me/wards` | Each ward carries its own school's `enabledModules`. Yaa: fees, results, students, discounts. Abena: attendance, fees, … with no results. |
| Yaa's attendance | **403** "This isn't turned on for parents at your child's school" |
| Abena's reports | **403**, the same message |
| Abena's attendance | 200, with her October days |
| Yaa's reports | 200 (empty) |
| The attendance of a FIS pupil not linked to this parent | **404** "Child not found" |

## Findings

- **QA-279 (Low, backend):** the staff Students search doesn't find a pupil by full name. "Abena Osei" returns nothing, while "Abena" or "Osei" finds her. The search matches the whole term against each name column on its own. It was found during setup and isn't about the parent portal. It's in [findings.md](./findings.md).
- **No parent-portal findings.**

## Environment note (not a finding)

The staff frontend on `feat/rbac-workspace` now saves registers and marks in the offline format. Against a backend on plain `main`, which lacks `feat/offline-sync`, the register save fails with "Register not saved — the server couldn't apply it". That is the known merge-order condition: backend `feat/offline-sync` must merge with or before the frontend. It also means a local setup running this frontend against a `main` backend can't save registers or marks.
