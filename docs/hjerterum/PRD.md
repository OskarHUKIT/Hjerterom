# Hjerterum — Product Requirements Document

**Version:** 1.2  
**Date:** July 2026  
**Owner:** Gamechanging AS (Oskar Høgmo-Utstøl)  
**Status:** Living document — reflects product owner decisions from July 2026  
**Related:** `UTVIKLINGSPLAN.md`, `PRODUKTANALYSE_AKTORER.md`, `PLATFORM_CONTROL_PANEL.md`, `DESIGN_SYSTEM.md`, `UI_UX_GOVERNANCE.md`, `Digital_Los_KI_Partnerproposisjon`

---

## 1. Executive summary

**Hjerterum** (Norwegian: *heart room*) is a multi-lane housing platform that expands **Boly** (municipal social housing mediation) into one shared **boligpool** with three commercial/social lanes — **social**, **events**, and **tourism** — plus a research-backed **Digital Los** module for youth outreach.

**Core bet:** A landlord lists a property once and activates the lanes they choose. Social and events fill off-season gaps that Airbnb-only landlords experience. Municipalities get a modern boligbank without platform fees on social placements. Tourism and events fund platform growth via a ~10% all-in fee (including payment provider costs).

**Brand hierarchy:**
- **Hjerterum** — umbrella product and future primary brand
- **Boly / Boligbank** — social lane and legacy name until full rebrand; references existing municipal structures

**Geography:** Marketing and pilot start in **Northern Norway**; national expansion is the long-term goal.

**Production default:** **Boly-only** mode. Hjerterum modules are feature-flagged via `/ops/platform` until explicitly enabled per environment/kommune.

---

## 2. Problem statement

### 2.1 Social housing mediation (Boly)

Municipalities and NAV caseworkers need private rental inventory to place people they support. Today this is often low-tech: spreadsheets, phone, fragmented landlord relationships. Boly digitizes **boligbank**, **formidling**, messaging, notifications, and BankID-signed agreements.

### 2.2 Underutilized housing

Landlords using **Airbnb only** face empty units outside tourism season. They pay high platform fees (~15%+) and have no connection to social or event-driven demand.

### 2.3 Youth in utenforskap (Digital Los — research)

Many youth aged **16–25** with housing needs do not contact NAV/kommune because the system feels intimidating or unclear. Digital Los (FoU project, 24–36 months) explores whether AI-assisted chat can lower the threshold and route youth to the right caseworker, with **housing as the entry point**.

### 2.4 Event housing

Festivals, construction projects, and regional events need coordinated housing. Today there is no governed Norwegian platform connecting event organizers, landlords, and either caseworkers or direct tourism booking.

---

## 3. Vision & positioning

### 3.1 Vision

One trusted platform where municipalities, landlords, event organizers, and guests meet — with **one calendar per listing**, **lane-specific agreements**, and **no platform fee on social formidling**.

### 3.2 Positioning

| Audience | Message |
|----------|---------|
| **Internal / strategy** | Hjerterum is the only product that connects social, event, and tourism housing in one governed service. |
| **Landlord** | One login, one calendar, three ways to earn — social, events, and tourism — with a larger cut than Airbnb on commercial lanes and zero platform fee on social. |
| **Kommune** | High-tech boligbank, bigger housing pool, zero cut on social formidling — commercial lanes fund the platform. |
| **Event organizer** | Choose caseworker-mediated or direct tourism booking; we configure it in ops. |

### 3.3 What Hjerterum is not

- Not a classifieds site (FINN.no) — governed mediation and agreements, not open listings
- Not a replacement for caseworker judgment or legal assessments
- Not a finished AI youth product — Digital Los is research until DPIA and pilot approval

---

## 4. Users & personas

| Persona | Role | Primary surfaces |
|---------|------|------------------|
| **Utleier (landlord)** | Lists property, sets availability per lane, signs agreements, accepts bookings/requests | `app.hjerterum.no` → `/homeowner/*` |
| **Saksbehandler (caseworker)** | Searches boligbank, initiates formidling, messages landlords | `app.hjerterum.no` → `/nav/*` |
| **Kommune admin** | Manages terms, users, kommune access | `/nav/*`, ops-assisted |
| **Event saksbehandler (`event_ansatt`)** | Handles event inquiries only — isolated from social boligbank | `/nav/event/*` |
| **Leietaker / gjest (guest)** | Searches, books, pays on tourism/event-tourism path | `finn.hjerterum.no` → `/finn/*` |
| **Ungdom (youth)** | Anonymous chat → optional handoff (research module) | `los.hjerterum.no` → `/los/*` |
| **Ops (Gamechanging)** | Platform mode, events, kommune toggles, accounts | `ops.hjerterum.no` → `/ops/*` |

