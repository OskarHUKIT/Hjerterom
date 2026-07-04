# NPD smoke log — turisme, event & UI (juli 2026)

Manuell verifikasjon etter NPD-leveranse. Kjør mot phi (`https://hjerterom-phi.vercel.app`) med demo-kontoer fra `DEMO_NARVIK_OFOTEN.md`.

**UI refresh spec:** [`NPD_5_UI_DESIGN_REFRESH.md`](./NPD_5_UI_DESIGN_REFRESH.md) · **Master plan:** [`NPD_PLAN.md`](../NPD_PLAN.md)

---

## NPD-2 — Event saksbehandler

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Logg inn `kari.event@demo.ofoten.no` / `Ofoten2026!` | Redirect til `/nav/event/database` | ☐ |
| 2 | Sjekk header | Isolert event-shell (ingen global Boly header) | ☐ |
| 3 | `/nav/event/inquiries` | Kun henvendelser for tildelte events | ☐ |
| 4 | Forsøk `/nav/database` | Redirect til event-portal | ☐ |
| 5 | Event boligbank | Ingen «formidla»-handlinger | ☐ |

**Ops:** Kjør `supabase/scripts/fix_event_demo_kari.sql` hvis steg 1 feiler.

---

## NPD-3B — Instant book (emma → ingrid)

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Logg inn `emma.becker@demo.ofoten.no` | `/finn/mine` tilgjengelig | ☐ |
| 2 | Book Ingrid instant-book listing (f.eks. hytte Skjomen) | Status `accepted` uten utleier-godkjenning | ☐ |
| 3 | Checkout Stripe test | Status `paid` | ☐ |
| 4 | Request-to-book listing (ikke instant) | Status `pending` → utleier godtar | ☐ |

---

