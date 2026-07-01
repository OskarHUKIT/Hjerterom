# M4 — Los CSS → Boly tokens (PRD §15.8 M4, UX-8)

**Status:** In progress  
**Prefix:** `feat(prd-m4):`  
**Depends:** M1

## Goal

Same as M3 for Digital Los: `los.css` uses semantic tokens; dark default; light opt-in.

## Files (scope lock)

| File | Action |
|------|--------|
| `frontend/app/los/los.css` | Token migration |
| `frontend/app/los/components/LosShell.tsx` | Remove `data-los-shell` if only for light hack |

## Acceptance

- Dark default on `/los`
- Chat bubbles readable in both themes

## Verify

`/los` dark + light; build green
