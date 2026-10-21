# Flow: Optional-service requests (bus, feeding, ...)

Parents can't change a bill. Optional fees are billed from each enrolment's `fee_preferences`, and only staff set those. So a parent **asks** the school to start or stop a service from the parent portal. A Principal or Account Officer approves or declines the request. An approved change applies to the **next bill the school generates**; bills already issued stay as they are.

Code:
- Parent side: `src/features/parent/fees/OptionalServices.tsx` (the Services tab under `/parent/fees`), plus `parentApi.*Optional*` in `src/features/parent/api.ts`, types in `types.ts` and sample data in `mock.ts`.
- Staff side: `src/features/optional-fee-requests/{api.ts,OptionalFeeRequestsPage.tsx}`, route `src/app/school-admin/(app)/(school)/fees/requests/page.tsx`, and the "Service requests" button with a pending badge in `src/features/fees/FeesPage.tsx`.
- Commit `a757a41`. The staff route entry (`APP_ROUTES.optionalFeeRequests`), the `student_fee_preferences:manage` key in `src/lib/rbac/permissions.ts` and the Fees page button are **still uncommitted** RBAC work on `feat/rbac-workspace`. See Known gaps.

**Backend verified against:** `fastrack-backend` (local `main` and checked-out `fix/invoice-run-class-label`, both at `8301857`), module `src/modules/finance/optional-fee-requests`. The sibling checkout `fastrack-backend-parent-fees` (`feat/parent-fees` at `f9049b5`) has the same feature, but **without** fix `08c9ee3`. On that branch the staff list returns 500 on every call.

**Status:** Live on both sides against backend `main`. Mock adapter available with `NEXT_PUBLIC_PARENT_API_MOCK=1`; in mock mode the school never decides.

## Who can use it

| Side | Who | Frontend gate | Backend gate |
| --- | --- | --- | --- |
| Parent | `PARENT` linked to the ward | Route `/parent/fees` needs `invoices:read`; the Services tab is always shown | `@Role(PARENT)` + `invoices:read`; `WardAccessService.resolve` checks the parent-ward link (404 otherwise) and the `fees` module at the ward's school (403) |
| Staff | PRINCIPAL, ACCOUNT_OFFICER | `APP_ROUTES.optionalFeeRequests`: staff audience, `student_fee_preferences:manage`, module `fees`. The Fees page button shows only with that permission | `@Role(PRINCIPAL, ACCOUNT_OFFICER)`, `@RequirePermissions(student_fee_preferences:manage)`, `@RequireModule('fees')` |

The frontend checks no role, only the permission. A stored per-user grant of `student_fee_preferences:manage` to another role would show the page, and the backend would then answer 403.

## Backend endpoints

| UI | Call | Exists | Notes |
| --- | --- | --- | --- |
| Services tab: list | `GET /parents/me/wards/:studentId/optional-services` | ✓ | `amount` in cedis; the frontend converts it to pesewas. A per-child `customAmount` wins over the class price for the current term |
| Services tab: history | `GET /parents/me/wards/:studentId/optional-fee-requests` | ✓ | All requests for the enrolment, newest first, no limit |
| Ask to start or stop | `POST /parents/me/wards/:studentId/optional-fee-requests` `{feeTypeId, action, note?}` | ✓ | 404 if the fee type isn't optional at that school; 409 if the child already has or lacks it, or a request is waiting; 403 when the school is suspended |
| Cancel | `POST …/optional-fee-requests/:requestId/cancel` | ✓ | Only the parent who asked (403). 409 once decided |
| Staff list | `GET /schools/me/optional-fee-requests?page&limit=20&status` | ✓ on `main`; **500 on `feat/parent-fees`** | `{items,total,page,limit}`, converted to `data[]` + `meta` by the v2 contract. Pending is sorted oldest first, everything else newest first |
| Fees page badge | `GET /schools/me/optional-fee-requests/pending-count` | ✓ | `{pending}`. If it fails, the button stays and shows no badge |
| Approve | `POST /schools/me/optional-fee-requests/:id/approve` `{note?}` | ✓ | One transaction: a conditional `UPDATE … WHERE status='PENDING'`, then sets `fee_preferences[feeTypeId].enabled` |
| Decline | `POST /schools/me/optional-fee-requests/:id/decline` `{note?}` | ✓ | Same conditional update; the preference is not touched |

## Parent: ask for a service

```mermaid
sequenceDiagram
  actor Pa as Parent
  participant S as Fees > Services tab
  participant API as Backend
  Pa->>S: open Services (for the selected child)
  par
    S->>API: GET …/optional-services
    S->>API: GET …/optional-fee-requests
  end
  alt 403 (fees off) / 404 (not linked)
    S->>Pa: "Your school has not turned this on…" / "This is not available yet…"
  else no optional fee types
    S->>Pa: "No optional services"
  else
    S->>Pa: one card per service: price per term (or "Price not set"), Taking / Not taking
    alt canRequest false (school suspended) or offline
      S->>Pa: buttons disabled ("The school isn't taking requests right now")
    else a request is waiting
      S->>Pa: "Waiting for school" + Cancel (only on the parent's own request)
    else
      Pa->>S: "Ask to start" / "Ask to stop", optional note (≤500)
      S->>API: POST …/optional-fee-requests
      alt 409 / 404 / 403
        S->>Pa: error inside the modal (modal stays)
      else 201
        S->>Pa: toast "Request sent. The school will review it."
        S->>API: reload both lists
      end
    end
  end
  Pa->>S: Cancel (no confirmation)
  S->>API: POST …/:requestId/cancel
  S->>Pa: "Request cancelled." or red "Could not cancel"; lists reload either way
```

