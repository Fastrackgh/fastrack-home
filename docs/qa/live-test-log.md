# Live test log

These tests ran on 20 Oct 2026 against backend `fastrack-backend` HEAD `01dda02` (plus its uncommitted AdminJS and seed edits) and a throwaway database. The raw request and response log is at the bottom; tokens are redacted.

## Setup (reproducible)

```bash
cd fastrack-backend
createdb fastrack_qa
export DATABASE_URL=postgresql://<user>@localhost:5432/fastrack_qa REDIS_URL=redis://localhost:6379/9
pnpm build && pnpm migration:run && pnpm seed
NODE_ENV=development PORT=3100 THROTTLE_ENABLED=false MEDIA_STORAGE_DRIVER=local \
  MEDIA_LOCAL_ROOT=/tmp/fastrack_qa_media node dist/src/main
```

- **Seeded schools:**
  - **FIS-001** (Fastrack International School)
  - **RIV-002** (Riverside Academy)
- **Accounts:** every demo user's password is `S3curePassw0rd!`. Throttling was switched off so repeated calls weren't blocked; the throttling finding was assessed from the code.

| Token | User | Role / school |
|---|---|---|
| `sa` | `SUPER_ADMIN_EMAIL` from `.env` | Super Admin |
| `fhead` | head@fastrack.school | Principal, FIS |
| `fah` | academic@fastrack.school | Academic Head, FIS |
| `fteach` | kwame.mensah@fastrack.school | Teacher, FIS |
| `fsec` | akosua.boateng@fastrack.school | Secretary, FIS |
| `rhead` | head@riverside.school | Principal, RIV |
| `rao` | accounts@riverside.school | Account Officer, RIV |
| `rsec` | admin@riverside.school | Secretary, RIV |
| `rah` | academic@riverside.school | Academic Head, RIV |
| `rteach` | kofi.asante@riverside.school | Teacher, RIV |

## Results

| # | Probe | Result | Finding |
|---|---|---|---|
| 1 | FIS Principal reads a RIV invoice, student and latest invoice by id | 404 ×3 ✅ isolation holds | — |
| 2 | FIS Principal pays a RIV student | 404 ✅ | — |
| 3 | Teacher, Secretary or Academic Head records a payment | 403 ×3 ✅ | — |
| 4 | Send `schoolId` of another school when creating a student | 403 ✅ | — |
| 5 | `?limit=100000` | 400 (max 100) ✅ | feeds QA-030 |
| 6 | 5 parallel GHS 100 payments on one invoice | **5 payment rows (GHS 500), but invoice shows `total_payment=100`, `balance=1350`** ❌ | **QA-001** |
| 7 | Arrears: Term 1 GHS 1450, pay 400, generate Term 2 (arrears 1050, balance 2500), pay 2500 | **Fee account balance 0, but Term 2 invoice still owes GHS 1050** ❌ | **QA-002** |
| 8 | Deactivate RIV, then log in, pay and refresh | **login 200, payment 201, refresh 200** ❌ | **QA-003** |
| 9 | Same payment body (`transactionReference` MTN-123) posted twice | **201, 201 (double credit)** ❌ | **QA-004** |
| 10 | Client-chosen `receiptNumber` used twice | 201, then **500** ❌ | QA-004 |
| 11 | `amount: 99999999999` | **500** ❌ | QA-019 |
| 12 | `paymentDate: 2030-01-01` | 201 ❌ | QA-018 |
| 13 | `amount: -5` | 400 ✅ | — |
| 14 | Pay GHS 50,000 on a GHS 1,450 bill | 201, no cap or warning ❌ | QA-029 |
| 15 | Generate invoices twice for the same term | second run skipped 3 ✅ (no duplicates) | — |
| 16 | Public invoice by **UUID**, no auth | 200, full invoice ❌ | **QA-010** |
| 17 | FIS Principal reads RIV's background job `1` | 200, job state and result ❌ | QA-011 |
| 18 | Student exited (`Transferred_Out`), then pay | 201 ❌; open Term 1 invoice stays GHS 1440 | QA-017 |
| 19 | Generate an invoice for the exited student | 400 ✅ (only active students are billed) | partly disproves the agent's claim |
| 20 | Disable `fees` for FIS while signed in, then list invoices | 403 immediately ✅ | — |
| 21 | Public invoice while `fees` is disabled | 200 ❌ (not gated by module) | QA-022 |
| 22 | Register a parent with a staff email | 409 "Email already registered" ❌ (shows the email exists) | QA-014 |
| 23 | Two parallel refreshes with one token | one 200, one 401 "reuse detected" (family revoked) ✅ for security; ⚠️ breaks multi-tab | QA-008 |
| 24 | Refresh after the frontend "logs out" (it never calls `/auth/logout`) | 200 ❌ | QA-009 |
| 25 | Security headers on `/api/health` | `X-Powered-By: Express`; no HSTS, CSP or X-Frame ❌ | QA-012 |
| 26 | `/api/docs` (Swagger) | 200 ❌ | QA-012 |
| 27 | CORS from `Origin: https://evil.example` | `Allow-Origin: *` + `Allow-Credentials: true` ❌ | QA-012 |
| 28 | Teacher `GET /schools/me/students` | all students, including `guardianContact` and `nationalId` ❌ | **QA-016** |
| 29 | 30 wrong AdminJS logins | 30 × 200, no lockout or 429 ❌ | **QA-005** |
| 30 | `/schools/me/academic-terms/current` when no term has `is_current=true` | resolves by date (the seed sets no current flag) ⚠️ | QA-047 |
| 31 | Academic Head `POST /users` role ACCOUNT_OFFICER with a password, then logs in as it and records a payment | 201, login ok, payment 201 ❌ privilege escalation | **QA-013** |
| 32 | Secretary `POST /students/:id/exit` | 403 ✅ | — |
| 33 | Secretary `PATCH /students/:id {"status":"Graduated"}` | 200, status Graduated ❌ bypasses `students:exit` | QA-024 |

