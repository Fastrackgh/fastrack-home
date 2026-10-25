# Flow: Bill and report designs (visual no-code builder)

Code: `src/features/document-templates/*`.
- `DocumentTemplatesPage.tsx` is the school page at route `/school-admin/templates` ("Bill & report designs").
- `SchoolDesigns.tsx` is the platform console version: the "Designs" tab in `src/features/platform-schools/SchoolDetail.tsx`.
- Both render `builder/TemplateBuilder.tsx`.
- `TemplateEditor.tsx` is the older Liquid HTML/CSS code editor. Only Fastrack staff can reach it, through the builder's "Advanced" button.
- Every call is in `api.ts`.

Commits: `cb77e30` (code editor), `188eb92` (visual builder), `99082e9` (wider workspace and section placement).

A school redesigns the two documents parents receive: the **fee bill** (`invoice.bill`) and the **terminal report** (`exam.report`). The flow has five steps:
1. The school uploads a photo or PDF of its current paper design as a "school sample".
2. It picks a starter design.
3. It arranges sections (header, fee table, notes, signers, columns and so on) and sets their options.
4. It compares the live preview with the sample, side by side.
5. It publishes.

Drafts save automatically. Published and archived versions are read-only, and "Edit a copy" makes a new draft from any version, which also covers rollback. Unpublishing archives the live version, and parents then get Fastrack's standard design again.

Backend verified against `fastrack-space/fastrack-backend`, branch `fix/invoice-run-class-label` @ `8301857`. It contains the template commits `0c540b1`, `5bae8a2` and `93d8be0`, the same code as `fastrack-backend-blocklayout` (`feat/template-block-layout` @ `93d8be0`). Module: `src/modules/documents/`.

**Who:**
- **School side:**
  - The frontend route needs `document_templates:read` (`src/lib/rbac/routes.ts:66-70`), with no module gate. Editing needs `document_templates:manage` (`DocumentTemplatesPage.tsx:24`).
  - The backend issues both keys only to the **Principal** (`role-permissions.matrix.ts:24-25`, migration `1792500000700`), and every school endpoint is also `@Role(PRINCIPAL)`.
  - In practice, only the Principal can use the page.
- **Platform side:** Super Admin, from the platform console (`/super-admin/schools/:schoolId/document-templates/*`, `@Auth({roles:[SUPER_ADMIN]})`; the permission guard lets the Super Admin through). Only Fastrack staff can:
  - open the Advanced code editor;
  - save `html`/`css`/`settings` directly (the backend rule is `assertCodeAllowed`).
- **Module:** none on either side. The fee-type picker in the fee table calls `/schools/me/fee-types`, which needs module `fees`. When that call fails, the picker is empty.

## Backend endpoints

`{base}` is `/schools/me/document-templates`, or `/super-admin/schools/:schoolId/document-templates` for the platform console.

