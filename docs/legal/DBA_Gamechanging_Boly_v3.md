# Databehandleravtale (DBA) — Boly

> **Avtale mellom:**
> **Behandlingsansvarlig:** Narvik kommune, org.nr. 959 469 059
> («kommunen» / «Behandlingsansvarlig»)
>
> **Databehandler:** Gamechanging AS, org.nr. 932 496 321
> Besøksadresse: Lavangsnesveien 2039
> Kontaktperson: Lars Utstøl, `lars@gamechanging.no`, +47 416 13 301
> («Gamechanging» / «Databehandler»)
>
> **Tjeneste:** Boly — digital formidlingsplattform for kommunal boligbistand
> (bolynorge.no).
>
> **Versjon:** 3.1 — utkast til signering
> **Sist oppdatert:** 2026-04-21
> **Erstatter:** DBA v2 (`DBA_Gamechanging_Boly_v2.pdf`) og intern v3.0 (2026-04-20)

---

## Endringslogg (v2 → v3)

| # | Område | Endring |
|---|---|---|
| 1 | Intro | Org.nr. fylt ut for begge parter: Narvik kommune 959 469 059, Gamechanging AS 932 496 321 (v3.1, 2026-04-21). |
| 2 | Vedlegg A.3 | Fjernet «fødselsnummer» (ikke lagret); presisert behandling av bankkontonummer (kun ved `payment_method = 'konto'`, region-scoped RLS, AES-256, 24 mnd retensjon) |
| 3 | Vedlegg A.4 | Harmonisert med A.3 og med `PRIVACY_NOTICE.md` |
| 4 | Vedlegg B.1 / §6.2 / C.5 | Regioner enhetlig: Supabase i `eu-central-1` (Frankfurt), Vercel i `arn1` (Stockholm). Edge Middleware globalt men persisterer ikke |
| 5 | Vedlegg B.2 | TIA-er vedlagt og referert (TIA_Vercel.md v1.0, TIA_Supabase.md v1.0) |
| 6 | Vedlegg C.4 | Oppdatert retensjonstabell (chat 24 mnd, notifikasjoner 12 mnd, audit-logger 12 mnd, invoice-basis 24 mnd, cron-jobb `boly-retention-daily`) |
| 7 | Vedlegg C.6 | TIA-er levert; flagget fjernet |
| 8 | §8.2 | Sikkerhetsvarsel til `security@bolynorge.no` som primær, `personvern@gamechanging.no` som sekundær |
| 9 | Vedlegg D.1 | DPIA-utkast levert (`docs/legal/DPIA_Boly.md` v1.0) |
| 10 | Vedlegg D.2 | Cookiebanner og policy implementert, referanser til kode og `/personvern` |
| 11 | Vedlegg D.5 | Status-tabell oppdatert: alle oransje flagg løst eller med konkret frist |
| 12 | Vedlegg C.4 / D.5 (v3.1) | **Handover-rapporter og -bilder:** retensjon harmonisert til 36 mnd, automatisert via migrasjon `20260428120000_handover_reports_retention.sql` (R-10 lukket). |
| 13 | Vedlegg D.5 (v3.1) | **DPF-status for Supabase Inc.:** lukket som verifisert «ikke DPF-sertifisert»; overføringen hviler fullt ut på SCC + TIA-supplerende tiltak, jf. `TIA_Supabase.md` §2.2. |

---

## Parter

Denne avtalen regulerer forholdet mellom Behandlingsansvarlig og
Databehandler når Databehandler behandler personopplysninger på vegne
av Behandlingsansvarlig, jf. **GDPR art. 28** og personopplysningsloven
§ 17.

| | Behandlingsansvarlig | Databehandler |
|---|---|---|
| Navn | Narvik kommune | Gamechanging AS |
| Org.nr. | 959 469 059 | 932 496 321 |
| Adresse | [kommunens besøksadresse] | Lavangsnesveien 2039 |
| Kontaktperson | [navn + e-post] | Lars Utstøl, `lars@gamechanging.no`, +47 416 13 301 |
| Personvernombud (DPO) | [navn + e-post] | N/A (databehandler er ikke pliktig etter art. 37, men har personvernkontakt: `personvern@gamechanging.no`) |
| Sikkerhetskontakt | [navn + e-post] | `security@bolynorge.no` |

---

## §1. Formål og virkeområde

