# Agent brief — Wave 2c: Manage page UI splits

## Objective

Further reduce `LandlordManagePage.tsx` (~1,695 lines) by extracting listing card and mobile action sheet.

## Prerequisites

W2a complete (bootstrap + listings hooks exist).

## In scope

| File | Action |
|------|--------|
| `frontend/features/listings/components/manage/LandlordListingCard.tsx` | **Create** |
| `frontend/features/listings/components/manage/LandlordListingActionSheet.tsx` | **Create** |
| `frontend/features/listings/components/manage/LandlordManageFilters.tsx` | **Create** |
| `frontend/features/listings/components/LandlordManagePage.tsx` | Compose extracted components |

## Target

`LandlordManagePage.tsx` < 800 lines.

## Commit

`refactor(wave-2): extract manage listing card and action sheet`