| UI | Call | Exists? | Notes |
| --- | --- | --- | --- |
| Load: section catalogue, starters, sample data | `GET {base}/kinds` | ✓ | read |
| Load: versions | `GET {base}?kind=` | ✓ | read. Sorted by version, newest first. Returns an array (not paginated). |
| Load: school samples | `GET /media?ownerType=SCHOOL&ownerId&purpose=TEMPLATE_SAMPLE` | ✓ | Principal of the same school with read, or Super Admin. The frontend filters by `label` (`invoice_bill` or `exam_report`). |
| Load: design images | `GET /media?…&purpose=TEMPLATE_ASSET` | ✓ | same rule |
| Load: fee types (bill only) | `GET /schools/me/fee-types` or `/super-admin/schools/:id/fee-types` | ✓ | Needs module `fees` plus `fee_types:read`. Errors are swallowed and the list becomes `[]`. |
| New design (starter) | `POST {base}` `{kind, starter, name}` | ✓ | manage. Version = max + 1. |
| Autosave | `PATCH {base}/:id` `{layout}` | ✓ | manage. Drafts only (409 otherwise). The layout is validated, compiled to HTML/CSS and test-rendered. |
| Rename | `PATCH {base}/:id` `{name}` | ✓ | Sent on blur. Name ≤120 characters; a blank name is ignored by the server. |
| Live preview (unsaved) | `POST {base}/preview` `{kind, layout, invoiceId?}` | ✓ | **manage** (not read). `invoiceId` must be a UUID of this school's invoice. |
| Preview of a saved or code version | `POST {base}/:id/preview` | ✓ | **manage** |
| Publish | `POST {base}/:id/publish` | ✓ | Archives the previous live version in a transaction. Works on drafts and archived versions. |
| Unpublish | `POST {base}/:id/archive` | ✓ | Any status can be archived |
| Edit a copy | `POST {base}/:id/duplicate` | ✓ | |
| Upload school sample | `POST /media` (multipart, `TEMPLATE_SAMPLE`, label) | ✓ | PDF/PNG/JPEG/WebP, ≤10 MB, private |
| Upload design image | `POST /media` (`TEMPLATE_ASSET`) | ✓ | PNG/JPEG/WebP, ≤2 MB, public URL (bills are opened without signing in) |
| Remove sample (code editor only) | `DELETE /media/:id` | ✓ | Not available in the visual builder |
| Convert to code | `POST {base}/:id/convert-to-code` | ✓ (Super Admin only) | `api.convertToCode` is **never called** by the UI |
| Code editor save | `PATCH {base}/:id` `{name, html, css, settings}` | ✓ | Super Admin only. It sets `layout = null`, so the draft becomes code mode. |

