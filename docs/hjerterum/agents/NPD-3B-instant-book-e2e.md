# Agent brief — NPD-3B: Instant book E2E

**Prioritet:** P1  
**Kilde:** Growth audit anbefaling #3, `tourism_instant_book`  
**Branch suffix:** `npd-3b-instant-book`  
**Avhengighet:** NPD-3A (anbefalt, ikke hard)

## Oppgave

Manuell + ev. Playwright E2E på phi:

1. Logg inn som `emma.becker@demo.ofoten.no`
2. Book listing med instant book (f.eks. Tor/ingrid instant book-bolig)
3. Verifiser statusflyt pending → accepted/paid

Dokumenter resultat i `audits/` eller NPD smoke-logg.

## Akseptansekriterier

- [ ] Happy path dokumentert med skjermsteg eller grønn e2e
- [ ] Request-to-book path fortsatt fungerer (regresjon)
