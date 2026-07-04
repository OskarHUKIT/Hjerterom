# NPD smoke log — turisme & event (juli 2026)

Manuell verifikasjon etter NPD-leveranse. Kjør mot phi (`https://hjerterom-phi.vercel.app`) med demo-kontoer fra `DEMO_NARVIK_OFOTEN.md`.

## NPD-2 — Event saksbehandler

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Logg inn `kari.event@demo.ofoten.no` / `Ofoten2026!` | Redirect til `/nav/event/database` | ☐ |
| 2 | Sjekk header | Isolert event-shell (ingen global Boly header) | ☐ |
| 3 | `/nav/event/inquiries` | Kun henvendelser for tildelte events | ☐ |
| 4 | Forsøk `/nav/database` | Redirect til event-portal | ☐ |
| 5 | Event boligbank | Ingen «formidla»-handlinger | ☐ |

**Ops:** Kjør `supabase/scripts/fix_event_demo_kari.sql` hvis steg 1 feiler.

## NPD-3B — Instant book (emma → ingrid)

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Logg inn `emma.becker@demo.ofoten.no` | `/finn/mine` tilgjengelig | ☐ |
| 2 | Book Ingrid instant-book listing (f.eks. hytte Skjomen) | Status `accepted` uten utleier-godkjenning | ☐ |
| 3 | Checkout Stripe test | Status `paid` | ☐ |
| 4 | Request-to-book listing (ikke instant) | Status `pending` → utleier godtar | ☐ |

## NPD-3A — Booking-melding

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Emma: `/finn/mine?booking=<id>` | Chat-panel åpent | ☐ |
| 2 | Send melding | Lagres i tråd | ☐ |
| 3 | Ingrid: `/nav/messages?booking=<id>` eller manage → «Melding til leietaker» | Samme tråd | ☐ |

## NPD-3C — Vipps

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Checkout uten `VIPPS_*` env | Kun Stripe valg + «Vipps ikke klar» | ☐ |
| 2 | Med test-credentials på staging | Vipps-radio synlig, redirect til Vipps | ☐ |

## NPD-3D — Concurrency

| Test | Forventet | Status |
|------|-----------|--------|
| To parallelle `submit_tourism_booking` på samme listing/dato | Én OK, én `dates_conflict` | ☐ |

Se `supabase/scripts/test_booking_concurrency.sql` for SQL-basert verifikasjon.

## NPD-4A — Finn locale

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Velg `no` i Finn-header | `/finn/vilkar` på norsk | ☐ |
| 2 | Velg `se` | Sámi vilkårstekst | ☐ |
| 3 | Checkout status | Oversatt status (ikke rå DB-verdi) | ☐ |

## NPD-4B — Sámi audit

```bash
cd frontend && npm run i18n-audit
```

Forventet: exit 0.
