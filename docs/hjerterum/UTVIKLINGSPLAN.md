# Hjerterum — Utviklingsplan

**Versjon:** 1.0 · Juni 2026  
**Formål:** Operativ plan for utvikling av Hjerterum (videreutvikling av Boly-plattformen).  
**Målgruppe:** Utviklere, Cloud Agent, produkteier.

---

## 0. Oppsummert visjon

Hjerterum er én plattform med **én boligpool** og **tre formålsbaner**:

| Bane | Gatekeeper | Hvem oppretter |
|------|------------|----------------|
| **Sosial** | Saksbehandler (kommune/NAV) | Eksisterende Boly-flyt |
| **Arrangement** | Sentralt valgt per event: saksbehandler ELLER utleier (turisme) | **Kun ops** oppretter event; utleier **opt-in** |
| **Turisme** | Utleier direkte + in-app betaling | Løpende, nasjonal |

**Digital Los** = chat-første inngang for ungdom 16–25 → sosial saksbehandler (alle kommuner med flagg).

**Subdomener:**
- `bolynorge.no` / `hjerterum.no` — landing + router
- `app.hjerterum.no` — utleier + saksbehandler (+ eksisterende Boly)
- `finn.hjerterum.no` — leietaker (søk, book, betal)
- `los.hjerterum.no` — Digital Los
- `ops.hjerterum.no` — sentral drift, **event-admin**

---

## 1. Låste produktbeslutninger (skal implementeres)

Disse er avklart i planlegging — **ikke re-besluttes under implementering** uten eksplisitt godkjenning:

1. **Events:** Kun ops oppretter/konfigurerer. Utleier/leietaker/saksbehandler **skaper ikke** events.
2. **Utleier + event:** Kun opt-in: «Boligen min er tilgjengelig for [event]» + valgfri datoperiode innen event-vindu.
3. **Event-routing:** Per event, satt sentralt: `saksbehandler` | `turisme` (utleier-direct).
4. **Turisme:** Alltid utleier-direct; nasjonal synlighet på `finn.*`.
5. **Sosial:** Alltid saksbehandler; aldri på public portal.
6. **Kalender:** Enhver kombinasjon sosial/turisme/event-perioder; konflikt forhindres automatisk.
7. **Betaling:** In-app for turisme-path og event i turisme-modus.
8. **Leietaker-auth:** Ingen BankID; **egen konto** (e-post/magic link) + **click-wrap** på vilkår.
9. **Los:** Alle kommuner med `digital_los_enabled`; kun sosial kobling. Ved handoff: **navn** (påkrevd) + **telefon** (valgfritt).
10. **Arrangementstype:** Generisk (tag/label), ikke hardkodede engangs-events i datamodellen.
11. **Avtaler utleier:** **BankID** for alle utleier-avtaler (sosial, turisme, event).
12. **Avtaler leietaker:** **Click-wrap** ved konto + booking — ikke BankID.
13. **Event saksbehandler:** Egen rolle **`event_ansatt`**, tildelt av ops via `central_event_staff` — parallell med kommune SB.
14. **Betaling turisme:** **Stripe og Vipps parallelt** (begge tilgjengelig på checkout).
15. **Event-avtale:** **Egen avtale per event** — utleier som opt-in må signere den event-spesifikke avtalen (BankID).
16. **Turisme-avtale:** Juridisk eier **Gamechanging**; ops publiserer nasjonal mal.
17. **Los:** Kobler ungdom til saksbehandler **via KI**; ungdom velger frivillig kobling; KI-routing kan være placeholder (manuell assign).
18. **Utleier meldinger:** Tydelig merking av motpart — sosial SB (inkl. **NAV**) / event SB / leietaker.
19. **Event turisme-routing:** Leietaker booker **Airbnb-lignende** (full turisme-flyt + event-kontekst).
20. **Avtale-scope:** Signer **når relevant**; **én avtale per scope** (kommune/event/turisme) dekker alle matchende boliger; ny signering ved nytt valg.
21. **Los synlighet:** **Alle** kommune-SB ser **alle** Los-saker i sine kommuner.
22. **Los kobling:** **Kun via KI-chat** (placeholder routing OK) — ikke egen Los-meldingsapp.
23. **Event SB isolasjon:** **Ingen** sosial boligbank eller sosiale meldinger; kun event opt-in boliger og event-henvendelser.
24. **Gruppebooking:** **Ja** — flere boliger per event.
25. **Anmeldelser:** **Ja i v1** (etter opphold).

