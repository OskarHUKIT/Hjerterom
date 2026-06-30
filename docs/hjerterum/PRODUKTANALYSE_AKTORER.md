# Hjerterum — produktanalyse per aktør

**Versjon:** 1.0 · Juni 2026  
**Formål:** Verdensklasse UX for hvert ledd i kjeden — utleier, saksbehandler, leietaker, admin, ops.  
**Metode:** Bransjekonvensjoner (Airbnb, Booking.com, VRBO), dagens kodebase, og forutsetninger der info mangler.

Relatert: `MARKEDSPLAN_OG_VEIEN_VIDERE.md`, `UTVIKLINGSPLAN.md`, `TEST_ACCOUNTS_SETUP.md`.

---

## 0. Kjerneinnsikt

Hjerterum er **ikke én app** — det er et **synergistisk nettverk** med én boligpool og flere «baner»:

| Bane | Gatekeeper | Avtale | Melding | Betaling |
|------|------------|--------|---------|----------|
| **Sosial** | Kommune saksbehandler | Regional kommune-PDF + BankID | Utleier ↔ kommune | Utenfor / faktura |
| **Turisme** | Utleier (direct) | Sentral turisme-avtale (+ ev. kommune) | Utleier ↔ leietaker | **Stripe + Vipps** |
| **Event (saksbehandler)** | Event saksbehandler | Event-spesifikke vilkår | Henvendelse → formidling utenfor | Utenfor Hjerterum |
| **Event (turisme)** | Utleier + leietaker på Finn | Turisme + event addendum | Utleier ↔ leietaker | In-app |
| **Los (ungdom)** | Kommune (etter handoff) | Personvern / samtykke | Los → **samme meldingsmotor** | — |

**Største strukturelle gap i dag:**

1. **Avtaler** er region-baserte — ikke lane/event-baserte.  
2. **Meldinger** er splittet: `chat_messages` (utleier↔kommune), `los_sessions` (ungdom), ingen gjest-tråd.  
3. **Event saksbehandler** finnes som DB-tabell (`central_event_staff`) men **ingen produktrolle/UI**.  
4. **Leietaker-opplevelse** på Finn er MVP — ikke Airbnb/Booking-nivå.

---

## 1. Bransjekonvensjoner (Airbnb / Booking / VRBO)

### 1.1 Leietaker (gjest) — forventninger

| Funksjon | Airbnb | Booking.com | Hjerterum i dag | Må ha |
|----------|--------|-------------|-----------------|-------|
| Søk (sted, dato, gjester) | ✓ kart + filtre | ✓ kart + filtre | Delvis (by + dato RPC) | ✓ |
| Tydelig pris (natt + avgifter) | ✓ | ✓ | Nattpris only | Cleaning fee, service fee |
| Instant Book vs forespørsel | ✓ begge | RtB vs Instant | Forespørsel only (`tourism_instant_book` ubrukt) | ✓ begge |
| Gjestprofil + verifisering | E-post/tlf | Alias-e-post | Magic link OTP | ✓ |
| **Innboks med utleier** | ✓ per reservasjon | ✓ Extranet/Pulse | **Mangler** | ✓ P0 |
| Booking-admin (avbestill, endre) | ✓ | ✓ | `/finn/mine` basic | Full lifecycle |
| Anmeldelser | ✓ | ✓ | Mangler | Fase 2 |
| Check-in guide / nøkkelinfo | ✓ guidebook | Maler | Mangler | Fase 2 |
| Betaling | Kort, Apple Pay | Booking Payments / lokalt | Stripe only | **+ Vipps** (Norge) |
| Event/opplevelser | Experiences | Activities | `/finn/arrangement` basic | Kurert UX |

**Airbnb-messaging-konvensjoner** (referanse for Hjerterum):

- Én **tråd per reservasjon** (ikke per listing generelt etter booking).
- Tråd **før** booking tillatt ved interesse (pre-reservation messaging).
- **Read receipts**, vedlegg, maler (quick replies).
- All kommunikasjon **på plattformen** (ikke del privat e-post) — tillit og sikkerhet.

### 1.2 Utleier — forventninger

| Funksjon | Konvensjon | Hjerterom i dag |
|----------|------------|-----------------|
| Multi-calendar (sosial/turisme/event) | Separate kalendere eller lanes | ✓ lanes på availability |
| Prising per lane | Ja | Delvis (turisme nattpris) |
| Booking-innboks | Godta/avslå, meldinger | ✓ `LandlordBookingRequests` |
| Utleier-dashboard | Oversikt, oppgaver, inntekt | `LandlordManagePage` (tung) |
| Co-host / delegasjon | Airbnb har co-host | Mangler |
| **Avtaler/vilkår** | Plattform ToS + lokale regler | BankID per region |
| Meldinger filtrert per kontekst | Turisme vs support | Alt i `/nav/messages` for kommune |

