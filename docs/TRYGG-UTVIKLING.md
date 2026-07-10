# Trygg utvikling i Hjerterom

Sosialmodulen er i produksjon. Alt annet (finn/tourism, los, events, stripe) utvikles videre
i samme kodebase og samme database. Dette dokumentet er reglene som gjør det trygt.
Bakgrunn og begrunnelse: `modularitet-og-db-strategi-2026-07-10.md` (prosjektmappen).

---

## 1. Grunnprinsippet

> **Alt som merges til `main` deployes til produksjon.**
> Derfor skal alt som merges være **additivt**, **flagg-gatet** og **shadow-testet**.

Trygt betyr: hvis en ny modul er skrudd av i ops-konsollen, skal koden og migrasjonene dens
kunne ligge i produksjon uten at sosialmodulen kan merke det («mørk deploy»).

## 2. Modulregler

1. **Én sannhetskilde:** nye moduler registreres først i `frontend/lib/moduleRegistry.ts`
   (id, `requires`, ruteprefikser) og får eget flagg i `platform_settings`
   (kolonne + `get_platform_settings`/`ops_set_platform_settings`). Flagget er **av som default**.
2. **Fire håndhevingslag** — alle skal på plass før modulen anses gatet:
   - middleware (ruteblokkering) — `frontend/middleware.ts`
   - klient (nav/portal-gate) — `FeaturePortalGate` / nav-configs
   - RLS: restrictive INSERT-policy `<tabell>_module_gate_ins` på modulens tabeller
     (mønster i `20260710121000_module_write_enforcement.sql`)
   - RPC: alle SECURITY DEFINER skrive-RPCer starter med
     `if not public.is_module_enabled('<modul>') then return jsonb_build_object('ok', false, 'error', '<modul>_module_disabled'); end if;`
3. **Sosialmodulen gates aldri** og skal aldri av i produksjon.
4. **Ingen kryssmodul-endringer:** en modulmigrasjon rører ikke sosialmodulens tabeller,
   policyer eller funksjoner. En modul-feature importerer ikke fra en annen modul —
   deling skjer via `components/ui` og `lib/`.
5. **Lesing gates ikke.** Av modul = ingen *ny* aktivitet; historikk og grace-flyter
   (aktive bookinger, avbestilling) skal fortsatt virke. Gate INSERT, ikke UPDATE/DELETE.
6. `public.is_module_enabled(text)` i databasen skal alltid speile
   `effectiveModuleFlags()` i `moduleRegistry.ts` — endres den ene, endres den andre.

## 3. Migrasjonsregler (expand/contract)

1. **Additivt først.** Nye tabeller, kolonner (nullable eller med default), funksjoner og
   policyer er alltid trygge. `drop`/`rename`/`not null` på eksisterende objekter kommer i
   en **egen migrasjon minst én release senere**, når ingen kode refererer det gamle.
2. **Idempotent.** `if not exists`, `create or replace`, `drop policy if exists` — en
   migrasjon skal tåle å kjøres mot en database der deler allerede finnes.
3. **Én bekymring per migrasjon.** Aldri blande modulskjema og felles-skjema i samme fil.
4. **Redefinering av funksjoner:** kopier alltid **siste** definisjon (grep etter siste
   `create or replace function public.<navn>` på tvers av migrasjonene) og endre minst mulig.
5. **Aldri kjør SQL manuelt i produksjons-dashboardet.** Alt skjema går som migrasjon
   gjennom PR.

## 4. Arbeidsflyt og miljøer

| Endringstype | Miljø |
|---|---|
| Frontend-endringer uten skjemaendring | Vercel preview (automatisk per PR) |
| Små skjemaendringer | Lokal Supabase (`supabase start` + `supabase db reset`) |
| Større modularbeid / risikofylte migrasjoner | Supabase-branch (persistent `develop` eller preview-branch per PR) — aldri produksjonsdatabasen |

Flyt: **branch → PR → CI shadow-test → review → merge til `main` → auto-deploy.**

- CI (`supabase-deploy.yml`) replayer **alle** migrasjoner mot en fersk shadow-database på
  hver PR som endrer `supabase/**`. Rød shadow-test = ikke merge.
- Direkte push til `main` er forbudt (aktiver branch protection i GitHub med
  «require pull request» + «require status checks: shadow-validate»).
- Nye edge functions deployes gjerne mørkt — de gjør ingenting før noe kaller dem.

## 5. Utrulling av ny modul (sjekkliste)

1. Flagg i `platform_settings` (default av) + `moduleRegistry.ts`-oppføring
2. Skjema som additiv migrasjon + restrictive INSERT-gates + RPC-guards
3. Frontend under `features/<modul>/`, ruter gatet i middleware + portal-gate
4. Shadow-test grønn, PR merget → koden ligger mørkt i produksjon
5. Verifiser i produksjon med flagget **av**: ruter redirecter, RPC svarer `module_disabled`
6. Skru på i ops-konsollen (`/ops/platform`) — først i test/branch, så produksjon
7. Rollback = skru flagget av igjen. Ingen deploy nødvendig.

## 6. Boly → Hjerterom-renamen (status)

Skjer i **samme Supabase-prosjekt** — alle kontoer, sesjoner og filer bevares. Tre bølger:

- **Bølge 1 (utført):** `is_platform_operator()` + `platform_retention_sweep()` innført,
  gamle navn er wrappere, cron repekt (`20260710120000_platform_naming_wave1.sql`).
- **Bølge 2 (pågår, puljevis):** RLS-policyer og kode migreres til nye navn;
  `boly-*` localStorage-nøkler flyttes til `hjerterom-*` med engangs-shim; UI-tekster.
- **Bølge 3 (til slutt):** wrappere droppes når `grep -rn "is_boly_operator\|boly_retention_sweep"`
  bare treffer wrapper-definisjonene selv.

Regel: aldri rename + referanse-oppdatering i samme migrasjon. Nytt navn først, migrér
referansene, dropp det gamle sist.

## 7. Hvis noe går galt

- **Modulfeil i produksjon:** skru modulen av i `/ops/platform` — middleware, klient, RLS
  og RPC stenger da modulen uten deploy (30 s cache i middleware).
- **Feilet migrasjon:** ikke fiks fremover i panikk — skriv en ny migrasjon som ruller
  tilbake til forrige fungerende skjema, og la shadow-testen verifisere den først.
- **Mistanke om at sosialmodulen er truffet:** sjekk `audit_logs` og
  `select * from cron.job;` (retention-jobben skal hete `hjerterom-retention-daily`).
