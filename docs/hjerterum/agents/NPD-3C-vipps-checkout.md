# Agent brief — NPD-3C: Vipps parallelt med Stripe

**Prioritet:** P2  
**Kilde:** UTVIKLINGSPLAN §1.14, PRODUKTANALYSE §1.1  
**Branch suffix:** `npd-3c-vipps`  
**Env:** Vipps test-credentials på phi/staging

## Oppgave

Vipps ePayment som alternativ på Finn checkout ved siden av Stripe.

## Akseptansekriterier

- [ ] Gjest kan velge Vipps eller kort der env er satt
- [ ] Webhook/idempotens dokumentert
- [ ] Uten credentials: feature-flag / tydelig «kun Stripe» i dev
