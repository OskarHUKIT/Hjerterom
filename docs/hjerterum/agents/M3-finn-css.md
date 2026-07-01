# M3 — Finn CSS → Boly tokens (PRD §15.8 M3, UX-7)

**Status:** In progress  
**Prefix:** `feat(prd-m3):`  
**Depends:** M1, M2

## Goal

Migrate `finn.css` from always-light hardcoded palette to `globals.css` semantic tokens via `[data-theme]`. Remove `FinnShell` forced-light `useEffect`.

## Files (scope lock)

| File | Action |
|------|--------|
| `frontend/app/finn/finn.css` | Map `--finn-*` → `var(--bg-app)` etc. |
| `frontend/app/finn/components/FinnShell.tsx` | Remove `data-finn-shell` light override |

## Acceptance

- Dark default first paint on `/finn`
- Light mode opt-in via theme toggle
- No `#fff` / `#f8fafc` full-page backgrounds without theme support

## Verify

`/finn` in dark + light; `npm run build`
