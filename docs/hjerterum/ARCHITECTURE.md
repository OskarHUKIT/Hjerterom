# Hjerterum — Architecture (Phase 0)

## Subdomains (planned)

| Host | Route group | Audience |
|------|-------------|----------|
| `hjerterum.no` | `(marketing)` | Landing |
| `app.hjerterum.no` | `(app)` | Utleier + saksbehandler |
| `finn.hjerterum.no` | `(finn)` | Leietaker |
| `los.hjerterum.no` | `(los)` | Digital Los |
| `ops.hjerterum.no` | `(ops)` | Central ops |

Middleware maps `finn.*` → `/finn/*` and `los.*` → `/los/*`. Finn uses forced light theme; Los uses dedicated dark chat shell.

## Deploy

See `SUPABASE_DEPLOY.md` for migration order, env vars, and smoke tests.

## Code layout

```
frontend/
  app/components/design-system/   # Shared UI primitives
  features/listings/              # Lanes, tourism, event opt-in
  app/ops/events/                 # Central event admin
  supabase/migrations/            # Schema + RLS
```

## Data model (Phase 1–2)

- `listings.tourism_enabled`, `tourism_nightly_price_cents`
- `listing_availability.lane` (`sosial` | `turisme`)
- `central_events`, `listing_event_availability`
- RPC `check_listing_availability_conflict`

See `UTVIKLINGSPLAN.md` for full roadmap.

## Service flows (canonical)

**`SERVICE_FLOW.md`** — redigerbar oversikt over hele økosystemet: aktører, tre baner (sosial/turisme/event), steg-for-steg-flyter, gates og typiske forvirringspunkter. Oppdater ved produktendringer.

**`REFACTOR_PLAN.md`** — bølgeplan for full refactor: megasite-splits, felles hooks, agent-arbeidsflyt og suksesskriterier.

**`agents/README.md`** — self-contained agent briefs per wave (smart zone packets for fresh context windows).
