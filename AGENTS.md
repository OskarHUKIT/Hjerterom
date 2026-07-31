# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is

Boly / Hjerterom is a **Next.js 16 (App Router) frontend** in `frontend/` backed by
**Supabase** (Postgres, Auth, Storage, Edge Functions) in `supabase/`. There is **no**
separate backend server in this repo despite what `docs/setup/SETUP.md` implies — that
doc is stale (mentions an Express `backend/` that does not exist). The only runnable
service here is the Next.js app.

### Running the app

- Dev server: `npm run dev` from the repo root (proxies to `frontend/` → `next dev`), or
  `cd frontend && npm run dev`. Serves http://localhost:3000.
- Build: `npm run build` (root) → `next build`. Succeeds even without real Supabase keys.
- Prod start (after build): `npm run start`.
- Other scripts live in `frontend/package.json`.

### Supabase is optional for local dev (important)

The app **degrades gracefully** without Supabase env vars: `frontend/app/lib/supabase.ts`
falls back to a placeholder client when `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset, so the server still boots. What works without a
real backend: the landing page, i18n language switch (`no` / `se` / `en`), and the
dark/light theme toggle. What does **not** work without a real Supabase project (and, for
gated portals, the right `platform_settings` flags): login/auth and feature-gated routes
such as `/finn`, `/los`, and `/ops` (these redirect to `/login`). Feature flags like
`finnPortalEnabled` / `tourismLaneEnabled` default to `false` in
`frontend/lib/platformSettings.ts` and are read from the `platform_settings` DB table.

To enable full backend features, copy `frontend/.env.example` to `frontend/.env.local`
and fill in real Supabase (and optionally Stripe) values. `.env.local` is gitignored.
There is no committed local-Supabase stack (no Docker/Supabase CLI here by default); the
project targets Supabase Cloud.

### Routing gotcha

`frontend/next.config.js` sets `trailingSlash: true`, so non-slash URLs return a `308`
redirect to the trailing-slash form (e.g. `/finn` → `/finn/`). Account for this when
curling or writing tests.

### Lint / test

- Lint: `cd frontend && npm run lint` (`eslint . --max-warnings 0`). This currently
  reports **pre-existing** errors (React Compiler "Cannot access refs during render")
  plus many warnings. These are code issues in the repo, not environment problems.
- E2E: Playwright in `frontend/e2e/` — `cd frontend && npm run test:e2e` (smoke:
  `npm run test:e2e:smoke`). Requires browsers once via `npx playwright install chromium`.
  `frontend/playwright.config.ts`'s `webServer` runs `npm run start` (needs a build) but
  has `reuseExistingServer` on, so if a dev server is already up on port 3000 the tests
  reuse it.
