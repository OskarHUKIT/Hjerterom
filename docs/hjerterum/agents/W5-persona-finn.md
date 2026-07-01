# Agent brief — Wave 5: Persona views + Finn async

## Objective

Split listing detail by persona; migrate remaining Finn pages to React Query; unify page shells.

## Prerequisites

Wave 4 (`useListingDetailsQuery` exists).

## In scope

| File | Action |
|------|--------|
| `frontend/features/listings/views/ListingDetailsOwnerView.tsx` | **Create** |
| `frontend/features/mediation/views/ListingDetailsNavView.tsx` | **Create** |
| `frontend/features/listings/components/ListingDetailsClient.tsx` | Mode router only (~200 lines) |
| `frontend/features/mediation/hooks/useListingMediation.ts` | **Create** — formidling CRUD from details |
| `frontend/app/finn/mine/FinnMineClient.tsx` | React Query for bookings |
| `frontend/app/components/design-system/PortalPageShell.tsx` | **Create** — loading/error/empty slots |

## Acceptance criteria

- [ ] Listing detail owner vs nav view parity
- [ ] Finn mine + book use shared loading shell
- [ ] `ListingDetailsClient.tsx` < 800 lines
- [ ] `npm run build` passes

## Commit

`refactor(wave-5): persona listing views and finn async`