---

## 2. Teknisk utgangspunkt (nåværende stack)

| Lag | Teknologi | Merknad |
|-----|-----------|---------|
| Frontend | Next.js (App Router), React, `globals.css` + minimal Tailwind | Monolittiske sider: `nav/database`, `ListingDetailsClient` |
| Auth | Supabase Auth, middleware, RLS | Roller: `homeowner`, `kommune_ansatt`, `kommune_admin`, **`event_ansatt`** (planlagt) |
| DB | Supabase Postgres + migrasjoner | 89 migrasjoner; listings, availability, grants |
| Edge | Supabase Edge Functions | Signicat, push, e-post |
| Ops | `/ops/*` + `ops.css` | Beste komponentstruktur i repoet |
| Deploy | Vercel + Supabase Cloud | Multi-subdomain krever Vercel-domeneoppsett |

**Eksisterende styrker å beholde:** RLS, kommune grants, formidling, meldinger, varsler, BankID for utleier/kommune.

**Teknisk gjeld å adressere først (Fase 0):** Megasider, 80+ `alert()`, inkonsistent loading, duplisert navigasjon.

---

## 3. Målarkitektur

### 3.1 Subdomain-routing (Next.js)

```
frontend/
  app/
    (marketing)/          → hjerterum.no
    (app)/                → app.hjerterum.no  — eksisterende routes flyttes gradvis
    (finn)/               → finn.hjerterum.no
    (los)/                → los.hjerterum.no
    (ops)/                → ops.hjerterum.no  — eksisterende /ops
  middleware.ts           → hostname → rewrite + eksisterende auth gates
```

**Implementasjon:** `middleware.ts` leser `Host`-header; setter `x-hjerterum-shell` header eller rewrite til route group.

### 3.2 Feature-map (vertikal slicing)

```
frontend/
  features/
    listings/           — listing CRUD, detail, gallery, availability
    mediation/          — formidling, sosial flow
    events/             — central events + utleier opt-in
    tourism/            — finn browse, booking, payment UI
    los/                — chat UI, handoff
    messaging/          — chat (extract from nav/messages)
    notifications/      — varsler
    auth/               — login, gates
  components/
    design-system/      — Button, EmptyState, ConfirmDialog, Toast, PageSkeleton
  lib/
    supabase/
    queries/
```

**Regel:** Route `page.tsx`-filer skal være **tynne** (< 50 linjer) og delegere til `features/*/`.

### 3.3 Datamodell — nye tabeller (oversikt)

```sql
-- Sentralt (ops)
central_events (
  id, slug, name, description_public,
  start_date, end_date,
  routing_mode enum('saksbehandler','turisme'),
  status enum('draft','published','closed'),
  geography_scope jsonb,  -- region_keys, kommune_ids
  arrangement_tag text,
  created_by, published_at, closed_at
)

central_event_staff (
  event_id, profile_id, role enum('coordinator','staff')
)

-- Utleier opt-in
listing_event_availability (
  id, listing_id, event_id,
  available_from, available_to,
  status enum('active','withdrawn'),
  unique(listing_id, event_id)
)

-- Turisme / booking (utleier-path)
bookings (
  id, listing_id, event_id nullable,
  guest_user_id nullable, guest_email, guest_phone,
  check_in, check_out,
  status enum('pending','accepted','paid','cancelled','completed'),
  amount_cents, currency, payment_intent_id,
  created_at
)

-- Event henvendelser (saksbehandler-path)
event_inquiries (
  id, event_id, listing_id nullable,
  contact_name, contact_email, contact_phone,
  message, date_from, date_to,
  status enum('new','assigned','mediated','closed'),
  assigned_profile_id
)

-- Leietaker (lett auth)
guest_profiles (
  id auth.users FK, email, phone_verified_at, display_name
)

-- Los
los_sessions (
  id, anonymous_token, kommune_id nullable,
  consent_level, created_at, handed_off_at
)

los_handoffs (
  id, session_id, assigned_profile_id, summary_text, created_at
)

-- Feature flags
kommuner.digital_los_enabled boolean default false
kommuner.tourism_enabled boolean default false
```

