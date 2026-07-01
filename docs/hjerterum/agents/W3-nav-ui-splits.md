# Agent brief — Wave 3c: NavDatabase UI splits

## Objective

Reduce `NavDatabasePage.tsx` (~3,031 lines) by extracting formidlet modals and filter/timeline UI.

## Prerequisites

W3b complete (`useNavDatabaseListingsQuery` wired).

## In scope

| File | Action |
|------|--------|
| `frontend/features/mediation/components/FormidletModal.tsx` | **Create** — mark-as-formidlet flow |
| `frontend/features/mediation/components/FormidletExtendModal.tsx` | **Create** |
| `frontend/features/mediation/components/NavDatabaseFilters.tsx` | **Create** — search + advanced filters |
| `frontend/features/mediation/components/NavDatabasePage.tsx` | Compose; target < 2,000 lines |

## Out of scope

- Map view rewrite
- RPC changes

## Acceptance criteria

- [ ] Formidling mark/extend/remove unchanged
- [ ] `npm run build` passes

## Commit

`refactor(wave-3): extract formidlet modals and nav database filters`
