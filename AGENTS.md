# AGENTS.md

## Cursor Cloud specific instructions

Hjerterum is a **Next.js 16 (App Router, Turbopack) frontend + Supabase backend** (Postgres,
Auth/GoTrue, Storage, Edge Functions). There is **no separate Node backend** — `npm run dev` at the
repo root just runs the frontend. It is the superset of the `Boly` product (adds Finn tourism, central
events, Digital Los, Stripe/Vipps payments, platform feature-flags).

### Services & how to run them

- **Frontend (required):** `cd frontend && npm run dev` → http://localhost:3000. Reads
  `frontend/.env.local`. Root shortcuts exist: `npm run dev` / `npm run dev:frontend`.
- **Supabase local stack (backend, required for auth/DB/storage):** use the repo-pinned CLI, not a
  global one: `./node_modules/.bin/supabase start` (run from the repo root; needs the Docker daemon
  running). Get connection values with `./node_modules/.bin/supabase status -o env`. Studio is at
  http://localhost:54323, Mailpit (captured emails) at http://localhost:54324. Stop with
  `./node_modules/.bin/supabase stop`.
- **Env file:** copy `frontend/.env.example` → `frontend/.env.local`. For local dev only three vars
  are needed: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (all from `supabase status -o env`). Stripe/Vipps/Signicat vars are only
  needed for tourism-payment / BankID flows.

### Important gotchas (non-obvious)

- **The demo seed is broken and blocks a fresh `supabase start` / `supabase db reset`.** Migration
  `supabase/migrations/20260701180000_hjerterum_ofoten_demo_seed.sql` (and `supabase/seed.sql`, which
  runs `scripts/seed_narvik_ofoten_demo.sql`) insert a profile with `role = 'leietaker'`, which
  violates the `profiles_role_check` constraint in effect at that point (the role is only broadened in
  the later migration `20260701210000_hjerterum_guest_accounts_required.sql`). To bring up a local DB,
  temporarily move that demo-seed migration out of `supabase/migrations/` and start with the seed
  disabled, then create data by registering through the app. This is a pre-existing data/ordering bug
  — do not "fix" it as part of unrelated work.
- **Email confirmation is off locally** (`config.toml` → `auth.email.enable_confirmations = false`),
  so email+password signup logs you straight in. Register at `/login?signup=1` (landlord context) →
  the app creates an auth user, the `handle_new_user_profile` trigger inserts a `profiles` row
  (default role `homeowner`), then redirects to `/homeowner/register`.
- **Lint gate is strict:** `cd frontend && npm run lint` runs `eslint . --max-warnings 0`. The repo
  currently has pre-existing lint problems, so this command exits non-zero even though ESLint itself
  runs correctly. Treat a non-zero lint exit as pre-existing unless your change added new issues.
- **Build works without a live Supabase:** the browser client falls back to a placeholder project
  (`app/lib/supabase.ts`) so `cd frontend && npm run build` succeeds offline.
- `frontend/next-env.d.ts` is regenerated with a different import path by `next dev` vs `next build`;
  the root/`frontend` `package-lock.json` can also churn on `npm install`. Revert this generated churn
  before committing.
- `middleware.ts` prints a Next 16 "rename to proxy" deprecation warning on boot — harmless.
- Both `Boly` and `Hjerterom` use the **same Supabase ports** (54321/54322/54323/54324), so only one
  local Supabase stack can run at a time.

### Tests

- E2E: Playwright specs live in `frontend/e2e/` (`npm run test:e2e`, `test:e2e:smoke`, etc.). The
  register/auth specs are `test.skip` unless `PLAYWRIGHT_LIVE_AUTH=1` is set against a Supabase-backed
  deployment.
- Standard commands are in `frontend/package.json`; deployment/setup docs are under `docs/setup/` and
  `docs/hjerterum/`.