1.1. Avtalen regulerer Databehandlers behandling av personopplysninger
på vegne av Behandlingsansvarlig i forbindelse med tjenesten Boly.

1.2. Behandlingens formål, art, varighet, typer personopplysninger og
kategorier av registrerte fremgår av **Vedlegg A**.

1.3. Ved motstrid mellom Hovedavtalen (SaaS-avtalen) og denne DBA, går
DBA foran for personvernspørsmål.

---

## §2. Definisjoner

Begrepene i denne avtalen tolkes i samsvar med GDPR art. 4 og
personopplysningsloven. Sentrale definisjoner:

- **Personopplysninger:** enhver opplysning om en identifisert eller
  identifiserbar fysisk person, jf. GDPR art. 4 (1).
- **Behandling:** enhver operasjon som utføres med personopplysninger,
  jf. GDPR art. 4 (2).
- **Registrert:** fysisk person som personopplysningene gjelder.
- **Underdatabehandler:** annen databehandler som Databehandler
  engasjerer, jf. GDPR art. 28 (2) og (4).
- **SCC:** Standard Contractual Clauses — Kommisjonens
  gjennomførings­avgjørelse (EU) 2021/914.
- **TIA:** Transfer Impact Assessment, jf. EDPB Rec. 01/2020 v2.0.

---

## §3. Databehandlers plikter

3.1. **Instruksbinding.** Databehandler behandler kun
personopplysninger etter dokumenterte instrukser fra
Behandlingsansvarlig, herunder om overføring til tredjeland, med
mindre EU/EØS-rett pålegger noe annet, jf. GDPR art. 28 (3) (a).

3.2. **Konfidensialitet.** Databehandler sørger for at enhver som er
autorisert til å behandle personopplysningene har forpliktet seg til
konfidensialitet eller er underlagt lovfestet taushetsplikt.

3.3. **Sikkerhet.** Databehandler iverksetter egnede tekniske og
organisatoriske tiltak som beskrevet i **Vedlegg C**.

3.4. **Assistanse med registrertes rettigheter.** Databehandler
bistår Behandlingsansvarlig med å ivareta registrertes rettigheter
(GDPR kap. III), herunder innsyn, retting, sletting, begrensning,
dataportabilitet og protest.

3.5. **Assistanse med art. 32–36.** Databehandler bistår med
sikkerhetsbrudd-varsling, DPIA og forhåndskonsultasjon i rimelig
utstrekning.

3.6. **Varsling om instruks i strid med lov.** Databehandler skal
umiddelbart varsle Behandlingsansvarlig dersom en instruks anses å
stride mot GDPR eller annen personvernlovgivning.

3.7. **Taushetspliktserklæring.** Alle ansatte og innleide som har
tilgang til Boly-data er underlagt skriftlig taushetspliktserklæring.

---

## §4. Behandlingsansvarliges plikter

4.1. Behandlingsansvarlig er ansvarlig for at det foreligger
behandlings­grunnlag for behandlingen.

4.2. Behandlingsansvarlig skal ikke overføre personopplysninger til
Databehandler som ikke er nødvendige for formålet beskrevet i
Vedlegg A.

4.3. Behandlingsansvarlig skal gjennomføre DPIA når det er påkrevd
(GDPR art. 35), og eventuelt forhåndskonsultasjon (art. 36).
Databehandler bistår med teknisk grunnlag; se `docs/legal/DPIA_Boly.md`.

4.4. Behandlingsansvarlig plikter å informere egne registrerte etter
GDPR art. 13/14 (se `docs/legal/PRIVACY_NOTICE.md`).

---

## §5. Underdatabehandlere

5.1. Databehandler har Behandlingsansvarligs generelle forhåndsgod­
kjenning til å benytte underdatabehandlere som angitt i **Vedlegg B**.

5.2. Ved endringer av underdatabehandlere skal Behandlingsansvarlig
varsles skriftlig minst **30 dager** før endringen trer i kraft.
Behandlingsansvarlig kan innen denne fristen gjøre begrunnede
innsigelser.

5.3. Databehandler pålegger underdatabehandlerne de samme forpliktelser
som følger av denne avtalen, og forblir fullt ansvarlig overfor
Behandlingsansvarlig for underdatabehandlernes oppfyllelse.

---

## §6. Overføring til tredjeland

6.1. **Hovedregel: EU/EØS-innenlands behandling.** Alle
persondata­lagre ligger innenfor EU/EØS:

