# Hjerterum — Supabase & produksjon (komplett sjekkliste)

## 1. Migrasjoner (kjør i rekkefølge)

```bash
cd supabase && supabase db push
```

| # | Fil |
|---|-----|
| 1 | `20260630120000_hjerterum_lanes_and_central_events.sql` |
| 2 | `20260630180000_hjerterum_complete_phase3_5.sql` |
| 3 | `20260630200000_hjerterum_production_ready.sql` |
| 4 | `20260630210000_platform_control_panel.sql` |

## 2. Miljøvariabler

Kopier `frontend/.env.example` → `frontend/.env.local` og fyll inn:

| Variabel | Påkrevd | Formål |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Ja | Supabase prosjekt |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ja | Klient |
| `SUPABASE_SERVICE_ROLE_KEY` | Ja* | Stripe webhook, Connect |
| `NEXT_PUBLIC_APP_URL` | Ja | Stripe redirect URLs |
| `STRIPE_SECRET_KEY` | Betaling | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Betaling | Webhook signatur |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Valgfritt | Fremtidig Elements |

\* Kreves for Stripe Connect og webhook i produksjon.

## 3. Platform operator

```sql
insert into public.platform_operators (user_id, is_active, notes)
values ('YOUR_AUTH_USER_UUID', true, 'Initial ops')
on conflict do nothing;
```

## 4. Supabase Auth

**URL Configuration:**
- Site URL: `https://app.hjerterum.no`
- Redirect URLs: `https://*/auth/callback`, `http://localhost:3000/auth/callback`

## 5. Stripe

1. Opprett Stripe Connect (Express) i Dashboard
2. Webhook: `https://app.hjerterum.no/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`
3. Utleier: `/homeowner/manage` → «Koble til Stripe»

## 6. Edge Functions

```bash
supabase functions deploy los-chat
# Sett OPENAI_API_KEY i Supabase secrets for ekte LLM (valgfritt)
supabase secrets set OPENAI_API_KEY=sk-...
```

Eksisterende: `sign-agreement`, `send-notification-email`, osv.

## 7. Vercel domener

| Host | App-rute |
|------|----------|
| `app.hjerterum.no` | Standard |
| `finn.hjerterum.no` | Middleware → `/finn/*` |
| `los.hjerterum.no` | Middleware → `/los/*` |
| `ops.hjerterum.no` | `/ops/*` |

## 8. Smoke test (E2E)

1. **Ops:** `/ops/events` → opprett + publiser arrangement
2. **Ops:** `/ops/kommuner/[slug]` → aktiver Digital Los + Turisme
3. **Utleier:** `/homeowner/manage` → turisme på + event opt-in + Stripe Connect
4. **Kommune:** `/nav/database` → filter «Arrangement»
5. **Public:** `/finn` → booking-forespørsel
6. **Utleier:** godta booking → gjest `/finn/book/[id]` → betal
7. **Los:** `/los` → chat → overlevering → `/nav/los-inbox`
8. **Kommune:** `/nav/event-inquiries`

## 9. Lokal utvikling

```bash
cd frontend && npm ci && npm run dev
# /finn /los /ops tilgjengelig på localhost:3000/finn osv.
```

## 10. Fase 6–7 (launch)

| Dokument | Innhold |
|----------|---------|
| `docs/hjerterum/OPS_EVENT_RUNBOOK.md` | Ops event publish/close |
| `docs/hjerterum/LOAD_TEST.md` | Load test + rate limit verify |
| `/finn/vilkar` | Turisme bookingvilkår |
| `/los/personvern` | Digital Los personvern |

- **Rate limit:** `/api/stripe/checkout` (20/min/IP)
- **Sentry (valgfritt):** `NEXT_PUBLIC_SENTRY_DSN` + `npm i @sentry/nextjs`
- **Finn locale:** default engelsk for turister (`finn.hjerterum.no`)

## 11. Fresh Hjerterum Supabase (nytt prosjekt)

**`docs/hjerterum/FRESH_SUPABASE_INSTALL.md`** — full install på nytt Supabase-prosjekt.  
**Ikke** bruk mot eksisterende Boly-produksjon.

## 12. Rydde prosjekt og iPad-deploy

Se **`docs/hjerterum/SUPABASE_RESET_AND_IPAD.md`** — reset av gammelt prosjekt, testdata-cleanup, og GitHub Actions for `db push` fra iPad.
