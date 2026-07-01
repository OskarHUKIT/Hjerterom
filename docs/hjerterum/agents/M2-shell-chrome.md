# M2 — Finn/Los shell chrome (PRD §15.8 M2, UX-17)

**Status:** In progress  
**Prefix:** `feat(prd-m2):`  
**Depends:** M1

## Goal

Add **language selector** + **theme toggle** to `FinnShell` and `LosShell`. Remove Finn English-default locale hack (`hjerterum-finn-locale`).

## Files (scope lock)

| File | Action |
|------|--------|
| `frontend/app/components/design-system/ShellChromeControls.tsx` | New shared control |
| `frontend/app/finn/components/FinnShell.tsx` | Add controls; remove locale EN force |
| `frontend/app/los/components/LosShell.tsx` | Add controls |

## Acceptance

- NO / Sámi / EN selector visible in Finn + Los header
- Theme toggle works for guests on Finn/Los
- Uses global `boly-locale` (not separate Finn key)

## Verify

Manual: `/finn` and `/los` — toggle theme + language at 320px width.