- Supabase: AWS `eu-central-1` (Frankfurt, Tyskland) — Postgres,
  Auth, Storage.
- Vercel: `arn1` (Stockholm, Sverige) — serverside-funksjoner,
  pinnet via `vercel.json`.
- Vercel Edge Middleware kjører på Vercels globalt distribuerte
  edge-CDN; **persisterer ingen personopplysninger**, men
  JWT-cookies fra brukeren passerer gjennom og videresendes til
  Supabase for verifisering.

6.2. **Tredjelandsoverføringer:** Supabase Inc. og Vercel Inc. har
begge morselskap i USA og kan i begrensede tilfeller (support, drift)
få tilgang til data. Overføringene er dekket av:

- **SCC** (Kommisjonens gjennomførings­avgjørelse (EU) 2021/914).
- **TIA** — se Vedlegg B.2.
- Der det er aktuelt: **Data Privacy Framework** (DPF).

6.3. Ingen annen overføring av personopplysninger til tredjeland er
godkjent uten ny skriftlig instruks fra Behandlingsansvarlig.

---

## §7. Sikkerhet

7.1. Databehandler iverksetter tekniske og organisatoriske tiltak som
sikrer et sikkerhetsnivå som er egnet i forhold til risikoen, jf.
GDPR art. 32. Tiltakene er spesifisert i **Vedlegg C**.

7.2. Databehandler gjennomfører jevnlige risikovurderinger og
oppdaterer tiltakene når risikobildet endres vesentlig.

---

## §8. Avvik, sikkerhetsbrudd og varsling

8.1. **Varslingsfrist.** Databehandler skal varsle Behandlingsansvarlig
om brudd på personopplysnings­sikkerheten **uten ugrunnet opphold** og
senest innen 24 timer etter at Databehandler fikk kjennskap til det.

8.2. **Varslingsadresser:**

| Type | Adresse |
|---|---|
| Primær, 24/7-monitorert | `security@bolynorge.no` |
| Sekundær / personvernfaglig | `personvern@gamechanging.no` |
| Behandlingsansvarliges mottaker | [kommunens dedikerte adresse, fylles inn] |

Se C.9 for detaljert eskaleringsstige.

8.3. **Varselets innhold** (i tråd med GDPR art. 33 (3)):

- Arten av bruddet.
- Hvilke kategorier og omtrentlig antall registrerte berørt.
- Hvilke kategorier og omtrentlig antall personopplysninger.
- Sannsynlige konsekvenser.
- Iverksatte eller foreslåtte tiltak.

8.4. Behandlingsansvarlig har 72-timers frist til Datatilsynet, jf.
GDPR art. 33 (1).

---

## §9. Sletting og retur ved avtaleopphør

9.1. Ved opphør av avtalen skal Databehandler, etter
Behandlingsansvarliges valg:

- (a) Slette alle personopplysninger og bekrefte slettingen
  skriftlig, eller
- (b) Returnere opplysningene i strukturert, alminnelig anvendt
  og maskinlesbart format.

9.2. Sletting skal skje innen **60 dager** etter avtaleopphør, med
mindre lov krever lengre oppbevaring.

9.3. Se **Vedlegg C.4** for løpende retensjon under avtalens
løpetid.

---

## §10. Revisjon

10.1. Behandlingsansvarlig har rett til å gjennomføre revisjon av
Databehandlers etterlevelse av denne avtalen, inkludert inspeksjoner
på stedet, jf. GDPR art. 28 (3) (h).

10.2. Databehandler gir innsyn i nødvendig dokumentasjon. For
underdatabehandlerne (Supabase, Vercel) aksepteres fremleggelse av
**SOC 2 Type II**-rapporter og ISO 27001-sertifiseringer som
tilstrekkelig bevis i første instans.

10.3. Revisjon skal varsles **minst 30 dager i forveien** og
gjennomføres med minimal forstyrrelse av ordinær drift.

---

## §11. Mislighold og erstatning

11.1. Erstatningsansvar følger av SaaS-hovedavtalen og alminnelige
erstatnings­regler, med følgende tillegg:

- Databehandler er ansvarlig for skade som skyldes behandling som er
  i strid med GDPR, jf. art. 82 (2).
- Partene er solidarisk ansvarlig overfor registrerte, men har
  regressrett mot hverandre.

---

## §12. Varighet og oppsigelse

12.1. Avtalen gjelder så lenge SaaS-hovedavtalen er i kraft.