**Utvidelse av eksisterende:**

```sql
listings (
  + tourism_enabled boolean default false,
  + tourism_nightly_price_cents int nullable,
  + tourism_instant_book boolean default false
)

listing_availability (
  + lane enum('sosial','turisme')  -- arrangement bruker listing_event_availability
)
```

**Navngivning i kode:** `CentralEvent` (ikke `Event` — kolliderer med `notifications.event_id`).

### 3.4 Betaling (Fase 4)

- **Provider:** Stripe Connect (vurder Vipps eCommerce som alternativ/n supplement for NO).
- **Flyt:** Request → utleier accept → payment intent → confirm → booking `paid`.
- **Webhook:** Supabase Edge Function eller Next.js route `/api/webhooks/stripe`.

### 3.5 Los (Fase 5)

- Edge Function eller ekstern API for LLM (GDPR: norsk infra, DPIA).
- Ingen art. 9-data uten samtykke.
- Handoff → `event_inquiries`-lignende inbox for saksbehandler ELLER dedikert `los_inbox`.

---

## 4. Faser og leveranser

### Fase 0 — Fundament (UX + repo-struktur)

**Mål:** Gjøre kodebasen klar for utvidelse uten å øke kompleksitet.

| ID | Oppgave | Filer / område | Akseptansekriterium |
|----|---------|----------------|---------------------|
| 0.1 | Design system: `EmptyState`, `ConfirmDialog`, `Toast`, `PageSkeleton` | `components/design-system/` | Brukt i minst 3 eksisterende flows |
| 0.2 | ESLint: forby `alert`/`confirm` | `eslint.config` | 0 nye alerts; plan for å fjerne eksisterende |
| 0.3 | Felles `NAV_ITEMS` config | `lib/navConfig.ts` | Header + MobileBottomNav + sidebars leser samme kilde |
| 0.4 | Erstatt blank loading i listing detail + register | `ListingDetailsClient`, `register/page` | Alltid skeleton/spinner |
| 0.5 | Start uttrekk: `features/listings/hooks/useListingAvailability` | Fra manage + ListingDetailsClient | Unit-testbar hook |
| 0.6 | Dokumenter shell-strategi | `docs/hjerterum/ARCHITECTURE.md` | Subdomain-middleware skissert |
| 0.7 | Rebrand copy: Boly → Hjerterum (brukervendt tekst) | i18n, metadata, README | Ingen brukersynlig «Boligbank» uten vilje |

**Estimat kompleksitet:** Medium-høy (refactor, lav synlig funksjon).

**Agent-notat:** Ikke start Fase 2+ før 0.1 og 0.3 er på plass.

---

### Fase 1 — Domene: lanes + availability

**Mål:** Datamodell for sosial/turisme-lanes og konfliktmotor; utleier kan flagge turisme uten finn.* ennå.

| ID | Oppgave | Akseptansekriterium |
|----|---------|---------------------|
| 1.1 | Migrasjon: `listings.tourism_enabled`, `listing_availability.lane` | RLS oppdatert |
| 1.2 | RPC: `check_availability_conflict(listing_id, from, to, lane)` | Returnerer konfliktårsak |
| 1.3 | UI: Listing edit — lane toggles (sosial/turisme) | Skjult hvis kun sosial |
| 1.4 | UI: Kalender «maler periode → velg lane» (sosial/turisme) | Ingen dobbeltbooking |
| 1.5 | Kommune: uendret sosial view; turisme-perioder read-only eller skjult | Ingen regressjon formidling |

