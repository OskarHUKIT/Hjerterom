# Agent brief — NPD-1A: Marketing chrome (/, /login)

**Prioritet:** P1  
**Audit:** Growth WARN — ingen theme/språk på landing og login  
**Branch suffix:** `npd-1a-marketing`  
**Avhengighet:** NPD-0A

## Oppgave

Utvid Universal Boly Standard til marketing og auth-kort:

- `/` (`frontend/app/page.tsx`) — `ShellChromeControls` eller kompakt variant i header/hero
- `/login` — språkvelger + theme toggle synlig uten å måtte åpne undermeny

Mørk default, `no`/`se`/`en` only. Gjest: `localStorage` theme persist.

## Akseptansekriterier

- [ ] Theme toggle synlig på `/` og `/login` ved 320px og 1280px
- [ ] Språkvelger med Sámi (`se`) på begge ruter
- [ ] Product growth audit: ingen WARN på `THEME_/` eller `I18N_/`
