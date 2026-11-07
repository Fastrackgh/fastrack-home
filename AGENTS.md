# Fastrack Frontend — Agent Instructions

## Business Guide

Fastrack's plain-language guide for its business team lives in the **backend repo** (`fastrack-backend/docs/business/`). It's served here at `/guide`, behind the access code `BUSINESS_GUIDE_CODE` (see `docs/deployment.md`).

- When a change alters what schools, staff or parents can do or see (a screen, button, option, label, rule or message), run the backend's **`business-docs-sync`** skill (`fastrack-backend/.agents/skills/business-docs-sync/SKILL.md`). It updates the guide in plain language, then `pnpm docs:business` (in the backend) regenerates `src/content/business-guide/guide-html.generated.ts` here.
- Commit that regenerated file with your change. Never edit it by hand.
- With no visible change, note "Business Guide: no business impact" in the commit or PR.

The `/guide` route is `src/app/guide/route.ts`; the access check is `src/content/business-guide/access.ts`.
