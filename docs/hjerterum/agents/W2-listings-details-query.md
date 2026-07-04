# Agent brief — Wave 2b: ListingDetailsClient query extraction

## Objective

Extract the monolithic `fetchData` useEffect from `ListingDetailsClient.tsx` (~4,967 lines) into a typed hook. First JSX split is optional if time-constrained.

## Context to read

- `frontend/features/listings/components/ListingDetailsClient.tsx` (search `fetchData`, ~line 622–790)
- `frontend/app/lib/listingUiTypes.ts`
- `frontend/app/lib/queries/queryKeys.ts`

## In scope

| File | Action |
|------|--------|
| `frontend/features/listings/hooks/useListingDetailsQuery.ts` | **Create** — all fetch logic, loading/error states |
| `frontend/features/listings/components/ListingDetailsClient.tsx` | Replace useEffect with hook |
| `frontend/app/lib/listingUiTypes.ts` | Wire types into hook return (replace `any` for listing) |

## Out of scope

- Gallery / nav sidebar JSX splits (Wave 2c follow-up)
- Mediation logic move to `features/mediation/`

## Acceptance criteria

- [ ] Owner, `?view=nav`, and event-staff views load same data as before
- [ ] Fetch errors show toast (not silent logError only)
- [ ] `ListingDetailsClient` loses ~150+ lines from effect extraction
- [ ] `npm run build` passes

## Commit

`refactor(wave-2): extract useListingDetailsQuery from megasite`
