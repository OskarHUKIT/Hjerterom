# Agent brief — NPD-3D: First-book-wins concurrency

**Prioritet:** P2  
**Kilde:** Growth INFO, PRD booking  
**Branch suffix:** `npd-3d-concurrency`

## Oppgave

Verifiser at samtidige booking-forespørsler på samme listing/dato ikke dobbelboker:

- DB-constraint eller RPC med row lock
- Test: to parallelle requests → én vinner, én feiler gracefully

## Akseptansekriterier

- [ ] Automatisert test eller dokumentert load-test
- [ ] Ingen dobbel `accepted` for overlappende periode