12.2. Ved opphør av Hovedavtalen opphører automatisk også denne DBA,
med unntak av sluttbestemmelser og sletteplikter i §9.

---

## Vedlegg A — Behandlingens formål og art

### A.1 Formål

Drift av Boly-plattformen for:

1. Formidling av utleieboliger fra godkjente utleiere til kvalifiserte
   leietakere innen samme kommune.
2. Autentisering av parter via BankID (Signicat) ved inngåelse av
   leie- eller brukervilkåravtaler.
3. Administrasjon av leieavtale-signering og overtakelses-/tilbake­
   leverings­prosesser.
4. Rapportering og revisjonsspor for kommunen.
5. Trygg kommunikasjon mellom partene (chat, notifikasjoner).

### A.2 Kategorier av registrerte

- Utleiere (`homeowner`) — private eiere av utleieobjekter.
- Leietakere (`tenant`) — personer tildelt kommunal boligbistand.
- Saksbehandlere (`kommune_ansatt`) — kommunens ansatte.
- Kommune-administratorer (`kommune_admin`).
- Publikum / gjester — kun marketing-sider, ingen personopplysninger
  utover loggdata.

### A.3 Kategorier av personopplysninger

**Alle registrerte:**
- Navn, e-post, telefon.
- Rolle og tilgangsrettigheter.
- Kommuneregion (bosted / virkeområde).
- Foretrukket språk.
- Påloggingsstatistikk og audit-logger.

**Utleiere (`homeowner`):**
- Adresse og koordinater for boligen(e) de tilbyr.
- Husregler, visuelle rapporter (overtakelses-/tilbake­leverings­
  rapporter), bilder.
- **Bankkontonummer (valgfritt, kun ved `payment_method = 'konto'`):**
  Persisteres i `public.listing_invoice_basis.account_number` (én rad
  per bolig) når utleier aktivt velger kontobetaling i stedet for
  standardvalget fakturabetaling. Informasjonen beskyttes av:
  - Postgres Row-Level Security (region-scoped; migrasjon
    `20260427120000_listing_invoice_basis_region_scoped_rls.sql`).
  - Kryptering i hvile (AES-256) og i transport (TLS 1.2+).
  - Automatisk sletting 24 måneder etter siste oppdatering når
    boligen ikke lenger er aktivt formidlet (via `boly_retention_sweep()`).
  - `on delete cascade` ved sletting av boligannonsen.
- Valgfritt org.nr. dersom utleier opererer under ENK/AS.

**Leietakere (`tenant`):**
- Samme basis som «alle registrerte».
- Tilknytning til utleieobjekt etter mediering.
- Chat-meldinger og vedlegg.
- BankID-signeringslogg (transient session-id + tidsstempel; ingen
  fødselsnummer).

**Saksbehandlere / kommune-admin:**
- Samme basis som «alle registrerte».
- Kommune-interne rettighetsflagg (f.eks. `kommune_can_edit`).

### A.4 Personopplysninger som IKKE behandles

Plattformen er designet etter *data minimization by design*.
Følgende lagres **ikke**:

- Fødselsnummer, DUF-nummer eller annen nasjonal identitets­
  identifikator. Signicat `sub` er transient og persisteres aldri.
- Bankkort-PAN, CVV, eller andre betalingsinstrumentslegitimasjoner.
- Helseopplysninger (GDPR art. 9).
- Etnisitet, religion, politiske meninger, fagforenings­medlemskap
  (GDPR art. 9).
- Biometriske data (GDPR art. 9) — BankID-biometri håndteres av
  Signicat, ikke Boly.
- Opplysninger om straffbare forhold (GDPR art. 10).
- Passord i klartekst (Supabase Auth med bcrypt/argon2).

### A.5 Behandlingens varighet

Avtalens løpetid, med retensjon som spesifisert i C.4.

---

## Vedlegg B — Underdatabehandlere

### B.1 Godkjente underdatabehandlere

