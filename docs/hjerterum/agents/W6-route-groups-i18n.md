# Agent brief — Wave 6: Route groups, i18n, enforcement

## Objective

Physical subdomain route groups; split translations; Playwright smoke; file size enforcement.

## Prerequisites

Waves 1–5 complete.

## In scope

| Area | Action |
|------|--------|
| `frontend/app/(finn)/`, `(app)/`, `(los)/`, `(ops)/` | Move routes into groups; middleware unchanged behavior |
| `frontend/lib/i18n/` | Split `translations.ts` by domain (listings, nav, finn, ops) |
| `frontend/eslint.config.mjs` | Optional: max-lines rule warn at 800 for tsx |
| `e2e/smoke.spec.ts` | **Create** — manage, database, messages, finn |
| `docs/hjerterum/SERVICE_FLOW.md` §7 | Update module status to Ferdig where applicable |

## Out of scope

- Backend migration squash
- Demo seed removal (separate ops task)

## Acceptance criteria

- [ ] All subdomains resolve same as before (middleware test)
- [ ] No TSX file > 800 lines (except generated)
- [ ] Smoke tests pass in CI
- [ ] `npm run build` passes

## Commit

`refactor(wave-6): route groups, i18n split, smoke tests`
