# Product Growth Audit — Hjerterum

Runnable checklist for evaluating **growth readiness** on staging/production (e.g. `hjerterom-phi.vercel.app`).

**Results archive:** `docs/hjerterum/audits/PRODUCT_GROWTH_AUDIT_RESULTS.txt` (shared text log — append or overwrite per run)

**Related:** `PRD.md` §11, `PRODUKTANALYSE_AKTORER.md`, `UI_UX_GOVERNANCE.md` §6, `MARKEDSPLAN_OG_VEIEN_VIDERE.md`, `DEMO_NARVIK_OFOTEN.md`

---

## Run

```bash
cd frontend && npm install && npx playwright install chromium
node ../scripts/product-growth-audit.mjs --base-url https://hjerterom-phi.vercel.app
```

---

## Test accounts (Ofoten demo seed)

Password for all `@demo.ofoten.no` accounts: **`Ofoten2026!`** (see `docs/hjerterum/DEMO_NARVIK_OFOTEN.md`).

| Persona | Email | Core routes after login |
|---------|-------|-------------------------|
| Ops | `ops@demo.ofoten.no` | `/ops`, `/ops/platform`, `/ops/events`, `/ops/kommuner`, `/ops/stats` |
| Kommune admin | `tina.olsen@demo.ofoten.no` | `/nav/database`, `/nav/los-inbox`, `/nav/event-inquiries`, `/nav/terms-documents` |
| Kommune SB | `lars.moen@demo.ofoten.no` | `/nav/database`, `/nav/messages`, `/nav/los-inbox` |
| Event SB | `kari.event@demo.ofoten.no` | `/nav/event-inquiries` |
| Utleier | `ingrid.fotland@demo.ofoten.no` | `/homeowner/manage` |
| Leietaker | `emma.becker@demo.ofoten.no` | `/finn`, `/finn/mine` |

---

## Audit sections

### 1. Route health (anonymous)
All public and module entry URLs return &lt;500 without error copy.

### 2. UX growth gates (PRD §15)
- Dark default + light toggle on **every** surface (/, /login, /finn, /los, app shells)
- Language selector: `no` + `se` + `en` on every surface
- No white-screen-only modules

### 3. Persona journeys
Login + smoke each role’s primary workflows (boligbank, Los innboks, Finn mine, ops platform).

### 4. Funnel surfaces
- **Finn:** search, map, event pages, booking path entry
- **Los:** anonymous chat start, privacy copy, handoff affordance

### 5. Known product gaps (manual)
Cross-check `PRODUKTANALYSE_AKTORER.md`:
- Guest↔landlord inbox per booking (P0)
- Instant book vs request-to-book
- `event_ansatt` dedicated UI
- Stripe + Vipps
- Sámi (`se`) key completeness
- First-book-wins double-booking protection

### 6. Growth metrics (ops)
When logged in as Ops, verify `/ops/stats` funnel data loads for pilot kommune.

---

## Severity

| Level | Meaning |
|-------|---------|
| **FAIL** | Blocks pilot/demo (5xx, auth broken for persona, missing module) |
| **WARN** | Growth friction (missing toggle, partial i18n, hydration-only UI) |
| **INFO** | Documented gap not in scope for automated pass |
