# Hjerterum — Product Requirements Document

**Version:** 1.1  
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
| **i18n** | NO / SE / EN; Finn default EN per locked decision |
| **GDPR** | DPIA for Los before pilot; privacy notices and DPA bundle in `docs/gdpr/` |
| **Performance** | Listing search RPC optimized for tourism; conflict check on availability write |
| **UI/UX** | Boly App Standard (§15) on all caseworker/landlord surfaces; portal planes per §15.2; WCAG 2.1 AA; mobile-first |

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
| i18n completeness | No user-facing hard-coded NO strings in new code | PR review |

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
| **UI/UX (parallel)** | Hjerterum v2 rollout to app shell; Finn/Los polish; visual regression | §15.5 phased plan |

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
| Finn.no brand confusion extends to visual identity | Medium | Dedicated Finn plane (light consumer UI); distinct from classifieds |
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

---

## 15. UI/UX & design system requirements

> **North star:** Every surface must meet or exceed the **Boly App Standard** — the production-proven UX that municipalities and landlords already trust. Hjerterum expansion adds lanes and portals; it must not dilute clarity, accessibility, or professional polish.

**Canonical references:** `DESIGN_SYSTEM.md` (tokens, components, planes), `UI_UX_GOVERNANCE.md` (how we maintain quality in development).

### 15.1 The Boly App Standard (non-negotiable baseline)

The **Boly App Standard** is defined by the live production surfaces `/homeowner/*` and `/nav/*`. New and refactored code in these areas must preserve:

| Dimension | Requirement | Implementation reference |
|-----------|-------------|--------------------------|
| **Visual tone** | Professional, calm, high-trust dark UI ("Northern scenery") | `frontend/app/globals.css` |
| **Typography** | DM Sans (body), Fraunces (display/hero only) | `layout.tsx`, CSS `--font-*` |
| **Spacing** | 8px grid via `--space-*` tokens | `globals.css` `:root` |
| **Colour** | Semantic tokens only — no ad-hoc hex in components | `--bg-app`, `--text-*`, `--color-accent`, lane tokens |
| **Components** | Shared design-system primitives for feedback, loading, empty, forms | `app/components/design-system/` |
| **Buttons & inputs** | Global `.button`, `.button-accent`, `.input`, `.card` classes or thin wrappers | `globals.css`, `ui/Button.tsx` |
| **Feedback** | Toast for transient messages; ConfirmDialog for destructive actions | **Never** `alert()` / `confirm()` |
| **Loading** | PageSkeleton or LoadingPlaceholder — no blank screens | `PageSkeleton.tsx` |
| **Empty states** | EmptyState with clear next action | `EmptyState.tsx` |
| **Accessibility** | WCAG 2.1 AA contrast; keyboard navigable; visible `:focus-visible` | SkipLink, semantic HTML, ARIA on modals/toasts |
| **Touch** | Minimum 44×44px interactive targets; 16px+ inputs on mobile (iOS zoom) | `--touch-target: 44px` |
| **Motion** | Respect `prefers-reduced-motion`; transitions ≤250ms | `--transition-*` tokens |
| **i18n** | All user-facing copy via `LanguageContext` / `lib/i18n/*` | NO / SE / EN |
| **Theme** | Light/dark toggle on main app; tokens switch via `[data-theme]` | `ThemeContext.tsx` |

**Acceptance:** A caseworker or landlord who used Boly in 2025 should recognise the app immediately after any Hjerterum feature ships.

### 15.2 Visual planes (one product, four intentional UX contexts)

Hjerterum is not one flat design — it is **one design system with four visual planes**. Each plane has allowed tokens and forbidden patterns.

