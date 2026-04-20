# Boly — endepunkt, auth og validering

Repovis oversikt for **Sinking Ship** / launch («hvem kan kalle», «hva valideres»). Oppdater ved nye ruter eller Edge Functions.

Supabase **verify_jwt** per funksjon er også dokumentert i [`supabase/config.toml`](../../supabase/config.toml) der det avvikes fra default.

## Next.js Route Handlers (`frontend/app/api`)

| Sti | Metode | Auth | Inputvalidering | Merknad |
|-----|--------|------|-----------------|--------|
| `/api/listings/[id]/invoice-basis-pdf` | GET | `Authorization: Bearer <user JWT>`; `getUser(token)` | `id` som path-param: Zod `z.string().uuid()` | PostgREST med brukerens JWT; RLS avgjør tilgang til listing/basis. Ingen service role i ruten. |

## Supabase Edge Functions (`supabase/functions`)

Base-URL: `{SUPABASE_URL}/functions/v1/<name>`. CORS: [`_shared/cors.ts`](../../supabase/functions/_shared/cors.ts) (allowlist; ikke `*`).

| Funksjon | Metode | verify_jwt (lokal config) | Auth / tillatelse | Inputvalidering | Typisk kaller |
|----------|--------|---------------------------|-------------------|-----------------|----------------|
| `auth-signicat` | GET (redirect) | `false` | OAuth `code` mot Signicat; `CLIENT_SECRET` i secrets | `return_to` / `state` via `isAllowedAppUrl` / `safeAppRedirectUrl` | Nettleser (Signicat redirect + init) |
| `sign-agreement` | POST | `false` | Body `userId` + rate limit via `audit_logs`; Signicat API med `SIGNICAT_SECRET_SIGN` | Zod `signAgreementBodySchema` (uuid, optional origin/city/locale) | App (`functions.invoke`); `assertAllowedBrowserOrigin` når `Origin` satt |
| `sign-callback` | GET (redirect) | `false` | Ingen JWT; callback-URL fra Signicat | Query: Zod-basert parsing av `status`, `signingSessionId`, `userId`, `city` | Signicat redirect (302 til app) |
| `send-push` | POST | `false` | Ingen bruker-JWT; stoler på webhook-playload + service role internt | `notificationWebhookPayloadSchema` (Zod) | Supabase Database Webhook (notifications INSERT) |
| `send-notification-email` | POST | `false` | Samme som send-push | Samme Zod-schema | Supabase Database Webhook |
| `remind-handover-report` | POST | *ikke i config.toml* (sjekk Dashboard: ofte `false` for cron) | Valgfri `CRON_SECRET`: `Authorization: Bearer` eller `x-cron-secret` | Ingen Zod body (tom/trigger); SQL filtrerer på dato | pg_cron / scheduled HTTP |
| `notify-terms-central-review` | POST | *ikke i config.toml* | Service role + `assertAllowedBrowserOrigin` på POST med `Origin` | Zod `bodySchema` (`terms_document_id` uuid) | App etter opplasting av vilkår |

**Merk:** Funksjoner uten eksplisitt `[functions.<name>]` i `config.toml` arver Supabase CLI / Dashboard default for `verify_jwt` — bekreft i **Hosted project → Edge Functions** at det matcher forventning (cron bør ikke kreve sluttbruker-JWT).

## Store klient-lister (paginering / risiko)

| Område | Fil / modul | Mønster | Anbefaling |
|--------|-------------|---------|------------|
| Boligbank | `app/nav/database/page.tsx` | Sidet: `get_listings_for_kommune_paged` + `.range` fallback | Migrasjon [`20260421100000_get_listings_for_kommune_paged.sql`](../../supabase/migrations/20260421100000_get_listings_for_kommune_paged.sql) må være **deployet** til prod. |
| Varsler | `app/lib/queries/notificationsListQuery.ts` | `select('*')` alle rader for `owner_id` | Neste kandidat: `.range` eller tak + «last mer». |
| Chat | `app/nav/messages/page.tsx` | `chat_messages` `select('*')` uten limit | Neste kandidat: paginering eller cap (f.eks. siste N meldinger). |
| Brukere (kommune) | `app/nav/users/page.tsx` | RPC `get_all_users_for_kommune` / fallback `profiles` + hele `user_agreements` | Ved stor skala: paginert RPC eller begrensede felter. |
| Utløpte | `app/nav/expired/page.tsx` | `select('*')` | Avhengig av volum; vurder limit/range. |
| `test-db` | `app/test-db/page.tsx` | `limit(1)` | Kun dev/test — ikke prod-flyt. |

Øvrige `select('*')` med `.eq('id', …).single()` / `maybeSingle()` er enkelt-rader og er normale.

## Relaterte dokumenter

- [`LAUNCH_DRIFT_SIGNOFF.md`](./LAUNCH_DRIFT_SIGNOFF.md) — manuell sign-off (HTTPS, backup, env, region, npm audit-status).