### 1.3 Saksbehandler / ops — forventninger

- **CRM-innboks**: assign, status, SLA, notater.
- **Rollebasert tilgang**: kun egne kommuner/events.
- **Audit trail**: hvem gjorde hva.
- Booking.com Extranet = «command center» — Hjerterum `/ops` + `/nav/*` skal matche dette nivået over tid.

---

## 2. Utleiere — analyse og forslag

### 2.1 Avtaler: region × lane × event

**Dagens modell:** `terms_documents` med `kommune_region` (global + regional). Signering via BankID. **Ikke** knyttet til sosial/turisme/event.

**Målmodell (forslag):**

```
Avtalepakke for utleier =
  BASE (alltid)
+ SOSIAL_REGIONAL (hvis listing i kommune X og lane sosial)
+ TURISME_SENTRAL (hvis tourism_enabled — én nasjonal mal fra ops)
+ EVENT_[slug] (hvis opt-in på sentralt arrangement)
```

| Avtaletype | Hvem publiserer | Når kreves | Signering |
|------------|-----------------|------------|-----------|
| Grunnavtale Boly/Hjerterum | Ops | Alltid | **BankID** (utleier) |
| Kommune sosial | Kommune admin → ops godkjenner | Listing i kommune + lane sosial | **BankID** (utleier) |
| Turisme sentral | Ops | `tourism_enabled` | **BankID** (utleier) |
| Event addendum | Ops (+ event-spesifikke vedlegg) | Event opt-in | **BankID** (utleier) |
| Leietaker vilkår (Finn) | Ops | Konto + booking | **Click-wrap** (leietaker-konto) |

**Besluttet (juni 2026):** Utleiere signerer **alltid med BankID**. Leietakere har **egen konto** på Finn og godtar vilkår via **click-wrap** (registrering + booking).

**Utleier-side — «Mine avtaler» (ny hub):**

- Tabell: avtale | omfang (region/lane/event) | status | PDF | signer
- **Blokkerer** turisme-publisering / event opt-in til riktig avtale er signert
- Varsel-badge på `LandlordManagePage` sidebar

**Fortsatt åpent:**

1. Kan én utleier ha **ulike sosiale avtaler** for boliger i ulike kommuner — signeres én gang per region eller per bolig?
2. Skal **event-avtale** gjelde alle opt-in boliger, eller kan utleier velge per bolig?

### 2.2 Utleier administrasjon (dashboard)

**Forslag: «Utleier-senter»** (evolve `LandlordManagePage`):

| Seksjon | Innhold |
|---------|---------|
| **Oversikt** | Oppgaver (signer avtale, godta booking, event opt-in), inntekt (Stripe) |
| **Boliger** | Eksisterende listing cards |
| **Kalender & lanes** | Sosial / turisme / event per periode |
| **Bookinger** | Turisme-forespørsler + status |
| **Meldinger** | Faner: *Kommune* | *Leietakere* | (fremtid: *Event*) |
| **Avtaler** | Matrix region/lane/event |
| **Stripe / utbetaling** | Connect status |

**Turisme — ekstra funksjoner (industri-standard):**

- Minimum opphold, forberedelsestid mellom gjester
- Husregler (PDF finnes delvis)
- Avbestillingsregler (`cancellation_policy` — kolonne finnes, UI mangler)
- Instant book toggle (`tourism_instant_book`)
- Prisregler: høysesong, ekstra gjest, rengjøringsgebyr
- **Co-host** (dele utleierkonto) — fase 2

**Si fra om du vil prioritere:** prisregler, co-host, eller avtale-matrix først.

### 2.3 Meldinger for utleier

**I dag:** Utleier ↔ kommune via `chat_messages` (service area tråd).

**Må ha:**

| Motpart | Tråd-type | Når åpnes |
|---------|-----------|-----------|
| Kommune saksbehandler | `channel: kommune` | Formidling, sosial |
| Leietaker (Finn) | `channel: guest_booking` | Etter booking-forespørsel / bekreftet |
| Event saksbehandler | **Nei** — event utleie skjer utenfor | — |

**UX:** Tydelig **avatar/merke** på hver tråd: 🏛️ Kommune · 🧳 Leietaker · (ikke event).