---

## 5. Product scope — the four modules

### 5.1 Lane overview

```
                    ┌─────────────────────────────────────┐
                    │         ONE LISTING (boligpool)      │
                    └─────────────────────────────────────┘
                                        │
          ┌──────────────┬──────────────┼──────────────┬──────────────┐
          ▼              ▼              ▼              ▼              │
      SOSIAL         ARRANGEMENT     TURISME      DIGITAL LOS        │
   (Boly core)    (central events)  (Finn path)  (research module)   │
          │              │              │              │              │
   Saksbehandler    Event SB or     Utleier direct   KI chat → SB     │
   gates access     tourism path    + in-app pay     handoff only     │
          │              │              │              │              │
   No platform fee  Fee on tourism   ~10% all-in      No fee           │
   Subscription    path only        platform take                     │
   (kommune)                                                           │
```

### 5.2 Module: Social (Boly)

**Purpose:** Municipal housing mediation for people caseworkers support.

**Gatekeeper:** Kommune/NAV saksbehandler — social listings are **never** on the public Finn portal.

**Requirements:**
- Landlord registers listing and signs **kommune-scoped social agreement** (BankID via Signicat where legally required)
- Caseworker searches **boligbank** (`/nav/database`), filters, initiates **formidling**
- Status flow includes **Formidla** (listing actively mediated)
- Messaging between landlord and caseworker
- Notifications, handover reports, invoice basis PDF
- Payments stay **outside the platform** (invoice/account payment)
- **No platform fee** on social placements

**Kommune subscription:** Primary revenue today. Municipality pays for access to boligbank, caseworker tools, and landlord pool in their region.

### 5.3 Module: Tourism (Finn)

**Purpose:** Short-stay bookings for landlords who opt in — Airbnb-like flow with lower platform take.

**Gatekeeper:** Landlord directly after signing **tourism agreement** (Gamechanging-owned terms, published via ops).

**Requirements:**
- Public search on `finn.hjerterum.no` by city + dates
- Listing detail, booking request or checkout
- Guest account (email / magic link) + **click-wrap** terms — no BankID for guests
- Landlord Stripe Connect onboarding; checkout via **Stripe** and **Vipps** (parallel when configured)
- **Platform fee:** ~**10% all-in** (including Stripe/Vipps costs); remainder to Hjerterum
- Guest area: `/finn/mine` — bookings, messaging, reviews (v1)
- National visibility when tourism lane enabled

**Landlord value:** Larger cut vs Airbnb; fills off-season alongside social/events.

### 5.4 Module: Central events (Arrangement)

**Purpose:** Housing coordination for festivals, construction, and regional events.

**Gatekeeper:** Set per event via **routing mode** (see §7.3).

**Requirements:**
- **Only ops** creates/publishes events (v1); event organizers do not self-serve yet
- Gamechanging contacts events and asks: caseworker-mediated housing or tourism marketing through Hjerterum
- Landlord **opt-in** per listing + optional date window within event period
- **Per-event agreement** — landlord signs before opt-in (BankID where required)
- **Group booking:** multiple listings per event supported
- **Routing modes:**
  - `saksbehandler` — inquiries to caseworker/event staff inbox; placement mediated
  - `turisme` — guest books on Finn with event context; full tourism checkout flow
- **Event saksbehandler (`event_ansatt`):** isolated role — no access to social boligbank or social messages

**Future:** Event organizers may self-register; routing choice remains with the organizer.

### 5.5 Module: Digital Los (research)

**Purpose:** Lower-threshold first contact for youth 16–25 in utenforskap, connecting to social caseworker via housing as entry point.

**Status:** **FoU research project** (24–36 months), not a production youth service until research gates pass.

**Partners:** Gamechanging (lead), UiT Narvik (research), Nav Narvik (domain/pilot).

**Research questions (from partner proposal):**
- **F1:** Which AI approaches lower the barrier for first contact?
- **F2:** Responsible development (GDPR, AI Act) — DPIA before pilot
- **F3:** Effect on boligformidling and follow-up

**Product scaffold (shipped but gated off):**
- Three steps: **Kontakt** (chat) → **Forståelse** (structured needs, data minimization) → **Kobling** (handoff to saksbehandler, human always involved)
- Public shell: `/los`, `los.hjerterum.no`
- Caseworker inbox: `/nav/los-inbox`
- Ops toggles: `los_portal_enabled` (platform) + `digital_los_enabled` (per kommune)
- **Default: OFF** until DPIA, partner agreement, and pilot approval
- AI vendor **not decided** — research determines acceptability; no youth data to external LLM when Los is disabled