**Tester:** SQL-tester for konflikt; Playwright smoke for utleier kalender.

---

### Fase 2 — Sentrale events + utleier opt-in

**Mål:** Ops kan publisere event; utleier opt-in; ingen public portal ennå.

| ID | Oppgave | Akseptansekriterium |
|----|---------|---------------------|
| 2.1 | Migrasjon: `central_events`, `central_event_staff`, `listing_event_availability` | RLS: kun ops skriver events |
| 2.2 | Ops: Event wizard (draft → publish → close) | `/ops/events`, `/ops/events/new`, `/ops/events/[id]` |
| 2.3 | Ops: Velg routing_mode + tildel koordinator | Lagret på event |
| 2.4 | Utleier: «Tilgjengelig for arrangement» — liste publiserte events | 3-taps opt-in |
| 2.5 | Utleier: Task card ved nytt event («VM Alpint — vil du delta?») | Push/e-post senere; in-app Fase 2 |
| 2.6 | Saksbehandler: filter Boligbank på `event_id` | Valgfritt filter chip |
| 2.7 | Audit log for event publish og opt-in | `audit_logs` |

**Akseptanse (E2E):** Ops publiserer test-event → utleier opt-in → saksbehandler ser bolig under event-filter.

---

### Fase 3 — finn.* MVP (browse + henvendelse)

**Mål:** Public subdomain; ingen betaling ennå.

| ID | Oppgave | Akseptansekriterium |
|----|---------|---------------------|
| 3.1 | Middleware: `finn.hjerterum.no` → `(finn)` route group | Lokal dev via `/etc/hosts` eller Vercel preview |
| 3.2 | `(finn)/` layout — egen enkel nav (3 items) | Ingen app-header |
| 3.3 | `(finn)/` søk: kart + dato + sted (turisme-perioder) | Kun `tourism_enabled` + ledige datoer |
| 3.4 | `(finn)/arrangement/[slug]` event-side | Kun published events |
| 3.5 | Listing cards fra opt-in + turisme | |
| 3.6a | **Saksbehandler-modus event:** skjema «Be om bolig» → `event_inquiries` | Inbox for assigned staff |
| 3.6b | **Turisme-modus event:** «Send forespørsel» → melding til utleier (foreløpig uten betaling) | |
| 3.7 | `(finn)/mine` — gjest sesjon (magic link) | |
| 3.8 | SEO: metadata per event/listing | |

**Design:** `finn.css` — lys, luftig, consumer; gjenbruk tokens fra `globals.css`.

---

### Fase 4 — Betaling + booking

**Mål:** Full turisme-path med in-app betaling.

| ID | Oppgave | Akseptansekriterium |
|----|---------|---------------------|
| 4.1 | Stripe Connect onboarding for utleiere | Account link flow |
| 4.2 | `bookings`-tabell + statusmaskin | |
| 4.3 | Request → accept → pay | Webhook oppdaterer status |
| 4.4 | `(finn)/book/[listingId]` checkout UI | Pris inkl. gebyr synlig |
| 4.5 | Utleier: booking-forespørsler i manage | Accept/reject |
| 4.6 | Kvittering e-post | Edge function |
| 4.7 | Avbestillingsregler (3 maler) | Per listing |

**Compliance:** PCI via Stripe; ingen kortdata i Supabase.

---

### Fase 5 — Digital Los

**Mål:** `/los` chat + handoff til saksbehandler; pilot-ready.

| ID | Oppgave | Akseptansekriterium |
|----|---------|---------------------|
| 5.1 | `(los)/` layout — fullskjerm chat | |
| 5.2 | Anonym sesjon + progressive consent | |
| 5.3 | Edge Function: LLM dialog (system prompt NB) | Rate limit |
| 5.4 | Handoff RPC → saksbehandler inbox | `los_handoffs` |
| 5.5 | `/nav/los-inbox` for kommune | |
| 5.6 | `kommuner.digital_los_enabled` i ops | |
| 5.7 | DPIA-dokumentasjon placeholder + logging | Audit trail |

