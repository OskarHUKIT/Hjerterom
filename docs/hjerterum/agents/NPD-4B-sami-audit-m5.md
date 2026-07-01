# Agent brief — NPD-4B: Sámi audit (M5)

**Prioritet:** P1 — **release blocker** for modul-GA  
**Kilde:** PRD §15.8 M5, growth INFO  
**Branch suffix:** `npd-4b-sami`

## Oppgave

1. Kjør `npm run i18n-audit` (eller `frontend/scripts/i18n-audit.mjs`) i `frontend/`.
2. Fyll inn manglende `se`-nøkler for Finn, Los, og nye turisme-strenger.
3. Oppdater PRD §15.5 status når grønn.

## Akseptansekriterier

- [ ] i18n-audit script exit 0
- [ ] Ingen `se`-fallback til `no` eller rå nøkler på `/finn` og `/los`
