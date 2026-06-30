# Ops runbook — Publish central event

**Audience:** Platform operators (`ops.hjerterum.no`)  
**Related:** `central_events`, `listing_event_availability`, `/finn/arrangement/[slug]`

## Before you start

- [ ] Event dates and geography scope agreed with kommune(s)
- [ ] Routing mode chosen: **saksbehandler** (inquiries) or **turisme** (direct booking)
- [ ] Kommune toggles: **Turisme** and/or **Digital Los** enabled if needed (`/ops/kommuner/[slug]`)

## Steps

### 1. Create draft

1. Go to `/ops/events/new`
2. Fill: name, slug, public description, date range, arrangement tag
3. Set **routing_mode** (`saksbehandler` | `turisme`)
4. Save as **draft**

### 2. Preview

- Open draft URL (ops only) and verify copy
- Confirm geography_scope matches intended region/kommune IDs

### 3. Publish

1. `/ops/events/[slug]` → **Publish**
2. Verify audit log entry (`audit_logs` / platform_events)
3. Confirm status = `published` in DB

### 4. After publish

| Routing | What happens |
|---------|----------------|
| saksbehandler | `/finn/arrangement/[slug]` shows inquiry form → `event_inquiries` → kommune inbox |
| turisme | Opt-in listings visible on event page; booking flow via `/finn/book/[id]` |

### 5. Notify utleiere (manual until push)

- Utleiere with listings in scope see **Event task cards** on `/homeowner/manage`
- 3-tap opt-in: open card → select listing → confirm dates within event window

### 6. Kommune verification

- Saksbehandler: `/nav/database` → filter **Arrangement** → verify opt-in listings
- Event inquiries: `/nav/event-inquiries`

### 7. Close event

1. `/ops/events/[slug]` → **Close** when event ends
2. Opt-in rows remain historical; public page shows closed state

## Rollback

- **Draft:** edit freely
- **Published:** close event; do not delete rows (audit). Fix copy via new draft if needed.

## Incidents

| Symptom | Check |
|---------|--------|
| No listings on event page | Utleier opt-in? `tourism_enabled`? Event dates overlap? |
| Inquiries not in inbox | `routing_mode`, staff assignment, RLS |
| Double booking | `check_listing_availability_conflict` RPC logs |

## Smoke test (5 min)

1. Publish test event (turisme mode)
2. Utleier opt-in on manage page
3. `/finn/arrangement/[slug]` shows listing
4. Submit booking request → utleier accept → pay (Stripe test)
5. Close event