**Scope-grense:** Los booker **ikke** turisme/event.

---

### Fase 6 — Decompose megasider + ytelse

**Mål:** Vedlikeholdbar kodebase ved full funksjon.

| ID | Oppgave | Mål-LOC for page.tsx |
|----|---------|----------------------|
| 6.1 | Splitt `nav/database/page.tsx` | < 200 (shell) |
| 6.2 | Splitt `ListingDetailsClient.tsx` | Komponenter per fane |
| 6.3 | Splitt `homeowner/manage/page.tsx` | |
| 6.4 | React Query for listing lists | Som notifications |
| 6.5 | Virtualisert tabell desktop database | 800+ rader |

**Parallelt:** Kan starte 6.1 etter Fase 0, fullføre etter Fase 4.

---

### Fase 7 — Lansering hardening

| ID | Oppgave |
|----|---------|
| 7.1 | Vercel prod-domener (alle subdomener) |
| 7.2 | Rate limiting public API |
| 7.3 | Overvåking: `platform_events` + Sentry |
| 7.4 | Load test formidling + finn search |
| 7.5 | i18n EN for finn (turister) |
| 7.6 | Juridisk: vilkår turisme, personvern Los |
| 7.7 | Runbook ops event publish |

---

## 5. Prioritert rekkefølge (agent)

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4
                │                    │
                └──── Fase 6 (delvis parallelt fra 0.5)