**Principles (from research proposal):**
- Dataminimering and clear consent
- Explainable recommendations to caseworker
- No training on sensitive personal data without legal basis
- Human involved in all important decisions
- Nav/kommune as data controller where applicable
- Tool **supports** caseworker — does not replace professional judgment

---

## 6. Agreement & access model

### 6.1 Lane-gated signing

| Lane | Agreement required | Block if unsigned | Signing method |
|------|-------------------|-------------------|----------------|
| Social | Komment scoped to kommune | Cannot publish for social lane | BankID (Signicat) — legal feasibility TBD per scope |
| Tourism | National tourism terms (Gamechanging) | Cannot enable tourism on listing | BankID where required |
| Event | Per-event agreement | Cannot opt-in to event | BankID where required |
| Guest (Finn) | Platform/guest terms | Cannot complete booking | Click-wrap |

**Rule:** If landlord does not sign tourism agreement, they **cannot** list for tourism. Same for social and each event.

**Multiple events** may require **multiple event-specific agreements**.

### 6.2 Landlord without subscribed kommune

If a landlord's municipality is **not** a paying Boly customer:
- They **may register** listing normally
- They **skip** social/kommune agreement for that municipality
- They **may use events and tourism** if ops has activated those modules and landlord signs relevant agreements
- Onboarding should clearly communicate: *"Din kommune er ikke tilknyttet sosial formidling — du kan aktivere turisme og arrangement."*

### 6.3 Kommune partnership ends

If municipality subscription/DBA ends:
- Caseworkers lose access to boligbank and landlord pool for that kommune
- Landlords in that area may shift to **events/tourism only** (if agreements signed)
- Ops must manage kommune status and access (`/ops/kommuner`)

---

## 7. Core product rules

### 7.1 Shared calendar & conflict resolution

**Principle:** Design to **prevent** double-booking; resolve by **first commit wins** when lanes overlap.

**"Books first" means:**
1. Caseworker marks listing as **Formidla** (social commitment), **OR**
2. Guest completes **paid tourism checkout** on Finn

Whichever happens first holds the dates. The other lane must be blocked for that period.

**Pending states:** Unpaid booking requests do not win until payment (or explicit acceptance rules for request-to-book flows — to be specified per flow).

**Implementation status:** `check_listing_availability_conflict` RPC blocks overlap on availability creation; **commit-time race logic (Formidla vs paid checkout) is a required build**.

### 7.2 Social contribution

Contributing to social housing is primarily a **moral pitch**. Landlords **may** use **tourism and events only** without activating social lane.

**Kommune sell:** Social lane = **largest landlord cut** (zero platform fee).

### 7.3 Event routing authority

**The event organizer decides** whether housing goes through:
- **Tourism path** (`routing_mode: turisme`), or
- **Caseworker path** (`routing_mode: saksbehandler`)

**Implementation (v1):** Gamechanging creates event in **ops** and sets `routing_mode` based on organizer choice. Organizer does not self-serve in product yet.

**Ops runbook rule:** Confirm routing mode with organizer before publish; do not change after publish without organizer approval.

### 7.4 Messaging context

Landlord messages must clearly label counterparty:
- Social caseworker (including NAV)
- Event caseworker
- Guest (tourism/event-tourism)

### 7.5 Platform modes (ops)

| Preset | Behavior |
|--------|----------|
| **Kun Boly** | All Hjerterum modules off — classic Boligbank |
| **Hjerterum pilot** | Selected modules for pilot kommune |
| **Full Hjerterum** | All modules on |

Flags include: `finn_portal_enabled`, `los_portal_enabled`, `central_events_enabled`, `tourism_lane_enabled`, `stripe_bookings_enabled`.

Per-kommune: `digital_los_enabled`, `tourism_enabled`.

---

## 8. Business model

### 8.1 Revenue streams

| Stream | Now | Future | Notes |
|--------|-----|--------|-------|
| **Kommune subscription** | **Primary** | Core B2G revenue | Price TBD — per kommune and/or seat/listing |
| **Tourism platform fee** | Secondary | **Major growth driver** | ~10% all-in (incl. Stripe/Vipps); code currently 5% — align before launch |
| **Event tourism path fee** | Secondary | Same as tourism | Only on in-app paid bookings |
| **Social formidling** | — | **Never** | Zero platform cut — key kommune argument |

### 8.2 Landlord economics (target)

