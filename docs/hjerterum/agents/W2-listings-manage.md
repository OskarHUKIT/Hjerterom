# Agent brief — Wave 2a: LandlordManagePage decomposition (part 1)

## Objective

Reduce `LandlordManagePage.tsx` (~2,005 lines) by extracting bootstrap + listings fetch + removing duplicate status logic.

## Context to read

- `docs/hjerterum/SERVICE_FLOW.md` §3.1 (utleier flow)
- `frontend/features/listings/components/LandlordManagePage.tsx`
- `frontend/features/listings/lib/landlordManagePageGate.ts`
- `frontend/app/lib/listingAvailabilityStatusToday.ts`

## In scope

| File | Action |
|------|--------|
| `frontend/features/listings/hooks/useLandlordManageBootstrap.ts` | **Create** — pageGate, welcome, stuck timer, auth redirects |
| `frontend/features/listings/hooks/useLandlordListingsQuery.ts` | **Create** — fetch listings + availability + event opt-ins map |
| `frontend/features/listings/components/LandlordManagePage.tsx` | Wire hooks; remove inline bootstrap + fetchData |
| `frontend/features/listings/components/ConfirmDeleteDialog.tsx` | **Create** — shared listing/period delete overlay |

## Tasks

1. **Remove duplicate `getEffectiveStatus`** — replace 18 call sites with `listingAvailabilityStatusToday(listing.id, availability)`.
2. **Extract `useLandlordManageBootstrap`** — move lines ~321–397 (bootstrap effect), welcome/PWA dismiss handlers.
3. **Extract `useLandlordListingsQuery`** — move `fetchData` body; expose `{ myListings, availability, eventOptInsByListing, loading, fetchError, refetch }`.
4. **Extract `ConfirmDeleteDialog`** — period + listing delete modals (~100 lines JSX).

## Out of scope

- Listing card / action sheet split (Wave 2b)
- React Query migration (optional; keep useState if simpler for this wave)
- `ListingDetailsClient.tsx`

## Acceptance criteria

- [ ] Manage page behavior unchanged (welcome modal, deep links `?listing=&panel=`)
- [ ] `LandlordManagePage.tsx` < 1,600 lines after extraction
- [ ] No local `getEffectiveStatus` function
- [ ] `npm run build` passes

## Commit

`refactor(wave-2): extract manage bootstrap and listings query hooks`