## Staff: review requests

```mermaid
sequenceDiagram
  actor St as Principal / Account Officer
  participant F as Fees & Billing
  participant R as /school-admin/fees/requests
  participant API as Backend
  F->>API: GET …/pending-count
  F->>St: "Service requests" button with a red count badge
  St->>R: open (filter Waiting, page 1)
  R->>API: GET …/optional-fee-requests?status=PENDING&page=1&limit=20
  St->>R: Approve or Decline on a row
  R->>St: modal with an optional note (≤500); approve explains "next bill only"
  R->>API: POST …/:id/approve or /decline
  alt 409 (already decided or cancelled)
    R->>St: error text in the modal; the list is not refreshed
  else ok
    R->>St: toast "<service> added for/removed for <student> from the next bill." or "Request declined…"
    R->>API: reload the current page
  end
  Note over API: Approve sets fee_preferences.enabled; issued invoices are unchanged.<br/>The next POST /invoices/generate follows the preference.
```

## States

| State | Parent Services tab | Staff requests page |
| --- | --- | --- |
| Loading | Loader; an offline copy shows first if one exists | Small loader beside the filter; previous rows stay |
| Empty | "No optional services". No "Past requests" heading until something has been decided | "No requests waiting." (Waiting filter) or "No requests." |
| Error | Red "Could not load" with Try again (per list) | Red error row with "Try again"; rows are hidden |
| Offline | "Showing a saved copy from …"; ask and cancel are disabled | n/a |
| Success | Green toast; the card turns to "Waiting for school" after reload | Toast, then the list reloads (the row leaves the Waiting filter) |

## Validation

| Rule | Frontend | Backend |
| --- | --- | --- |
| Note length | `maxLength=500` on both textareas | `@MaxLength(500)` before trimming; stored trimmed, empty becomes null |
| `feeTypeId` is an optional fee of the ward's school | n/a | 404 "Service not found" (soft-deleted types excluded) |
| Start when already taking, or stop when not taking | The button offered follows `enrolled` | 409 |
| One waiting request per child and service | The card hides the button while one waits | Partial unique index `UQ_OPTIONAL_FEE_REQUESTS_PENDING (school_student_id, fee_type_id) WHERE status='PENDING'`, so two linked parents or a double tap can't both create one |
| Decide once | Buttons shown only on PENDING rows | `UPDATE … WHERE status='PENDING'`, 0 rows → 409. Two staff, or staff and the cancelling parent, can't both win |
| Decline reason | Labelled "Reason for the parent" but **not required** | Optional |

## Behaviour worth knowing

- **Issued bills don't change.** Approving after this term's invoice was generated only affects the next generation (normally next term, since generation skips students who already have an invoice). An approved stop leaves the service on the current bill; staff have to correct that bill by hand. The approve modal says so, but nothing links to the affected invoice.
- **No price snapshot.** The request stores no amount, and the staff list doesn't show one. The price the parent saw can change before approval.
- **Several children:** every read is keyed by `studentId`, and the Fees page remounts per child, so wards don't mix.
- **Mock mode** (`NEXT_PUBLIC_PARENT_API_MOCK=1`): three sample services; requests live in `sessionStorage` and are never decided. The only notice is a line on the More page.

## Known gaps

Not yet in the [findings register](../qa/findings.md). Related: QA-022 (the existing staff optional-fees toggle on the student drawer is gated by the `students` module, not `fees`) and QA-048 (`feeTypeId` validation on that toggle).

1. **Staff page unreachable in committed code.** At `a757a41`, `APP_ROUTES` has no entry for `/school-admin/fees/requests` (an unregistered page is denied to everyone), `permissions.ts` drops `student_fee_preferences:manage`, and the Fees page has no button. All three are in uncommitted working-tree changes.
2. **`feat/parent-fees` staff list returns 500** (fixed by `08c9ee3` on `main`). `docs/api/parent-portal.md` still says "Built on `feat/parent-fees`".
3. **Mock mode has no production guard,** and the Services tab doesn't say it is on sample data. The mock also skips the "already taking" 409.
4. **A stale 409 leaves the row actionable.** After "already decided", the modal shows the error but the list isn't reloaded.
5. **Parent Cancel has no busy state or confirmation.** A double tap gives a success toast and then a red "Could not cancel".
6. **Orphaned pending requests.** If a fee type is deleted or made non-optional, its pending request disappears from the parent's view (no Cancel), but staff can still approve it. Approve doesn't re-check the fee type, the enrolment's status or the current preference.
7. **Left or graduated child.** `WardAccessService` falls back to the latest enrolment, so a parent can still ask for services for a child who has left the school.
8. **Forced optional fees.** Students billed through `includeOptionalFeeTypeIds` (without a preference) show "Not taking", and their "stop" request is refused with 409.
9. **Paging after decisions.** The page number isn't clamped once the last row on a page is decided. The list has no stale-response guard, and parent history shows at most 10 decided requests from an unbounded list.
