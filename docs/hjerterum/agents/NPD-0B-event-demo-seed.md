# Agent brief — NPD-0B: Event demo-konto på phi

**Prioritet:** P0 blocker  
**Audit:** Product growth FAIL — `kari.event@demo.ofoten.no` login  
**Branch suffix:** `npd-0b-event-seed`

## Oppgave

Sikre at event saksbehandler-demo fungerer på phi Supabase:

1. Kjør `supabase/scripts/seed_narvik_ofoten_demo.sql` (eller tilsvarende migrasjon `20260701180000_hjerterum_ofoten_demo_seed.sql`) mot phi.
2. Verifiser at `kari.event@demo.ofoten.no` har rolle `event_ansatt` og rad i `central_event_staff`.
3. Oppdater `docs/hjerterum/DEMO_NARVIK_OFOTEN.md` hvis avvik (passord, e-post, tildelte events).

## Akseptansekriterier

- [ ] Login med `Ofoten2026!` → ikke blir på `/login`
- [ ] `/nav/event-inquiries` returnerer 200 for Kari
- [ ] `node scripts/product-growth-audit.mjs` — persona `event_sb` PASS