| Plane | Routes | Theme | CSS source | Audience expectation |
|-------|--------|-------|------------|---------------------|
| **Boly App** | `app.*` → `/homeowner`, `/nav` | Dark default (+ light toggle) | `globals.css` (+ phased `hjerterum-v2.css`) | Professional tool — municipality-grade |
| **Finn (tourism)** | `finn.*` → `/finn/*` | Always light | `finn/finn.css` | Consumer booking — Airbnb-adjacent clarity |
| **Digital Los** | `los.*` → `/los/*` | Always light | `los/los.css` | Youth-friendly, low intimidation |
| **Ops** | `ops.*` → `/ops/*` | Dark admin | `ops/ops.css` | Operator console — reference for data-dense UI |

**Rules:**
1. **Do not** import Finn/Los light styles into Boly App routes (or vice versa).
2. **Lane semantics** (sosial / turisme / event / conflict) use shared lane tokens everywhere calendars appear — see `laneCalendarStyles.ts` and `--lane-*` in `globals.css`.
3. **Hjerterum v2** brand tokens (`--hrt-*` in `hjerterum-v2.css`) apply to marketing, landing, login, and phased app-shell polish — they **override accent** but must not break contrast or spacing grid.
4. **Ops components** (`OpsShell`, `OpsDataTable`, `OpsBadge`, etc.) are the reference for new data-dense admin patterns; extract to design-system when reused outside ops.

### 15.3 Functional UI requirements by actor

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| UX-1 | Boly App Standard on all `/homeowner` and `/nav` flows | P0 | **Baseline met** — maintain during refactor |
| UX-2 | Unified lane calendar colours and legend across manage, detail, nav | P0 | Done |
| UX-3 | Mobile bottom nav + safe-area insets on primary app flows | P0 | Done |
| UX-4 | Toast/Confirm design-system — zero native dialogs | P0 | Done |
| UX-5 | Hjerterum v2 landing + portal cards + login polish | P1 | Partial |
| UX-6 | Consistent header/footer chrome via `SiteChrome` | P0 | Done |
| UX-7 | Finn consumer UI — light plane, distinct from FINN.no classifieds | P0 | Partial (~55% module) |
| UX-8 | Los youth UI — light plane, chat-first, low cognitive load | P1 | Scaffold (gated) |
| UX-9 | Ops console as reference for tables, KPIs, alerts | P0 | Done (~95%) |
| UX-10 | Full Hjerterum rebrand in logo, PWA manifest, footer copy | P1 | **In progress** — mixed Boly/Hjerterum |
| UX-11 | Persona-split listing detail views (owner vs nav vs guest) | P1 | Partial — megasite remains |
| UX-12 | Inline form validation with accessible error association | P1 | Partial |
| UX-13 | Skeleton loading on all React Query data views | P1 | Partial — megasites lag |
| UX-14 | Visual regression suite on core routes | P2 | Smoke only — no screenshots yet |

### 15.4 Component catalogue (mandatory reuse)

Before building new UI, check this order:

1. **Design-system** (`Toast`, `ConfirmDialog`, `PageSkeleton`, `EmptyState`, `Modal`, `FieldInput`, `PortalCard`, `SkipLink`)
2. **Ops components** (for admin/data-dense patterns)
3. **Feature components** in `features/*/components/`
4. **Global CSS classes** (`.button`, `.card`, `.input`, `.container`)
5. **New component** — only if none of the above fit; add to design-system if used twice

**Anti-patterns (reject in PR review):**
- Inline `style={{ color: '#...' }}` for brand colours
- Custom one-off modals duplicating `Modal.tsx`
- `window.confirm` / `window.alert`
- Raw `<button>` without touch-target sizing on mobile
- Hard-coded Norwegian strings in TSX (bypass i18n)
- Tables without horizontal scroll wrapper on mobile (boligbank pattern)

### 15.5 Hjerterum v2 rollout plan (brand without UX regression)

Phased visual upgrade — each phase has a **rollback switch** (revert CSS import) and **smoke checklist**.

