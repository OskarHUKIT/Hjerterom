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
| **Los (ungdom)** | Kommune (etter KI-handoff) | Personvern / samtykke | **KI kobler** → SB innboks | — |

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
+ EVENT_[slug] (kun når utleier opt-in på det arrangementet — **egen avtale per event**)
```

| Avtaletype | Hvem publiserer | Når kreves | Signering |
|------------|-----------------|------------|-----------|
| Grunnavtale Boly/Hjerterum | Ops | Alltid | **BankID** (utleier) |
| Kommune sosial | Kommune admin → ops godkjenner | Listing i kommune + lane sosial | **BankID** (utleier) |
| Turisme sentral | **Gamechanging** (via ops) | `tourism_enabled` | **BankID** (utleier) |
| **Event (per arrangement)** | Ops (+ event-vedlegg) | Utleier **opt-in** på event | **BankID** (utleier) — **én avtale per event** |
| Leietaker vilkår (Finn) | Ops / Gamechanging | Konto + booking | **Click-wrap** (leietaker-konto) |

**Besluttet (juni 2026):**

- Utleiere signerer **alltid med BankID**. Leietakere har **egen konto** på Finn og godtar vilkår via **click-wrap**.
- **Signering når relevant:** Ny avtale kreves ved **nytt valg** (kommune, turisme, event) eller når utleier **ikke har tilsvarende avtale** fra før.
- **Én signering per scope — ikke per bolig:** Flere boliger med **samme kriterier** (samme kommune, samme event, turisme generelt osv.) dekkes av **én signert avtale**. Ny signering utløses kun ved **endring/registrering** av noe nytt.
- **Event:** Hvert arrangement har **sin egen avtale-PDF** — signeres **én gang per event per utleier**, dekker alle opt-in boliger på det eventet.
- **Turisme:** Nasjonal avtale eies juridisk av **Gamechanging**; signeres én gang per utleier, dekker alle turisme-boliger.

**Teknisk (forslag):** `terms_signatures(landlord_id, agreement_kind, scope_key)` — f.eks. `scope_key = 'kommune:narvik' | 'tourism:global' | 'event:vm2026'`.

**Utleier-side — «Mine avtaler» (ny hub):**

- Tabell: avtale | omfang (region/lane/event) | status | PDF | signer
- **Blokkerer** turisme-publisering / event opt-in til riktig avtale er signert
- Varsel-badge på `LandlordManagePage` sidebar

### 2.2 Utleier administrasjon (dashboard)

**Forslag: «Utleier-senter»** (evolve `LandlordManagePage`):

| Seksjon | Innhold |
|---------|---------|
| **Oversikt** | Oppgaver (signer avtale, godta booking, event opt-in), inntekt (Stripe) |
| **Boliger** | Eksisterende listing cards |
| **Kalender & lanes** | Sosial / turisme / event per periode |
| **Bookinger** | Turisme-forespørsler + status |
| **Meldinger** | Faner: *Sosial SB* | *Event SB* | *Leietakere* — tydelig merking |
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

### 2.3 Meldinger for utleier — **besluttet UX**

**Prinsipp:** Samme meldingsmotor som i dag, men utleier skal **alltid** se tydelig **hvem** og **hva** de skriver med.

| Motpart | Merke / fane | Kontekstlinje (eksempel) |
|---------|--------------|---------------------------|
| **Sosial saksbehandler** (kommune / **NAV**) | 🏛️ Sosial | «Formidling · Narvik» |
| **Event saksbehandler** | 🎫 Event | «VM 2026 · henvendelse» |
| **Leietaker** (Finn) | 🧳 Leietaker | «Booking #4821 · 12–15 aug» |

**UX-krav (P0):**

- Farge + ikon + rolle-badge på hver tråd og i tråd-header
- Faner eller filter: *Sosial* | *Event* | *Leietakere*
- Aldri blande trådtyper uten visuell skillnad
- **NAV** behandles som sosial saksbehandler (samme rollemodell som kommune SB)

**Teknisk:** `conversation_type` eller metadata på tråd: `social_caseworker` | `event_caseworker` | `guest_booking`.

---

## 3. Kommunesaksbehandlere

### 3.1 Boly-funksjoner (behold)

- Boligbank, formidling, reservasjon, meldinger med utleier, brukere, vilkår, varsler.
- **NAV** er et eksempel på sosial saksbehandler — samme rolle (`kommune_ansatt` / grants), ikke egen produktrolle.

### 3.2 Digital Los — **besluttet modell**

**Los kobler ungdom til saksbehandler via KI — ikke som generell meldingsapp for ungdom.**

```
Ungdom (/los)
  → Chat med KI (Los)
  → Velger frivillig: «Koble meg til saksbehandler»
  → Oppgir navn (+ valgfri telefon)
  → KI kobler til valgt / riktig saksbehandler (placeholder inntil full KI-routing)
  → Saksbehandler får handoff i /nav/los-inbox (+ Los-fane i meldinger)
  → Videre: formidling i boligbank (Boly-flyt)
