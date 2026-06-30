# Hjerterum — Architecture (Phase 0)

## Subdomains (planned)

| Host | Route group | Audience |
|------|-------------|----------|
| `hjerterum.no` | `(marketing)` | Landing |
| `app.hjerterum.no` | `(app)` | Utleier + saksbehandler |
| `finn.hjerterum.no` | `(finn)` | Leietaker |
| `los.hjerterum.no` | `(los)` | Digital Los |
| `ops.hjerterum.no` | `(ops)` | Central ops |

Middleware will map `Host` → shell. Routes under `/finn/*` use `FinnShell` (no app header). Subdomain `finn.*` rewrites to `/finn/*` via `middleware.ts`.

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