| Phase | Scope | Gate |
|-------|-------|------|
| **v2.0** | Landing, portal cards, login, skip-link, footer | ✅ Shipped |
| **v2.1** | App header accent + logo treatment on `SiteChrome` | PO sign-off; contrast audit |
| **v2.2** | Card/button polish inside `/homeowner/manage` | No layout shift; mobile 320px pass |
| **v2.3** | `/nav/database` + messages chrome alignment | Caseworker UAT (1 kommune) |
| **v2.4** | PWA manifest + icon set → Hjerterum | App store assets aligned |
| **v2.5** | Finn/Los plane accent harmonisation (not merge) | Distinct planes preserved |

**Principle:** Brand evolves; **interaction patterns do not**. Navigation, form flows, and data density stay Boly-familiar.

### 15.6 Responsive & device matrix (test before merge)

Every UI PR touching `app/` or `features/` must be verified at:

| Viewport | Device proxy | Critical flows |
|----------|--------------|----------------|
| 320×568 | iPhone SE | Login, manage list, nav database scroll |
| 375×667 | iPhone SE 2 | Messaging, lane calendar |
| 390×844 | iPhone 14 | Formidling modal, Finn search |
| 768×1024 | iPad | Split layouts, ops tables |
| 1280×800 | Laptop | Boligbank full table |
| 1920×1080 | Desktop | Hero/landing only |

**Safe areas:** `env(safe-area-inset-*)` on fixed headers, bottom nav, and full-screen modals.

### 15.7 Accessibility requirements (WCAG 2.1 AA)

| Criterion | Requirement |
|-----------|-------------|
| **1.4.3 Contrast** | 4.5:1 body text; 3:1 large text and UI components |
| **2.1.1 Keyboard** | All actions reachable without pointer |
| **2.4.7 Focus** | Visible focus ring — use `:focus-visible`, not outline removal |
| **2.4.1 Skip** | Skip-to-content on marketing and app shell |
| **4.1.2 Name, role, value** | Icons with `aria-label`; form labels associated |
| **1.4.10 Reflow** | No horizontal scroll at 320px except intentional table wrappers |
| **2.3.3 Animation** | Honour `prefers-reduced-motion` |

### 15.8 Critical review — where we are honest

This section exists to **grill** the UI/UX strategy. Gaps and tensions must stay visible.

| Challenge | Reality check | Mitigation |
|-----------|---------------|------------|
| **"Same as Boly" vs "Hjerterum rebrand"** | Accent colours already diverge (`#3b82f6` Boly vs `#5b7cfa` Hjerterum v2) | v2 rollout plan (§15.5); accent-only first; spacing/typography unchanged |
| **Megasites block consistency** | `ListingDetailsClient` (~3k lines), `NavDatabasePage` (~2k), `NavMessagesPage` (~1.7k) violate refactor target | W5 persona-split; ESLint `max-lines: 800`; no new megasites |
| **Four planes = four QA surfaces** | Finn/Los can drift from Boly App patterns | Plane-specific CSS files; shared lane tokens only |
| **No Storybook / Figma source of truth** | Design lives in CSS + code; onboarding designers is hard | `DESIGN_SYSTEM.md` + Cursor skill; consider Storybook post-pilot |
| **Visual regression not automated** | Smoke tests check HTTP status only — not pixels | Add Playwright screenshot diff on 4 core routes before tourism GA |
| **i18n split incomplete** | SE/EN landing still says "Boly" in places | UX-10 tracked; copy audit per release |
| **World-class bar is subjective** | Municipal SaaS ≠ consumer unicorn polish | Benchmark: Stripe Dashboard (ops), gov.uk forms (accessibility), Airbnb calendar (Finn) |
| **Tailwind + globals.css hybrid** | Two styling systems risk inconsistency | New code: prefer tokens + global classes; Tailwind only with `boly-*` mapped tokens |
| **Light mode less tested** | Dark is default; light overrides are extensive | Light-mode pass on every UI PR |

**Verdict:** The Boly App Standard is **achieved today** on core social flows. Risk is **regression and drift** as Hjerterum modules ship — not absence of a standard. Governance (see `UI_UX_GOVERNANCE.md`) is the product requirement.

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
