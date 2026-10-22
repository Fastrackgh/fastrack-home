# End-to-end UI run: Bismark International School

- **Date:** 21 October 2026.
- **Method:** driven through the web frontend in a visible Chromium window (Playwright over CDP), as a real user would.
- **Frontend:** `http://localhost:3001` (`feat/rbac-workspace` working tree).
- **Backend:** `fastrack-backend` `main`, rebuilt at 18:40 with `FRONTEND_URL=http://localhost:3001` and a Paystack test key. It runs against the dev database `fastrack`.
- **Ledger checks:** read-only SQL against that database.

**New issues** are numbered QA-200 onward; full detail is in [findings.md](./findings.md). Earlier findings that this run confirmed again are noted under their existing IDs.

**Legend:** ✅ works · ❌ issue · ⚠️ works with friction · 🔁 re-confirms an earlier finding

**Screenshots:** [`screenshots/bis-*.png`](./screenshots/), for example `bis-p2-setup-page.png` (invite crash), `bis-p2-principal-landing.png` (sample data on a new school), `bis-p15-public-old-bill.png` (a changed "sealed" bill) and `bis-p16-paid.png` (Paystack success).

**Workarounds used** (because of blockers, and recorded as findings):
- Staff accounts were activated through the backend's dev page or `POST /auth/setup-password` (QA-204).
- Parents were registered through `POST /auth/register-parent` (QA-212).
- Current terms were fixed by unticking the old one (QA-206).

Everything else was done through the UI.

## Phase 1: Super Admin provisioning

| Step | Result |
|---|---|
| Sign in as Super Admin | ✅ Lands on `/school-admin/platform`. The login page still claims "Port 3001", "260+ schools" and "99.98% uptime" 🔁 QA-044. The platform lists 82 schools, 70+ of them junk "Parent Ward Link Academy" rows 🔁 QA-054. |
| Provision with an empty form | ✅ Blocked by the browser's required-field check (no app message). |
| Name of spaces only | ✅ "School name is required." |
| Duplicate code `FIS-001` | ✅ 409 "School code already exists". |
| Code case and whitespace | ❌ **QA-200**: the code is compared exactly and the unique index is case-sensitive, so `fis-001` or `FIS-001 ` would be a second school (confirmed in code and the index; not created). |
| Provision BIS-001 (all fields) | ✅ Created and shown at the top of the list. Website `bis.test` is stored without a scheme ⚠️. |
| Modules | ⚠️ A new school starts with **all 8 modules off** and nothing prompts the Super Admin to switch them on. Expenses, Other Income, Payroll and Timetable have no real UI. 7 were enabled (Discounts left off on purpose). Each switch sends an explicit `isEnabled` value ✅. |
| Logo: text file renamed `.png` | ✅ Rejected by its content. ⚠️ The message exposes the internal name "Unsupported file type for SCHOOL_LOGO". |
| Logo: real PNG | ✅ Uploaded and shown. |
| Assign principal using another school's principal email | ✅ 409 "Email already registered". |
| Same email with different case `HEAD@Fastrack.school` | ❌ **QA-201**: accepted. A second, inactive account and a pending PRINCIPAL invite were created for the FIS-001 principal's mailbox. |
| Login `Head@fastrack.school` with the right password | ❌ **QA-201**: "Invalid credentials" (login matches the email exactly; phones capitalise the first letter). With a trailing space: "email must be an email". Every error is shown twice 🔁 QA-059. |
| After assigning, the page still says "Principal: Not assigned" | ❌ **QA-202**: the pending invite is invisible, can't be resent or revoked, and a second principal invite (Ama Boateng) was accepted while the first was still open. **Two PRINCIPAL invites are pending for BIS-001.** |
| Invite email | ✅ The HTML version is correct and links to `localhost:3001/auth/setup-password`. ❌ **QA-203**: the plain-text version contains `token&#x3D;…`, which is a broken link. |
| Deactivate school | ⚠️ One click, no confirmation 🔁 QA-040. |
| Principal signs in while suspended | ✅ 403 "This school account is suspended. Please contact Fastrack support." **QA-003 fixed at login.** |
| Suspend during a live principal session | ✅ Every request returns 403 at once. ⚠️ The user stays inside the workspace, and each page shows its own error card. |
| Re-activate | ✅ |
| Platform staff count | ❌ Still "STAFF 0" with an active principal 🔁 QA-056. |

## Phase 2: Principal onboarding and passwords