| Lane | Platform fee | Payment |
|------|-------------|---------|
| Social | 0% | Off-platform / invoice |
| Tourism / event-tourism | ~10% all-in | Stripe + Vipps in-app |
| Event (saksbehandler path) | 0% on placement | Off-platform |

**Comparison:** Position as lower total cost than Airbnb (~15%+ host fees) on commercial lanes.

### 8.3 Legal ownership

- **Tourism terms:** Gamechanging AS (ops publishes national template)
- **Social/regional terms:** Municipality + central ops approval workflow
- **Event terms:** Per-event documents managed via ops

---

## 9. Functional requirements by actor

### 9.1 Landlord

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| L-1 | Register and manage listings | P0 | Done (Boly) |
| L-2 | Set availability per lane (sosial / turisme) | P0 | Done |
| L-3 | Sign lane-specific agreements before activation | P0 | Partial — RPCs exist; UX polish ongoing |
| L-4 | Opt in listings to central events with date window | P0 | Done |
| L-5 | Accept/reject tourism booking requests | P0 | Done |
| L-6 | Stripe Connect onboarding for tourism payouts | P0 | Done |
| L-7 | Onboarding path when kommune not subscribed (tourism/events only) | P1 | **Not built** |
| L-8 | Unified calendar showing all lanes | P1 | **Done** — `LandlordAvailabilityHub` + lane calendar |
| L-9 | Co-host / delegation | P2 | Not started |

### 9.2 Caseworker (social)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| S-1 | Search/filter boligbank | P0 | Done |
| S-2 | Initiate formidling; mark Formidla | P0 | Done |
| S-3 | Message landlords | P0 | Done |
| S-4 | Manage terms documents | P0 | Done |
| S-5 | Los inbox — view/assign handoffs | P1 | Done (gated) |
| S-6 | Formidla triggers date hold (first-book-wins) | P0 | **Done** — `20260701220000_hjerterum_first_book_wins.sql` |

### 9.3 Guest (Finn)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| G-1 | Search by city + dates | P0 | Done |
| G-2 | Guest account (email / magic link) | P0 | **Done** — `/finn/login` email+password; auth required for booking |
| G-3 | Booking request + Stripe checkout | P0 | Done |
| G-4 | Vipps checkout (parallel) | P1 | Routes exist; env-gated |
| G-5 | Guest ↔ landlord messaging per booking | P0 | Partial |
| G-6 | Reviews after stay | P1 | Basic v1 |
| G-7 | Instant book | P2 | DB column; UI incomplete |
| G-8 | Cancellation policy UI | P2 | Incomplete |
| G-9 | Pre-booking inquiry threads | P2 | Not started |

### 9.4 Ops

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| O-1 | Platform mode presets (Boly / pilot / full) | P0 | Done |
| O-2 | Create/publish/close central events + routing_mode | P0 | Done |
| O-3 | Per-kommune feature toggles (Los, tourism) | P0 | Done |
| O-4 | Assign event staff | P1 | Done |
| O-5 | Publish tourism terms (Gamechanging) | P0 | Done |
| O-6 | Manage kommune subscription / access status | P0 | Partial |
| O-7 | Event runbook: routing mode from organizer choice | P1 | **Document** |

### 9.5 Digital Los (research scaffold)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| D-1 | Anonymous chat shell | P1 | Done (gated) |
| D-2 | Kommune selection (los-enabled only) | P1 | Done |
| D-3 | Consent + handoff (name required, phone optional) | P1 | Done |
| D-4 | Case reference (LOS-XXXXXXXX) | P1 | Done |
| D-5 | Caseworker inbox | P1 | Done |
| D-6 | Platform/kommune off switches | P0 | Done |
| D-7 | DPIA + AI vendor decision | P0 | **Research — blocked** |
| D-8 | Safeguarding / crisis escalation protocol | P0 | **Not defined** |

---

## 10. Non-functional requirements

| Area | Requirement |
|------|-------------|
| **Auth** | Supabase Auth; BankID (Signicat) for landlords/caseworkers; magic link for guests |
| **Security** | Row Level Security on all tenant data; kommune grants whitelist |
| **Hosting** | Vercel (frontend) + Supabase Cloud (DB, auth, edge functions) |
| **Subdomains** | `app.*`, `finn.*`, `los.*`, `ops.*` via middleware |
| **Mobile** | Responsive web + PWA; Capacitor for native apps |
| **i18n** | Norwegian, Sámi (`se`), and English on **all** surfaces; selector in header; see §15.3 |
| **GDPR** | DPIA for Los before pilot; privacy notices and DPA bundle in `docs/gdpr/` |
| **Performance** | Listing search RPC optimized for tourism; conflict check on availability write |
| **UI/UX** | Universal Boly Standard (§15) on **every** page; dark default + light toggle; no white-screen modules; WCAG 2.1 AA; mobile-first |