---

## 3. Kommunesaksbehandlere

### 3.1 Boly-funksjoner (behold)

- Boligbank, formidling, reservasjon, meldinger med utleier, brukere, vilkår, varsler.

### 3.2 Los i meldingsfunksjonen

**Dagens gap:** Los er `/nav/los-inbox` (summary), ikke i `/nav/messages`.

**Mål-UX (verdensklasse):**

```
/nav/messages
├── Faner: [Alle] [Utleiere] [Kollegaer] [Digital Los]
└── Los-fane:
    ├── Liste: handoffs med saksnummer, status, kommune
    ├── Valgfritt: fortsett samtale (når ungdom har gitt kontakt)
    └── CTA: «Åpne boligbank» (beholder kobling formidling)
```

**Placeholder nå (inntil full integrasjon):**

- Los-fane i meldinger som **peker til innboks** + kort forklaring
- Eller: embed handoff-liste i meldingslayout med samme design språk

**Los-tilgang per konto:**

| Flag | Hvor settes | Effekt |
|------|-------------|--------|
| `digital_los_enabled` | Ops → kommune | Kommune kan motta handoffs |
| `staff.los_access` (ny) | Kommune admin | Individuell tilgang til Los-fane |

**Besluttet (juni 2026) — identitet etter handoff:**

- Ungdom oppgir **navn** (påkrevd) og **telefon** (valgfritt) ved overlevering.
- Saksbehandler ser navn i Los-innboks og ev. meldingstråd — **ikke** anonym videre chat.

**Fortsatt åpent:**

1. Skal **alle** saksbehandlere i kommune med Los se alle saker, eller kun tildelte?
2. Skal Los **erstatte** telefon for ungdom i pilotkommune?

### 3.3 Visuell skillnad kommune vs event

Kommune-navigasjon skal **ikke** vise event-innboks med mindre brukeren har event-tillatelse. Bruk **rolle-badge** i header: «Kommune · Narvik».

---

## 4. Event saksbehandlere (ny rolle)

### 4.1 Tillatelsesmodell — **besluttet**

**Besluttet (juni 2026):** Event saksbehandler er en **egen produktrolle** — parallell med kommune saksbehandler, ikke bare et grant-flagg.

| Aspekt | Kommune SB | Event SB |
|--------|------------|----------|
| `profiles.role` | `kommune_ansatt` / `kommune_admin` | **`event_ansatt`** (ny) |
| Scope | `user_kommune_grants` | **`central_event_staff`** (per event) |
| Tildeling | Kommune admin inviterer | **Ops** tildeler i dashboard |
| Innlogging | `/nav/*` | `/nav/event/*` (eget shell) |

**Implementasjon:**

```text
profiles.role = 'event_ansatt'   -- ny verdi i CHECK constraint

central_event_staff (finnes):
  event_id, profile_id, role ('coordinator' | 'staff')
```

- Ops: `/ops/events/[slug]` → **Staff** → velg bruker / inviter ny `event_ansatt`
- Middleware: event SB ser kun events de er assigned til
- UI-badge i header: «Event · [arrangementsnavn]» (ikke «Kommune»)

**Lik kommune ellers:** innboks, assign, status, meldinger mellom kollegaer — men **uten** formidling, Los og boligbank-redigering.

### 4.2 Event saksbehandler — viktige funksjoner

| Funksjon | Begrunnelse |
|----------|-------------|
| **Henvendelses-innboks** | Per event, assign, status (finnes delvis) |
| **Boligoversikt (read-only)** | Se opt-in boliger, filtre, **ingen** formidling i Hjerterum |
| **Geografi-filter** | `geography_scope` på event |
| **Eksport kontaktinfo** | Utleie skjer utenfor — trenger PDF/CSV til hotell/koordinator |
| **Statistikk** | Antall henvendelser, opt-in boliger, kapasitet |
| **Meldinger** | Kun internt mellom event-staff (ikke utleier) |
| **Avtale-oversikt** | Event-spesifikke vilkår for utleier-opt-in (read-only) |

**Forskjell fra kommune:**

| | Kommune SB | Event SB |
|---|------------|----------|
| Formidling / reservasjon | ✓ | ✗ |
| Boligbank redigering | ✓ (med grant) | Read-only |
| Los | ✓ (med tilgang) | ✗ |
| Henvendelser fra Finn | Kun `routing_mode=saksbehandler` | ✓ |
| Utleie gjennomføres | I Hjerterum (sosial) | **Utenfor** |

