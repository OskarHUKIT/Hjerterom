# Boly — sikkerhet og trusselbilde

## Arkitektur

- **Frontend:** Next.js (App Router) med Supabase JS-klient (anon key + bruker-JWT). **Browser-klient** bruker `createBrowserClient` (`@supabase/ssr`) slik at økt lagres i **cookies** og kan leses i **`middleware.ts`**.
- **Autorisasjon:** Primært **Postgres RLS** og **RPC** med `security definer` — klienten er aldri kilden til sannhet for tilgang.
- **Hemmeligheter:** Service role, Signicat, e-post, VAPID osv. i **Supabase Edge Function secrets** og Vercel/hosting-miljø; ikke i repo.

## Redirect / åpen redirect

BankID (`auth-signicat`) og signering (`sign-callback`) godtar bare redirect til:

- `http(s)://localhost` / `127.0.0.1` (valgfri port), og
- **`PUBLIC_SITE_URL`** (én primær produksjons-URL, uten trailing slash), og
- **`PUBLIC_SITE_ORIGINS_EXTRA`** (valgfritt: kommaseparerte origins), og
- **`https://boly.vercel.app`** (siste utvei i kode).

**Sett `PUBLIC_SITE_URL`** i Supabase → Edge Functions → Secrets til faktisk nettadresse (f.eks. `https://app.dittdomene.no`).

`sign-agreement` sender bare **validert** `origin` (query) videre til Signicat; ugyldig verdi blir tom streng, og callback bruker trygg fallback.

## Rate limiting

- **`sign-agreement`:** Maks **8** `SIGN_INITIATED`-hendelser per bruker i et **15 minutters** vindu (teller i `audit_logs`). Over: **429**.

## Cron / interne jobber

- **`remind-handover-report`:** Hvis **`CRON_SECRET`** er satt i secrets, kreves `Authorization: Bearer <CRON_SECRET>` eller header `x-cron-secret: <CRON_SECRET>`. Uten secret oppfører funksjonen seg som før (åpen) — **sett secret i produksjon** og konfigurer cron med header.

## Webhooks

- **`send-push`** og **`send-notification-email`** validerer webhook-body med **Zod** før behandling.

## Next.js API

- **`/api/listings/[id]/invoice-basis-pdf`:** UUID-validering; strukturert logg + **`x-request-id`** på suksess og i 500-svar.

## Next.js middleware (`frontend/middleware.ts`)

- Kaller `supabase.auth.getUser()` med server-klient og **oppdaterer auth-cookies** ved behov (Supabase SSR-mønster).
- **Omdirigerer** uautentiserte forespørsler til `/login?redirect=…` for prefiksene **`/homeowner`**, **`/nav`**, **`/documents`**, **`/settings`**, **`/ops`**.
- **`/ops/*`:** Kun brukere i `platform_operators` (GameChanging drift). Mutasjoner via `ops_*` RPC + `OPS_*` audit_logs. `/diagnostics` videresender operatører til `/ops/security`.
- Offentlige ruter (f.eks. `/`, `/login`, `/listings/…`, rapporter med token) er **unntatt**. **RLS** er fortsatt det autoritative tilgangslaget; middleware er et ekstra lag mot direkte URL-tilgang uten gyldig JWT i cookie.

## Viktige overflater

| Overflate | Merknad |
|-----------|---------|
| Edge Functions | Zod der det er innført; `edgeLog` for JSON-linjer i logger. |
| Next Route Handlers | Valider path/query; ikke logg tokens. |
| `backend/` Express | **Ikke produksjons-BFF** — stub; begrenset CORS, ingen body-echo på POST. |

## OWASP (kort sjekkliste)

1. **Tilgang:** Test nye features med feil rolle; stol på RLS/RPC.
2. **Inndata:** Valider på kant; behold DB-constraints.
3. **XSS:** Unngå `innerHTML` med brukerdata; bruk `textContent` / React.
4. **CSRF:** Supabase-klient bruker ikke klassisk skjema-cookie som eneste lag.

## Bundle-analyse (ytelse)

I `frontend/`: `npm run analyze` (setter `ANALYZE=true` under `next build`) — åpner rapport etter bygg.

## Avhengigheter

- Kjør **`npm audit --omit=dev`** i `frontend/` før release. Per siste runde: produksjonsavhengigheter uten kjente sårbarheter etter oppgradering av bl.a. **Next.js 16.2.3+** og **axios 1.15+** (GHSA som tidligere traff eldre versjoner).
- Dev-avhengigheter kan fortsatt rapportere funn; vurder `npm audit` uten `--omit=dev` separat.

## Gjenstående forbedringer (ikke «ferdig produkt» alene)

- **`ListingDetailsClient`:** store deler av listing-state er fortsatt **`any`** (filen er stor); delte typer ligger i `app/lib/listingUiTypes.ts` for videre bruk. **`nav/database`** er sterkere typet (inkl. tilgjengelighetsperioder).
- Flere **`any`→typer** i andre klientfiler etter behov.
- **BankID / eldre økter:** Tidligere ble BankID-callback koblet til **sessionStorage** (`supabase-auth-bankid`). Nå er standard **cookie-økt**; `sign-terms` kan fortsatt lese gammel sessionStorage og kalle `setSession` én gang for overgang. Brukere som kun har tokens i gammel lagring bør **logge inn på nytt** om noe feiler.
- Vurder **`getClaims()`** på server der Supabase anbefaler det fremfor `getUser()` i nye serverkomponenter.

Oppdater dette dokumentet når arkitektur eller deploy endres.