---

## 11. Success metrics

### 11.1 Boly (social) — primary today

- Kommune subscription renewals and new kommune sign-ups
- Active listings in boligbank per kommune
- Formidling initiated → completed conversion
- Caseworker weekly active usage
- Landlord retention (signed terms + active listings)

### 11.2 Hjerterum expansion

- Landlords active on 2+ lanes
- Occupancy proxy: % of listing-days with active availability or booking across lanes
- Tourism GMV and effective platform fee after payment costs
- Event opt-in count per published event
- Guest repeat booking rate on Finn

### 11.3 Digital Los (research)

- F1–F3 research outcomes (not revenue KPIs until pilot approved)
- Prototype usability metrics from UiT-led evaluation
- Handoff completion rate (pilot phase only)

### 11.4 UI/UX quality (cross-cutting)

| Metric | Target | Measurement |
|--------|--------|-------------|
| WCAG 2.1 AA contrast on primary flows | 100% pass on axe/Lighthouse audit | Quarterly + pre-release on changed surfaces |
| Touch target compliance (≥44px) | 100% on interactive controls | Manual spot-check + lint rule where applicable |
| Loading state coverage | 100% async views use skeleton/spinner | PR checklist + code review |
| Blocking dialog anti-pattern | 0 `alert()` / `confirm()` in `app/` + `features/` | ESLint / CI grep |
| Mobile viewport usability | No horizontal overflow on 320px for core flows | Playwright + device matrix (§15.6) |
| Design token drift | 0 new hard-coded hex in TSX for colours | PR review + optional lint |
| i18n completeness | All new strings in NO + Sámi + EN | PR review |
| Theme on all surfaces | Dark + light toggle on every route incl. Finn/Los/guest | PR checklist |
| White-screen modules | 0 new always-light-only feature pages | PR review + grep |

---

## 12. Roadmap phases

| Phase | Focus | Key deliverables |
|-------|-------|------------------|
| **Now** | Boly production + Hjerterum flags off | Stable formidling, kommune subscriptions |
| **Pilot (Nord-Norge)** | Hjerterum pilot preset for selected kommune | Finn + tourism + events; Los **off** |
| **Commercial alignment** | Fee model in code (10%), first-book-wins, non-subscribed landlord UX | PRD §7.1, §6.2 implemented |
| **Event scale** | Ops runbook, event staff workflows polished | §7.3 documented and tested |
| **Los FoU** | Aug 2026 kickoff → research application Jan–Mar 2027 | DPIA, F1–F3; no public pilot until cleared |
| **Future** | Event self-registration; national marketing; Boly rebrand complete | Organizer sets routing at creation |
| **UI/UX (parallel)** | Migrate Finn/Los to Boly theme system; universal dark/light; Sámi parity | §15.8 migration plan |

---

## 13. Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FINN.no brand confusion (`finn.hjerterum.no`) | Medium | Distinct visual identity; product positioning as governed platform |
| Shared pool double-booking | High | Implement first-book-wins at commit time; prevent overlap in UI |
| Kommune backlash on tourism + social same pool | High | Zero fee on social; clear lane separation; kommune controls social access |
| Los youth data / AI compliance | High | Research gate; ops off by default; DPIA before pilot |
| Signicat/BankID scope for tourism/event terms | Medium | Legal review; document fallback if click-wrap acceptable |
| Central ops bottleneck for events | Medium | Future self-serve; ops runbook and delegation |
| Stripe fee (5%) vs pitch (10%) | Medium | Align code and contracts before tourism marketing |
| Boly/Hjerterum brand split | Low | Phased rebrand; consistent external comms per audience |
| UI regression during Hjerterum expansion | Medium | Boly App Standard locked (§15); PR UI checklist; smoke + visual tests |
| Finn.no brand confusion extends to visual identity | Medium | Same Boly visual language everywhere; distinct **product** positioning, not white consumer skin |
| White-screen drift on new Hjerterum modules | High | §15.7 ban; migrate `finn.css` / `los.css` to `globals.css` tokens |
| Sámi translation lag on new features | Medium | UX-16; no ship with NO-only strings |
| Megasite components resist design-system adoption | Medium | Refactor waves W5–W6; max-lines ESLint; persona-split views |

---

## 14. Open decisions & TBD

