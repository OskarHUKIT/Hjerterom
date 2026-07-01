# M1 — Theme persistence (PRD §15.2, §15.8 M1)

**Status:** In progress  
**Prefix:** `feat(prd-m1):`  
**Depends:** —

## Goal

Enable dark/light theme for **all users** (guest + logged-in). Persist guest choice in `boly-theme-guest`; logged-in in `profiles.preferred_theme` + `boly-theme:{userId}` localStorage. Profile wins on login.

## Files (scope lock)

| File | Action |
|------|--------|
| `supabase/migrations/*_profiles_preferred_theme.sql` | Add column |
| `frontend/context/ThemeContext.tsx` | Guest + profile sync |
| `frontend/app/components/Header.tsx` | Guest theme toggle in toolbar |

## Acceptance

- Guest can toggle theme; reload keeps choice
- Logged-in user syncs to `profiles.preferred_theme`
- Default remains `dark`
- No forced `data-theme=light` in FinnShell (removed in M3)

## Verify

```bash
cd frontend && npm run build
```
