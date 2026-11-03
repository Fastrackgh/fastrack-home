# Deployment settings

No production address is written in the code. Every address comes from a
setting, and a production build stops with a clear error when a required one
is missing. The production domain isn't decided yet; examples use
`example.com`. The backend follows the same rule (backend PR #12).

## Settings

Listed in [`.env.example`](../.env.example). For development, copy it to
`.env.local`. For production, set the values in the build environment.

| Setting | Required | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | In production | The backend API address, ending in `/api`, e.g. `https://api.example.com/api`. Every call from the staff portal, parent portal and offline sync goes there. |
| `NEXT_PUBLIC_SITE_URL` | No | The public site's address, used as the base for link previews (Open Graph `url`, `metadataBase`). Left out of the page when unset. |
| `NEXT_PUBLIC_PARENT_API_MOCK` | No, development only | `1` serves the parent portal from mock data. |
| `NEXT_PUBLIC_SHOW_PREVIEW_PAGES` | No, demo deployments only | `1` shows staff the pages that are still UI previews with sample data (Communication, Timetable, Budgets & expenses and 8 others). Leave it unset for real schools: those pages are then left out of the menu and the overview, and their links open the overview (QA-290). |
| `FASTRACK_BUILD_ID` | No | Set by `next.config.mjs` per build; the staff service worker re-saves its offline pages when it changes. |

`NEXT_PUBLIC_` values are copied into the JavaScript at build time. Changing
one means building again; setting it only on the server that runs
`next start` has no effect.

## What happens when a setting is missing

- **Production build** (`next build`): `checkSettings` in `next.config.mjs`
  stops the build if `NEXT_PUBLIC_API_URL` is unset or empty, and if it or
  `NEXT_PUBLIC_SITE_URL` isn't a full address (with `https://`). Before this,
  a build without the setting sent every call to `http://localhost:3000/api`.
- **Development** (`next dev`): the API address falls back to
  `http://localhost:3000/api`.

## Checks

- `pnpm test:settings` (`scripts/check-settings.mjs`) runs `checkSettings` for
  each phase: a production build fails without the API address or with an
  address that isn't a full URL, and development and `next start` need no
  setting.
- To see it in a real build, build in a separate checkout (never in a folder
  that a running `next dev` uses): `next build` without the setting stops with
  "NEXT_PUBLIC_API_URL is not set"; with it, the build completes.