| Step | Result |
|---|---|
| Open the invite link (`/auth/setup-password?token=…`) | ❌ **QA-204 (Critical)**: "Application error: a client-side exception". The page calls `useAuth()`, but `AuthProvider` is mounted only under `/school-admin` and `/parent`. The committed `41eeb3b` page has the same call, so the QA-015 fix never worked at runtime. **No invited user can activate an account through the app.** **Re-test 22 Oct: fixed**; the link opens, and setup signs in once and lands on the dashboard (see QA-204 in findings). |
| Workaround used for the rest of the run | The backend's own dev page `/api/dev/setup-password?token=…` (interactive form) was used to activate the account. |
| Weak password `abc` | ✅ Blocked: minimum 8 characters. |
| Activate with a strong password | ✅ 200. Signed in. |
| Reuse the used invite token | ✅ 400 "Invitation has already been accepted" (the dev page still renders the form; dev-only). |
| Principal's first screen | ❌ 🔁 QA-034: the Overview shows invented data ("3 active students", "GH₵1,000 collected", "Kofi Ansah · At risk") for a school with **0 students and no terms**. A small "UI PREVIEW" label is the only hint. Nothing points a new principal to School setup. |
| Forgot password (known and unknown email) | ✅ The same "If … has a Fastrack account" message for both (no way to tell which emails have accounts). |
| Reset email | ❌ **QA-205**: it says the link "will expire in 30 minutes"; the real expiry is 60 minutes and the app says "one hour". The plain-text link has the same `&#x3D;` problem (QA-203). |
| Reset with the **same** password as before | ⚠️ Allowed (Low). |
| Reset page result | ✅ "Password changed… signed out on every device". |
| Reuse the reset link | ✅ "Link not valid… Links work once". |

## Phase 3: School setup (Principal)

| Step | Result |
|---|---|
| Open `/school-admin/setup` | ✅ The checklist reads "1 of 7 done", with 4 tabs. |
| Profile: school code | ✅ Read-only in the UI ("Set by Fastrack"). The API still accepts changes 🔁 QA-079. |
| Profile: clear the email | ❌ 🔁 QA-079: "Could not save the school profile · email must be an email". |
| Profile: save email `Office@BIS.test ` and phone | ✅ Saved and trimmed. |
| Year with end before start | ✅ "Ends before it starts". Add is disabled. |
| **Add 2026/27 as current** | ❌ **QA-206 (Critical)**: "Could not save · Internal server error". Backend log: `missing FROM-clause entry for table "academicyear"` in `AcademicYearRepository.setCurrent`. The tenant filter from `BaseRepository.createQueryBuilder()` is added to an alias-less `UPDATE`. The year **was** inserted as current, but the UI showed "No academic years yet". Retrying gives "Academic year already exists". After a reload it shows as CURRENT. |
| Add Term 1 as current | ❌ **QA-206**: the same 500 (`academicterm`). The term was saved as current anyway. |
| Term starting before its year | ⚠️ Add is greyed out with **no message** saying why. |
| Term 2 overlapping Term 1 (1 Dec – 1 Mar) | ❌ 🔁 QA-076: accepted. Corrected by Edit to 8 Jan – 9 Apr ✅. |
| Term 3, then a second "Term 3" | ✅ Second one rejected: "Term sequence already exists for this year" (⚠️ "sequence" is internal wording). |
| 2027/28 starting 1 Jul 2027 (overlaps 2026/27) | ❌ 🔁 QA-076: accepted. Corrected by Edit ✅. 2027/28 Term 1 added, not current ✅. |
| Add standard departments (×2) | ✅ Five departments, no duplicates. ⚠️ 🔁 QA-079: no feedback either time. ⚠️ Uses "Primary 1–6"; Ghana's curriculum now says "Basic". |
| Add classes KG2, B1, B2, B3 | ✅ Each shows a toast. |
| Add `kg2` | ❌ 🔁 QA-079: accepted next to `KG2`. ❌ 🔁 QA-075: **no Delete**, only Edit, so the mistake stays in every class picker. |
| Class order | ❌ **QA-207**: classes have no level or order field. The list sorts alphabetically ("Basic 1… Basic 3, KG 2"), and nothing tells promotion which class comes next. |
| Getting-started checklist | ✅ Ticks update (4 of 7 after classes). |

## Phase 4: Staff (Principal)

