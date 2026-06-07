# Boly — produksjonsklarhet (audit-plan, avsluttet runde)

Dette dokumentet lukker den strukturerte **production-readiness**-gjennomgangen (audit → plan → inkrementell implementasjon). Teknisk dybde for trusselbilde og redirects finnes i [SECURITY.md](./SECURITY.md).

## Status: hva som er levert

| Fase | Innhold | Status |
|------|---------|--------|
| **1 — Audit** | Stack, dataflyt, OWASP-orientert sjekk, ytelse/a11y-notater | Reflektert i SECURITY.md + kodeendringer |
| **2 — Plan** | Sikkerhet (Zod, redirects), ytelse (bilde/bundle), hygiene, UI | Utført gradvis (Tailwind B-valg fra tidligere) |
| **3 — Utførelse** | Små, verifiserbare endringer; lint/build etterpå | Denne runden fullført med siste punkt nedenfor |

### Implementasjon (kort)

- **Edge Functions:** delt `safeRedirect` / logging; Zod der innført; rate limit på `sign-agreement`; validering av webhooks; `CRON_SECRET` for `remind-handover-report` når satt.
- **Next:** Zod på PDF-route; `next/image` + `OptimizedPublicStorageImage` der det gir mening; `remotePatterns` inkl. lagring fra env; **`middleware.ts`** med cookie-basert auth og beskyttelse av `/homeowner`, `/nav`, `/documents`; browser-klient via **`createBrowserClient`**.
- **Kvalitet:** ESLint 9 flat config, `lint` med `--max-warnings 0`, målrettede a11y/typing-forbedringer; **typer** for listing-detalj og nav-database (`app/lib/listingUiTypes.ts`).
- **Avhengigheter:** Next.js **16.2.3+**, axios **1.15+**; `npm audit --omit=dev` = 0 ved siste kjøring i `frontend/`.

## Obligatorisk manuelt før «go live»

1. **RLS og policies** — Gjennomgå Supabase-tabeller/RPC som nye features treffer; test med feil rolle og uten JWT.
2. **Secrets** — Sett bl.a. `PUBLIC_SITE_URL`, eventuelt `PUBLIC_SITE_ORIGINS_EXTRA`, `CRON_SECRET`, Signicat/e-post/VAPID etter miljø.
3. **Redeploy** — Alle Edge Functions som bruker oppdatert `_shared/` må deployes på nytt etter endringer.
4. **Røyktest** — BankID-innlogging, signering, meldinger med vedlegg, PDF-route, cron-kall med secret.

## Kommandoer (frontend)

```bash
npm run lint
npm run build
npm audit --omit=dev
npm run analyze   # valgfritt: bundle-størrelse
```

## Bevisste begrensninger

- **Middleware** stoler på JWT i **cookies** (synk med `createBrowserClient`). Eldre BankID-økter kun i sessionStorage krever ev. **ny innlogging** eller `setSession`-overgang (se SECURITY.md).
- **Systematisk fjerning av `any`** i øvrige filer kan fortsette inkrementelt.
- **APM/SIEM** er ikke inkludert; strukturert logging (`edgeLog`, `x-request-id` på PDF) er første lag.

Oppdater tabellene over når dere gjør nye sikkerhets- eller deploy-runder.
