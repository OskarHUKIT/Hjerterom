# M5 — Sámi audit (PRD §15.8 M5, UX-16)

**Status:** Ready  
**Prefix:** `feat(prd-m5):`  
**Depends:** M2–M4

## Goal

100% `se` keys for Finn/Los user-facing strings. Replace Norwegian/English placeholders in `lib/i18n/finn.ts` and Los keys in `common.ts`. i18n audit script in CI.

## Files (scope lock)

| File | Action |
|------|--------|
| `frontend/lib/i18n/finn.ts` | Proper Sámi translations |
| `frontend/lib/i18n/common.ts` | Los keys |
| `frontend/scripts/i18n-audit.mjs` | Parity checker |
| `frontend/package.json` | `"i18n:audit"` script |

## Acceptance

- `npm run i18n:audit` exits 0
- No hardcoded user copy in `app/finn/vilkar`, `app/los/personvern` (or i18n-wrapped)

## Note

Release blocker for tourism/Los GA per PRD.