Where the design is used:
- The published `invoice.bill` design is rendered for parents by `public-invoices.controller.ts` (public bill link) and `parent-fees.service.ts` (parent portal) through `DocumentRendererService.render`. When a school has no published design, it falls back to the default copy.
- What a bill shows (QA-227, fixed 24 Oct; backend `eb0f25c`):
  - A bill shows itself as issued, never the student's running balance or later bills. "Fees Due" is that term's fees. "Balance from previous bills" (or "Credit from previous bills") is what it brought forward when it was issued; it replaced "Bal B/f". "TOTAL FEES DUE" is what is still owed on that bill, or "CREDIT ON THIS BILL" when it is in credit.
  - A bill whose balance moved on owes 0.00 and shows "Balance moved to INV/…".
  - The seal reads "CHARGES DIGITALLY SIGNED & SEALED" with "Payments as of <date>".
  - Bills keep the class they were issued in. Bills from before the fix still show the current class (no backfill, by the user's choice).
  - Published designs pick this up without republishing.
- Nothing renders `exam.report` for parents yet, so report designs can be built and published, but **no parent sees them** (the page says as much in a blue banner).

## Diagram

```mermaid
sequenceDiagram
  actor P as Principal (or Fastrack staff)
  participant B as TemplateBuilder
  participant API as Backend
  B->>API: Promise.all: GET kinds, GET list?kind, GET media(samples), GET media(images), GET fee-types (bill; errors -> [])
  alt any of the first four fails
    B->>P: red Alert "Designs unavailable: <msg>" (whole page)
  else ok
    B->>B: open newest DRAFT, else PUBLISHED, else empty state
  end
  opt no design yet
    B->>P: "No fee bill design yet … upload, start, adjust, Publish"
  end
  P->>B: Upload school sample (PDF/image)
  B->>API: POST /media (TEMPLATE_SAMPLE) -> reload list, opens list[0]
  P->>B: New design -> StarterGallery -> pick starter
  B->>API: POST {base} {kind, starter, name}
  B->>B: reload, open the new draft
  loop editing (add / move / duplicate / hide / remove sections, edit props, page theme)
    P->>B: change (undo/redo, 100 steps)
    B-->>API: after 500ms: POST {base}/preview {kind, layout, invoiceId?}
    API-->>B: html -> sandboxed iframe at paper width (Fit / 100%)
    B-->>API: after 1200ms (or at once before switching, publishing or leaving): PATCH {base}/:id {layout}
    alt 400 (field too long, unknown field chip, missing image…)
      B->>P: "Not saved" + red Alert with section-specific message
    else ok
      B->>P: "All changes saved"
    end
  end
  P->>B: Publish (any waiting edit is saved first; if it can't be, nothing is published)
  B->>API: POST {base}/:id/publish
  API->>API: test-render with sample data, archive old live, set PUBLISHED
  B->>P: toast "Published — parents now see this design", reopen as read-only
  P->>B: Unpublish (live version)
  B->>API: POST {base}/:id/archive -> parents get Fastrack's standard design
```

## States

| State | UI |
| --- | --- |
| Loading | A bare `<Loader />` until the versions and the current kind's catalogue arrive. Switching kind keeps the old versions on screen until the new load ends. |
| Load error | One red Alert "Designs unavailable" replaces the whole builder. A failure in samples or images alone also does this. |
| Empty (no versions) | A card explaining the three steps, plus "Start a new design" (manage only) |
| Read-only version | Gray alert "This version is live / an old version and can't be changed. Use Edit a copy…". All inputs are disabled and the drag handles are hidden. |
| Code-mode version | Yellow alert. Staff are told to use Advanced; principals are told to start a New design. |
| Saving | Status text "Saving…", then "All changes saved", or "Not saved" in red with an Alert carrying the server message |
| Preview error | The same red Alert (`problem`). The previous preview HTML stays in the frame. |
| Actions (publish, unpublish, copy, new, upload) | `busy` puts Publish, Unpublish and Edit a copy into a loading state. Success and failure show a toast. |
| Narrow screens | Below 62em the workspace becomes one column. The sections and settings panels toggle with a segmented control, and the preview is 80vh tall. Moving a section into or out of a column needs HTML5 drag, which does not work on touch screens; the arrows only reorder within a list. |

## Validation

Every rule below is checked on the server, by `layout-compiler.ts` and `layout-props.ts`. The client checks none of them; it shows the server's message after the autosave or preview fails.

| Input | Rule |
| --- | --- |
| Layout | Version 1 only, at most 120 sections. The section type must be allowed for the kind. Block ids match `^[\w-]{1,64}$`. Columns cannot nest. |
| Columns | The **Columns** section has two or three columns, chosen by its widths: Equal, Left wider, Right wider (two), or Three equal, Three middle wider, Three left wider, Three right wider (25/50/25 and so on). A third column is stored as `children.middle`. The outline shows Left, Middle and Right drop zones. Switching back to two moves the middle's sections into the left column. The server refuses a two-column section that still has a middle (400), which the builder never sends. Added 25 Oct (frontend `f2006b1`, backend `e10fc96`). Tested 25 Oct, including a published bill with an image in the middle column. Known gap: dragging onto an *empty* column puts the section above the Columns section instead (QA-266); use "Add here". |
| Text / multiline / rich text | ≤500 / ≤5000 / ≤5000 characters. A `[[field]]` chip must be one of the kind's placeholders. |
| Colour | `#rrggbb` |
| Number | min and max from the schema. Clearing the field on the client sends `0`. |
| List / fee groups | ≤50 items |
| Image | Must be the school's own `TEMPLATE_ASSET` or logo, else "An image in this design was not found; upload it again" |
| Name | ≤120 characters (DTO). A blank name is ignored. |
| Preview invoice id | `@IsUUID`, and the invoice must belong to the same school |
| Code mode (staff) | HTML and CSS sanitised (`template-sanitizer.ts`), CSS ≤200 KB, `settings` shape checked, test-rendered |

**XSS:**
- Text typed in the builder is HTML-escaped, and `{`/`}` are encoded so they can't become Liquid (`layout-html.ts:13-22`).
- Liquid output is escaped by default (`outputEscape: 'escape'`). Only staff code can use `| raw`, and staff code is sanitised.
- The builder shows the preview in `<iframe sandbox="" srcDoc>`, which blocks scripts.
- No user-HTML injection path was found.

**Preview and print:**
- The preview is rendered with `actions: false`, so the Print / Copy-link bar parents see on the public bill is not shown.
- The print CSS (`@page` size and margins, white background) only applies when printing.
- The preview frame width is 840 px for A4 and 862 px for Letter, and approximates the real page.

## Status

- **Fee bill designs:** Live. The published design is used for the public bill link and the parent portal bill.
- **Terminal report designs:** Preview. They can be designed and published, but no backend path renders reports for parents yet.
- **Advanced code editor:** staff-only tool. It is Live, but rough.
- **QA-057** (designs page 500 because the `layout` column was missing): **resolved**.
  - Migration `1792500000800-AddDocumentTemplateLayout` is committed in `5bae8a2`.
  - On the local `fastrack` database it is recorded in `migrations`, and `document_templates.layout` exists (checked 21 Oct 2026).
  - Environments that have not run the migration will still fail.

## Known gaps

See the findings register for the evidence and repro steps behind each item.

- *Fixed 25 Oct (QA-064, QA-065, QA-066), in `builder/useDraftAutosave.ts`:*
  - **Edits stay with their design:** each edit is kept with the id of the design it was made on, and saves go out one at a time, in order. An edit can't be saved onto a design opened afterwards.
  - **Saved before you move on:** switching version or kind, Edit a copy, New design, Upload sample, Advanced, and leaving through the app all save the waiting edit first. If that fails, the builder asks "Your last change to this design could not be saved. Leave it anyway?".
  - **Closing or reloading the tab** with an edit unsaved shows the browser's leave warning.
  - **Publish** saves first and refuses with "Not published" if it can't, so parents never get an older design.
  - **The status** reads "Unsaved changes", "Saving…", "All changes saved" or "Not saved", with Try again.
  - **Tested live** on QPM-402: an edit then a quick switch saved to the first draft only; an edit then Publish sent PATCH, then publish; leaving through the menu sent the PATCH; a forced 500 showed "Not saved" and asked before switching.
- **Concurrency:** two editors on the same draft (Principal and Fastrack staff, or two tabs) overwrite each other without warning. There is no version check.
- *Fixed 25 Oct:* an uploaded **PDF** sample showed blank. The API serves media with `X-Frame-Options: SAMEORIGIN`, and the app runs on another origin, so the browser refused to frame its URL. The sample pane now fetches the PDF (CORS allows it) and shows that copy, with "Open it in a new tab" if the fetch fails. Image samples were never affected.
- *Fixed 25 Oct (QA-264 Templates part, QA-265):*
  - The builder loads kinds, images and fee types once, not on every bill/report switch; a switch fetches only that kind's versions.
  - The school sample is fetched only when "School sample" or "Side by side" is open, and again after an upload.
  - A school without the fees module isn't asked for fee types (no 403).
  - In a production build each request runs once; in dev, React's Strict Mode still runs each effect twice.
- *Fixed 25 Oct (QA-070):*
  - Preview errors are separate from save errors, and clear when the preview recovers.
  - The kind, design and layout reach the preview together, so switching kind no longer previews the old layout as the new kind (no 400).
  - A slow version load can't open another kind's design.
  - Rename is limited to 120 characters, says when it fails, and updates the version list.
- **Loading:**
  - A samples or images error blanks the whole page.
  - A fee-types error looks like "No fee types set up yet".
- **School sample upload:** it jumps to the newest version, regardless of which version was open.
- **Code editor (staff):**
  - Saving a visual draft there silently turns it into a code-mode draft.
  - Its row actions have no busy state.
- **Parent-facing fallback:** if a published design fails to render with real data, parents get an error; the renderer does not fall back to the default design.
- **Reports:** the report kind has no parent-facing consumer yet.
