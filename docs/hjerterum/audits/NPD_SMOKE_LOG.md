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

## NPD-5 — UI design refresh (pilot sign-off)

**Spec:** [`NPD_5_UI_DESIGN_REFRESH.md`](./NPD_5_UI_DESIGN_REFRESH.md)  
**Phi:** `https://hjerterom-phi.vercel.app` · passord `Ofoten2026!` for `@demo.ofoten.no`  
**Baseline PR:** [#34](https://github.com/OskarHUKIT/Hjerterom/pull/34)

### NPD-5A — Design decisions (blocker)

| ID | Beslutning | Status |
|----|------------|--------|
| D1 | Fraunces kun landing/marketing (DM Sans operasjonelt) | ☐ |
| D2 | Én primary token (`--hrt-primary`) | ☐ |
| D3 | Semantiske danger/warning/success tokens | ☐ |
| D4 | Sticky section-nav på nav listing detail | ☐ |
| D5 | Leietaker-lenke: kopier + maskert URL | ☐ |

### NPD-5B — Token & a11y

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | `rg '#[0-9a-fA-F]{3,8}' frontend/features/listings --glob '*.tsx'` | 0 treff (unntak dokumentert) | ☐ |
| 2 | Impeccable live `/` dark + light | Primary CTA ≥ 4.5:1 | ☐ |
| 3 | Impeccable live `/homeowner/manage` | Ingen kontrast-blokkere | ☐ |
| 4 | Impeccable live `/listings/<nav>` (formidlet) | Ingen kontrast-blokkere | ☐ |
| 5 | 320px viewport: manage + listing detail | Ingen horisontal scroll | ☐ |

### NPD-5C — i18n (operasjonelle flater)

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | `cd frontend && npm run i18n-audit` | Exit 0 | ☐ |
| 2 | Listing detail owner: bytt locale til `en` | Ingen hardkodet «Boliginformasjon» / «SOVEROM» | ☐ |
| 3 | Handover + availability legend | `se` + `en` på alle nye nøkler | ☐ |

### NPD-5D — Persona: Tina (kommune)

Konto: `tina.olsen@demo.ofoten.no`

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | `/nav/database` → åpne formidlet bolig | Liste + filter OK mobil/desktop | ☐ |
| 2 | Listing nav view | Formidling + handover synlig / section-nav ≤3 klikk | ☐ |
| 3 | Handover: filter + «Se rapport» fullscreen | Lesbar modal, lukk fungerer | ☐ |
| 4 | Leietaker-lenke (formidlet) | Kopier fungerer; UI etter D5 | ☐ |
| 5 | Dark ↔ light + språk | Persistens, ingen hvit flash | ☐ |

### NPD-5E — Persona: Tommy (utleier)

Konto: `tommy.hakonsen@demo.ofoten.no`

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | `/homeowner/manage` | Kort, filtre, action sheet mobil | ☐ |
| 2 | Lane calendar: marker periode | Farger dark + light korrekte | ☐ |
| 3 | `/listings/<id>?view=owner` | Rediger metrics, galleri, lagring | ☐ |
| 4 | `/homeowner/register` | Skjema + bilder + submit-states | ☐ |
| 5 | Formidlet bolig | Read-only notice; handover CTA | ☐ |

### NPD-5F — Persona: Emma + guest

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Guest: `/` → `/login` | Dark default, trust badges AA | ☐ |
| 2 | `emma.becker@demo.ofoten.no` → `/finn` | Samme token-familie som landing | ☐ |
| 3 | `/finn/search` + boligdetalj | Ingen hvit Finn-øy | ☐ |

### NPD-5G — Portaler (stikkprøve)

| Rute | Forventet | Status |
|------|-----------|--------|
| `/ops` | Solid hero, grafer uten layout shift | ☐ |
| `/los` | Chat-shell tokens, ikke lilla legacy | ☐ |
| `/nav/event/database` | Event-shell (NPD-2 overlap OK) | ☐ |

**NPD-5 ferdig når:** alle ☑ over + sign-off §8 i `NPD_5_UI_DESIGN_REFRESH.md`.
