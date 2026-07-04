# NPD-5 — UI design refresh (pilot sign-off)

**Version:** 1.0 · July 2026  
**Status:** Plan — not signed off  
**Environment:** [hjerterom-phi.vercel.app](https://hjerterom-phi.vercel.app)  
**Demo:** `docs/hjerterum/DEMO_NARVIK_OFOTEN.md` (passord `Ofoten2026!`)  
**Design authority:** `docs/hjerterum/DESIGN_SYSTEM.md`, `.cursor/skills/hjerterum-ui/SKILL.md`  
**Related PR:** [#34](https://github.com/OskarHUKIT/Hjerterom/pull/34) (CSS/token refactor — necessary but not sufficient for NPD-5 done)

---

## 1. Problem statement

PR #34 moved listing/manage UI from inline styles to shared CSS (`hjerterum-v2.css`, `listing-details-shared.css`, `landlord-manage.css`). That improves maintainability but does **not** prove:

- Pilot-ready **trust** for kommune caseworkers  
- **Completion** for landlords (register → manage → formidle)  
- **Brand** consistency without token/type drift  
- **Trilingual** compliance on operational surfaces  

NPD-5 defines measurable acceptance for a **visual and IA sign-off** before Narvik/Ofoten pilot.

---

## 2. Goals and non-goals

### In scope (must pass to close NPD-5)

| ID | Goal |
|----|------|
| G1 | Dark default + light toggle work on all routes in smoke matrix (§6) |
| G2 | WCAG 2.1 AA contrast on primary actions, body text, and callouts (dark **and** light) |
| G3 | Single primary colour ladder — no ad-hoc `#ef4444` / `#6b8afd` in feature CSS |
| G4 | Typography scope documented and applied (Fraunces limited; DM Sans for operational UI) |
| G5 | Persona journeys (§5) completable on phi without visual breakage or dead ends |
| G6 | Listing/handover/manage user-facing strings use `t()` with `no` / `se` / `en` |
| G7 | Nav listing detail: caseworker can reach formidling + handover in ≤3 clicks from landing on listing |
| G8 | Impeccable static + live scan: zero **confirmed** contrast/line-length blockers on matrix routes |

### Out of scope (follow-up NPD or product backlog)

- New feature functionality (booking, Vipps, event logic) — covered by NPD-2–4  
- Full removal of `finn.css` / `los.css` files (migrate behaviour, not delete in NPD-5 unless blocking G1)  
- Font file change if scope doc + landing-only Fraunces satisfies G4  
- Automated visual regression (Percy/Chromatic) — recommended post-NPD-5  

---

## 3. Definition of done

NPD-5 is **DONE** when all are true:

1. Every row in `NPD_SMOKE_LOG.md` § NPD-5 is ☑ with date + tester initials.  
2. `cd frontend && npm run i18n-audit` exits 0 **after** listing/handover i18n sweep (G6).  
3. Token audit (§4.2) shows no new raw hex in `frontend/features/listings/**` except lane calendar CSS variables.  
4. Design decisions D1–D5 (§4.1) recorded in this doc with **Accepted** status.  
5. At least one screenshot set per persona (§5) stored under `docs/hjerterum/audits/screenshots/npd-5/` (or linked PR comment).  

---

## 4. Design decisions (must accept before implementation)

Record decision, owner, and date in the table when resolved.

### 4.1 Decision log

| ID | Decision | Options | Recommendation | Status |
|----|----------|---------|----------------|--------|
| D1 | **Display font scope** | A) Fraunces landing only B) Fraunces landing + portal heroes C) Keep everywhere | **A** — DM Sans on `/homeowner`, `/nav`, `/listings`, handover | ☐ Pending |
| D2 | **Primary token** | A) `--hrt-primary` only B) Keep `--color-royal-blue` alias C) Revert to sky-blue | **A** — one primary; deprecate aliases in DESIGN_SYSTEM §3 | ☐ Pending |
| D3 | **Semantic colours** | Centralise success/warning/danger tokens vs keep rgba in components | Centralise `--color-danger`, `--color-warning`, `--color-success` | ☐ Pending |
| D4 | **Nav listing IA** | A) Sticky section jump nav B) Tabs C) Status quo scroll | **A** for `?view=nav` only | ☐ Pending |
| D5 | **Tenant handover link UI** | A) Copy button + masked URL B) Full URL in `<code>` C) QR | **A** | ☐ Pending |