Not run live, but confirmed in the code (see `findings.md`): invitation reactivation (QA-007), notification token leakage (QA-006), OTP send crash (QA-021), and the parent flows.

## Browser walk-through

Run on 20 Oct 2026 (afternoon) with headless Chromium (Playwright). The frontend was this repo's working tree, including uncommitted calendar, templates and fees work. The backend was `fastrack-backend` at `0c540b1` plus its uncommitted document-template edits. Both pointed at a fresh `fastrack_qa` database, which was dropped afterwards. Scripts are in [browser-walkthrough/](./browser-walkthrough/), and the key screenshots are in [screenshots/](./screenshots/).

```bash
# backend as in Setup above, on :3100; then the frontend on :3101
NEXT_PUBLIC_API_URL=http://localhost:3100/api pnpm dev -p 3101
cd docs/qa/browser-walkthrough && npm i playwright && npx playwright install chromium
node 01-route-sweep.js          # every role × every route
node 02-flows.js                # journeys (or name one: node 02-flows.js feesJourney)
FIS_ID=<FIS-001 school id> node 02-flows.js platformControls
FIS_ID=<FIS-001 school id> node 03-module-off.js
```

| # | Journey | Role | What happened | ID |
|---|---|---|---|---|
| B1 | Sign in and visit every route | all 6 staff roles | Each lands correctly; out-of-scope pages redirect to the dashboard. Teacher opens `/students` by URL (whole school); AO opens `/staff`; Secretary opens `/attendance`; AH opens `/admissions`. Calendar redirects for everyone. Templates returns 500. | QA-016, QA-051, QA-057, QA-058 |
| B2 | Wrong password / unknown email / empty form | anon | Same "Invalid credentials" for both (good), shown 3 times; empty submit shows nothing; no forgot-password link | QA-059, QA-027 |
| B3 | Open the invite-email link `/auth/setup-password?token=…` | anon | 404 | QA-015 |
| B4 | Submit the waitlist (`/coming-soon`) and the Contact form (`/`) | anon | Both show success; 0 POST requests leave the browser | QA-020 |
| B5 | Generate Term Invoices | AO | 3 invoices created; toast "Generated undefined student invoices totaling GHS 0.00" | QA-028 |
| B6 | Record Payment: pick student, type 50 at once, double-click submit | AO | 1 POST (double-click guarded); recorded **GHS 1,450.00**, not 50 | QA-055, QA-004 |
| B7 | Staff page | Principal | Only the teacher is listed | QA-036 |
| B8 | Invite an Account Officer | Academic Head | Dialog offers AO; `POST /api/users` 201; "will receive an email" | QA-013 |
| B9 | Log out, then reuse the old refresh token | Principal | No `/auth/logout` call; storage cleared; old refresh token → 200 | QA-009 |
| B10 | Two tabs refresh an expired token at once | Principal | Both stayed signed in (race not triggered) | QA-008 |
| B11 | Refresh request fails (network) | Principal | Redirected to login; storage wiped | QA-037 |
| B12 | Students/invoices API returns 500 | Principal | Error toast shown, but KPIs show 0 and the table shows "no matches" | QA-039 |
| B13 | Super Admin switches Fees off; AO's page is open | SA + AO | Open page: 3 "module not enabled" toasts, buttons remain. Reload: menu item gone, redirect to dashboard | QA-035 |
| B14 | Super Admin deactivates FIS-001 from the UI | SA + Principal + AO | "School deactivated" toast. Principal signs in fresh and sees students; AO's session continues. Re-activated afterwards. | QA-003 |
| B15 | Platform overview and school page | SA | Total staff 3 (should be 10); school page Staff 1 (should be 4 + Principal) | QA-056 |
| B16 | Phone width (390 px) | Principal | Dashboard, Students, Fees, Staff: no horizontal scroll | — |

Not walked: parent pages (no seeded parent), the admission wizard, receipt printing, and dark mode.

## Raw log (tokens redacted)