| Leverandør | Behandling | Lokasjon | Rettslig grunnlag |
|---|---|---|---|
| **Supabase Inc.** (Ireland Ltd. for EU-kontrakter) | Postgres-database, Auth, Storage, Edge Functions | AWS `eu-central-1` (Frankfurt, Tyskland) | SCC + DPA + TIA (B.2.2) |
| **Vercel Inc.** | Hosting av frontend og serverside-funksjoner | `arn1` (Stockholm, Sverige) — pinnet via `vercel.json`. Edge Middleware på globalt CDN, persisterer ikke | SCC + DPA + TIA (B.2.1) |
| **Mailjet SAS** | Utsending av transaksjonelle e-poster | EU (Paris, Frankrike) | Separat DPA |
| **Signicat AS** | BankID-signering og identifikasjon | Norge | Separat DPA |
| **Kartverket / Geonorge** | Offentlig adresse-oppslag (ingen personopplysninger lagres) | Norge | Offentlig tjeneste |
| **AWS (som Supabase-underleverandør)** | Hosting av Supabase-infrastruktur | `eu-central-1` | Arver SCC-ene fra Supabase |
| **Cloudflare (som Supabase-underleverandør)** | CDN foran enkelte Supabase Edge-tjenester | EU | Arver SCC-ene fra Supabase |

### B.2 Transfer Impact Assessment (TIA)

For underdatabehandlere med morselskap i tredjeland (USA) er det
utarbeidet Transfer Impact Assessment i tråd med **EDPB Recommendations
01/2020 v2.0**:

- **B.2.1 — Vercel Inc.:** `docs/legal/TIA_Vercel.md` (v1.0, 2026-04-20).
- **B.2.2 — Supabase Inc.:** `docs/legal/TIA_Supabase.md` (v1.0, 2026-04-20).

Begge TIA-er vedlegges denne avtalen og gjøres tilgjengelige for
Datatilsynet ved forespørsel. TIA-ene skal re-vurderes:

- **Årlig** (neste: 2027-04-20).
- **Ad-hoc** ved: ny rettsavgjørelse som berører overføringer til USA
  (f.eks. Schrems III, DPF-overprøving), endringer i underdata­
  behandlers infrastruktur, eller utvidelse av behandlings­grunnlaget.

Ingen annen overføring til tredjeland er godkjent uten ny skriftlig
instruks fra Behandlingsansvarlig.

---

## Vedlegg C — Tekniske og organisatoriske tiltak (TOM)

### C.1 Tilgangskontroll

- **Autentisering:** Alle brukerkontoer er passord- eller BankID-baserte.
  Passord hashes med bcrypt/argon2 (Supabase Auth-standard).
- **Autorisasjon:** Rollebasert tilgangsstyring håndhevet på to lag:
  - Applikasjonslaget (Next.js middleware + route-guards).
  - Databaselaget (Postgres Row-Level Security, RLS).
- **Region-scoping:** Kommune-staff ser kun data for boliger i egen
  region, håndhevet via `public.kommune_listing_region_ok()` i RLS.
- **Minste privilegium:** Produksjons­tilgang for Gamechanging-utviklere
  er rolle- og tidsbegrenset; service-nøkler roteres kvartalsvis.

### C.2 Tilgjengelighet

- **Backup:** Supabase PITR (Point-in-Time Recovery) innenfor
  `eu-central-1`. Daglige øyeblikksbilder + WAL-replikering.
- **RTO / RPO:** RTO < 4 timer, RPO < 24 timer.
- **Gjenopprettingsprøve:** Årlig.

### C.3 Integritet og konfidensialitet

- **Kryptering i transport:** TLS 1.2+ for alle klient-til-server-
  og server-til-server-forbindelser.
- **Kryptering i hvile:** AES-256 (Supabase + Vercel standard).
- **Særlig om finansiell PII:** Bankkontonummer lagres i krypterte
  tablespaces; aldri i server-logger eller klartekst-eksporter.

### C.4 Sletting og retensjon

| Datakategori | Slettefrist | Mekanisme |
|---|---|---|
| Brukerkontoer (leietakere) | 12 måneder etter siste aktive leieforhold | Manuell + varsling |
| Brukerkontoer (utleiere) | 12 måneder etter siste aktive kontrakt | Manuell + varsling |
| Brukerkontoer (saksbehandlere) | 30 dager etter avsluttet arbeidsforhold | Kommunen varsler |
| Chat-meldinger og vedlegg | 24 måneder | Automatisert (pg_cron, `boly-retention-daily`) |
| Notifikasjoner | 12 måneder | Automatisert (pg_cron) |
| Audit-logger | 12 måneder | Automatisert (pg_cron) |
| Bankkontonummer (`listing_invoice_basis`) | 24 måneder etter siste oppdatering når boligen ikke aktivt formidles | Automatisert (pg_cron) + `on delete cascade` |
| Handover-rapporter og -bilder (`handover_reports` + `handover-reports`-bucket) | 36 måneder etter `approved_at` / `signed_at` / `created_at` (tidligste tilgjengelige tidsstempel) | Automatisert (pg_cron, `boly_retention_sweep` — migrasjon `20260428120000`) |
| Signerte kontrakter | Inntil 10 år (arkivloven / bokførings­loven) | Kommunens ansvar |