### 4.2 Token audit checklist

Run before sign-off:

```bash
# Raw hex in listings features (allowlist: lane calendar vars only)
rg '#[0-9a-fA-F]{3,8}' frontend/features/listings --glob '*.tsx' --glob '*.css'
# Target: 0 matches in .tsx; .css limited to documented semantic tokens
```

| Token | Dark value | Light value | Used for |
|-------|------------|-------------|----------|
| `--hrt-primary` | `#4a5fd4` | `#2563eb` | Primary CTA, active nav |
| `--color-link` | TBD | TBD | Inline links, map pin |
| `--color-success` | `--color-teal` | TBD | Available, approved |
| `--color-danger` | TBD | TBD | Delete, rejected, utilgjengelig |
| `--color-warning` | TBD | TBD | Be om endring, expired banner |

---

## 5. Persona journeys (qualitative acceptance)

Each journey: run on **phi**, **dark** and **light**, locales **no** and **en** (spot-check **se** on same screens).

### P1 — Tina (kommune saksbehandler)

**Account:** `tina.olsen@demo.ofoten.no` / `Ofoten2026!`

| # | Journey step | Pass criteria |
|---|--------------|---------------|
| 1 | `/nav/database` → open formidlet listing | Card/list readable; filters sticky on mobile; no horizontal scroll |
| 2 | Listing detail (nav view) | Status, gallery, formidling panel visible above fold or via section nav (D4) |
| 3 | Handover reports | Filter dropdown usable; fullscreen report readable; approve/request change clear |
| 4 | Tenant link callout | Copy works; UI matches D5; not “hacky” URL dump |
| 5 | Theme + language toggle | Persists; no white flash on navigation |

### P2 — Tommy (utleier, 5 boliger)

**Account:** `tommy.hakonsen@demo.ofoten.no` / `Ofoten2026!`

| # | Journey step | Pass criteria |
|---|--------------|---------------|
| 1 | `/homeowner/manage` | Header, filters, cards aligned; mobile action sheet complete |
| 2 | Mark utilgjengelig / tilgjengelig | Lane calendar paint colours correct both themes |
| 3 | `/listings/[id]?view=owner` | Edit metrics/tags; gallery upload; no layout jump on save |
| 4 | `/homeowner/register` (new listing draft) | Form sections, geocode, image preview; submit states |
| 5 | Formidlet listing | Read-only notice visible; handover PDF CTA clear |

### P3 — Emma (leietaker / Finn)

**Account:** `emma.becker@demo.ofoten.no` / `Ofoten2026!`

| # | Journey step | Pass criteria |
|---|--------------|---------------|
| 1 | `/` → login → Finn | Dark default; portal cards; no legacy white Finn shell |
| 2 | `/finn` search + listing | Tokens match globals; cancellation/i18n labels |
| 3 | English locale on listing detail (if exposed) | No hardcoded Norwegian blocks from owner sections |

### P4 — Ops / platform

**Account:** `ops@demo.ofoten.no` / `Ofoten2026!`

| # | Journey step | Pass criteria |
|---|--------------|---------------|
| 1 | `/ops` dashboard | Hero solid (no broken gradient); chart bars animate without layout shift |
| 2 | Stats / events | Readable on 768px; sidebar transition smooth |

### P5 — Guest (no login)

| # | Journey step | Pass criteria |
|---|--------------|---------------|
| 1 | `/` landing | Hero line-length ≤ ~65ch; trust badges contrast AA |
| 2 | Toggle light → `/login` | Consistent theme; footer solid contrast |
| 3 | `/finn` as guest | Same token family as landing |

---

## 6. Route smoke matrix (Impeccable + manual)

Run Impeccable on phi for each route (dark + light). Manual ☑ in `NPD_SMOKE_LOG.md`.

