# API contract: parent portal

The parent portal (`/parent`, `src/features/parent/api.ts`) needs these endpoints. The **Exists** column records what the backend has today (checked against `fastrack-backend/src/modules/identity/parents`). Everything marked **Proposed** is what the frontend is built against. It runs on sample data until then (`NEXT_PUBLIC_PARENT_API_MOCK=1`).

## Ground rules

- Every endpoint is `@Role(Roles.PARENT)` and returns the v2 envelope (`X-Api-Contract: 2`). Lists put rows in `data` and pagination in `meta`, using `page` and `limit`.
- **Scoping.** Every route under `/parents/me/wards/:studentId` first checks that the signed-in parent has an active link to `studentId`. If not, it returns **404**, not 403, so callers can't probe which students exist.
- **Modules (fixes QA-026).** A parent has no `schoolId`. Module and suspension checks must use the **ward's** school, taken from the ward's enrolment: fees routes need `fees`, attendance needs `attendance`, and reports need the academics/results module. If the module is off, return **403**. The UI then shows "Your school has not turned this on for parents."
- **Money** is in decimal cedis, the same as the staff fees API. The frontend converts it to pesewas.
- **Documents** (`…/document`) return `{ html }`, rendered with the ward's school's **published** design for that kind (`invoice.bill` or `exam.report`). They fall back to the default starter design. The frontend shows the HTML in a sandboxed iframe with scripts disabled, but the HTML should still be script-free.

## Account and wards

| Method | Path | Body / query | Response `data` | Exists |
| --- | --- | --- | --- | --- |
| POST | `/auth/register-parent` | `{firstName, lastName, email, password(≥8), phone?}` | `{accessToken, refreshToken, expiresIn, user}`, the same as login | ✅ |
| GET | `/parents/me/wards` | – | `ParentWardResponseDto[]` | ✅ |
| POST | `/parents/me/wards/link/initiate` | `{studentCode, schoolCode?}` | `{requestId, maskedDestination, expiresInSeconds, message}` | ✅ |
| POST | `/parents/me/wards/link/resend-otp` | `{requestId}` | `{maskedDestination, expiresInSeconds, cooldownSeconds, message}` | ✅ |
| POST | `/parents/me/wards/link/verify` | `{requestId, otp}` | `ParentWardResponseDto` | ✅ |
| DELETE | `/parents/me/wards/:studentId` | – | `{message}` | ✅ |
| GET | `/parents/me/wards/:studentId` | – | Ward profile (below) | Proposed |
| GET | `/parents/me/wards/:studentId/academic-terms` | – | `[{id, label, yearId, yearLabel, isCurrent}]`, newest first | ✅ `feat/parent-fees` |

Ward profile = `ParentWardResponseDto` plus:
- `photoUrl?`, `admissionDate?` and `house?`
- `guardians: [{name, relationship?, phone?, email?}]`
- extra school fields: `school: {id, code, name, logoUrl?, phone?, email?, address?}`

**QA-014.** `initiate` currently returns distinct errors, for example "No student found matching the provided student code". It should return the same success-shaped response for unknown codes and only fail at `verify`. Until then, the UI shows one generic message for every failure except 429.

## Fees

**Built** on backend branch `feat/parent-fees` (`src/modules/finance/parent-fees`), with the ward-scoped academic-terms route. Not merged yet. Receipts (`…/payments/:id/document`) are a plain printable page for now, because schools have no receipt template.

| Method | Path | Query / body | Response `data` |
| --- | --- | --- | --- |
| GET | `…/wards/:studentId/invoices` | `page, limit, termId?` | `Invoice[]`, newest term first. Same fields as `/schools/me/invoices` (including `status: 'CARRIED_FORWARD'` with `carriedForwardAmount, carriedForwardToInvoiceNumber`), plus `termId, termLabel, yearLabel, dueDate, canPayOnline` |
| GET | `…/wards/:studentId/invoices/:invoiceId` | – | `Invoice` with `lineItems` |
| GET | `…/wards/:studentId/invoices/:invoiceId/document` | – | `{html}` |
| GET | `…/wards/:studentId/payments` | `page, limit` | `Payment[]`, newest first. Same fields as `/schools/me/payments`, plus `invoiceId, invoiceNumber, termLabel, reference` |
| GET | `…/wards/:studentId/payments/:paymentId` | – | `Payment` |
| GET | `…/wards/:studentId/payments/:paymentId/document` | – | `{html}` (receipt) |

