# Agent brief — NPD-1B: Nav desktop chrome

**Prioritet:** P1  
**Audit:** UX WARN — theme toggle og `se`-velger ikke på `/nav/database` desktop  
**Branch suffix:** `npd-1b-nav-chrome`  
**Avhengighet:** NPD-0A

## Oppgave

Sørg for at Boly App-header (`Header.tsx` / `SiteChrome`) eksponerer:

- Theme toggle ved viewport ≥1280px (ikke kun mobilmeny/bunnnav)
- Locale selector med `no`, `se`, `en` på `/nav/*`

## Filer (sannsynlige)

- `frontend/app/components/Header.tsx`
- `frontend/app/components/SiteChrome.tsx`

## Akseptansekriterier

- [ ] `/nav/database` — toggle + språk synlig desktop uten hamburger
- [ ] UX audit: 0 WARN på Nav theme/i18n
- [ ] PRD §15.9: 1280×800 boligbank i begge temaer
