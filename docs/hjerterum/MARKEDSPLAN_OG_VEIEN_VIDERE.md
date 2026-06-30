# Hjerterum — markedsplan og veien videre

**Versjon:** 2.0 · Juni 2026  
**Formål:** Verdensklasse-krav for norsk marked, gap-analyse, og full utviklingsplan.  
**Mål:** Ta over det norske markedet for kommunal boligformidling + turisme + ungdomstjenester.

---

## 0. Er alt som det skal være i dag?

**Nei — men fundamentet er solid.** Hjerterum har:

| Modul | Modenhet | Vurdering |
|-------|----------|-----------|
| Boly sosial formidling | ~90% | Produksjonsklar boligbank, meldinger, formidling |
| Plattformkontroll (`/ops/platform`) | ~95% | Presets, moduler, trygg Boly-default |
| Lanes (sosial/turisme) | ~80% | DB + utleier-UI; booking-konflikt mangler |
| Sentrale arrangement (ops) | ~70% | CRUD OK; geografi, staff, workflow tynt |
| Finn / turisme | ~55% | Søk + booking-sti; kart, Vipps, dato-søk delvis |
| Stripe-bookinger | ~60% | Happy path; kvittering, avbestilling, Vipps mangler |
| Digital Los (ungdom) | ~50% | Chat + overlevering; case-kontinuitet forbedret i sprint 2 |
| Ungdom ↔ saksbehandler | ~45% | Kobling via Los-innboks → boligbank (ny flyt) |
| BankID | Moden (Boly) | Test-bypass via `BANKID_AUTO_ACCEPT` (ny) |

**Default produksjon:** Kun Boly til ops eksplisitt aktiverer Hjerterum-moduler.

---

## 1. Visjon: én plattform, tre baner + Los

```
                    ┌─────────────────────────────────────┐
                    │         HJERTERUM PLATTFORM         │
                    │     (én boligpool, flere baner)     │
                    └─────────────────────────────────────┘
           │                    │                    │
     ┌─────▼─────┐        ┌─────▼─────┐        ┌─────▼─────┐
     │   SOSIAL  │        │ ARRANGEMENT│        │  TURISME  │
     │ saksbeh.  │        │ ops event  │        │  utleier  │
     │ gatekeeper│        │ + routing  │        │  direct   │
     └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
           │                    │                    │
     /nav/database         /finn/arrangement      /finn
           ▲                    ▲                    ▲
           │                    │                    │
     ┌─────┴────────────────────┴────────────────────┴─────┐
     │              DIGITAL LOS (ungdom 16–25)              │
     │   Anonym chat → kommune-valg → overlevering →      │
     │   saksnummer → saksbehandler-innboks → boligbank   │
     └─────────────────────────────────────────────────────┘
```

---

## 2. Ungdom ↔ saksbehandler — målbilde

### I dag (etter sprint 2)

1. **Ungdom** åpner `/los` (ingen innlogging, ingen BankID).
2. Velger **kommune** (kun kommuner med `digital_los_enabled`).
3. Chatter med Los (OpenAI edge fn eller fallback).
4. Samtykker → **Overlevering** → får **saksnummer** (`LOS-XXXXXXXX`).
5. **Saksbehandler** ser innboks på `/nav/los-inbox`:
   - **Ta saken** (assign)
   - **Start formidling** (status `in_progress`)
   - **Åpne boligbank** (`/nav/database`)
   - **Lukk** sak

### Gjenstår for verdensklasse

| # | Funksjon | Prioritet | Status |
|---|----------|-----------|--------|
| 1 | Push/e-post til saksbehandler ved ny overlevering | P0 | Placeholder (varsler finnes i Boly) |
| 2 | Ungdom får SMS/e-post med saksnummer | P1 | Placeholder |
| 3 | Koble Los-sak til `chat_messages`-tråd | P1 | Planlagt |
| 4 | RLS: session kun lesbar med token (sikkerhet) | P0 | Migrasjon planlagt |
| 5 | Filtrer handoffs på saksbehandlers kommune-grants | P0 | Delvis (kommune_id på handoff) |
| 6 | **Navn + valgfri telefon** ved handoff (besluttet) | P0 | Schema/UI mangler |
| 7 | DPIA / personvern Los | P1 | Doc placeholder |
| 8 | Azure OpenAI Norge / data residency | P2 | Beslutning åpen |

### Intuitivt for begge sider

**Ungdom:** Minimal friksjon — chat, ett samtykk, ett saksnummer, tydelig «noen tar kontakt».

**Saksbehandler:** Samme mental modell som formidling — innboks → ta sak → boligbank. Ikke raw `<pre>`-dump som sluttstation.

---

## 3. Turisme (Finn) — verdensklasse-krav

### Implementert

- `/finn` søk (by + dato via `search_tourism_listings` RPC)
- Listing-detalj, booking-forespørsel, `/finn/mine` magic link
- Stripe Connect + checkout
- Utleier: turisme-toggle, nattpris, lane `turisme`

### Placeholders (bevisst i UI)

- **Kart** — `ComingSoonPlaceholder` på `/finn`
- **Vipps** — placeholder (kritisk for Norge)

### Sprint 3–4 (turisme)

| Oppgave | Beskrivelse |
|---------|-------------|
| T3.1 | Leaflet-kart på Finn (anonymiserte koordinater) |
| T3.2 | `guest_profiles` + magic-link profil |
| T3.3 | `tourism_instant_book` + `cancellation_policy` i UI |
| T3.4 | Booking ↔ kalender konflikt (RPC) |
| T3.5 | **Vipps eCommerce** parallelt med Stripe |
| T3.6 | Booking-bekreftelse e-post |
| T3.7 | EN/NB språkvelger prominent på Finn |
| T3.8 | Rate limiting på public inserts |

