# Hjerterum — Supabase & produksjon

Siste steg for utvikler: kjør migrasjoner, sett miljøvariabler, deploy.

## 1. Supabase migrasjoner

Kjør i rekkefølge (Supabase CLI eller SQL Editor):

```bash
cd supabase
supabase db push
```

Eller manuelt i SQL Editor, **etter** eksisterende migrasjoner:

1. `20260630120000_hjerterum_lanes_and_central_events.sql`
2. `20260630180000_hjerterum_complete_phase3_5.sql`

## 2. Frontend miljøvariabler (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Valgfritt — Stripe (Fase 4)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Webhook oppdaterer booking — kun server-side
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 3. Supabase Auth — magic link (finn.*)

I Supabase Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://app.hjerterum.no` (eller din Vercel-URL)
- **Redirect URLs:**  
  `https://finn.hjerterum.no/auth/callback`  
  `https://YOUR_VERCEL_URL/auth/callback`  
  `http://localhost:3000/auth/callback`

## 4. Platform operator (ops)

```sql
-- Kjør én gang for din bruker
insert into public.platform_operators (user_id, is_active, notes)
values ('YOUR_AUTH_USER_UUID', true, 'Initial ops')
on conflict do nothing;
```

Seed-script: `supabase/scripts/seed_platform_operator.sql`

## 5. Vercel domener

| Subdomain | Route |
|-----------|--------|
| `app.hjerterum.no` | Standard app |
| `finn.hjerterum.no` | Middleware → `/finn/*` |
| `los.hjerterum.no` | Middleware → `/los/*` |
| `ops.hjerterum.no` | `/ops/*` |

Lokal test: `/etc/hosts` → `127.0.0.1 finn.localhost`

## 6. Stripe webhook (når klar)

1. Stripe Dashboard → Webhooks → `https://app.hjerterum.no/api/webhooks/stripe`
2. Events: `payment_intent.succeeded`
3. Metadata på PaymentIntent: `booking_id`

## 7. Smoke test etter deploy

1. Ops: opprett og publiser arrangement på `/ops/events`
2. Utleier: aktiver turisme + opt-in event på `/homeowner/manage`
3. Public: `/finn` og `/finn/arrangement/[slug]`
4. Send booking-forespørsel → utleier godkjenner på manage
5. Los: `/los` → samtykke → overlevering → `/nav/los-inbox` (kommune)
6. Kommune: `/nav/event-inquiries` for arrangement-henvendelser

## 8. Edge functions (eksisterende)

Deploy som før:

```bash
supabase functions deploy
```

Signicat, e-post og push er uendret fra Boly-baseline.