| Item | Owner | Target |
|------|-------|--------|
| Kommune subscription pricing model | Product / sales | Before national expansion |
| Final platform fee % and fee display on Finn | Product / finance | Before tourism GA |
| Request-to-book vs instant book default | Product | P2 |
| Los AI vendor and data residency | FoU (UiT + Nav) | Post DPIA |
| Los safeguarding escalation | FoU + Nav | Before any pilot |
| Event self-registration spec | Product | Post pilot |
| Kommune veto on event routing (if ever) | Product / legal | Not planned v1 — organizer decides |
| Hjerterum v2 accent rollout to `/homeowner` + `/nav` shell | Product / design | After landing + login validated |
| Visual regression tooling (Chromatic vs Playwright screenshots) | Engineering | Before tourism GA |
| Design system Storybook (or equivalent) | Engineering | Post-pilot — optional |
| **Theme for anonymous/guest users** (Finn, landing) | Product | §15.2 — extend `ThemeContext` beyond logged-in |
| **Sámi parity deadline** for tourism/Los launch | Product | Full parity vs best-effort new strings only |
| **Default locale per subdomain** (Finn guests vs app) | Product | See §15.11 grill questions |
| **Retire `finn.css` / `los.css` always-light** | Engineering | §15.8 migration — target before tourism GA |

---

## 15. UI/UX & design system requirements

> **North star:** Every page in Hjerterum must feel like **Boly** — the professional dark-first product municipalities and landlords already trust. New modules (Finn, Los, events) must **not** ship as simplistic white screens with a separate visual language. Users choose **dark or light mode** and **Norwegian, Sámi, or English** on every surface, just as in Boly today.

**Canonical references:** `DESIGN_SYSTEM.md`, `UI_UX_GOVERNANCE.md`.

### 15.1 The Universal Boly Standard (all pages)

The **Boly Standard** (production `/homeowner`, `/nav`, landing) applies to **every route** — including Finn, Los, Ops, marketing, and all future features. There is no exemption for "new" or "consumer" modules.

| Dimension | Requirement | Implementation reference |
|-----------|-------------|--------------------------|
| **Visual tone** | Professional, calm, high-trust UI; **dark default** (`--bg-app: #020617`) with Northern scenery gradient mesh | `globals.css`, `hjerterum-v2.css` |
| **Not acceptable** | Flat white full-page backgrounds, light-only portals, bootstrap-default styling on new features | Reject in PR — see §15.7 |
| **Typography** | DM Sans (body), Fraunces (display/hero only) | `layout.tsx`, CSS `--font-*` |
| **Spacing** | 8px grid via `--space-*` tokens | `globals.css` `:root` |
| **Colour** | Semantic tokens only — no ad-hoc hex in components | `--bg-app`, `--text-*`, `--color-accent`, `--lane-*` |
| **Components** | Shared design-system primitives | `app/components/design-system/` |
| **Buttons & inputs** | Global `.button`, `.button-accent`, `.input`, `.card` | `globals.css`, `ui/Button.tsx` |
| **Feedback** | Toast + ConfirmDialog — **never** `alert()` / `confirm()` | Design-system |
| **Loading** | PageSkeleton or LoadingPlaceholder — no blank white screens | `PageSkeleton.tsx` |
| **Empty states** | EmptyState with clear next action | `EmptyState.tsx` |
| **Accessibility** | WCAG 2.1 AA; keyboard navigable; `:focus-visible` | SkipLink, semantic HTML, ARIA |
| **Touch** | ≥44×44px targets; 16px+ inputs on mobile | `--touch-target: 44px` |
| **Motion** | `prefers-reduced-motion`; transitions ≤250ms | `--transition-*` |
| **Theme** | Dark + light on **all** pages — see §15.2 | `ThemeContext.tsx`, `[data-theme]` |
| **i18n** | Norwegian, Sámi, English on **all** pages — see §15.3 | `LanguageContext.tsx`, `lib/i18n/*` |

**Acceptance:** A user moving from boligbank to Finn to Los should recognise the same product — same chrome, same theme toggle, same language selector, same card and button feel.

### 15.2 Theme — dark and light on every page

| Rule | Requirement |
|------|-------------|
| **Default** | **Dark** (`data-theme="dark"`) on first visit — black/navy app background, not white |
| **Toggle** | User can switch to **light mode** on every surface, including Finn, Los, landing, and guest flows |
| **Persistence** | Saved per user (`profiles.preferred_theme` or localStorage); guests use localStorage |
| **Implementation** | All colours via `[data-theme='light']` overrides in `globals.css` — not separate always-light CSS files |
| **Current gap** | `ThemeContext` only enables toggle when logged in; `finn.css` / `los.css` force light — **must be fixed** (§15.8) |

**Product decision (locked):** We do **not** ship always-light modules. The previous "Finn = light consumer plane" approach is **retired**.

