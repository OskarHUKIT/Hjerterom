# L7 — Non-subscribed kommune onboarding (PRD §6.2, L-7)

**Status:** In progress  
**Prefix:** `feat(prd-l7):`  
**Depends:** M1 (optional M2 for banner i18n)

## Goal

When landlord's city maps to a kommune that is **not** `pilot`/`active`, allow registration without social sign-terms redirect. Show clear messaging: tourism/events available; social not.

## Files (scope lock)

| File | Action |
|------|--------|
| `supabase/migrations/*_kommune_social_subscribed.sql` | RPC `is_kommune_social_subscribed(city)` |
| `frontend/app/lib/kommuneSocialEligibility.ts` | Client helper |
| `frontend/app/homeowner/register/page.tsx` | Branch sign-terms redirect |
| `frontend/app/lib/landlordNavGate.ts` | Skip sign-terms when ineligible |
| `frontend/features/listings/components/LandlordManagePage.tsx` | Info banner |
| `frontend/lib/i18n/listings.ts` | `landlordKommuneNotSubscribed*` keys (no+se+en) |

## Acceptance

- City in `draft`/`suspended`/unknown kommune → listing saves without BankID social terms
- City in `pilot`/`active` kommune → existing sign-terms flow unchanged
- Banner on manage when social lane unavailable

## Verify

RPC unit test or manual with test kommune; build green