| Step | Result |
|---|---|
| Staff page | ✅ The Invitations table shows the stray "Test Hijack" principal invite with Resend and Revoke, so the Principal can clean up QA-202 (the Super Admin can't). ⚠️ The Principal herself is not in the Staff list. |
| Revoke the stray invite | ✅ Revoked. ⚠️ One click, no confirmation. ❌ The revoked row still shows **Resend**, which always fails ("Invitation resent failed · Invitation has been revoked"). |
| Invite Academic Head, Account Officer, Secretary and 2 Teachers | ✅ All five sent with clear toasts. The emails are correct. |
| Accept the invites | ⚠️ Done through the backend (QA-204 blocks the app page). |
| Staff directory | ✅ **QA-036 looks fixed**: Academic Head, Account Officer, Secretary and Teachers are all listed, with Edit and Deactivate. |
| Revoke Akosua's pending invite, then use her link | ✅ 400 "Invitation has been revoked". |
| Revoked invitee in the directory | ❌ **QA-208**: shown as **INACTIVE with "Reactivate"**. Reactivate makes the account ACTIVE with **no password**, so she can't sign in. Resend is refused, a fresh invite says "Email already registered", and forgot-password skips accounts with no password. **Once revoked, a person can never be re-invited on that email.** The class-teacher picker then lists two identical "Akosua Frimpong" entries. **Re-test 22 Oct: fixed**; the row shows "Not set up" with "Resend invite", Activate is refused for accounts with no password, and a resent invite lets the person in (see QA-208). |
| Re-invite on a different email | ✅ Works (`akosua.f@bis.test`). |
| Academic Head's Invite dialog | ❌ 🔁 QA-013: offers Account Officer and Academic Head. |
| Role menus and URL access | ✅ Each role lands on Overview, and blocked pages redirect. 🔁 QA-051 and QA-016: pages reachable only by typing the URL: Account Officer → Staff, Secretary → Attendance, Teacher → Students, Academic Head → Admissions. ⚠️ Most menu items are sample-data areas (Gradebook, Timetable, Question bank, Meal menu, Gallery…). |
| Assign class teachers (Basic 1 → Yaw, KG 2 → Akosua) | ✅ Saved. ⚠️ Duplicate names in the picker can't be told apart (QA-208). |

## Phase 5: Students (Secretary)

| Step | Result |
|---|---|
| Students page | ✅ Shows "2026/27 · Term 1". ⚠️ "Across 5 classroom cohorts" counts the mistaken `kg2` class. |
| Admission defaults | ✅ **QA-032 fixed**: gender, religion, blood group and genotype are saved empty unless chosen. Boarding defaults to "Day". |
| Birth date in 2030 | ❌ **QA-209**: accepted at step 1 and saved by the backend (`birth_date = 2030-05-01`). |
| "Next Step" on the Guardians step | ❌ **QA-210 (High)**: it **submits the admission**. The Health & Safety step (blood group, allergies, emergency contact) can never be reached. Cause: the Next `<Button>` in the `<form>` has no `type="button"` (`students/page.tsx:1244-1253`). Pressing Enter in any field also submits. |
| Admit with **no guardian at all** | ❌ **QA-210**: allowed. Kwame Adjei (001) was saved with no mother, father or emergency contact. |
| Admit 8 more students across KG 2 and Basic 1–3 | ✅ Codes `BIS-001/STD/2026/001`–`009`. The father's phone was kept as typed (`+233 24 777 0002`). |
| Duplicate name (a second "Kwame Adjei") | ⚠️ Accepted with no "possible duplicate" warning. |
| Edit profile (birth date, gender, allergies, emergency contact) | ✅ Saved. This is the only way to enter health details (workaround for QA-210). |
| Edit mother and father contacts after admission | ❌ **QA-211 (High)**: not possible anywhere. The drawer has no guardian-contact fields, but parent linking sends the OTP to "the contact on record". A typo or changed phone number means **the parent can never link**, and staff have no "link parent" action. |
| Teacher (Basic 1) opens Students by URL | ❌ 🔁 QA-016 (improved): guardian phones are now hidden and the drawer is read-only, but the teacher still sees **all 9 students** in every class, guardian names, and medical notes. |

## Phase 6: Parents and linking (parent app at 390 px)

| Step | Result |
|---|---|
| `/parent` while signed out | ✅ Goes to `/parent/login`. Clean mobile layout. |
| `/parent/register`: type the first letter of the first name | ❌ **QA-212 (Critical)**: "Application error". `ParentAuth.tsx:210` reads `e.currentTarget.value` inside a `setForm(current => …)` updater, where `currentTarget` is already null. The committed code has the same bug (line 200). **No parent can create an account.** **Re-test 22 Oct: fixed** (another session): `set()` now reads the value before `setForm`; all six fields keep their values with no page errors in Chrome. Submitting was not re-tested. |
| Workaround used | Parents registered through `POST /auth/register-parent` (the same call the form makes). Everything after that was done in the UI. |
| Parent sign-in | ✅ The home screen asks "Link your child" and offers an install-the-app prompt. |
| Link: unknown code, child with no contact on record, child whose contacts belong to someone else | ✅ The same generic message for all three (nothing leaks). ⚠️ For a genuine parent whose contact is missing, the message ("check the code") points the wrong way, and the school can't fix the contact (QA-211). |
| Link with the code in lowercase | ✅ Accepted. |
| Phone matching | ✅ `0207770001` matched the stored `020 777 0001`, and `0247770002` matched `+233 24 777 0002`. The OTP went to a masked number ("0207 ••• 001"). |
| Wrong OTP ×3 | ✅ The backend locks the session, so even the correct code is refused. ❌ **QA-213**: the UI always says "That code is not right or has expired… send a new one". It hides "2 attempts remaining" and "Maximum attempts reached, start over". "Send a new code" after the lockout fails with "We could not link a child… check the code". |
| Correct OTP | ✅ "Esi Adjei is linked · KG 2 · Bismark International School". |
| Link an already-linked child again | ❌ QA-213: the backend says "already linked to your parent account", but the UI says "check the code". |
| Email-only guardian contact | ✅ The OTP goes by email to a masked address (`a********h@bis.test`). |
| Mother and father both link one child (Kobby Mensah) | ✅ Both linked. |
| Staff Guardians tab → Unlink the father | ✅ Shows both parents with their relationship. A confirmation explains the effect. The father loses access immediately. |
| **The unlinked father links again** | ❌ **QA-214 (High, safeguarding)**: he got straight back in with a new OTP. The school can't remove his contact (QA-211) and there's no block list, so an unlink never sticks (custody disputes, court orders). |

## Phase 7: Fee setup (Account Officer)

| Step | Result |
|---|---|
| Fees page | ✅ "2026/27 · Term 1". KPI cards and tabs: Invoices, Payments, Fee Structures, Fee Types, Discounts. |
| Discounts tab with the Discounts module off | ❌ 🔁 QA-087: the tab is shown with the raw error "The 'discounts' module is not enabled for this school" and a "Try again" button. |
| Double-click "Add the standard fee types" | ❌ 🔁 QA-087: "Could not add the standard fee types · Internal server error", although six types were added. |
| Add "tuition fee " next to "Tuition Fee" | ❌ 🔁 QA-087: accepted. There is no fee-type delete, so it was renamed to "Excursion Trip" (one-off). |
| Set fees: amount −100 or 0 | ✅ Blocked ("Enter an amount on every line"). ⚠️ The due date is required on every line, and the message doesn't point at the field. |
| Set fees: amount 99,999,999,999 | ❌ 🔁 QA-087: "Internal server error" (no maximum on either side). |
| Set fees for Term 1 | ✅ "15 fee entries set" (Basic 1–3: Tuition 1,500 with a GHS 20 penalty, PTA 50, ICT 100, Bus 300 optional, Uniform 250 once) and "4 fee entries set" (KG 2: Tuition 1,200, PTA 50, Bus 300, Uniform 250). The dialog explains that existing amounts are replaced and issued invoices aren't changed ✅. ⚠️ The inputs on the second and later fee lines have no labels (screen readers) 🔁 QA-050. |
| Super Admin enables Discounts while the Account Officer's page is open | ✅ The open tab picked it up the next time the tab was clicked, with no reload. |
| Discount picker | ✅ Search shows name, code and class, so the two "Kwame Adjei" students can be told apart. Defaults: whole bill, current term, percentage. |
| Kwame (009) 10%, then 20% on the same bill and term | ❌ 🔁 QA-043: both say "Discount added", but the list shows only **20%**. The 10% was silently replaced. |
| Adwoa: 60% every term + 60% Term 1 | ❌ 🔁 QA-043: both accepted with no warning that together they exceed 100%. |
| Kofi Badu: GHS 100 off Tuition | ✅ |

## Phase 8: Billing and payments (Term 1)

| Step | Result |
|---|---|
| Opt Kojo into School Bus (student drawer → Optional fees) | ✅ Saved (`PUT … 200`). ⚠️ No confirmation toast. |
| Generate Term Invoices dialog | ✅ The term is fixed to the current term. Class can be "All classes", and the due date is optional. |
| Generate for the whole school | ✅ **QA-028 fixed**: "Successfully generated 10 term invoice(s) for Term 1 (whole school)". Every bill is correct: Basic 1,900; Kojo 2,200 (bus); Kofi 1,800 (−100 fixed); Kwame (009) 1,520 (20% only); KG 2 1,500; total GHS 16,120 (matches the database). |
| Stacked discounts (Adwoa) | ❌ **QA-215**: payable GHS 0.00, but status **UNPAID** (she will show in arrears and reminders). 🔁 QA-043: 120% capped silently. |
| Generate again | ✅ "No new invoices · 0 generated (10 already billed)". |
| Invoice breakdown | ✅ Itemised. ⚠️ No due date and no late-penalty terms are shown, although the structure has a GHS 20 penalty (🔁 QA-085). |
| **Partial** payment: Nana GHS 1,000 of 1,900, cash | ✅ Receipt RCT/…/0001, 900 remaining. ❌ 🔁 QA-041: the receipt reads "OFFICIAL RECEIPT — **PAID & VERIFIED**" on a part payment, with a raw ISO date. |
| **Exact** payment: Ama Serwaa 1,900 by MoMo with a reference | ✅ Balance 0, PAID. ⚠️ The "Channel / Network" picker had **no options** (MTN, Telecel and AirtelTigo can't be chosen). |
| **Overpayment**: Kofi 2,000 against 1,800 | ⚠️ 🔁 QA-029: accepted with no warning. The receipt says "Remaining Outstanding: **GHS -200.00**" where it should say "credit". The status shows OVERPAID and the ledger is correct (account −200). |
| **Underpayment**: Esi GHS 0.50 | ✅ Accepted, PARTIAL, 1,499.50 left. |
| Pay a GHS 0 bill: Adwoa GHS 100 | ⚠️ Accepted as credit with no warning (🔁 QA-029). |
| Reuse a MoMo reference on another student | ✅ 409 "already recorded (receipt RCT/…/0002)". ❌ **QA-216**: one MoMo transfer covering several siblings can't be recorded (one payment per child is refused), and there's no "split across siblings" option. |
| Double-click Record Payment | ✅ One request, one receipt. |
| Type an amount before the balance loads | ✅ **QA-055 fixed**: the typed 300 is kept. |
| KPI cards after payments, and after the page's Refresh button | ❌ **QA-217**: still "Total collected GHS 0.00 · 0%". Only a full browser reload shows the true 5,800.50 / 35.3% (which matches the database). |
| Correct bill (Principal only): remove ICT from Kwame (001) with a reason | ✅ New total 1,800, with the reason "Kept in the audit log". ⚠️ Fees can only be edited, not added (a bus can't be added mid-term). |
| Correct a **paid** bill: Ama Serwaa tuition 1,500 → 1,000 | ✅ Becomes OVERPAID, balance −500, and the account ledger matches. |

## Phase 9: Extra bills and bill links (Account Officer)

| Step | Result |
|---|---|
| More billing → Extra bill | ✅ Clear dialog: term, fee type, title, scope (one class, one student, whole school), optional amount ("leave empty to use the class's fee structure"). |
| Whole-school "Cape Coast Castle excursion" GHS 120 | ✅ "Successfully generated 10 supplementary invoice(s) … (whole school)". |
| Same bill again | ✅ "All selected students have already been billed for this supplementary fee type in this term." |
| PTA Dues (already on the term bill) to Basic 1, amount empty | ❌ 🔁 QA-062: 3 more bills of GHS 50 were created, so Basic 1 now owes PTA twice. No warning, and the empty amount silently reused the structure price. |
| Fee type with no structure, amount empty | ✅ "Please ensure classes have fee structures configured or specify an explicit amount." |
| One student (Kojo) "Science fair kit" GHS 80 | ✅ |
| A second excursion in the same term ("Accra Zoo trip", Basic 2, GHS 50) | ❌ **QA-218**: refused ("already been billed for this supplementary fee type in this term"). Each extra event needs a new fee type, and fee types can't be deleted. |
| Send bill links to parents (Term 1, SMS and email) | ✅ The dialog promises private per-child links. ⚠️ "27 notifications (18 SMS, 9 Email)" for 10 students: **one message per invoice**, so a family gets up to four separate SMS. A link was sent for Adwoa's GHS 0 bill (QA-215) and for an overpaid bill. |
| SMS content | ⚠️ The link is the **backend API URL** `localhost:3000/api/public/invoices/<invoice UUID>` (long, not the parent app, exposes the database id) 🔁 QA-010. |
| Public bill page (phone width) | ✅ Readable bill with a print/PDF button, correct total 1,619.50. ❌ **QA-219**: this term's excursion extra bill appears as "**Bal B/f 120.00**" (balance brought forward), as if it were old debt. ⚠️ "Signed … by accounts@bis.test" exposes a staff email 🔁 QA-010. |

## Phase 10: Term rollover, arrears and credit

| Step | Result |
|---|---|
| Ledger before rollover | ⚠️ **QA-220**: credit is not applied to new extra bills. Ama Serwaa (−500 credit), Kofi (−200) and Adwoa (−100) each still show the GHS 120 excursion as **unpaid** and were sent SMS about it, while their accounts net to credit. |
| Principal marks Term 2 as current | ❌ 🔁 **QA-206**: "Could not save · Internal server error". The school is left with **two current terms** (Term 1 and Term 2 both flagged). Billing silently switched to "Term 2". |
| Untick "current" on Term 1 | ✅ Saved. This is the only way out, and nobody would guess it. |
| Term 2 fee structures | ✅ 12 + 3 entries. |
| Generate Term 2 invoices | ✅ "Successfully generated 10 term invoice(s) for Term 2". **Every bill is correct**: Term 2 fees + Term 1 balance once (Nana 1,650 + 1,020 = 2,670; Kojo 1,950 + 2,450 = 4,400; Ama Serwaa 1,650 − 380 credit = 1,270; Adwoa 660 + 20 = 680 with her every-term 60% still applied). |
| Old invoices | ✅ "MOVED TO NEXT BILL", balance 0, carried-forward amount recorded. Account balance = new bill. **QA-002 looks fixed.** The invoice table and the database reconcile (GHS 26,159.50 outstanding). |
| Pay Nana GHS 500 after rollover | ✅ Goes to the Term 2 bill (0027). |
| Pay a specific extra bill (Kobby's GHS 80 science kit) | ❌ **QA-221**: Record Payment always targets the latest *term* invoice and has no bill picker. The GHS 1,000 went to the term bill, and the GHS 80 extra bill stays UNPAID until it's rolled into arrears. Extra bills can't be settled one by one (excursion money, exam fees). |
| Billing vs today's date | ⚠️ 🔁 QA-061: with Term 2 flagged current on 21 Oct (inside Term 1), billing and the fee screens follow the flag, not the date. |

## Phase 11: Optional services (parent ↔ school)

| Step | Result |
|---|---|
| Parent home (Grace, 390 px) | ✅ Esi's card: "FEES OWED GHS 2,869.50 · Term 2 outstanding", attendance and "Coming up". |
| Parent Fees → Bills | ✅ The Term 2 bill and old bills marked "MOVED TO NEXT BILL". ❌ **QA-222**: the summary says "GHS 0.50 paid **of GHS 4,489.50**". It adds the Term 2 bill (which already includes GHS 1,619.50 carried) to the Term 1 bills it replaced. The real total billed is GHS 2,870, so parents will think they were overcharged. |
| Services tab | ✅ "Prices for KG 2, Term 2 · School Bus Service · NOT TAKING · GHS 300.00 / term · Ask to start". |
| Ask to start (with a note) | ✅ The dialog states the price and that the change applies "from the next bill". The card shows "WAITING FOR SCHOOL" with Cancel, and Ask disappears (no duplicates possible). |
| Staff `/school-admin/fees/requests` | ✅ Waiting, Approved, Declined and All filters. The row shows the student, request, parent's note, parent phone, time and status. |
| Approve | ✅ "School Bus Service added for Esi Adjei from the next bill." The parent's card flips to TAKING. |
| Two staff tabs: approve in one, decline in the stale one | ✅ The stale tab shows "This request has already been decided" in the dialog, and nothing changes. ⚠️ 🔁 QA-083: the stale row still shows WAITING with Approve and Decline until a reload. |
| Ask to stop → approved | ✅ "School Bus Service removed … from the next bill". |
| Decline with a reason | ✅ The parent sees "DECLINED · School: The KG bus route is full this term…" in Past requests. |
| Parent double-taps Cancel | ⚠️ 🔁 QA-083: shows "Request cancelled" **and** "Could not cancel" (no busy state). The result is correct (CANCELLED). |

## Phase 12: New school year, promotion and exits

| Step | Result |
|---|---|
| Mark 2027/28 and its Term 1 as current | **Re-test 22 Oct: fixed**: switching to 2026/27 Term 2 and back saved with no error and kept exactly one current term and year (see QA-206; new edge cases QA-236, QA-237). Original result: ❌ 🔁 **QA-206**: two "Internal server error" saves. The school ends up with **two current years and two current terms**. Fixed by unticking 2026/27 and its Term 2. |
| Skipping Term 3 | ⚠️ No warning that 2026/27 Term 3 was never billed. |
| Student → Class & status → Move to another class | ✅ The current class is excluded. "From term" defaults to the current term. ❌ 🔁 **QA-207**: no suggested next class, the stray `kg2` class is offered, and there is **no bulk or class-wide promotion**. It takes about 8 clicks per pupil, so a 400-pupil school needs thousands of clicks each September. ⚠️ No confirmation step. |
| Promote 8 pupils (KG 2 → B1, B1 → B2, B2 → B3) | ✅ Each "Class changed". ⚠️ The history table shows "KG 2 · Term 1 · 2026-10-21" and "Basic 1 · Term 1 · 2026-10-21", with **no year**, so the two rows can't be told apart, and the "from" date is today, not the term start. |
| Promote Kwame (001) "from 2026/27 Term 2" (a past, already-billed term) | ❌ **QA-223**: accepted silently. History now says he was in Basic 2 for a term he was billed as Basic 1. |
| Record exit: Ama Serwaa and Kofi Graduated, Adwoa Transferred out | ✅ The confirmation explains "stop being billed… can't be undone here". ❌ **QA-224**: no mention of the outstanding balances (GHS 1,270, 1,570 and 680). There's no "clear fees before exit" warning, and no way to view leavers' debts. |
| Bill 2027/28 Term 1 | ✅ 7 invoices at the **new** class rates with arrears carried (Kobby 2,720 + 80 science kit = 2,800 b/f). Leavers skipped. |
| Pay GHS 570 for graduated Kofi | ✅ Accepted (good for debt recovery). ⚠️ The form doesn't show that the student has left 🔁 QA-017. |

## Phase 13: Calendar (Principal)

| Step | Result |
|---|---|
| Open `/school-admin/calendar` | ✅ "2027/28 · Term 1 · Mon 6 Sept – Fri 17 Dec" with term stats (75 weekdays, 0 closures, 75 school days), Month and List views, and Term and Class filters. |
| Add Farmers' Day (holiday), mid-term break Fri 22 – Tue 26 Oct (spans a weekend), exams 13–16 Dec, PTA meeting 09:00–12:00 for parents, Basic 2 trip (one class), sports week 29 Oct – 2 Nov | ✅ All "Event added". Stats: **4 closure days** (1 + 3 weekdays; the weekend is correctly ignored) → 71 school days. |
| Overnight camp Fri 18:00 → Sat 08:00 | ❌ 🔁 QA-074: "The end time must be after the start time" (times compared without dates). |
| End date before start date | ✅ Blocked. |
| Four events on Sat 16 Oct | ⚠️ 🔁 QA-074: the month grid shows "+1 more" as plain text (not clickable). The fourth event is reachable only from List. ⚠️ Events on a Saturday get no "this is a weekend" hint. |
| List view | ✅ Grouped by month with type, dates, time, audience, Edit and Remove. ⚠️ 🔁 QA-074: the sports week (29 Oct – 2 Nov) appears only under October. |
| Switch to the **past** term 2026/27 Term 1 and add an "Emergency closure" | ❌ 🔁 **QA-072**: accepted with no warning. That term's school days changed from 79 to 78, so every pupil's attendance percentage for a finished term changes. |

## Phase 14: Attendance (Teacher Yaw, homeroom Basic 1)

| Step | Result |
|---|---|
| Open Attendance | ✅ Defaults to Basic 1 and **today (Wed 21 Oct 2026)**. The backend picks the term containing today, not the flagged one. Present, Late, Half day, Absent and Excused, with arrival time and note per pupil, plus "Mark the rest present". |
| Who is on today's Basic 1 register | ❌ **QA-225**: Esi and Yaa, who join Basic 1 only in **2027/28** (on 21 Oct 2026 they were in KG 2). The register and term totals use each pupil's *current* class whatever the date, so once promotions are entered, past and current registers list the wrong children. |
| Mark Esi present, Yaa late 08:25 "Traffic at Kaneshie" → Save | ✅ "Register saved · 2 marks saved for Basic 1." |
| Saturday 24 Oct | ✅ "This day is a weekend. There is no register to mark." |
| 14 Oct (the closure added in Phase 13) | ✅ "The school is closed (Emergency closure (flooding))…" |
| Future date (30 Oct) | ✅ View only, no Save. ⚠️ The message ("Only the class teacher, or a school leader, can mark it") gives the wrong reason; the real reason is that the date is in the future. |
| Past date (1 Sept) | ✅ Can be marked (backfilling allowed). |
| Another class (Basic 2) | ✅ Viewable, read-only. |
| Term totals | ✅ "36 school days from Tue 1 Sept to Wed 21 Oct" (the closure is excluded). Rates count marked days only. ❌ QA-225: the Basic 2 totals list Kwame, Kobby and Kojo (next year's Basic 2). |

## Phase 15: Bill and report designs (Principal)

| Step | Result |
|---|---|
| Open `/school-admin/templates` | ✅ **QA-057 fixed** (no 500). Clear empty state: "Parents currently get Fastrack's standard fee bill… 1) upload a sample, 2) start a new design, 3) adjust, then Publish." |
| Start a new design | ✅ Three starters (Classic bill recommended, Simple grouped fees, Compact). Classic opens as "v1 · Draft" with sections, page settings and a live preview. |
| "Show a real bill (invoice id)" with `INV/BIS-001/2026/0033` | ❌ **QA-226**: only the internal database UUID works. The invoice number staff can see fails with the raw "invoiceId must be a UUID". ❌ 🔁 QA-070: the error **stays** after the field is cleared. |
| Builder preview header | ❌ **QA-231** (spotted by the reviewer after the run): the preview shows "FASTRACK INTERNATIONAL SCHOOL", `FIS/STD/2026/014`, "East Legon, Accra" and `bursar@fastrack.school`, a hard-coded sample from another (real) school, with no logo. Bismark's own name, logo and contacts never appear while designing. |
| Rename to a 130-character name | ❌ 🔁 QA-070c: the server rejects it ("shorter than or equal to 120 characters"), but the UI shows nothing new; only the old preview error is still visible. |
| Change the main colour, rename, Publish | ✅ "This version is live and can't be changed. Use Edit a copy to make changes." |
| Edit a copy (v2) → change text size to 16 → switch to v1 within 1 s → back to v2 | ❌ 🔁 **QA-065**: the edit was **silently lost** (v2 still shows 11), no save was sent, and there was no unsaved-changes warning. |
| Parent app → bill → "View printable bill" | ✅ Uses the **published** design (green main colour). |
| Public bill link (the one sent by SMS) | ❌ **QA-228**: still renders Fastrack's **default** design, so parents see two different-looking bills. |
| Old SMS link for a Term 1 bill, opened later | ❌ **QA-227 (High)**: the "SUMMARY TERM 1 2026/27" bill now shows Esi's **current** class (BASIC 1; she was billed as KG 2), "Bal B/f 3,130.00" and "TOTAL FEES DUE 4,629.50" (her current all-time balance), all under "DIGITALLY SIGNED & SEALED · Tamper-Proof & Verified". The JSON status is "PARTIAL" although the bill was moved to the next term. |
| Terminal report designs | ⚠️ Can be designed and published, but parents' Reports tab says "Terminal reports coming soon" and there's no score entry anywhere 🔁 QA-034. |

## Phase 16: Parent portal and online payment

| Step | Result |
|---|---|
| Parent bill detail | ✅ Clear breakdown, "Arrears from last term", balance, "Pay now". |
| Bills summary | ❌ 🔁 **QA-222**: "GHS 0.50 paid **of GHS 9,119.00**" for Esi, whose real total billed is GHS 4,630. Every carried-forward bill is counted again each term. |
| Pay now → dialog | ✅ Part or full amount, Mobile Money or Card, explains the redirect. |
| Pay with the account email `grace.adjei@bis.test` | ❌ **QA-229**: Paystack refuses with **"Invalid Email Address Passed"**, shown raw in the dialog. Checkout always sends the parent's login email. Any parent whose email Paystack rejects (typos, unusual domains) can never pay online, and there's no phone-only option. (Partly a test-data artefact: `.test` domains.) |
| New parent with a normal email, links Nana by **phone** | ✅ Linked. ⚠️ One phone number has now linked two parent accounts to the same child with no notice to the first. |
| Card GHS 1,000 → Paystack test page → **Cancel Payment** | ✅ Back on the bill, nothing charged. ⚠️ No "payment cancelled" message. |
| Card GHS 1,000 → **Success** | ✅ "Payment received · GHS 1,000.00 paid. Receipt RCT/BIS-001/2026/0011. Balance left: GHS 2,930.00." The ledger has one card payment with the Paystack reference. |
| Reload the callback page twice | ✅ No double credit (verify is idempotent). |
| Attendance | ✅ Month grid with legend. "14 school days have not been marked yet". |
| Home "Coming up this term" | ⚠️ **QA-230**: shows only three events (all on 16 Oct, no year), leaves out the **PTA meeting for parents** (the one event addressed to them), and there's no calendar page to see the rest. |
| Reports | ✅ Honest: "Terminal reports coming soon". |

## Phase 17: Cross-cutting

| Step | Result |
|---|---|
| In-app change password (Secretary) | ✅ "Password changed · Any other devices signed in… have been signed out" (204). The alias-less query in the refresh-token repository did not fail here. |
| Sign out, then reuse the old refresh token | ✅ **QA-009 fixed**: the UI calls `/auth/logout`, and the old refresh token returns 401. ⚠️ Tokens are still kept in `localStorage`. |
| Tab 1 = Secretary; tab 2 signs out and signs in as Account Officer | ❌ 🔁 **QA-008**: tab 1 silently becomes the Account Officer (opens Fees & Billing with the Account Officer menu) with no notice. |
| 390 px and 768 px on Fees, Students, Staff, Calendar and Service requests | ✅ No sideways scroll. |
| Sample-data pages | ❌ 🔁 QA-034: every role's Overview, and most menu items (Gradebook, Timetable, Academic performance, Payment plans, Budgets, Meal menu, Gallery, Question bank…), show invented data in a live school. |

## Follow-up review questions (after the run)

| Question | Answer |
|---|---|
| Is there anything that identifies the invoices created in one billing run? | ❌ **QA-232**: no. Each invoice has its own `id`, number, access token and signature, but no run ID. In BIS-001 the 7 runs can only be guessed from type, title, term and the second they were issued. |
| How are teachers assigned to classes? | School setup → Classes → Edit → **Class teacher** (Principal or Academic Head; the teacher must have activated their account). That's the only assignment. ❌ **QA-233**: no subject teachers. ❌ **QA-234**: one teacher per class. ❌ **QA-235**: no per-term history. 🔁 QA-016: assignment doesn't limit what teachers see. 🔁 QA-208: identical names in the picker. |

## Ledger reconciliation (end of run)

| Check | Count | GHS |
|---|---|---|
| Payments recorded (cash, MoMo, card) | 11 | 8,870.50 |
| Σ payments on invoices | — | 8,870.50 ✅ |
| Σ paid on student accounts | — | 8,870.50 ✅ |
| Σ open invoice balances | 10 | 35,789.50 |
| Σ student account balances | 10 | 35,789.50 ✅ |

**No money was lost or double-counted** in the ledger across partial, exact, over- and under-payments, extra bills, discounts, bill corrections, two term rollovers, promotion, exits and an online payment. The problems are in **what people are shown**: KPI cards, parent totals, public bills, receipts and statuses.