Automatikk implementert i migrasjonene:
- `supabase/migrations/20260426120000_data_retention_cron.sql` — opprinnelig
  `boly_retention_sweep()`.
- `supabase/migrations/20260427120000_listing_invoice_basis_region_scoped_rls.sql`
  — utvider retensjonen med `listing_invoice_basis`.
- `supabase/migrations/20260428120000_handover_reports_retention.sql`
  — utvider retensjonen med 36 mnd for `handover_reports`-rader og
  `storage.objects` i `handover-reports`-bucket.

### C.5 Lokasjon

Se §6.1. Kort oppsummert:
- Supabase: AWS `eu-central-1` (Frankfurt).
- Vercel: `arn1` (Stockholm).
- Edge Middleware (JWT-sjekk): globalt edge-CDN, persisterer ikke.

### C.6 Tredjelandsvurdering

Se Vedlegg B.2. **Status: Løst** — TIA-er levert.

### C.7 Logging og overvåking

- Supabase Dashboard Logs (`eu-central-1`).
- Applikasjonslogger via `devLog` / `logError` — filtrerer
  sensitive felter (kontonummer, tokens, chat-innhold).
- Audit-logger (`public.audit_logs`) for sikkerhetshendelser og
  RETENTION_SWEEP-kjøringer.

### C.8 Opplæring

- Alle utviklere og driftpersonell hos Gamechanging har personvern-
  og sikkerhetsopplæring ved onboarding og årlig oppfriskning.
- Kommunen har ansvar for opplæring av egne saksbehandlere.

### C.9 Eskaleringsstige ved sikkerhetshendelse

1. Hendelse oppdaget → `security@bolynorge.no` (24/7 monitorert).
2. Innen 2 timer: Intern trihengsel (Gamechanging-team).
3. Innen 24 timer: Varsel til Behandlingsansvarlig (§8.2).
4. Behandlingsansvarlig vurderer art. 33 (Datatilsynet, 72 timer) og
   art. 34 (registrerte).
5. Post-mortem og tiltak dokumenteres skriftlig innen 14 dager.

---

## Vedlegg D — Andre bestemmelser

### D.1 DPIA (Personvernkonsekvensvurdering)

**Status 2026-04-20:** DPIA-utkast levert
(`docs/legal/DPIA_Boly.md`, v1.0). Utkastet er til vurdering hos
kommunens personvernombud.

**Art. 36-vurdering:** Forhåndskonsultasjon med Datatilsynet er
vurdert og foreslått **ikke påkrevd**, jf. DPIA § 5, gitt at:

- Ingen særlige kategorier (art. 9) eller straffedata (art. 10)
  behandles.
- Ingen automatiserte beslutninger med rettsvirkning (art. 22).
- Tredjelandsoverføringer er dekket av SCC + TIA.
- Restrisiko etter tiltak er klassifisert som Lav–Moderat.

DPIA-en oppdateres årlig eller ad-hoc ved vesentlig endring.

### D.2 Cookies og e-kommunikasjonsloven

**Status 2026-04-20:** Cookiebanner og cookie-policy er
**implementert i produksjon**.

- **Teknisk implementasjon:**
  - `frontend/app/components/CookieBanner.tsx`
  - `frontend/app/lib/cookieConsentStorage.ts`
  - `frontend/context/CookieConsentContext.tsx`
- **Brukervendt dokumentasjon:** https://www.bolynorge.no/personvern §4.
- **Kategorier:** Strengt nødvendige (alltid aktivt) + Statistikk
  (aktivt samtykke). Ingen markedsføringskapsler.
- **«Avvis alle»** er plassert like lett tilgjengelig som **«Godta
  alle»**, i tråd med Datatilsynets veileder og ekomlova § 2-7b.

### D.3 Registrertes rettigheter

Mekanismer, frister og ansvar er beskrevet i
`docs/legal/PRIVACY_NOTICE.md` §6 og DPIA §2.6.

### D.4 Endringer av avtalen

