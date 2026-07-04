# Agent brief — Wave 3b: NavDatabase listings query

## Objective

Replace imperative `fetchListings` in `NavDatabasePage.tsx` with real React Query hook; delete placeholder stub behavior.

## Context to read

- `frontend/features/mediation/components/NavDatabasePage.tsx` (search `fetchListings`)
- `frontend/features/mediation/hooks/useNavDatabaseListingsQuery.ts` (placeholder)
- `frontend/app/lib/queries/queryKeys.ts`

## In scope

| File | Action |
|------|--------|
| `frontend/features/mediation/hooks/useNavDatabaseListingsQuery.ts` | Implement real queryFn (kommune + event portal modes) |
| `frontend/features/mediation/components/NavDatabasePage.tsx` | Use hook; remove tabCache manual state where possible |
| `frontend/features/mediation/lib/navDatabaseFetch.ts` | **Create** — pure fetch function for testability |

## Optimizations (if safe)

- Stop full-scan `user_agreements` on every fetch — filter in RPC or cache terminated IDs
- Invalidate query after formidling mutations instead of manual `fetchListings(false)`

## Out of scope

- Timeline/filter JSX extraction (Wave 3c)
- Map view changes

## Acceptance criteria

- [ ] Boligbank loads for kommune and event staff portals
- [ ] Formidling mark/extend/remove still refreshes list
- [ ] No `useNavDatabaseListingsPlaceholder` with `enabled: false`
- [ ] `npm run build` passes

## Commit

`refactor(wave-3): wire useNavDatabaseListingsQuery in boligbank`
