# Agent brief — NPD-2: Event saksbehandler-reise

**Prioritet:** P1  
**Audit:** Growth FAIL (løses av 0B) + INFO event_ansatt UI delvis  
**Branch suffix:** `npd-2-event-sb`  
**Avhengighet:** NPD-0B

## Oppgave

Etter login som `kari.event@demo.ofoten.no`:

1. Post-login routing til event-relevant rute (`/nav/event-inquiries` eller `/nav/event/*`).
2. Dokumenter forventet demo-flyt i `DEMO_NARVIK_OFOTEN.md` (event SB isolasjon — ingen sosial boligbank).
3. Vurder om eksisterende `/nav/event/*`-ruter trenger tydeligere IA for `event_ansatt`.

## Akseptansekriterier

- [ ] Full persona-smoke i product-growth-audit
- [ ] Event SB ser kun event opt-in boliger og event-henvendelser (ikke sosial SB-data)