### 4.3 Event SB — eget dashboard?

**Forslag:** `/nav/event` (eller `/event/dashboard`) — egen shell lik kommune, men smalere nav:

- Henvendelser
- Boliger (opt-in)
- Arrangement-detaljer (read-only fra ops)
- (Ingen boligbank-formidling, ingen Los)

**Fortsatt åpent:**

1. Skal de se **persondata** fra henvendelser utover det som trengs for koordinering (GDPR)?
2. Trenger de **melding til utleier** i appen, eller kun ekstern koordinering?
3. Skal event SB se **sosial boligbank** read-only i samme region?

---

## 5. Leietakere (Finn) — verdensklasse UX

### 5.1 Informasjonsarkitektur

```
finn.hjerterum.no
├── Søk (turismo) — kart, filtre, datoer, gjester
├── Opplevelser / Arrangement — kurert liste + detalj
├── Mine reiser — bookinger, meldinger, kvitteringer
└── Hjelp / Vilkår
```

### 5.2 Booking-flyt (mål)

1. **Registrer konto** (e-post/magic link) + **click-wrap** på plattformvilkår
2. **Oppdag** → listing/event med rike bilder, tydelig pris
3. **Forespørsel eller Instant book**
4. **Bekreftelse** → e-post + `/finn/mine`
5. **Betaling** — **Stripe og Vipps** (leietaker velger eller default per listing)
6. **Melding** → tråd med utleier (pre- og post-booking)
7. **Før ankomst** → check-in info (fase 2)
8. **Avbestilling** → policy-styrt (fase 2)

**Leietaker-konto (besluttet):** Ikke BankID. Permanent konto med profil (`guest_profiles`), bookinghistorikk, meldinger og click-wrap ved registrering og booking.

### 5.3 Event + turisme (routing)

| `central_events.routing_mode` | Leietaker-opplevelse |
|-------------------------------|----------------------|
| `saksbehandler` | Skjema → event saksbehandler (ingen direkte utleier) |
| `turisme` | Listing opt-in → **booking som vanlig turisme** + event-badge |

**Spørsmål:**

1. Skal leietaker kunne **booke flere boliger** for ett event (gruppe)?
2. **Gjesteliste** (Airbnb: inviter medreisende til tråd)?
3. Språk: **EN default** — skal NB være like prominent?

### 5.4 Gjest-meldinger (teknisk forslag)

Utvid `chat_messages` eller ny `conversation` + `conversation_participants`:

- `conversation_type`: `landlord_guest_booking`
- `booking_id` FK
- Gjest = `guest_user_id` fra magic link auth
- RLS: kun deltakere + utleier

---

## 6. Saksbehandler-admin

### 6.1 Kommune admin — tilgangsmatrise

| Tillatelse | Beskrivelse | I dag |
|------------|-------------|-------|
| `kommune` | Hvilke kommuner (grants) | ✓ `user_kommune_grants` |
| `redigering` | `can_edit` vs read-only | ✓ |
| `los` | Se Los-fane / handoffs | **Mangler per bruker** |
| `avtale` | Last opp vilkår-PDF | ✓ `/nav/terms-documents` |
| `inviter` | Nye saksbehandlere | ✓ `/nav/kommune-access` |

**UX-forslag:** `/nav/kommune-access` → tabell med checkboxes per person: Redigering | Los | Admin.

### 6.2 Event admin (ops-side)

Event har **ikke** kommune admin — ops styrer event staff. Kommune admin kan ev. **delegeres** read-only innsyn i event boliger i sin region (avklar).

---

## 7. Ops — verdensklasse dashboard

### 7.1 Moduler i dag

`/ops/platform`, kommuner, events, accounts, terms, service areas, stats.

### 7.2 Forslag utvidelse

| Modul | Funksjon |
|-------|----------|
| **Kommune-tilgang** | Bulk: Los, turisme, antall SB, whitelist |
| **Event-tilgang** | Staff per event, routing mode, geografi |
| **Avtaler** | Sentral turisme-PDF, godkjenn kommune-PDF, event addendum |
| **Meldinger / SLA** | Antall ubesvarte Los-handoffs, event inquiries (kun metrikk) |
| **Integrasjoner** | Stripe, Vipps, Signicat status |
| **Audit** | Siste kritiske hendelser (finnes delvis via platform events) |

**Ops accounts UI:** Legg til capabilities: `event_staff`, `kommune_grants`, `platform_operator` — ikke bare rolle-dropdown.

---