These must not expose staff emails or signatures beyond what the printed bill shows (QA-010).

## Online payment (Paystack: Mobile Money and card)

**Built** on `feat/parent-fees`. It is on only when the backend has `PAYSTACK_SECRET_KEY`. Without the key, checkout returns 503 and every bill has `canPayOnline: false`, so the portal hides Pay now. Register the webhook URL `<api>/api/webhooks/paystack` in the Paystack dashboard. Paystack does the card and MoMo charging; the backend never sees card details.

| Method | Path | Body / query | Response `data` |
| --- | --- | --- | --- |
| POST | `…/wards/:studentId/invoices/:invoiceId/checkout` | `{amount, channel: 'mobile_money' \| 'card', idempotencyKey, callbackUrl}` | `{reference, authorizationUrl}` |
| GET | `/parents/me/payments/verify` | `reference` | `{status: 'success' \| 'pending' \| 'failed', studentId?, invoiceId?, payment?, message?}` |
| POST | `/webhooks/paystack` | Paystack event (public, signature-verified) | 200 |

Backend rules:
1. **Checkout.**
   - Reject `amount <= 0` or `amount > balance` with 400 (QA-029).
   - Treat `idempotencyKey` as unique per parent. A repeat with the same key returns the original `{reference, authorizationUrl}` and creates no new transaction (QA-004).
   - Only accept a `callbackUrl` on the frontend's own origin; anything else is rejected. Pass it to Paystack's `initialize` together with the channel (`mobile_money` or `card`). The frontend sends `<origin>/parent/fees/pay/callback`.
2. **Only the backend marks an invoice paid.** It does this from the **webhook** (`charge.success`, after the HMAC check), or from `verify` calling Paystack's verify endpoint. It never trusts the redirect.
   - Posting must be idempotent per `reference`.
   - The payment is recorded through the same ledger path as staff payments, with method `MoMo` or `Card`, `recordedBy` set to the parent, and the provider reference kept.
   - Fix QA-001 (concurrent credits) before turning this on.
3. **Verify** returns `pending` until the transaction settles. The UI polls for about 30 seconds and then offers "Check again".
4. **Disabling.** A school can turn online payment off: set `canPayOnline: false` on the invoice and return 403 from checkout.

## Reports

| Method | Path | Response `data` |
| --- | --- | --- |
| GET | `…/wards/:studentId/reports` | Published terminal reports, newest first: `[{id, termId, termLabel, yearLabel, className?, publishedAt, average?, overallGrade?, position?, classSize?}]` |
| GET | `…/wards/:studentId/reports/:reportId` | The same, plus `subjects: [{subject, classScore, examScore, total, grade, position?, remark?}]`, `attendance?: {present, total}`, `teacherRemark?`, `headRemark?`, `promotedTo?`, `nextTermBegins?` |
| GET | `…/wards/:studentId/reports/:reportId/document` | `{html}` (`exam.report` design) |

Only reports the school has **published** are visible. Drafts stay hidden.

## Attendance

| Method | Path | Query | Response `data` |
| --- | --- | --- | --- |
| GET | `…/wards/:studentId/attendance` | `from, to` (ISO dates; the UI asks for one month at a time) | `{days: [{date, status: 'present' \| 'absent' \| 'late' \| 'excused', note?}], summary: {present, absent, late, excused, schoolDays}}` |

`schoolDays` counts the days the register was taken in the range. The UI computes the rate as `(present + late) / (schoolDays − excused)`.
