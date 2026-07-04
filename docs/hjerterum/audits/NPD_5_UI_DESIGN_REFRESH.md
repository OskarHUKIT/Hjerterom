# NPD-5 — UI design refresh (pilot sign-off + 21st.dev)

**Version:** 1.1 · July 2026  
**Status:** Plan — not signed off  
**Environment:** [hjerterom-phi.vercel.app](https://hjerterom-phi.vercel.app)  
**Demo:** `docs/hjerterum/DEMO_NARVIK_OFOTEN.md` (passord `Ofoten2026!`)  
**Design authority:** `DESIGN_SYSTEM.md`, `.cursor/skills/hjerterum-ui/SKILL.md`  
**Parent plan:** [`NPD_PLAN.md`](../NPD_PLAN.md) § Spor 5  
**Component source:** [21st.dev](https://21st.dev) — 20 kuraterte mønstre (tabell §3)

---

## 1. Problem statement

Funksjonelle NPD-spor (0–4) leverer pilot-flyter, men verdensklasse UX krever mer enn token-refactor:

- **Kommune SB** trenger rolig, forutsigbar boligbank — ikke «startup dashboard noise»
- **Utleier** trenger tydelig progresjon register → manage → formidle
- **Finn-gjest** trenger Booking.com-enkelhet uten Airbnb-overload
- **Los-ungdom** trenger lav friksjon chat — én inngang, ett steg om gangen
- **Alle** trenger mørk default, trilingual chrome, og **maks én primær handling per skjerm**

NPD-5 integrerer **20** [21st.dev](https://21st.dev)-komponenter som **forsterkere** av Boly-standard — ikke et nytt designsystem.

---

## 2. Design philosophy — world class without overload

### 2.1 The Hjerterum calm contract

| Rule | Implementation |
|------|----------------|
| **One job per screen** | Boligbank = søk + liste. Meldinger = tråd. Los = chat. Ingen «dashboard widgets» på SB-forside. |
| **One primary CTA** | Royal blue button; sekundære handlinger som ghost/link eller «⋯» meny. |
| **Progressive disclosure** | Filtre collapsed på mobil. Kart under liste. Avansert kalender bak «Rediger periode». |
| **Same shell everywhere** | #5 Dashboard sidebar + #6 mobil variant — ikke ny nav per modul. |
| **Marketing ≠ operations** | #3 Hero + #4 Features **kun** `/`. Fra `/login` → DM Sans, kort, tokens. |
| **Motion with purpose** | Ingen parallax docks/shaders. Steppers og status — ja. Dekor — nei. |
| **Trilingual or ship-block** | Hver 21st-komponent: oversett alle strings før merge. |

### 2.2 Cognitive load budget (per persona)

| Persona | Max visible nav items | Max cards above fold | Max form fields (unfolded) |
|---------|----------------------|----------------------|----------------------------|
| Saksbehandler (Tina) | 7 sidebar | 1 filter bar + table | 5 (filter drawer) |
| Utleier (Tommy) | 5 sidebar | 6 listing cards | 8 per register step |
| Gjest (Emma) | 3 Finn tabs | 12 search results | 3 (sted, dato, gjester) |
| Ungdom (Los) | 0 nav (chat only) | 1 composer | 1 question at a time (#15) |
| Ops | 8 sidebar | 4 KPI (#20) | N/A |

---

## 3. The 20 components — implementation map

Install pattern (example):

```bash
npx shadcn@latest add https://21st.dev/r/uniquesonu/status-badge-beautiful-accessible-status-indicators
```

After install: move to `frontend/components/design-system/` or `features/*/components/`, map CSS variables to `globals.css`, replace hardcoded copy with `t()`.

### Wave 5A — Chrome & trust foundation

| # | Component | Target files / routes | Improves | Hjerterum-specific |
|---|-----------|----------------------|----------|-------------------|
| **1** | [Toggle theme](https://21st.dev/community/components/shadcnspace/toggle-theme) | `ShellChromeControls`, all layouts | Theme discoverability (audit WARN W3/W5) | Guest `boly-theme-guest` + logged-in profile sync |
| **2** | [StatusBadge](https://21st.dev/community/components/uniquesonu/status-badge-beautiful-accessible-status-indicators) | `features/listings`, `features/tourism`, messaging | One status language: formidlet, pending, paid, utilgjengelig | WCAG in both themes — municipal trust |
| **3** | [Hero Section Dark](https://21st.dev/community/components/kinfe123/hero-section-dark/default) | `app/(marketing)/page.tsx` | Dark first paint; professional Nord-Norge positioning | Fraunces headline only here (decision D1) |
| **4** | [Feature Section hover](https://21st.dev/community/components/aceternity/feature-section-with-hover-effects) | Landing below hero | Four lanes explained without four subdomains | Map to existing `PortalCard` data; disable hover on `prefers-reduced-motion` |

**5A exit:** `/` and `/login` pass audit W1/W2; landing dark + light screenshots captured.

---

### Wave 5B — App shell (nav + homeowner)

| # | Component | Target | Improves | Hjerterum-specific |
|---|-----------|--------|----------|-------------------|
| **5** | [Dashboard collapsible sidebar](https://21st.dev/community/components/uniquesonu/dashboard-with-collapsible-sidebar/default) | `app/(app)/layout` or nav shell | Collapse for data density; activity feed slot | Strip demo stats — keep nav + content area only |
| **6** | [Modern Sidebar](https://21st.dev/community/components/uniquesonu/modern-side-bar/default) | Mobile `<768px` nav | Badges on `/nav/messages`, `/nav/notifications`, `/nav/los-inbox` | 44px touch; auto-close on route change |

**5B exit:** Tina sees theme + `se` at 1280px; sidebar collapse persists in localStorage.

---

### Wave 5C — Caseworker & landlord work surfaces

| # | Component | Target | Improves | Hjerterum-specific |
|---|-----------|--------|----------|-------------------|
| **7** | [Table sort + search](https://21st.dev/community/components/shadcn/table/with-sorting-and-search) | `/nav/database` | Sort/filter boligbank; keyboard accessible | Filters in collapsible `<details>` on mobile |
| **8** | [Messaging Conversation](https://21st.dev/community/components/hextaui/messaging-conversation/default) | `/nav/messages`, NPD-3A booking thread | Thread UI with counterpart label (SB/NAV/event/guest) | PRD §1.18 motpart-merking in thread header |
| **9** | [Property Card](https://21st.dev/community/components/ravikatiyar/card-4) | Shared `ListingCard` for nav + finn | Consistent listing preview | Lane badges via #2 StatusBadge + `--lane-*` |
| **10** | [Calendar booked days](https://21st.dev/community/components/shadcn/calendar-with-booked-days) | `/homeowner/manage` availability | Visual booked vs open; multi-lane | Paint with `--lane-social`, `--lane-finn`, `--lane-event` |
| **18** | [File Upload Card](https://21st.dev/community/components/ravikatiyar162/file-upload-card) | Listing gallery owner view | Drag-drop Supabase Storage | Single drop zone; no multi-modal upload chain |
| **19** | [Gallery Grid + Lightbox](https://21st.dev/community/components/reapollo/gallery-grid-block-shadcnui/default) | Listing detail (all views) | Professional photo review | Lightbox lazy-loaded |

**5C exit:** P1 boligbank + P2 manage calendar qualitative OK; token audit clean (§4.2).

---

### Wave 5D — Finn tourism (guest path)

| # | Component | Target | Improves | Hjerterum-specific |
|---|-----------|--------|----------|-------------------|
| **11** | [Range selection calendar](https://21st.dev/community/components/shadcn/calendar-with-range-selection/default) | `/finn` search bar | Check-in/out in popover | Replaces inline date inputs; mobile-friendly |
| **12** | [mapcn LayerMarkers](https://21st.dev/@mapcn/components/mapcn-layer-markers) | `/finn` map panel | Theme-aware map; many pins | **Below** results on mobile; toggle «Vis kart» |
| **13** | [Visualize Booking](https://21st.dev/community/components/ln-dev7/visualize-booking/default) | `/finn/mine`, booking detail | Guest understands pending → paid → stay | Single vertical timeline — no duplicate status chips |
| **14** | [Stepper with labels](https://21st.dev/community/components/originui/stepper/with-labels) | `/finn/book/[id]` checkout | 3 steps: detaljer → betaling → bekreftelse | Future steps disabled — no skip-ahead |
| **9** | *(reuse)* Property Card | `/finn/search` results | Same card as boligbank — one mental model | EN default on Finn per PRD; labels from i18n |

**5D exit:** NPD-W6 fixed; Finn map no longer `ComingSoonPlaceholder`; Emma journey P3 pass.

---

### Wave 5E — Los + landlord onboarding

| # | Component | Target | Improves | Hjerterum-specific |
|---|-----------|--------|----------|-------------------|
| **15** | [AgentChat + InputBar](https://agent-elements.21st.dev/docs/agent-chat) | `/los` only | Streaming AI; structured questions for handoff | UI-only — wire to existing Los edge fn; DPIA-safe copy |
| **14** | *(reuse)* Stepper with labels | `/los` header | Kontakt → Forståelse → Kobling visible | Labels from `lib/i18n/los.ts` — **se required** |
| **16** | [Registration Stepper](https://21st.dev/community/components/ravikatiyar/registration-stepper/default) | `/homeowner/register` | Multi-step listing create without wall of fields | Max 5 steps; «Lagre utkast» on each |
| **17** | [Identity Verification Dialog](https://21st.dev/community/components/ruixen.ui/identity-verification-dialog) | Pre-BankID sign flows | Sets expectation before Signicat redirect | Copy mentions BankID; test bypass when env set |

**5E exit:** Los not purple legacy shell; register flow E2E on phi.

---

### Wave 5F — Ops + system feedback

| # | Component | Target | Improves | Hjerterum-specific |
|---|-----------|--------|----------|-------------------|
| **20** | [Statistics Card 12](https://21st.dev/community/components/reui/statistics-card-12) | `/ops/stats` | KPI cards with delta badges | Max 4 cards; link «Se detaljer» to tables — not 12 metrics |
| **2** | *(reuse)* StatusBadge | Ops events, platform flags | Module on/off, event draft/published | Ops data density without new colour system |
| **Alerts** | [Alert category](https://21st.dev/community/components/s/alert) — pick 1 calm variant | Feature-flag banners, Vipps-not-ready | Inline context — not modal spam | NPD-3C «Vipps ikke klar» as dismissible alert |

**5F exit:** P4 ops dashboard; no layout shift on chart load.

---

## 4. Design decisions (must accept before Wave 5A)

| ID | Decision | Options | Recommendation | Status |
|----|----------|---------|----------------|--------|
| D1 | Display font scope | A) Fraunces landing only B) + heroes C) everywhere | **A** + #3 Hero | ☐ Pending |
| D2 | Primary token | `--hrt-primary` single ladder | **A** — map 21st `primary` to token | ☐ Pending |
| D3 | Semantic colours | Centralise danger/warning/success | Required for #2 StatusBadge | ☐ Pending |
| D4 | Nav listing IA | A) Sticky section nav B) Tabs C) scroll | **A** — complements #7 table → detail | ☐ Pending |
| D5 | Tenant handover link | A) Copy + masked B) full URL C) QR | **A** | ☐ Pending |
| **D6** | **21st adoption** | A) All 20 B) 12 core C) cherry-pick | **B** — waves 5A–5F; defer carousel/dock | ☐ Pending |
| **D7** | **Component ownership** | Promote to `design-system/` vs feature-local | Promote if used ≥2 modules (#2, #9, #14) | ☐ Pending |

### 4.1 Token audit

```bash
rg '#[0-9a-fA-F]{3,8}' frontend/features/listings --glob '*.tsx' --glob '*.css'
# After 21st import: also scan frontend/components/
```

Map 21st Tailwind classes:

| 21st/shadcn | Hjerterum token |
|-------------|-----------------|
| `bg-background` | `--bg-app` / `--bg-card` |
| `text-foreground` | `--text-main` |
| `text-muted-foreground` | `--text-muted` |
| `primary` | `--color-royal-blue` or `--hrt-primary` |

---

## 5. Persona journeys (qualitative acceptance)

Run on **phi**, **dark + light**, locales **no** + **en** (spot **se**).

### P1 — Tina (kommune saksbehandler)

` tina.olsen@demo.ofoten.no`

| # | Step | Pass criteria | 21st # |
|---|------|---------------|--------|
| 1 | `/nav/database` | Collapsible filters; table sort (#7) | 7 |
| 2 | Open listing | StatusBadge (#2); section nav (D4) | 2, 19 |
| 3 | Messages | Thread header shows counterpart (#8) | 8 |
| 4 | Theme + language | Toggle (#1) persists | 1 |

### P2 — Tommy (utleier)

`tommy.hakonsen@demo.ofoten.no`

| # | Step | Pass criteria | 21st # |
|---|------|---------------|--------|
| 1 | `/homeowner/manage` | Sidebar (#5/6); listing cards | 5, 9 |
| 2 | Lane calendar | Booked days + lane colours (#10) | 10 |
| 3 | Register | Stepper (#16); upload (#18) | 16, 18 |
| 4 | Gallery | Lightbox (#19) | 19 |

### P3 — Emma (leietaker)

`emma.becker@demo.ofoten.no`

| # | Step | Pass criteria | 21st # |
|---|------|---------------|--------|
| 1 | `/finn` search | Range calendar (#11); property cards (#9) | 11, 9 |
| 2 | Map toggle | LayerMarkers (#12); optional | 12 |
| 3 | Book + mine | Checkout stepper (#14); timeline (#13) | 14, 13 |

### P4 — Guest + landing

| # | Step | Pass criteria | 21st # |
|---|------|---------------|--------|
| 1 | `/` | Hero dark (#3); 4 features (#4); not cluttered | 3, 4 |
| 2 | Chrome | Theme + language (#1) | 1 |

### P5 — Los youth (anonymous)

| # | Step | Pass criteria | 21st # |
|---|------|---------------|--------|
| 1 | `/los` | Fullscreen chat (#15); step labels (#14) | 15, 14 |
| 2 | Handoff | One clear CTA — no secondary nav | — |

### P6 — Ops

`ops@demo.ofoten.no` — KPI cards (#20), max 4 visible.

---

## 6. Route smoke matrix

| Route | Wave | Components | Blocker if |
|-------|------|------------|------------|
| `/` | 5A | 1, 3, 4 | >2 scroll sections before CTA |
| `/login` | 5A | 1 | Missing theme/lang |
| `/nav/database` | 5B–5C | 5, 7, 9 | Horizontal scroll 320px |
| `/nav/messages` | 5C | 8 | Missing counterpart label |
| `/homeowner/manage` | 5C | 5, 9, 10 | Calendar wrong lane colour |
| `/homeowner/register` | 5E | 16, 17, 18 | >5 steps visible |
| `/listings/[id]` | 5C | 19, 2 | Raw hex in CSS |
| `/finn` | 5D | 1, 9, 11, 12 | White Finn island |
| `/finn/book/*` | 5D | 14 | Multiple primary CTAs |
| `/finn/mine` | 5D | 13 | Confusing duplicate status |
| `/los` | 5E | 15, 14 | Legacy purple shell |
| `/ops/stats` | 5F | 20 | >4 KPI above fold |

**Auto-fail:** contrast < 4.5:1, invisible focus, horizontal overflow 320px, hardcoded Norwegian in 21st components.

---

## 7. Implementation phases (ordered)

| Phase | Waves | Deliverable | PR suggestion |
|-------|-------|-------------|---------------|
| **A** | Decisions | D1–D7 accepted; DESIGN_SYSTEM §3 update | docs-only |
| **B** | 5A | Landing + chrome (#1–4) | `cursor/npd-5a-chrome-4fd7` |
| **C** | 5B | App shell (#5–6) | `cursor/npd-5b-shell-4fd7` |
| **D** | 5C | Boligbank + manage (#7–10, 18–19) | `cursor/npd-5c-work-4fd7` |
| **E** | 5D | Finn (#11–14, reuse #9) | `cursor/npd-5d-finn-4fd7` |
| **F** | 5E | Los + register (#15–17) | `cursor/npd-5e-los-4fd7` |
| **G** | 5F | Ops (#20) + alerts | `cursor/npd-5f-ops-4fd7` |
| **H** | QA | Smoke log + screenshots + sign-off §8 | — |

**Rule:** One wave per PR where possible — easier rollback, less user-facing churn per deploy.

---

## 8. Sign-off record

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | Waves 5A–5F merged |
| Design / product | | | D1–D7; overload budget §2.2 |
| Pilot (kommune) | | | P1 |
| Pilot (utleier) | | | P2 |

**NPD-5 status:** ☐ Not started · ☐ In progress · ☐ Done

---

## 9. References

| Document | Use |
|----------|-----|
| [`NPD_PLAN.md`](../NPD_PLAN.md) | Master NPD queue + component table |
| [`NPD_SMOKE_LOG.md`](./NPD_SMOKE_LOG.md) § NPD-5 | Executable checkboxes |
| [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) | Tokens, anti-patterns |
| [21st.dev](https://21st.dev) | Component source registry |

---

* v1.1 adds 21st.dev integration map and anti-overload contract. When NPD-5 closes, record commit SHA and phi URL in §8.*