## 8. Synergier — ett nettverk

```text
                    ┌──────────── OPS ────────────┐
                    │ avtaler · events · tilgang  │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
  KOMMUNE SB               EVENT SB                    UTLIER
  boligbank+Los            henvendelser                boliger+lanes
        │                         │                         │
        └──────────── meldinger ──┴──── meldinger ──────────┘
                                  │
                            LEietaker (Finn)
                            søk · book · melding
```

**Designprinsipper:**

1. **Samme meldingsmotor** — ulike trådtyper, tydelig merking.
2. **Samme avtalemotor** — ulike pakker utløst av lane/event/region.
3. **Samme listing** — lanes styrer synlighet (sosial aldri public).
4. **Presets i ops** — Boly / pilot / full (finnes).

---

## 9. Prioritert roadmap (forslag)

### P0 — Fundament

| # | Leveranse |
|---|-----------|
| 1 | Avtalemodell v2: lane + turisme sentral + event addendum (BankID utleier; click-wrap leietaker) |
| 2 | Gjest-meldinger knyttet til `bookings` |
| 3 | Los-fane i `/nav/messages` + navn/telefon ved handoff |
| 4 | `los_access` per saksbehandler (kommune admin) |
| 5 | **`event_ansatt` rolle** + ops UI + scoped `/nav/event` dashboard |
| 6 | Finn: pris breakdown + booking lifecycle på `/finn/mine` |
| 7 | **Vipps + Stripe** parallelt på checkout |

### P1 — Konkurransedyktig Norge

| # | Leveranse |
|---|-----------|
| 8 | Kart på Finn |
| 9 | Instant book + avbestilling |
| 10 | Utleier meldings-faner (kommune vs leietaker) |

### P2 — Verdensklasse polish

| # | Leveranse |
|---|-----------|
| 12 | Anmeldelser |
| 13 | Check-in guide |
| 14 | Co-host |
| 15 | Quick replies / maler |

---

## 10. Produktbeslutninger (låst juni 2026)

| # | Tema | Beslutning |
|---|------|------------|
| 1 | **Avtaler utleier** | **BankID** for alle utleier-avtaler (sosial, turisme, event) |
| 2 | **Avtaler leietaker** | **Click-wrap** + **egen konto** på Finn (e-post/magic link, ikke BankID) |
| 3 | **Los etter handoff** | **Navn** (påkrevd) + **telefon** (valgfritt) — ikke anonym videre |
| 4 | **Event saksbehandler** | **Egen rolle** `event_ansatt`, tildelt av ops per event — lik kommune SB ellers |
| 5 | **Betaling turisme** | **Stripe og Vipps parallelt** — leietaker/utleier velger eller default |

---

## 11. Fortsatt åpne spørsmål

### Avtaler
1. Event-avtale per utleier globalt eller per bolig?
2. Skal kommuner **publisere egne turisme-vilkår**, eller kun ops sentral?

### Los
3. Alle SB ser alle Los-saker i kommunen, eller kun assigned?
4. Skal Los **erstatte** telefon for ungdom i pilotkommune?

### Event
5. Trenger event SB **melding til utleier** i appen?
6. Skal event SB se **sosial boligbank** read-only i samme region?

### Leietaker
7. Gruppebooking / flere rom for event?
8. Anmeldelser — ja/nei i v1?

### Organisatorisk
9. Skal **NAV**-saksbehandlere ha samme rolle som kommune SB?
10. Én nasjonal **turisme-avtale** — hvem eier juridisk (ops/kommune/forbund)?

---

## 12. Konklusjon

Hjerterum har **riktig konseptuell arkitektur** (én pool, flere baner), men **produktet behandler fortsatt avtaler, meldinger og roller som Boly 1.0**. For verdensklasse UX må hvert ledd få:

- **Utleier:** avtale-matrix + meldinger mot kommune **og** leietaker  
- **Kommune SB:** Boly + Los **inni meldinger** + granulær Los-tilgang  
- **Event SB:** egen rolle `event_ansatt`, eget dashboard, henvendelser uten formidling  
- **Leietaker:** Finn-konto + click-wrap + Airbnb-nivå (søk, book, administrer, **melding**)  
- **Admin/Ops:** intuitive tilgangspaneler for kommune, event, avtaler  

Neste steg anbefales: **avtale v2 (BankID/click-wrap) + `event_ansatt` + gjest-meldinger + Los navn/telefon + Vipps/Stripe** som P0.

*Dokumentet er levende — oppdater når flere spørsmål i §11 avklares.*