### 15.3 Languages — Norwegian, Sámi, English (as in Boly)

| Locale code | Language | UI label |
|-------------|----------|----------|
| `no` | Norwegian (bokmål) | Norsk |
| `se` | **Sámi** (Sámegiella) | Sámegiella |
| `en` | English | English |

**Rules:**
1. **Three languages on every page** — language selector in header (or module shell), same as Boly `Header.tsx`.
2. **Not Swedish** — locale code `se` means **Sámi** in this product. Documentation and PRs must not refer to `se` as Swedish.
3. **All new user-facing strings** require keys in `no`, `se`, and `en` in `lib/i18n/*` before merge.
4. **Persistence** — `localStorage` (`boly-locale`) + `profiles.preferred_locale` for authenticated users.
5. **No hard-coded copy** in TSX for user-visible text.

**Current gap:** Some Finn/Los shells may lack the full language selector; Sámi coverage may lag on newer tourism strings — tracked as UX-16.

### 15.4 Module contexts (same look, different jobs)

Hjerterum has route **contexts** (social app, tourism, youth, ops) — not separate visual skins.

| Context | Routes | Visual requirement |
|---------|--------|-------------------|
| **App** | `/homeowner`, `/nav` | Boly Standard — reference implementation |
| **Finn** | `/finn/*` | **Same** Boly Standard; layout may differ (search-first) but **same** dark/light, tokens, chrome |
| **Los** | `/los/*` | **Same** Boly Standard; chat-first layout allowed, not a white chat app |
| **Ops** | `/ops/*` | Boly Standard + ops data-density patterns (`ops.css` extends tokens, does not replace them) |
| **Marketing** | `/` landing | Boly Standard + Hjerterum v2 brand layer |

**Shared everywhere:** lane calendar tokens, toast/confirm/skeleton, theme toggle, language selector, `.card` / `.button` patterns.

### 15.5 Functional UI requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| UX-1 | Universal Boly Standard on all routes | P0 | **Partial** — core app yes; Finn/Los no |
| UX-2 | Unified lane calendar colours and legend | P0 | Done |
| UX-3 | Mobile bottom nav + safe-area insets on app flows | P0 | Done |
| UX-4 | Toast/Confirm — zero native dialogs | P0 | Done |
| UX-5 | Hjerterum v2 landing + portal cards + login | P1 | Partial |
| UX-6 | Consistent header/footer via `SiteChrome` or module shell with same controls | P0 | Partial |
| UX-7 | Finn uses Boly theme system — **not** always-light `finn.css` | P0 | **Not met** — migration required |
| UX-8 | Los uses Boly theme system — **not** always-light `los.css` | P0 | **Not met** — migration required |
| UX-9 | Ops extends Boly tokens; dark + light | P0 | Done (~95%) |
| UX-10 | Hjerterum rebrand in logo, PWA, footer | P1 | In progress |
| UX-11 | Persona-split listing detail views | P1 | Partial |
| UX-12 | Inline form validation + accessible errors | P1 | Partial |
| UX-13 | Skeleton loading on all React Query views | P1 | Partial |
| UX-14 | Visual regression suite | P2 | Smoke only |
| UX-15 | Theme toggle for guests and anonymous users | P0 | **Not met** — logged-in only today |
| UX-16 | Sámi (`se`) keys for all new user-facing strings | P0 | Partial — audit needed |
| UX-17 | Language selector on Finn, Los, and guest shells | P0 | **Partial** |

### 15.6 Component catalogue (mandatory reuse)

Before building new UI:

1. **Design-system** (`Toast`, `ConfirmDialog`, `PageSkeleton`, `EmptyState`, `Modal`, `FieldInput`, `PortalCard`, `SkipLink`)
2. **Ops components** (data-dense patterns)
3. **Feature components** in `features/*/components/`
4. **Global CSS classes** (`.button`, `.card`, `.input`, `.container`)
5. **New component** — only if necessary; promote to design-system if used twice

### 15.7 Anti-patterns — reject in every PR

| Anti-pattern | Why forbidden |
|--------------|---------------|
| Full-page white (`#fff` / `#f8fafc`) without `[data-theme]` support | Breaks Boly feel; excludes dark-mode users |
| New `*-only-light.css` files for features | Retired model — use `globals.css` tokens |
| `finn.css`-style isolated light gradients on new modules | Creates "simplistic white screen" drift |
| Hard-coded Norwegian (or any single language) in TSX | Violates §15.3 |
| `alert()` / `confirm()` | Unprofessional; blocks a11y |
| Inline brand hex in TSX | Token drift |
| Shipping Finn/Los without theme + language controls | UX-15, UX-17 |

