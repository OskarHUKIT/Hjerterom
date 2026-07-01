# Agent brief — NPD-4A: Finn locale-konsistens

**Prioritet:** P1  
**Audit:** Growth WARN — blandet EN body + NO nav  
**Branch suffix:** `npd-4a-finn-i18n`

## Oppgave

Sikre at Finn-undersider (`/finn/listing/*`, `/finn/arrangement/*`, `/finn/vilkar`) bruker `useLanguage()` konsekvent — ingen hardkodet engelsk når locale er `no` eller `se`.

## Akseptansekriterier

- [ ] Bytt språk på `/finn` → undersider følger valgt locale
- [ ] Ingen nye hardkodede strenger i TSX (grep-gate)