Fase 5 kan starte etter Fase 3 (uavhengig av betaling)
Fase 7 til slutt
```

**Første sprint (anbefalt):** 0.1, 0.3, 0.7, 1.1, 1.2  
**Andre sprint:** 1.3, 1.4, 2.1, 2.2  
**Tredje sprint:** 2.3–2.7, 3.1–3.4

---

## 6. UX-krav (skal verifiseres hver fase)

| Persona | Maks primærnav | Regel |
|---------|----------------|-------|
| Utleier | 4 | Event opt-in = 3 trykk |
| Saksbehandler | 4 + filter | Aldri event-opprettelse |
| Leietaker (finn) | 3–4 | Alltid «neste steg»-skjerm |
| Los | 1–2 | Ingen BankID ved start |
| Ops | sidebar | Event wizard med preview |

**Forbudt:** Native `alert()`/`confirm()` i ny kode.  
**Påkrevd:** Empty state med CTA der det gir mening.

---

## 7. Sikkerhet og RLS-prinsipper

1. **Sosial listing** — aldri public SELECT; kun kommune grants + owner.
2. **finn.*** — public SELECT kun på `tourism_enabled` + published event listings (view/RPC).
3. **central_events** — INSERT/UPDATE kun `is_boly_operator()`.
4. **listing_event_availability** — INSERT/UPDATE kun `owner_id = auth.uid()`.
5. **event_inquiries** — INSERT public (rate limited); SELECT kun assigned staff + ops.
6. **bookings** — guest ser egne; utleier ser egne listings; ingen kryss-lekkasje.
7. **Los** — anonym sesjon isolert; sletting etter handoff retention policy.

---

## 8. Testingstrategi

| Nivå | Hva |
|------|-----|
| SQL | Migrasjoner + RLS policy-tester (pgTAP eller script) |
| Unit | hooks, conflict logic, date utils |
| Integration | RPC + RLS med test users |
| E2E Playwright | Utleier opt-in; formidling regression; finn søk |
| Manuell | Saksbehandler 30 min smoke etter hver fase |

**Regression-gates:** Eksisterende formidling (Formidla), meldinger, varsler, BankID utleier **må passere** etter Fase 1–2.

---

## 9. Risikoregister

| Risiko | Sannsynlighet | Impact | Mitigering |
|--------|---------------|--------|------------|
| Megaside-refactor tar overhand | Høy | Medium | Fase 0 + 6 inkrementelt |
| Stripe/onboarding friksjon for utleiere | Medium | Høy | Guidet oppsett; fallback «kun sosial» |
| Forveksling FINN Hjerterom (navn) | Medium | Medium | Produktposisjonering; egen visuell identitet |
| Los GDPR/AI Act | Medium | Høy | DPIA før pilot; minimal datalagring |
| Subdomain cookie/auth kompleksitet | Medium | Medium | Shared parent domain `.hjerterum.no` |
| Event dobbeltbooking | Lav | Høy | Sentral conflict RPC; DB constraints |

---

## 10. Åpne beslutninger (må avklares med produkteier)

| # | Spørsmål | Blokkerer |
|---|----------|-----------|
| A | Stripe vs Vipps vs begge | Fase 4 |
| B | `hjerterum.no` vs `bolynorge.no` som hoveddomene | Fase 3 deploy |
| C | Instant book for turisme som default? | Fase 4 UX |
| D | Escrow: betaling ved booking vs check-in | Fase 4 |
| E | Los LLM-leverandør (Azure NO, self-host, annet) | Fase 5 |
| F | Plattformgebyr % | Fase 4 forretningsmodell |
| G | Engelsk finn ved launch? | Fase 7 |

---

## 11. Agent-arbeidsflyt (for Cloud Agent)

### Ved start av hver sesjon
1. Les denne filen + siste migrasjon i `supabase/migrations/`.
2. Sjekk git branch — bruk `cursor/<beskrivelse>-020a`.
3. Bekreft hvilken fase/oppgave-ID som jobbes med.

### Ved implementering
1. **Minste diff** — én oppgave-ID per PR når mulig.
2. Migrasjon → RLS → RPC → types → UI.
3. Match eksisterende konvensjoner (`kommuneRoles.ts`, `Button`, i18n `t()`).
4. Ingen nye megasider — extract til `features/`.
5. Commit + push før E2E; oppdater PR.

### Definition of Done (alle oppgaver)
- [ ] Migrasjon kjører rent lokalt
- [ ] RLS verifisert for minst 2 roller
- [ ] Ingen nye `alert()`
- [ ] Loading + empty state
- [ ] i18n for brukersynlig tekst
- [ ] Eksisterende formidling smoke OK hvis berørt

### Filreferanser (kritisk path eksisterende)
- Formidling: `frontend/app/nav/database/page.tsx`
- Listing detail: `frontend/app/listings/[id]/ListingDetailsClient.tsx`
- Utleier manage: `frontend/app/homeowner/manage/page.tsx`
- Middleware: `frontend/middleware.ts`
- Ops mønster: `frontend/app/ops/components/*`
- Grants: `supabase/migrations/20260608120000_kommune_grants_service_areas.sql`

---

## 12. Milepæler (leveranse til produkteier)

| Milepæl | Faser | Demonstrerbart |
|---------|-------|----------------|
| **M1: Fundament** | 0 + 1 | Utleier setter lanes; konflikt fungerer |
| **M2: Event** | 2 | Ops publiserer; utleier opt-in; kommune filter |
| **M3: Finn** | 3 | Public søk + event-side + henvendelse |
| **M4: Betaling** | 4 | Full booking med Stripe |
| **M5: Los** | 5 | Chat → saksbehandler inbox |
| **M6: Launch** | 6 + 7 | Prod-domener; decomposed codebase |

---

## 13. Relaterte dokumenter

| Dokument | Sti |
|----------|-----|
| Visjons-PDF | `docs/hjerterum/HJERTERUM_Visjonsrapport.pdf` |
| Visjon HTML | `docs/hjerterum/HJERTERUM_rapport.html` |
| Digital Los proposisjon | `uploads/digital_los_ki_proposisjon_*.pdf` |
| Kommune access | `docs/KOMMUNE_ACCESS_LEVELS.md` |
| Supabase setup | `SUPABASE_SETUP.md` |

---

*Sist oppdatert: juni 2026. Revidér ved nye produktbeslutninger — logg endringer i commit-melding og bump versjon.*