```text
### current term rao
GET /schools/me/academic-terms/current as rao 
-> 200 {"data":{"id":"e121b5d1-ee99-4139-8173-beca791c3747","schoolId":"c7b2c267-ed9d-4d3e-8034-d8f531abc42b","academicYearId":"9cc7b777-98ec-4ad6-bf5b-09ff96846ff7","termSequence":1,"termLabel":"Term 1","startDate":"2026-09-01","endDate":"2026-12-18","isCurrent":false,"createdAt":"2026-10-20T11:46:16.931Z"},"success":true,"message":""}

### generate invoices rao
POST /schools/me/invoices/generate as rao {"academicTermId":"e121b5d1-ee99-4139-8173-beca791c3747"}
-> 201 {"data":{"generatedCount":3,"skippedCount":0,"totalProcessed":3,"termId":"e121b5d1-ee99-4139-8173-beca791c3747","termLabel":"Term 1","yearLabel":"2026/27","classId":"26eed8dd-594d-4929-81af-5202f0eda23c","className":"Primary 1","message":"Successfully generated 3 term invoice(s) for Term 1 (Primary 1).","invoice":null},"success":true,"message":""}

### current term fhead
GET /schools/me/academic-terms/current as fhead 
-> 200 {"data":{"id":"e5aba8fb-8d2f-432e-bbb0-2f7c35623feb","schoolId":"ce1fc064-14a1-49b4-8cc4-bdb8d18c53ea","academicYearId":"c78acfc7-66d7-4cd4-8bbc-f03594b96e24","termSequence":1,"termLabel":"Term 1","startDate":"2026-09-01","endDate":"2026-12-18","isCurrent":false,"createdAt":"2026-10-20T11:46:16.635Z"},"success":true,"message":""}

### generate invoices fhead
POST /schools/me/invoices/generate as fhead {"academicTermId":"e5aba8fb-8d2f-432e-bbb0-2f7c35623feb"}
-> 201 {"data":{"generatedCount":3,"skippedCount":0,"totalProcessed":3,"termId":"e5aba8fb-8d2f-432e-bbb0-2f7c35623feb","termLabel":"Term 1","yearLabel":"2026/27","classId":"a2ea6a4c-229f-448f-b016-0e0276923bc4","className":"Primary 2","message":"Successfully generated 3 term invoice(s) for Term 1 (Primary 2).","invoice":null},"success":true,"message":""}

### list invoices rao
GET /schools/me/invoices?limit=3 as rao 
-> 200 {"data":{"items":[{"id":"67344eb6-3c4e-43b2-9caa-38b950909ef5","invoiceNumber":"INV/RIV-002/2026/0001","invoiceType":"regular_term","title":"Term 1 Term Fees","accessToken":"<redacted>","viewUrl":"http://localhost:3100/api/public/invoices/67344eb6-3c4e-43b2-9caa-38b950909ef5","schoolId":"c7b2c267-ed9d-4d3e-8034-d8f531abc42b","schoolStudentId":"84899cf3-b943-4799-a946-5587efd798d5","studentId":"65cc2232-2078-48c6-9bbe-12743ad7f909","studentCode":"RIV-002/STD/2026/002","studentName":"Abena Osei","className":"Primary 1","academicYearId":"9cc7b777-98ec-4ad6-bf5b-09ff96846ff7"

### list invoices fhead
GET /schools/me/invoices?limit=2 as fhead 
-> 200 {"data":{"items":[{"id":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","invoiceNumber":"INV/FIS-001/2026/0001","invoiceType":"regular_term","title":"Term 1 Term Fees","accessToken":"<redacted>","viewUrl":"http://localhost:3100/api/public/invoices/a689d489-cdd5-44a0-a7f7-278e09d6a7c4","schoolId":"ce1fc064-14a1-49b4-8cc4-bdb8d18c53ea","schoolStudentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","studentId":"17c8f258-f30b-4f92-a7c7-fddd082f66fb","studentCode":"FIS-001/STD/2026/003","studentName":"Yaw Agyemang","className":"Primary 2","academicYearId":"c78acfc7-66d7-4cd4-8bbc-f03594b96e2

### IDOR invoice
GET /schools/me/invoices/67344eb6-3c4e-43b2-9caa-38b950909ef5 as fhead 
-> 404 {"message":"Invoice not found","error":"Not Found","statusCode":404}

### IDOR student
GET /schools/me/students/84899cf3-b943-4799-a946-5587efd798d5 as fhead 
-> 404 {"message":"Student not found","error":"Not Found","statusCode":404}

### IDOR latest invoice
GET /schools/me/invoices/students/84899cf3-b943-4799-a946-5587efd798d5/latest as fhead 
-> 404 {"message":"Student not found in this school","error":"Not Found","statusCode":404}

### IDOR pay other school student
POST /schools/me/payments as fhead {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":10,"paymentMethod":"CASH"}
-> 400 {"message":["paymentMethod must be one of the following values: Cash, MoMo, Bank Transfer, Cheque"],"error":"Bad Request","statusCode":400}

### role pay rteach
POST /schools/me/payments as rteach {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":1,"paymentMethod":"CASH"}
-> 403 {"message":"Forbidden resource","error":"Forbidden","statusCode":403}

### role pay rsec
POST /schools/me/payments as rsec {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":1,"paymentMethod":"CASH"}
-> 403 {"message":"Forbidden resource","error":"Forbidden","statusCode":403}

### role pay rah
POST /schools/me/payments as rah {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":1,"paymentMethod":"CASH"}
-> 403 {"message":"Forbidden resource","error":"Forbidden","statusCode":403}

### F01 concurrent 1
POST /schools/me/payments as fhead {"studentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","amount":100,"paymentMethod":"CASH"}
-> 400 {"message":["paymentMethod must be one of the following values: Cash, MoMo, Bank Transfer, Cheque"],"error":"Bad Request","statusCode":400}

### F01 concurrent 3
POST /schools/me/payments as fhead {"studentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","amount":100,"paymentMethod":"CASH"}
-> 400 {"message":["paymentMethod must be one of the following values: Cash, MoMo, Bank Transfer, Cheque"],"error":"Bad Request","statusCode":400}

### F01 concurrent 2
POST /schools/me/payments as fhead {"studentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","amount":100,"paymentMethod":"CASH"}
-> 400 {"message":["paymentMethod must be one of the following values: Cash, MoMo, Bank Transfer, Cheque"],"error":"Bad Request","statusCode":400}

### F01 concurrent 4
POST /schools/me/payments as fhead {"studentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","amount":100,"paymentMethod":"CASH"}
-> 400 {"message":["paymentMethod must be one of the following values: Cash, MoMo, Bank Transfer, Cheque"],"error":"Bad Request","statusCode":400}

### F01 concurrent 5
POST /schools/me/payments as fhead {"studentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","amount":100,"paymentMethod":"CASH"}
-> 400 {"message":["paymentMethod must be one of the following values: Cash, MoMo, Bank Transfer, Cheque"],"error":"Bad Request","statusCode":400}

### IDOR pay other school student
POST /schools/me/payments as fhead {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":10,"paymentMethod":"Cash"}
-> 404 {"message":"Student not found in this school","error":"Not Found","statusCode":404}

### F01 concurrent 5
POST /schools/me/payments as fhead {"studentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","amount":100,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"1e60b05b-7342-47cc-9035-17d81d5cf6b1","receiptNumber":"RCT/FIS-001/2026/0001","paymentDate":"2026-10-20","amountPaid":100,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","invoiceNumber":"INV/FIS-001/2026/0001","studentId":"17c8f258-f30b-4f92-a7c7-fddd082f66fb","studentCode":"FIS-001/STD/2026/003","studentName":"Yaw Agyemang","className":"Primary 2","previousBalance":1450,"newBalance":1350,"surplusCredit":0,"recordedByName":"Ama Owusu","createdAt":"2026-10-20T12:01:19.174Z"}],"success":true,"message":""}

### F01 concurrent 3
POST /schools/me/payments as fhead {"studentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","amount":100,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"faa380b6-2154-4244-beee-8f8547ec5f8b","receiptNumber":"RCT/FIS-001/2026/0002","paymentDate":"2026-10-20","amountPaid":100,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","invoiceNumber":"INV/FIS-001/2026/0001","studentId":"17c8f258-f30b-4f92-a7c7-fddd082f66fb","studentCode":"FIS-001/STD/2026/003","studentName":"Yaw Agyemang","className":"Primary 2","previousBalance":1450,"newBalance":1350,"surplusCredit":0,"recordedByName":"Ama Owusu","createdAt":"2026-10-20T12:01:19.179Z"}],"success":true,"message":""}

### F01 concurrent 1
POST /schools/me/payments as fhead {"studentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","amount":100,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"4891b58a-be78-4120-ad3f-50c228a78d7f","receiptNumber":"RCT/FIS-001/2026/0003","paymentDate":"2026-10-20","amountPaid":100,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","invoiceNumber":"INV/FIS-001/2026/0001","studentId":"17c8f258-f30b-4f92-a7c7-fddd082f66fb","studentCode":"FIS-001/STD/2026/003","studentName":"Yaw Agyemang","className":"Primary 2","previousBalance":1450,"newBalance":1350,"surplusCredit":0,"recordedByName":"Ama Owusu","createdAt":"2026-10-20T12:01:19.190Z"}],"success":true,"message":""}

### F01 concurrent 4
POST /schools/me/payments as fhead {"studentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","amount":100,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"8284d8ca-7f96-49a3-a69d-4dc3ba13fe95","receiptNumber":"RCT/FIS-001/2026/0004","paymentDate":"2026-10-20","amountPaid":100,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","invoiceNumber":"INV/FIS-001/2026/0001","studentId":"17c8f258-f30b-4f92-a7c7-fddd082f66fb","studentCode":"FIS-001/STD/2026/003","studentName":"Yaw Agyemang","className":"Primary 2","previousBalance":1450,"newBalance":1350,"surplusCredit":0,"recordedByName":"Ama Owusu","createdAt":"2026-10-20T12:01:19.194Z"}],"success":true,"message":""}

### F01 concurrent 2
POST /schools/me/payments as fhead {"studentId":"d7b76159-06e6-4523-9b3f-ec1cc792ed62","invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","amount":100,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"1ad7cab6-e063-4aac-8a04-950437e7c2de","receiptNumber":"RCT/FIS-001/2026/0005","paymentDate":"2026-10-20","amountPaid":100,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","invoiceNumber":"INV/FIS-001/2026/0001","studentId":"17c8f258-f30b-4f92-a7c7-fddd082f66fb","studentCode":"FIS-001/STD/2026/003","studentName":"Yaw Agyemang","className":"Primary 2","previousBalance":1450,"newBalance":1350,"surplusCredit":0,"recordedByName":"Ama Owusu","createdAt":"2026-10-20T12:01:19.189Z"}],"success":true,"message":""}

payment rows|5|500.00
invoice total_payment/balance|100.00|1350.00
### F04 dup 1
POST /schools/me/payments as rao {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","invoiceId":"67344eb6-3c4e-43b2-9caa-38b950909ef5","amount":50,"paymentMethod":"MoMo","transactionReference":"MTN-123"}
-> 201 {"data":[{"id":"9723f2df-0be6-46a7-ab48-a17c6cb1abb9","receiptNumber":"RCT/RIV-002/2026/0001","paymentDate":"2026-10-20","amountPaid":50,"paymentMethod":"MoMo","bankType":null,"transactionReference":"MTN-123","invoiceId":"67344eb6-3c4e-43b2-9caa-38b950909ef5","invoiceNumber":"INV/RIV-002/2026/0001","studentId":"65cc2232-2078-48c6-9bbe-12743ad7f909","studentCode":"RIV-002/STD/2026/002","studentName":"Abena Osei","className":"Primary 1","previousBalance":1450,"newBalance":1400,"surplusCredit":0,"recordedByName":"Abena Mansa","createdAt":"2026-10-20T12:01:51.296Z"}],"success":true,"message":""}

### F04 dup 2
POST /schools/me/payments as rao {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","invoiceId":"67344eb6-3c4e-43b2-9caa-38b950909ef5","amount":50,"paymentMethod":"MoMo","transactionReference":"MTN-123"}
-> 201 {"data":[{"id":"ce0ad76f-143f-42cd-80dd-c665c0ecb986","receiptNumber":"RCT/RIV-002/2026/0002","paymentDate":"2026-10-20","amountPaid":50,"paymentMethod":"MoMo","bankType":null,"transactionReference":"MTN-123","invoiceId":"67344eb6-3c4e-43b2-9caa-38b950909ef5","invoiceNumber":"INV/RIV-002/2026/0001","studentId":"65cc2232-2078-48c6-9bbe-12743ad7f909","studentCode":"RIV-002/STD/2026/002","studentName":"Abena Osei","className":"Primary 1","previousBalance":1400,"newBalance":1350,"surplusCredit":0,"recordedByName":"Abena Mansa","createdAt":"2026-10-20T12:01:51.340Z"}],"success":true,"message":""}

### F04 receipt 1
POST /schools/me/payments as rao {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":1,"paymentMethod":"Cash","receiptNumber":"RCT/X/2026/999999"}
-> 201 {"data":[{"id":"c1752842-de97-4cc8-9384-3a7034196131","receiptNumber":"RCT/X/2026/999999","paymentDate":"2026-10-20","amountPaid":1,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"67344eb6-3c4e-43b2-9caa-38b950909ef5","invoiceNumber":"INV/RIV-002/2026/0001","studentId":"65cc2232-2078-48c6-9bbe-12743ad7f909","studentCode":"RIV-002/STD/2026/002","studentName":"Abena Osei","className":"Primary 1","previousBalance":1350,"newBalance":1349,"surplusCredit":0,"recordedByName":"Abena Mansa","createdAt":"2026-10-20T12:01:51.385Z"}],"success":true,"message":""}

### F04 receipt 2
POST /schools/me/payments as rao {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":1,"paymentMethod":"Cash","receiptNumber":"RCT/X/2026/999999"}
-> 500 {"statusCode":500,"message":"Internal server error"}

### F19 overflow
POST /schools/me/payments as rao {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":99999999999,"paymentMethod":"Cash"}
-> 500 {"statusCode":500,"message":"Internal server error"}

### F18 future date
POST /schools/me/payments as rao {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":1,"paymentMethod":"Cash","paymentDate":"2030-01-01"}
-> 201 {"data":[{"id":"87b59b9a-7a5b-4d83-b17a-fe29e88a5731","receiptNumber":"RCT/RIV-002/2026/1000000","paymentDate":"2030-01-01","amountPaid":1,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"67344eb6-3c4e-43b2-9caa-38b950909ef5","invoiceNumber":"INV/RIV-002/2026/0001","studentId":"65cc2232-2078-48c6-9bbe-12743ad7f909","studentCode":"RIV-002/STD/2026/002","studentName":"Abena Osei","className":"Primary 1","previousBalance":1349,"newBalance":1348,"surplusCredit":0,"recordedByName":"Abena Mansa","createdAt":"2026-10-20T12:01:51.511Z"}],"success":true,"message":""}

### negative
POST /schools/me/payments as rao {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":-5,"paymentMethod":"Cash"}
-> 400 {"message":["amount must not be less than 0.01"],"error":"Bad Request","statusCode":400}

### overpay
POST /schools/me/payments as rao {"studentId":"6ade776e-6289-4537-b209-ada028cdf8e9","amount":50000,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"25e33d48-5b43-415f-b258-b0a06ea3e72b","receiptNumber":"RCT/RIV-002/2026/1000001","paymentDate":"2026-10-20","amountPaid":50000,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"c03d3254-d601-490a-9280-32b38cff90bb","invoiceNumber":"INV/RIV-002/2026/0002","studentId":"7ece9288-5abe-4036-96b3-b1b9a39005f2","studentCode":"RIV-002/STD/2026/003","studentName":"Yaw Agyemang","className":"Primary 2","previousBalance":1450,"newBalance":-48550,"surplusCredit":48550,"recordedByName":"Abena Mansa","createdAt":"2026-10-20T12:01:51.563Z"}],"success":true,"messa

### F19 dueDate soon
POST /schools/me/invoices/generate as rao {"academicTermId":"e121b5d1-ee99-4139-8173-beca791c3747","dueDate":"soon"}
-> 201 {"data":{"generatedCount":0,"skippedCount":3,"totalProcessed":3,"termId":"e121b5d1-ee99-4139-8173-beca791c3747","termLabel":"Term 1","yearLabel":"2026/27","classId":"26eed8dd-594d-4929-81af-5202f0eda23c","className":"Primary 1","message":"Successfully generated 0 term invoice(s) for Term 1 (Primary 1). (3 already billed)","invoice":null},"success":true,"message":""}

### F10 public uuid
GET /public/invoices/67344eb6-3c4e-43b2-9caa-38b950909ef5?format=json as anon 
-> 200 {"id":"67344eb6-3c4e-43b2-9caa-38b950909ef5","invoiceNumber":"INV/RIV-002/2026/0001","invoiceType":"regular_term","title":"Term 1 Term Fees","issuedAt":"2026-10-20T12:00:58.168Z","dueDate":null,"status":"PARTIAL","signature":"<token>","isVerified":true,"signedAt":"2026-10-20T12:00:58.192Z","signedByEmail":"accounts@riverside.school","school":{"name":"Riverside Academy","code":"RIV-002","logoUrl":null,"email":"info@riverside.school","phone":"+233244987654","address":"5 Lake Road, Kumasi","currency":"GHS"},"student":{"studentId":"65cc2232-

### F11 async gen
POST /schools/me/invoices/generate/async as rao {"academicTermId":"e121b5d1-ee99-4139-8173-beca791c3747"}
-> 201 {"data":{"jobId":"1","status":"QUEUED","message":"Batch invoice generation job enqueued in BullMQ background queue"},"success":true,"message":""}

### F11 job 1 as FIS
GET /schools/me/invoices/jobs/1 as fhead 
-> 200 {"data":{"id":"1","state":"completed","progress":100,"result":{"count":0,"timestamp":"2026-10-20T12:01:51.672Z"}},"success":true,"message":""}

### F11 job 2 as FIS
GET /schools/me/invoices/jobs/2 as fhead 
-> 404 {"message":"Job with ID 2 not found","error":"Not Found","statusCode":404}

### F03 deactivate RIV
PATCH /super-admin/schools/c7b2c267-ed9d-4d3e-8034-d8f531abc42b/deactivate as sa {}
-> 200 {"data":{"id":"c7b2c267-ed9d-4d3e-8034-d8f531abc42b","name":"Riverside Academy","code":"RIV-002","address":"5 Lake Road, Kumasi","phone":"+233244987654","email":"info@riverside.school","website":"https://riverside.school","logoUrl":null,"isActive":false,"createdAt":"2026-10-20T11:46:16.717Z"},"success":true,"message":""}

is_active|f
login while suspended: 200
### F03 pay while suspended
POST /schools/me/payments as rao {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":1,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"2c334145-2e81-4788-81d6-ba9df89e736e","receiptNumber":"RCT/RIV-002/2026/1000002","paymentDate":"2026-10-20","amountPaid":1,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"67344eb6-3c4e-43b2-9caa-38b950909ef5","invoiceNumber":"INV/RIV-002/2026/0001","studentId":"65cc2232-2078-48c6-9bbe-12743ad7f909","studentCode":"RIV-002/STD/2026/002","studentName":"Abena Osei","className":"Primary 1","previousBalance":1348,"newBalance":1347,"surplusCredit":0,"recordedByName":"Abena Mansa","createdAt":"2026-10-20T12:02:06.534Z"}],"success":true,"message":""}

### F03 refresh while suspended
POST /auth/refresh as anon {"refreshToken":"<redacted>"}
-> 200 {"data":{"accessToken":"<redacted>

### F03 reactivate
PATCH /super-admin/schools/c7b2c267-ed9d-4d3e-8034-d8f531abc42b/activate as sa {}
-> 200 {"data":{"id":"c7b2c267-ed9d-4d3e-8034-d8f531abc42b","name":"Riverside Academy","code":"RIV-002","address":"5 Lake Road, Kumasi","phone":"+233244987654","email":"info@riverside.school","website":"https://riverside.school","logoUrl":null,"isActive":true,"createdAt":"2026-10-20T11:46:16.717Z"},"success":true,"message":""}

### F17 exit
POST /schools/me/students/879b8231-6121-4838-b9eb-ff35b8b0602a/exit as rhead {"exitReason":"Transferred","exitDate":"2026-10-20"}
-> 400 {"message":["property exitReason should not exist","academicTermId must be a UUID","status must be one of the following values: Pending_Admission, Active, Inactive, Stopped, Transferred_Out, Graduated"],"error":"Bad Request","statusCode":400}

### F17 bill exited
POST /schools/me/invoices/supplementary as rao {"studentId":"879b8231-6121-4838-b9eb-ff35b8b0602a","title":"Bus","items":[]}
-> 400 {"message":["property items should not exist","academicTermId should not be empty","academicTermId must be a UUID","feeTypeId should not be empty","feeTypeId must be a UUID"],"error":"Bad Request","statusCode":400}

### F17 pay exited
POST /schools/me/payments as rao {"studentId":"879b8231-6121-4838-b9eb-ff35b8b0602a","amount":5,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"af3df6cc-07e1-4425-92a4-50cdd13ddbc8","receiptNumber":"RCT/RIV-002/2026/1000003","paymentDate":"2026-10-20","amountPaid":5,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"f2c16cb6-5181-458d-8f4f-916eef9bccfa","invoiceNumber":"INV/RIV-002/2026/0003","studentId":"c735e5d1-6b05-4607-98d0-67826d201b74","studentCode":"RIV-002/STD/2026/001","studentName":"Kofi Ansah","className":"Primary 1","previousBalance":1450,"newBalance":1445,"surplusCredit":0,"recordedByName":"Abena Mansa","createdAt":"2026-10-20T12:02:06.659Z"}],"success":true,"message":""}

### F14 register-parent staff email
POST /auth/register-parent as anon {"email":"head@fastrack.school","password":"Xyz12345!a","firstName":"A","lastName":"B","phone":"0244000000"}
-> 409 {"message":"Email already registered","error":"Conflict","statusCode":409}

### F15 refresh 1
POST /auth/refresh as anon {"refreshToken":"<redacted>"}
-> 200 {"data":{"accessToken":"<redacted>

### F15 refresh 2
POST /auth/refresh as anon {"refreshToken":"<redacted>"}
-> 401 {"message":"Refresh token reuse detected","error":"Unauthorized","statusCode":401}

X-Powered-By: Express
swagger 200
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
### F17 exit
POST /schools/me/students/879b8231-6121-4838-b9eb-ff35b8b0602a/exit as rhead {"academicTermId":"e121b5d1-ee99-4139-8173-beca791c3747","status":"Transferred_Out"}
-> 400 {"message":["exitDate should not be empty","exitDate must be a valid ISO 8601 date string"],"error":"Bad Request","statusCode":400}

status after exit|Active
### F17 supplementary bill exited
POST /schools/me/invoices/supplementary as rao {"studentId":"879b8231-6121-4838-b9eb-ff35b8b0602a","academicTermId":"e121b5d1-ee99-4139-8173-beca791c3747","feeTypeId":"c1cb7988-c2b6-4e38-8a1d-76e9266f78d2","amount":100}
-> 400 {"message":["title should not be empty","title must be a string"],"error":"Bad Request","statusCode":400}

### F17 exit
POST /schools/me/students/879b8231-6121-4838-b9eb-ff35b8b0602a/exit as rhead {"academicTermId":"e121b5d1-ee99-4139-8173-beca791c3747","status":"Transferred_Out","exitDate":"2026-10-20"}
-> 201 {"data":{"id":"879b8231-6121-4838-b9eb-ff35b8b0602a","studentId":"c735e5d1-6b05-4607-98d0-67826d201b74","studentCode":"RIV-002/STD/2026/001","firstName":"Kofi","surname":"Ansah","otherName":null,"fullName":"Kofi Ansah","birthDate":"2019-03-12","gender":"Male","status":"Transferred_Out","school":{"id":"c7b2c267-ed9d-4d3e-8034-d8f531abc42b","name":"Riverside Academy","code":"RIV-002","logoUrl":null},"currentClass":null,"admission":{"date":"2026-09-01","academicYear":{"id":"9cc7b777-98ec-4ad6-bf5b-09ff96846ff7","label":"2026/27"},"term":{"id":"e121b5d1-ee99-4139-8173-beca791c3747","label":"Term 1

status after exit|Transferred_Out
### F17 supplementary bill exited
POST /schools/me/invoices/supplementary as rao {"studentId":"879b8231-6121-4838-b9eb-ff35b8b0602a","academicTermId":"e121b5d1-ee99-4139-8173-beca791c3747","feeTypeId":"c1cb7988-c2b6-4e38-8a1d-76e9266f78d2","amount":100,"title":"Bus levy"}
-> 400 {"message":"No supplementary invoices could be generated. Please ensure classes have fee structures configured or specify an explicit amount.","error":"Bad Request","statusCode":400}

### F17 pay exited student
POST /schools/me/payments as rao {"studentId":"879b8231-6121-4838-b9eb-ff35b8b0602a","amount":5,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"e9ec622a-472f-4633-b22d-3c005753124a","receiptNumber":"RCT/RIV-002/2026/1000004","paymentDate":"2026-10-20","amountPaid":5,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"f2c16cb6-5181-458d-8f4f-916eef9bccfa","invoiceNumber":"INV/RIV-002/2026/0003","studentId":"c735e5d1-6b05-4607-98d0-67826d201b74","studentCode":"RIV-002/STD/2026/001","studentName":"Kofi Ansah","previousBalance":1445,"newBalance":1440,"surplusCredit":0,"recordedByName":"Abena Mansa","createdAt":"2026-10-20T12:02:34.896Z"}],"success":true,"message":""}

### F17 generate for exited student
POST /schools/me/invoices/generate as rao {"academicTermId":"e121b5d1-ee99-4139-8173-beca791c3747","studentId":"879b8231-6121-4838-b9eb-ff35b8b0602a"}
-> 400 {"message":"No invoices could be generated. Please ensure active students have classes assigned.","error":"Bad Request","statusCode":400}

open invoice balance for exited student|1440.00
### module toggle off fees FIS
POST /super-admin/modules/schools/ce1fc064-14a1-49b4-8cc4-bdb8d18c53ea/toggle as sa {"moduleId":"b64793bb-1937-4850-850a-da5d4817f90e","isEnabled":false}
-> 200 {"data":{"moduleId":"b64793bb-1937-4850-850a-da5d4817f90e","moduleKey":"fees","moduleName":"Fees & Billing","description":"Fee structures, invoices, payments","isEnabled":false,"enabledAt":"2026-10-20T11:46:16.653Z","disabledAt":"2026-10-20T12:02:35.115Z"},"success":true,"message":"School module status updated successfully"}

### fees list after disable
GET /schools/me/invoices?limit=1 as fhead 
-> 403 {"message":"The 'fees' module is not enabled for this school","error":"Forbidden","statusCode":403}

### public invoice after module disabled
GET /public/invoices/a689d489-cdd5-44a0-a7f7-278e09d6a7c4?format=json as anon 
-> 200 {"id":"a689d489-cdd5-44a0-a7f7-278e09d6a7c4","invoiceNumber":"INV/FIS-001/2026/0001","invoiceType":"regular_term","title":"Term 1 Term Fees","issuedAt":"2026-10-20T12:00:58.287Z","dueDate":null,"status":"PARTIAL","signature":"<token>","isVerified":true,"signedAt":"2026-10-20T12:00:58.294Z","signedByEmail":"head@fastrack.school","school":{"name":"Fastrack International School","code":"FIS-001","logoUrl":null,"email":"info@fastrack.school","phone":"+233244123456","address":"12 Independence Avenue, Accra","currency":"GHS"},"student":{"stude

### module toggle on fees FIS
POST /super-admin/modules/schools/ce1fc064-14a1-49b4-8cc4-bdb8d18c53ea/toggle as sa {"moduleId":"b64793bb-1937-4850-850a-da5d4817f90e","isEnabled":true}
-> 200 {"data":{"moduleId":"b64793bb-1937-4850-850a-da5d4817f90e","moduleKey":"fees","moduleName":"Fees & Billing","description":"Fee structures, invoices, payments","isEnabled":true,"enabledAt":"2026-10-20T12:02:35.181Z","disabledAt":null},"success":true,"message":"School module status updated successfully"}

### mass-assign schoolId
POST /schools/me/students as fhead {"schoolId":"c7b2c267-ed9d-4d3e-8034-d8f531abc42b","firstName":"X"}
-> 403 {"message":"You cannot access another school","error":"Forbidden","statusCode":403}

### pagination limit 100000
GET /schools/me/students?limit=100000 as fhead 
-> 400 {"message":["limit must not be greater than 100"],"error":"Bad Request","statusCode":400}

### current term rao after activity
GET /schools/me/academic-terms/current as rao 
-> 200 {"data":{"id":"e121b5d1-ee99-4139-8173-beca791c3747","schoolId":"c7b2c267-ed9d-4d3e-8034-d8f531abc42b","academicYearId":"9cc7b777-98ec-4ad6-bf5b-09ff96846ff7","termSequence":1,"termLabel":"Term 1","startDate":"2026-09-01","endDate":"2026-12-18","isCurrent":false,"createdAt":"2026-10-20T11:46:16.931Z"},"success":true,"message":""}

### current term fhead
GET /schools/me/academic-terms/current as fhead 
-> 200 {"data":{"id":"e5aba8fb-8d2f-432e-bbb0-2f7c35623feb","schoolId":"ce1fc064-14a1-49b4-8cc4-bdb8d18c53ea","academicYearId":"c78acfc7-66d7-4cd4-8bbc-f03594b96e24","termSequence":1,"termLabel":"Term 1","startDate":"2026-09-01","endDate":"2026-12-18","isCurrent":false,"createdAt":"2026-10-20T11:46:16.635Z"},"success":true,"message":""}

### F02 pay 400 on term1
POST /schools/me/payments as fhead {"studentId":"b779c75b-381e-4eba-84fb-ad1dc0cf29cb","invoiceId":"36323712-719c-48b1-8c61-4a139307d728","amount":400,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"38a311db-3780-4304-99da-bfb02719c0d8","receiptNumber":"RCT/FIS-001/2026/0006","paymentDate":"2026-10-20","amountPaid":400,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"36323712-719c-48b1-8c61-4a139307d728","invoiceNumber":"INV/FIS-001/2026/0002","studentId":"61b0272f-d1f9-4841-9076-c6eae6d3ed0a","studentCode":"FIS-001/STD/2026/002","studentName":"Abena Osei","className":"Primary 1","previousBalance":1450,"newBalance":1050,"surplusCredit":0,"recordedByName":"Ama Owusu","createdAt":"2026-10-20T12:03:03.416Z"}],"success":true,"message":""}

### F02 generate term2
POST /schools/me/invoices/generate as fhead {"academicTermId":"bf8f38f4-5885-42c9-a36f-20a257439826"}
-> 201 {"data":{"generatedCount":3,"skippedCount":0,"totalProcessed":3,"termId":"bf8f38f4-5885-42c9-a36f-20a257439826","termLabel":"Term 2","yearLabel":"2026/27","classId":"a2ea6a4c-229f-448f-b016-0e0276923bc4","className":"Primary 2","message":"Successfully generated 3 term invoice(s) for Term 2 (Primary 2).","invoice":null},"success":true,"message":""}

before: Term 1 Term Fees|0.00|1450.00|400.00|1050.00
before: Term 2 Term Fees|1050.00|2500.00|0.00|2500.00
### F02 pay latest bill total 2500.00
POST /schools/me/payments as fhead {"studentId":"b779c75b-381e-4eba-84fb-ad1dc0cf29cb","amount":2500.00,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"6bfb28c1-9539-44cf-89a9-6a00f04dfd0b","receiptNumber":"RCT/FIS-001/2026/0007","paymentDate":"2026-10-20","amountPaid":1050,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"36323712-719c-48b1-8c61-4a139307d728","invoiceNumber":"INV/FIS-001/2026/0002","studentId":"61b0272f-d1f9-4841-9076-c6eae6d3ed0a","studentCode":"FIS-001/STD/2026/002","studentName":"Abena Osei","className":"Primary 1","previousBalance":2500,"newBalance":1450,"surplusCredit":0,"recordedByName":"Ama Owusu","createdAt":"2026-10-20T12:03:03.605Z"},{"id":"ba09e85c-eeb1-482f-becd-ce2df

after: Term 1 Term Fees|0.00|1450.00|1450.00|0.00
after: Term 2 Term Fees|1050.00|2500.00|1450.00|1050.00
fee account|8b838c8c-00a8-4c94-8baa-101d026dc36a|ce1fc064-14a1-49b4-8cc4-bdb8d18c53ea|b779c75b-381e-4eba-84fb-ad1dc0cf29cb|0.00|2900.00|2900.00|5c06fd50-5c49-4b14-80d7-b53645c9e496|INV/FIS-001/2026/00
teacher sees 3 students; keys: guardianName,guardianContact,nationalId
### F09 frontend never calls logout; reuse refresh after local signout
POST /auth/refresh as anon {"refreshToken":"<redacted>"}
-> 200 {"data":{"accessToken":"<redacted>

  30 200
### AH creates ACCOUNT_OFFICER
POST /users as rah {"role":"ACCOUNT_OFFICER","email":"ah-alt@qa.test","password":"Passw0rd!!Qa","firstName":"Alt","lastName":"AO"}
-> 201 {"data":{"id":"4c370e55-7195-4633-b822-819eb51c765b","email":"ah-alt@qa.test","role":"ACCOUNT_OFFICER","firstName":"Alt","lastName":"AO","phone":null,"isActive":true,"schoolId":"c7b2c267-ed9d-4d3e-8034-d8f531abc42b","permissions":["schools:read","school_modules:read","academic_years:read","academic_terms:read","classes:read","staff:read","students:read","student_fee_preferences:manage","enrollment:read","fee_types:read","fee_types:manage","fee_structures:read","fee_structures:manage","invoices:read","invoices:generate","payments:read","payments:collect","discounts:read","discounts:manage","oth

### AH-minted AO records payment
POST /schools/me/payments as ahalt {"studentId":"84899cf3-b943-4799-a946-5587efd798d5","amount":1,"paymentMethod":"Cash"}
-> 201 {"data":[{"id":"bfdb6a30-666c-4747-8261-4ee7106422be","receiptNumber":"RCT/RIV-002/2026/1000005","paymentDate":"2026-10-20","amountPaid":1,"paymentMethod":"Cash","bankType":null,"transactionReference":null,"invoiceId":"67344eb6-3c4e-43b2-9caa-38b950909ef5","invoiceNumber":"INV/RIV-002/2026/0001","studentId":"65cc2232-2078-48c6-9bbe-12743ad7f909","studentCode":"RIV-002/STD/2026/002","studentName":"Abena Osei","className":"Primary 1","previousBalance":1347,"newBalance":1346,"surplusCredit":0,"recordedByName":"Alt AO","createdAt":"2026-10-20T12:04:03.931Z"}],"success":true,"message":""}

### SEC exit via /exit
POST /schools/me/students/6ade776e-6289-4537-b209-ada028cdf8e9/exit as rsec {"academicTermId":"e121b5d1-ee99-4139-8173-beca791c3747","status":"Graduated","exitDate":"2026-10-20"}
-> 403 {"message":"Forbidden resource","error":"Forbidden","statusCode":403}

### SEC graduate via PATCH
PATCH /schools/me/students/6ade776e-6289-4537-b209-ada028cdf8e9 as rsec {"status":"Graduated"}
-> 200 {"data":{"id":"6ade776e-6289-4537-b209-ada028cdf8e9","studentId":"7ece9288-5abe-4036-96b3-b1b9a39005f2","studentCode":"RIV-002/STD/2026/003","firstName":"Yaw","surname":"Agyemang","otherName":null,"fullName":"Yaw Agyemang","birthDate":"2018-11-05","gender":"Male","status":"Graduated","school":{"id":"c7b2c267-ed9d-4d3e-8034-d8f531abc42b","name":"Riverside Academy","code":"RIV-002","logoUrl":null},"currentClass":{"id":"7a262919-6dbd-4e26-bdac-448b9985af72","classCode":"P2","className":"Primary 2","department":null},"admission":{"date":"2026-09-01","academicYear":{"id":"9cc7b777-98ec-4ad6-bf5b-09

status|Graduated
```