---

## 4. Arrangement (events) — verdensklasse-krav

### Implementert

- Ops: opprett/publiser/lukk (`/ops/events`)
- Utleier: event opt-in + task cards
- Finn: arrangement-liste + henvendelse
- Kommune: filter i boligbank + **innboks med workflow** (assign → formidle → lukk)

### Gjenstår

| # | Oppgave | Prioritet |
|---|---------|-----------|
| E1 | Ops: rediger `geography_scope` | P0 |
| E2 | Ops: `central_event_staff` UI + **`event_ansatt` rolle** | **P0** |
| E3 | Skill routing: `saksbehandler` vs `turisme` på Finn | P0 |
| E4 | Push ved event publish til utleiere | P1 |
| E5 | Custom opt-in periode (sub-range av event) | P2 |

---

## 5. Betalinger

| Metode | Status |
|--------|--------|
| Stripe Connect | Implementert (happy path) |
| Vipps | **P0** — parallelt med Stripe (besluttet juni 2026) |
| Escrow / utbetaling ved check-in | Beslutning åpen |
| Kvittering e-post | Mangler |
| Avbestilling UI | Mangler (`cancellation_policy` ubrukt) |

---

## 6. BankID — test uten Signicat

For staging og enkel testing:

```env
# Vercel + Supabase Edge Functions
BANKID_AUTO_ACCEPT=true
NEXT_PUBLIC_BANKID_AUTO_ACCEPT=true
```

**Effekt:**

- `/homeowner/sign-terms` viser **«Test: Godta uten BankID»**
- `sign-agreement` edge fn hopper over Signicat når env er satt
- API: `POST /api/dev/auto-accept-terms` (krever innlogget bruker)

**Prod:** Env skal være `false` eller unset.

---

## 7. Faseplan (full utvikling)

### Fase A — Pilot-klar (P0, nå → neste sprint)

- [x] Los handoff: kommune-valg + saksnummer
- [x] Los-innboks: assign → formidling → boligbank
- [x] Event-inquiries workflow
- [x] Turisme RPC dato-søk
- [x] BankID test-bypass
- [ ] Los RLS token-scoped
- [ ] Handoff-varsler (e-post)
- [ ] Booking/kalender konflikt
- [ ] Event geography i ops wizard

### Fase B — Konkurransedyktig i Norge (P1)

- [ ] Vipps betaling
- [ ] Finn kart
- [ ] Event routing turisme vs saksbehandler
- [ ] Kvitteringer + avbestilling
- [ ] E2E Playwright (Los → handoff, Finn → book)
- [ ] Rate limiting public API

### Fase C — Markedsleder (P2)

- [ ] Dekomponering megasider (NavDatabase, ListingDetails)
- [ ] Sentry + Core Web Vitals overvåking
- [ ] Multi-kommune Finn visibility
- [ ] Los → meldingstråd
- [ ] BankID login re-enabled for utleier/kommune (prod Signicat)
- [ ] Lastetest + runbook

### Fase D — Skalering

- [ ] White-label per kommune
- [ ] API for tredjepart (NAV, kommune-systemer)
- [ ] Rapportering / BI for ops

---

## 8. Modul-matrise (hvem gjør hva)

| Handling | Ungdom | Gjest Finn | Utleier | Saksbehandler | Ops |
|----------|--------|------------|---------|---------------|-----|
| Los chat | ✓ | — | — | innboks | toggle kommune |
| Sosial formidling | — | — | egne boliger | boligbank | — |
| Event opt-in | — | — | ✓ | filter | opprett event |
| Event henvendelse | — | ✓ (Finn) | — | innboks | — |
| Turisme book | — | ✓ | godta | — | modul på |
| BankID signering | — | — | ✓ | ✓ (vilkår) | — |

---

## 9. Tekniske migrasjoner (rekkefølge)

1. Eksisterende Hjerterum-bundle (lanes, events, bookings, los)
2. `20260701120000_hjerterum_youth_workflows.sql` — Los workflow RPCs, turisme-søk
3. (Planlagt) `20260702_los_rls_token.sql` — sikker session-tilgang
4. (Planlagt) `20260703_booking_calendar_conflict.sql`

---

## 10. Relaterte dokumenter

| Dokument | Innhold |
|----------|---------|
| `UTVIKLINGSPLAN.md` | Original fase 0–7 plan |
| `PLATFORM_CONTROL_PANEL.md` | Modul-toggles |
| `BRUKERVEILEDNING.md` | Teste alle moduler |
| `TEST_ACCOUNTS_SETUP.md` | Roller og testkontoer |
| `OPS_EVENT_RUNBOOK.md` | Arrangement i drift |

---

## 11. Konklusjon

Hjerterum er **arkitektonisk riktig** for norsk marked (én pool, tre baner, Los som inngang for ungdom), men **turisme og arrangement er bevisst tynne** i MVP. Sprint 2 kobler **ungdom → saksbehandler** intuitivt via innboks-flyt. Neste kritiske steg for markedsdominans: **Vipps**, **kart/dato-søk**, **varsler**, og **sikker Los RLS**.

**Test nå:** Sett `BANKID_AUTO_ACCEPT=true`, opprett testkontoer per `TEST_ACCOUNTS_SETUP.md`, aktiver `Hjerterum pilot` i `/ops/platform`, og kjør Los → innboks → boligbank.