| Route | Portal | Impeccable | Manual persona |
|-------|--------|------------|----------------|
| `/` | Landing | Static + live | P5 |
| `/login` | Auth | Static + live | P5 |
| `/homeowner/manage` | Utleier | Static + live | P2 |
| `/homeowner/register` | Utleier | Static + live | P2 |
| `/listings/[id]?view=owner` | Utleier | Static + live | P2 |
| `/listings/[id]` (nav) | Kommune | Static + live | P1 |
| `/nav/database` | Kommune | Static + live | P1 |
| `/nav/messages` | Kommune | Static + live | P1 |
| `/finn` | Turisme | Static + live | P3 |
| `/finn/search` | Turisme | Static + live | P3 |
| `/los` | Los | Static + live | P1 (inbox) |
| `/ops` | Ops | Static + live | P4 |
| `/nav/event/*` | Event | Static + live | NPD-2 overlap OK |

**Blockers (auto-fail NPD-5):** primary button contrast &lt; 4.5:1, body text &lt; 4.5:1, focus ring invisible, horizontal overflow at 320px on matrix routes.

---

## 7. Implementation phases (technical)

Phases are ordered by dependency. Complete phase *n* before sign-off claims phase *n*.

### Phase A — Sign-off prerequisites (design)

- [ ] Accept D1–D5 in §4.1  
- [ ] Update `DESIGN_SYSTEM.md` §3 with final token table  
- [ ] Create `docs/hjerterum/audits/screenshots/npd-5/` (placeholder README)

### Phase B — Token & typography (code)

- [ ] Implement D1: remove `font-display` from listing/manage/handover/ops data tables  
- [ ] Implement D2/D3: semantic tokens in `globals.css`; replace raw hex in `listing-details-shared.css`, `landlord-manage.css`  
- [ ] Verify light theme overrides for new tokens  

**Exit:** Token audit (§4.2) clean; Impeccable primary-button pass on `/` and `/homeowner/manage`.

### Phase C — i18n operational surfaces (code)

- [ ] Extract hardcoded Norwegian in:  
  - `ListingDetailsPropertySection.tsx`  
  - `ListingDetailsHandoverSection.tsx` / modals  
  - `ListingDetailsAvailabilitySection.tsx` (calendar legend)  
- [ ] Add keys to `lib/i18n` (`no`, `se`, `en`)  
- [ ] `npm run i18n-audit` → exit 0  

**Exit:** G6; P3 step 3 pass.

### Phase D — Nav listing IA (code)

- [ ] Implement D4: sticky section jump nav on nav listing view (`#overtakelsesrapport`, availability, mediation)  
- [ ] Mobile: horizontal scroll chips or compact dropdown  

**Exit:** P1 step 2 — formidling reachable in ≤3 clicks.

### Phase E — Trust polish (code)

- [ ] Implement D5: tenant handover link component  
- [ ] Review manage page duplicate actions (desktop chips vs icon row) — consolidate or document  
- [ ] Formidlet callout styling aligned with `hrt-callout` patterns  

**Exit:** P1 step 4; P2 step 5 qualitative OK from tester.

### Phase F — Verification (QA)

- [ ] Execute all NPD-5 rows in `NPD_SMOKE_LOG.md`  
- [ ] Impeccable full matrix §6  
- [ ] Capture screenshot set per persona  
- [ ] Mark NPD-5 **DONE** in this doc (§8)  

---

## 8. Sign-off record

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | PR #34 + phases B–E |
| Design / product | | | D1–D5 accepted |
| Pilot (kommune) | | | P1 journey |
| Pilot (utleier) | | | P2 journey |

**NPD-5 status:** ☐ Not started · ☐ In progress · ☐ Done

---

## 9. References

| Document | Use |
|----------|-----|
| `NPD_SMOKE_LOG.md` § NPD-5 | Executable checkbox log |
| `DEMO_NARVIK_OFOTEN.md` | Accounts and seed |
| `DESIGN_SYSTEM.md` | Token and anti-pattern law |
| `UI_UX_GOVERNANCE.md` | Review process |
| PR #34 | CSS refactor baseline |

---

*Maintained with `NPD_SMOKE_LOG.md`. When NPD-5 closes, link commit SHA and phi deployment URL in §8.*