### 15.8 Migration plan — bring Finn/Los onto Boly Standard

Required before tourism GA. Each phase has smoke checklist + rollback.

| Phase | Scope | Gate |
|-------|-------|------|
| **M1** | Extend `ThemeContext` — theme toggle for guests (localStorage) | Works on `/finn`, `/`, `/los` without login |
| **M2** | Add language selector to `FinnShell`, `Los` shell | NO / Sámi / EN |
| **M3** | Refactor `finn.css` — map to `globals.css` tokens + `[data-theme='light']` | Dark mode visually matches app; no white-only |
| **M4** | Refactor `los.css` — same as M3 | Los chat in dark Boly style |
| **M5** | Sámi audit on Finn + tourism strings | UX-16 pass |
| **M6** | Remove "always light" comments and forced light backgrounds | Code grep clean |

### 15.9 Responsive & device matrix

Every UI PR must be verified at **320px and 1280px** minimum, in **both dark and light**:

| Viewport | Critical flows |
|----------|----------------|
| 320×568 | Login, manage, nav database, **Finn search (dark)**, language switch |
| 390×844 | Messaging, lane calendar, Los chat |
| 1280×800 | Boligbank table, ops console |

### 15.10 Accessibility (WCAG 2.1 AA)

Unchanged: 4.5:1 body contrast, keyboard access, focus visible, skip link, reduced motion. **Dark and light modes both** must pass contrast audit.

### 15.11 Critical review & questions for product owner

| Challenge | Reality check |
|-----------|---------------|
| **Finn was built light-only** | ~55% tourism module uses `finn.css` white gradients — **direct conflict** with this PRD. Migration M1–M6 is required work, not optional polish. |
| **Theme for guests** | Today only logged-in users can toggle theme. You asked for all pages — we need PO confirm: guests get localStorage theme immediately? |
| **Sámi parity cost** | Full `se` translations for all tourism copy is significant. **Grill:** launch blocker, or phased with NO+EN first? |
| **Dark default on Finn for tourists** | Unusual vs Airbnb/booking.com (light). You want Boly feel — confirm dark default for first-time guests on `finn.hjerterum.no`? |
| **"Bodi"** | Treated as **Boly** (this codebase). Confirm if a separate product reference was intended. |
| **Swedish** | Never a locale in code. `se` = Sámi only. Swedish market uses English per `docs/SCALING_SVERIGE_DANMARK.md` — unchanged? |

**Verdict:** Core Boly app **already matches** your vision. The **gap is new Hjerterum modules** (Finn, Los) that were built with a retired white-screen model. PRD now locks universal dark/light + trilingual as the target; implementation follows §15.8.

---

## 16. Appendix

### 16.1 Subdomains

| Host | Audience |
|------|----------|
| `hjerterum.no` / `bolynorge.no` | Marketing / landing |
| `app.hjerterum.no` | Landlords + caseworkers |
| `finn.hjerterum.no` | Guests (tourism/events) |
| `los.hjerterum.no` | Digital Los (gated) |
| `ops.hjerterum.no` | Platform operations |

### 16.2 Tech stack (production)

- **Frontend:** Next.js 16 (App Router), React, TypeScript, TanStack Query
- **Backend:** Supabase (Postgres, Auth, RLS, Storage, Edge Functions)
- **Payments:** Stripe Connect + Vipps ePayment
- **Identity:** Signicat / BankID for landlords and caseworkers
- **Deploy:** Vercel + Supabase Cloud

### 16.3 Module maturity (approximate)

| Module | Maturity |
|--------|----------|
| Boly social | ~90% |
| Platform control (ops) | ~95% |
| Lanes & availability | ~80% |
| Central events | ~70% |
| Finn / tourism | ~55% |
| Stripe bookings | ~60% |
| Digital Los scaffold | ~50% (research-gated) |
| First-book-wins commit logic | ~85% (DB triggers + tourism assert; UI error keys) |

### 16.4 Glossary

| Term | Meaning |
|------|---------|
| **Boligbank** | Searchable housing inventory for caseworkers |
| **Formidling / Formidla** | Mediation / actively mediated status |
| **Bane / lane** | sosial \| turisme (+ event via separate table) |
| **Henvendelse** | Inquiry (especially event caseworker path) |
| **Overlevering** | Los handoff to caseworker |

---

*Document synthesized from product owner sessions (July 2026), `UTVIKLINGSPLAN.md`, `PRODUKTANALYSE_AKTORER.md`, and `Digital_Los_KI_Partnerproposisjon`.*