## NPD-3A — Booking-melding

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Emma: `/finn/mine?booking=<id>` | Chat-panel åpent (21st #8 Messaging Conversation) | ☐ |
| 2 | Send melding | Lagres i tråd | ☐ |
| 3 | Ingrid: `/nav/messages?booking=<id>` eller manage → «Melding til leietaker» | Samme tråd; motpart merket | ☐ |

---

## NPD-3C — Vipps

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Checkout uten `VIPPS_*` env | Kun Stripe valg + rolig alert «Vipps ikke klar» (21st alert) | ☐ |
| 2 | Med test-credentials på staging | Vipps-radio synlig, redirect til Vipps | ☐ |

---

## NPD-3D — Concurrency

| Test | Forventet | Status |
|------|-----------|--------|
| To parallelle `submit_tourism_booking` på samme listing/dato | Én OK, én `dates_conflict` | ☐ |

Se `supabase/scripts/test_booking_concurrency.sql` for SQL-basert verifikasjon.

---

## NPD-4A — Finn locale

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | Velg `no` i Finn-header | `/finn/vilkar` på norsk | ☐ |
| 2 | Velg `se` | Sámi vilkårstekst | ☐ |
| 3 | Checkout status | Oversatt status (ikke rå DB-verdi) | ☐ |

---

## NPD-4B — Sámi audit

```bash
cd frontend && npm run i18n-audit
```

Forventet: exit 0 (inkl. alle 21st-komponent-strenger etter NPD-5).

---

## NPD-5 — UI design refresh (21st.dev, pilot sign-off)

**Spec:** [`NPD_5_UI_DESIGN_REFRESH.md`](./NPD_5_UI_DESIGN_REFRESH.md)  
**Phi:** `https://hjerterom-phi.vercel.app` · passord `Ofoten2026!` for `@demo.ofoten.no`

### NPD-5A — Design decisions + chrome (21st #1–4)

| ID | Beslutning / komponent | Status |
|----|------------------------|--------|
| D1–D7 | Se beslutningslogg i NPD-5 §4 | ☐ |
| #1 | Theme toggle på `/`, `/login`, `/finn`, `/los`, `/nav/*` | ☐ |
| #3–4 | Landing hero dark + fire-bane features (kun `/`) | ☐ |
| #2 | StatusBadge på minst én listing + én booking | ☐ |

### NPD-5B — App shell (21st #5–6)

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | `/nav/database` 1280px | Theme + `se` synlig i header (audit W3/W4) | ☐ |
| 2 | Sidebar collapse | Ikon-only modus; tooltips | ☐ |
| 3 | `/nav/messages` badge | Uleste teller på nav (#6) | ☐ |
| 4 | 320px mobil | Hamburger; ingen horisontal scroll | ☐ |

### NPD-5C — Boligbank + utleier (21st #7–10, 18–19)

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | `/nav/database` | Sort + søk (#7); filter collapsed mobil | ☐ |
| 2 | `/homeowner/manage` | Property cards (#9); lane calendar (#10) | ☐ |
| 3 | Listing detail | Gallery lightbox (#19) | ☐ |
| 4 | Token audit | 0 rå hex i `features/listings/**/*.tsx` | ☐ |

### NPD-5D — Finn (21st #11–14)

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | `/finn` søk | Range calendar popover (#11) | ☐ |
| 2 | Kart | LayerMarkers (#12); «Vis kart» toggle mobil | ☐ |
| 3 | `/finn/book/*` | Checkout stepper (#14); én primær CTA | ☐ |
| 4 | `/finn/mine` | Booking timeline (#13) | ☐ |
| 5 | Ingen hvit Finn-øy | `--bg-app` dark default | ☐ |

### NPD-5E — Los + register (21st #15–17)

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | `/los` anonym | AgentChat (#15); steg-labels (#14) | ☐ |
| 2 | `/homeowner/register` | Registration stepper (#16) | ☐ |
| 3 | BankID-flyt | Identity dialog (#17) før redirect | ☐ |

### NPD-5F — Ops (21st #20)

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | `/ops/stats` | Maks 4 KPI-kort (#20) above fold | ☐ |
| 2 | Feature-flag banner | Alert, dismissible | ☐ |

### NPD-5G — Persona sign-off

| Persona | Konto | Journey | Status |
|---------|-------|---------|--------|
| Tina | `tina.olsen@demo.ofoten.no` | P1 i NPD-5 §5 | ☐ |
| Tommy | `tommy.hakonsen@demo.ofoten.no` | P2 | ☐ |
| Emma | `emma.becker@demo.ofoten.no` | P3 | ☐ |
| Guest | — | P4 | ☐ |
| Los | anonym | P5 | ☐ |
| Ops | `ops@demo.ofoten.no` | P6 | ☐ |

### NPD-5H — Overload-sjekk (skal feile hvis brutt)

| Regel | Verifikasjon | Status |
|-------|--------------|--------|
| Én primær CTA per skjerm | Manuell på `/finn/book`, listing detail, los | ☐ |
| ≤7 synlige nav-punkter (SB) | Tell sidebar expanded | ☐ |
| Ingen dock/shader/carousel på `/nav/*` | Visuell stikkprøve | ☐ |
| Marketing blocks kun på `/` | `/login` og `/nav` har ikke hero #3 | ☐ |

### NPD-5I — Token & a11y (implementert redesign)

| Steg | Handling | Forventet | Status |
|------|----------|-----------|--------|
| 1 | `rg '#[0-9a-fA-F]{3,8}' frontend/features/listings --glob '*.tsx'` | 0 treff (unntak dokumentert) | ☐ |
| 2 | Impeccable live `/` dark + light | Primary CTA ≥ 4.5:1 | ☐ |
| 3 | Impeccable live `/homeowner/manage` | Ingen kontrast-blokkere | ☐ |
| 4 | 320px viewport: manage + listing detail | Ingen horisontal scroll | ☐ |
| 5 | `/nav/event/database` | Event-shell + theme/locale chrome | ☐ |

**NPD-5 ferdig når:** alle ☑ over + sign-off §8 i `NPD_5_UI_DESIGN_REFRESH.md`.