```

| Aspekt | Beslutning |
|--------|------------|
| Ungdoms-side | **Kun KI-chat** — Los er inngangsporten |
| Kobling til SB | **Via KI** (kan være placeholder: manuell assign i innboks) |
| Identitet ved handoff | **Navn** (påkrevd) + **telefon** (valgfritt) |
| SB-side | Innboks; **alle SB i kommunen ser alle Los-saker** i sine kommuner |
| Kobling (P0) | **Kun via chat/KI** — som beskrevet; ingen separat Los-meldingsapp for ungdom |
| Meldinger ungdom↔SB | **Ikke** utenfor KI-chat inntil videre — KI håndterer koblingen |

**Placeholder (P0):** KI-chat → ungdom velger kobling → handoff → **alle** SB i kommunen ser saken → én tar den. Full KI-routing til spesifikk SB senere.

**Los-tilgang:**

| Flag | Hvor settes | Effekt |
|------|-------------|--------|
| `digital_los_enabled` | Ops → kommune | Kommune kan motta handoffs |
| Synlighet | Automatisk | **Alle** kommune-SB med grant i kommunen ser **alle** Los-saker der |

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

**Lik kommune ellers:** innboks, assign, status — men **strengt isolert** fra sosial bane (se §4.4).

### 4.2 Event saksbehandler — viktige funksjoner

| Funksjon | Begrunnelse |
|----------|-------------|
| **Henvendelses-innboks** | Per event, assign, status (finnes delvis) |
| **Boligoversikt** | Kun **event opt-in** boliger — ikke sosial boligbank |
| **Geografi-filter** | `geography_scope` på event |
| **Eksport kontaktinfo** | Utleie skjer utenfor — PDF/CSV til koordinator |
| **Statistikk** | Henvendelser, opt-in boliger, kapasitet |
| **Meldinger** | Kun **event-kontekst** (kollegaer event-SB; utleier kun event-relatert) |
| **Avtale-oversikt** | Event-spesifikke vilkår (read-only) |

### 4.3 Isolasjon sosial ↔ event — **besluttet**

| | Kommune / sosial SB | Event SB |
|---|---------------------|----------|
| Sosial boligbank | ✓ | **✗** (unntak: bolig **også** event opt-in) |
| Event henvendelser | ✗ | ✓ |
| Los | ✓ | ✗ |
| Meldinger utleier (sosial) | ✓ | **✗** |
| Meldinger utleier (event) | ✗ | ✓ (event-kontekst) |
| Formidling | ✓ | ✗ |

**Besluttet:** Sosial og event SB har **sjeldent noe med hverandre å gjøre**. De kan **iblant se samme bolig** når den er event opt-in — ellers **ingen delt innboks, meldinger eller sosial data** for event SB.

### 4.4 Event SB — eget dashboard

**`/nav/event`** — egen shell, smalere nav:

- Henvendelser (kun egne events)
- Boliger (kun opt-in for assigned events)
- Arrangement-detaljer (read-only fra ops)
- Ingen boligbank-formidling, Los, sosial brukerliste

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

### 5.3 Event + turisme (routing) — **besluttet**

| `central_events.routing_mode` | Leietaker-opplevelse |
|-------------------------------|----------------------|
| `saksbehandler` | Skjema → event saksbehandler (ingen direkte utleier-booking) |
| `turisme` | Opt-in boliger → **full Airbnb-lignende flyt**: søk, dato, pris, instant book / forespørsel, betaling, melding med utleier, `/finn/mine` |

**Besluttet:** Event med `routing_mode = turisme` skal føles som **vanlig turisme-booking** (Airbnb-nivå) — event er kontekst/badge, ikke annen bookingmotor.

**Besluttet — gruppebooking:** Ja — leietaker kan booke **flere boliger** knyttet til ett event (gruppe / flere rom).

**Besluttet — anmeldelser v1:** Ja — anmeldelser etter opphold (Airbnb-konvensjon) inkluderes i produktplanen.

**Fortsatt åpent:**

1. **Gjesteliste** (Airbnb: inviter medreisende til tråd)?
2. Språk: **EN default** — skal NB være like prominent?

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
| 1 | Avtalemodell v2: per-event avtale + Gamechanging turisme + BankID/click-wrap |
| 2 | Gjest-meldinger + **utleier tråd-merking** (sosial / event / leietaker) |
| 3 | Los: KI-kobling + handoff (navn/telefon) + placeholder routing |
| 4 | Los: KI-chat-kobling + alle SB ser saker i kommunen |
| 5 | **`event_ansatt` rolle** + ops UI + isolert `/nav/event` |
| 6 | Finn: pris breakdown + booking lifecycle + **gruppebooking** |
| 7 | **Vipps + Stripe** parallelt på checkout |
| 8 | **Anmeldelser v1** (etter opphold) |

### P1 — Konkurransedyktig Norge

| # | Leveranse |
|---|-----------|
| 9 | Kart på Finn |
| 10 | Instant book + avbestilling |
| 11 | Utleier meldings-faner + channel badges (sosial / event / leietaker) |

### P2 — Verdensklasse polish

| # | Leveranse |
|---|-----------|
| 12 | Check-in guide |
| 13 | Co-host |
| 14 | Quick replies / maler |
| 15 | Gjesteliste / medreisende i tråd |

---

## 10. Produktbeslutninger (låst juni 2026)

| # | Tema | Beslutning |
|---|------|------------|
| 1 | **Avtaler utleier** | **BankID** for alle utleier-avtaler (sosial, turisme, event) |
| 2 | **Avtaler leietaker** | **Click-wrap** + **egen konto** på Finn (e-post/magic link, ikke BankID) |
| 3 | **Los etter handoff** | **Navn** (påkrevd) + **telefon** (valgfritt) — ikke anonym videre |
| 4 | **Event saksbehandler** | **Egen rolle** `event_ansatt`, tildelt av ops per event — lik kommune SB ellers |
| 5 | **Betaling turisme** | **Stripe og Vipps parallelt** |
| 6 | **Event-avtale** | **Egen avtale per event** — utleier signerer ved opt-in (BankID) |
| 7 | **Turisme-avtale eier** | **Gamechanging** (juridisk); ops publiserer |
| 8 | **Los** | **Kun KI-kobling** ungdom → saksbehandler (placeholder routing OK) |
| 9 | **Utleier meldinger** | Tydelig skillnad: sosial SB / event SB / leietaker |
| 10 | **Event + turisme** | Leietaker booker **som Airbnb** (full turisme-flyt + event-badge) |
| 11 | **NAV** | Eksempel på **sosial saksbehandler** — samme rolle som kommune SB |
| 12 | **Avtale-scope** | **Én signering per scope** (kommune/event/turisme) — dekker alle matchende boliger |
| 13 | **Los synlighet** | **Alle SB** i kommunen ser **alle** Los-saker i sine kommuner |
| 14 | **Los kobling** | **Kun KI-chat** til videre (som tidligere beskrevet) |
| 15 | **Event SB isolasjon** | **Ingen** sosial boligbank/meldinger — kun event opt-in boliger |
| 16 | **Sosial ↔ event** | Separate baner; delt kun når bolig er event opt-in |
| 17 | **Gruppebooking** | **Ja** — flere boliger per event |
| 18 | **Anmeldelser** | **Ja i v1** |

---

## 11. Fortsatt åpne spørsmål

### Los
1. Skal Los **erstatte** telefon for ungdom i pilotkommune?

### Leietaker
2. **Gjesteliste** — inviter medreisende til booking-tråd?
3. Språk: EN default — skal NB være like prominent på Finn?

---

## 12. Konklusjon

Hjerterum har **riktig konseptuell arkitektur** (én pool, flere baner), men **produktet behandler fortsatt avtaler, meldinger og roller som Boly 1.0**. For verdensklasse UX må hvert ledd få:

- **Utleier:** avtale-matrix + meldinger mot kommune **og** leietaker  
- **Kommune SB:** Boly + Los **inni meldinger** + granulær Los-tilgang  
- **Event SB:** isolert `event_ansatt`-dashboard — kun event opt-in, ingen sosial data  
- **Leietaker:** Finn-konto + click-wrap + Airbnb-nivå + **gruppebooking** + **anmeldelser v1**  
- **Admin/Ops:** intuitive tilgangspaneler for kommune, event, avtaler  

Neste steg anbefales: **per-event avtaler + utleier meldings-merking + Los KI-handoff + event_ansatt + Finn/Airbnb event-turisme + Vipps/Stripe** som P0.

*Dokumentet er levende — oppdater når flere spørsmål i §11 avklares.*