Endringer skal avtales skriftlig. Mindre justeringer i Vedlegg B-D
som følge av oppdateringer hos underdatabehandlere kan gjøres med
30 dagers forhåndsvarsel.

### D.5 Status-tabell og gjenstående punkter

| Punkt | Status | Ansvarlig | Referanse |
|---|---|---|---|
| Fjerne fødselsnummer fra A.3 | **Løst** (2026-04-20) | Gamechanging AS | Dette dokument |
| Region-scoping av `listing_invoice_basis` | **Løst** (2026-04-20) | Gamechanging AS | Migrasjon `20260427120000` |
| Retensjon for bankkontonummer | **Løst** (2026-04-20) | Gamechanging AS | Migrasjon `20260427120000` (`boly_retention_sweep`) |
| TIA-dokumenter for Supabase og Vercel | **Løst** (2026-04-20) | Gamechanging AS | `TIA_Supabase.md`, `TIA_Vercel.md` (v1.0) |
| Cookiebanner og cookie-policy | **Løst** | Gamechanging AS | D.2 over |
| Regioner i §6/B.1/C.5 harmonisert | **Løst** (2026-04-20) | Gamechanging AS | Dette dokument |
| Sikkerhetsadresse `security@bolynorge.no` | **Åpen** | Gamechanging AS | Mailjet + DNS-oppsett, frist før lansering |
| DPIA-utkast | **Løst** (utkast) | Gamechanging AS (teknisk) + kommunen (godkjenning) | `DPIA_Boly.md` v1.0 |
| DPIA DPO-godkjenning | **Åpen** | Kommunens DPO | Før lansering |
| DPIA inn i kommunens behandlings­protokoll | **Åpen** | Kommunen | Før lansering |
| Retensjon for handover-rapporter og -bilder | **Løst** (2026-04-20) | Gamechanging AS | Migrasjon `20260428120000_handover_reports_retention.sql` (36 mnd, pg_cron) |
| DPF-status for Supabase Inc. | **Løst** — verifisert: **ikke DPF-sertifisert**; overføring hviler på SCC + TIA-supplerende tiltak, jf. `TIA_Supabase.md` §2.2 | Gamechanging AS | Ikke noe handlingsbehov — posisjonen gjennomgås på nytt ved neste TIA-revisjon (2027-04-20) eller ved ny DPF-sertifisering |
| Gamechanging AS org.nr. | **Løst** (932 496 321, 2026-04-21) | Gamechanging AS | – |
| Kontaktpersoner og -adresser | **Åpen** | Begge parter | Ved signering |
| Kommunens sikkerhetsadresse (§8.2) | **Åpen** | Narvik kommune | Ved signering |
| SOC 2 Type II / ISO 27001-rapporter fra Supabase og Vercel | **Åpen** — innhentes | Gamechanging AS | Innen 30 dager etter signering |

---

## Signatur

| For Behandlingsansvarlig | For Databehandler |
|---|---|
| Narvik kommune | Gamechanging AS |
| Navn: _________________________ | Navn: _________________________ |
| Tittel: ________________________ | Tittel: ________________________ |
| Sted/Dato: ___________________ | Sted/Dato: ___________________ |
| Signatur: ____________________ | Signatur: ____________________ |

---

## Referanser

- **GDPR:** Forordning (EU) 2016/679, særlig art. 28, 32–36, 82.
- **Personopplysningsloven** (LOV-2018-06-15-38).
- **Ekomlova** (LOV-2003-07-04-83) § 2-7b.
- **SCC:** Kommisjonens gjennomførings­avgjørelse (EU) 2021/914.
- **EDPB Recommendations 01/2020 v2.0.**
- **Datatilsynets veileder om databehandleravtaler** (2020).
- **Vedlagte dokumenter:**
  - `docs/legal/PRIVACY_NOTICE.md` (v1.0)
  - `docs/legal/DPIA_Boly.md` (v1.0)
  - `docs/legal/TIA_Vercel.md` (v1.0)
  - `docs/legal/TIA_Supabase.md` (v1.0)
- **Vedlagte migrasjoner (RLS + retensjon):**
  - `supabase/migrations/20260423120000_kommune_region_security_hardening.sql`
  - `supabase/migrations/20260426120000_data_retention_cron.sql`
  - `supabase/migrations/20260427120000_listing_invoice_basis_region_scoped_rls.sql`
  - `supabase/migrations/20260428120000_handover_reports_retention.sql`
