# Transfer Impact Assessment — Supabase Inc.

> **Tjeneste:** Backend-plattform for Boly (Postgres-database, Auth, Storage,
> Edge Functions)
> **Databehandler:** Gamechanging AS (for Boly-plattformen)
> **Behandlingsansvarlig:** Kommunen som har aktivert Boly (f.eks. Narvik kommune)
> **Mottakerselskap:** Supabase Inc., 548 Market St PMB 44160, San Francisco,
> CA 94104, USA
> **EU-entitet:** Supabase Ireland Ltd. (Dublin) — kontraktspart i EU-avtaler
> **Produkt:** Supabase Platform (Postgres-as-a-service)
> **Sist oppdatert / Last reviewed:** 2026-04-21
> **Neste gjennomgang:** 2027-04-20 (årlig)
> **Versjon:** 1.1 — harmonisert med Supabase Inc.'s offisielle TIA (14. mars 2025);
> Singapore-overføring, utvidet underbehandler-liste og OpenAI-vurdering lagt til.

---

## Om dette dokumentet

Dette er en Transfer Impact Assessment (TIA) i tråd med **EDPB Recommendations
01/2020 v2.0** (juni 2021) og Datatilsynets veileder om overføring til
tredjeland (2022). Den følger den anbefalte seks-stegs-metodikken:

1. Kartlegg overføringene
2. Identifiser overføringsgrunnlaget
3. Vurder effektiviteten av grunnlaget i lys av lovgivningen i mottakerlandet
4. Identifiser og innfør supplerende tiltak
5. Formalisér den prosedyrale siden
6. Re-vurder med jevne mellomrom

Supabase er Bolys primære backend og holder alle applikasjonsdata. Dette
dokumentet er derfor materielt for hele tjenestens personvernvurdering.

---

## Steg 1 — Kartlegging av overføringer

### 1.1 Hvilke data overføres

| Datakategori | Sensitivitet | Lagringssted |
|---|---|---|
| Navn, e-post, telefon | PII (lav) | `eu-central-1` (Frankfurt) |
| Rolle (utleier / kommune / leietaker) | Operasjonelt | Samme |
| Kommuneregion | Operasjonelt | Samme |
| Adresse og koordinater på bolig | PII om eiendom | Samme |
| Chat-meldinger og vedlegg | PII, kan uforvarende være sensitivt | Samme |
| Husregler, overtakelsesrapporter | PII om leieforhold | Samme |
| Handover-bilder (Storage) | PII-eksponert kontekst (bolig) | `handover-reports`-bucket, Frankfurt |
| Signeringslogg (Signicat session-id) | Gyldighetsbevis | Samme |
| Audit logs og sikkerhetslogger | IT-sikkerhet | Samme |
| Passord-hash (bcrypt/argon2) | Hemmelig | `auth.users`, Frankfurt |
| Sesjonstokens (JWT) | Autentisering | Samme |

**Boly lagrer ikke** (verifisert 2026-04-20):
- Fødselsnummer / DUF-nummer (Signicat `sub` er transient, aldri persistert).
- Bank- / betalingskortinformasjon.
- Helseopplysninger.
- Etnisitet, religion, politiske meninger.
- Biometriske data.

### 1.2 Hvor ligger dataene

- **Primærdata (Postgres):** AWS `eu-central-1` (Frankfurt, Tyskland). Pinnet
  til denne regionen som del av Supabase-prosjektkonfigurasjon.
- **Auth-database:** Samme region, separat schema (`auth.*`).
- **Storage-bøtter:** Samme region. Alle tre aktive bøtter (`handover-reports`,
  `documents`, `chat-images`, `listings`).
- **Edge Functions:** Kjører ved forespørsels-nærmeste Supabase edge-node i
  EU. For kunder i EU er dette typisk Frankfurt eller Paris.
- **Automatiske backup:** Innenfor samme AWS-region (ikke kryss-regional).
- **Logg-data (Dashboard Logs + audit logs):** `eu-central-1`.
- **Supabase Dashboard (web-app brukt av Gamechanging-utviklere):** Supabase
  sitt kontrollplan (fordelt, US-basert metadata).

### 1.3 Hvem behandler

Verifisert mot Supabase Inc.'s egen offisielle TIA datert **14. mars 2025**
(`docs/legal/attachments/supabase/TIA_20250314.pdf`):

**Supabase-selskaper:**
- **Supabase Inc.** (USA) — morselskap, eier plattformen.
- **Supabase Ireland Ltd.** (EU, Dublin) — kontraktspart for EU-kunder.
- **Supabase Pte. Ltd** (Singapore, 65 Chulia Street) — APAC-kontraktspart
  og intra-konsern-prosesserer. Se §3.5 for risikovurdering av
  Singapore-overføring.

**Underbehandlere som faktisk kan prosessere Boly-data (Tier 1):**
| Underbehandler | Tjeneste for Boly | Lokasjon | DPF-sertifisert? |
|---|---|---|---|
| **AWS, Inc.** | Hosting av Postgres, Auth, Storage i `eu-central-1` | EU Frankfurt | ✅ Ja |
| **Google LLC** (BigQuery) | Lagring av Supabase Logs | US (med EU-lokal speiling) | ✅ Ja |
| **Fly.io, Inc.** | Realtime-prosessering for WebSocket-abonnementer | Globalt (EU-ruter for EU-prosjekter) | ❌ Nei (vurderer per case) |
| **Cloudflare, Inc.** | CDN/WAF foran Supabase Edge | EU/global edge | ✅ Ja |
| **Upstash, Inc.** | Serverless Redis (rate limiting) — **ikke brukt av Boly** | US | ❌ Nei (ikke relevant) |
| **Vercel, Inc.** | Applikasjons-hosting — brukes av Boly **direkte**, ikke via Supabase | Se `TIA_Vercel.md` | ✅ Ja (egen DPF) |

**Underbehandlere som IKKE prosesserer kundedata (Tier 2 — Supabase intern drift):**

Supabase bruker følgende tjenester for *eget* salg, support, analytics og
kommunikasjon — de får kun Supabase-kontaktpersoners data (Lars Utstøl,
Oskar Høgmo-Utstøl som kontoadmin), ikke Boly-sluttbrukerdata:

HubSpot (DPF ✅), Notion, Slack, Sentry (DPF ✅), Stripe (DPF ✅),
Postmark/AC PM (DPF ✅), Twilio (DPF ✅), PandaDoc, GitHub,
Salesforce/Tableau (DPF ✅), Common Room, Posthog, Plausible (EU),
ConfigCat (Ungarn), Orb, Atlassian, Clay Labs, Clazar, Front, Hex, Stape.

**OpenAI LLC — særskilt merknad:**
Supabase lister OpenAI som subprocessor for AI-funksjoner i Supabase
Studio (admin-UI, "Supabase AI"-assistent). **Verifisert 2026-04-21:**
Boly-produksjon bruker **ikke** disse AI-funksjonene — `openai_api_key`
i `supabase/config.toml` er kun aktiv i lokal CLI-dev, og
`[storage.vector.buckets.documents-openai]` er kommentert ut. Ingen
Boly-kundedata flyter til OpenAI. Dette verifiseres årlig.

### 1.4 Formålet med behandlingen

- Persistens av applikasjonsdata (relasjonsdatabase).
- Autentisering av brukere (inkl. passord-håndtering).
- Lagring av filer (bilder, PDF-er).
- Utføring av Edge Functions (auth-signicat, sign-agreement, send-notification-email,
  send-push, remind-handover-report osv.).
- Realtime-push til tilkoblede klienter.

### 1.5 Rettslig grunnlag

- GDPR art. 6 (1) b (avtale).
- GDPR art. 6 (1) c (rettslig forpliktelse, f.eks. bokføring av signering).
- GDPR art. 6 (1) f (berettiget interesse, IT-sikkerhet / audit).

---

## Steg 2 — Overføringsgrunnlag

### 2.1 Hovedgrunnlag

**Standard Contractual Clauses (SCC)** vedtatt av Europakommisjonen
**4. juni 2021** (Decision 2021/914), modul 2 (controller-to-processor).

Supabase Data Processing Agreement (DPA) inkorporerer SCC-ene direkte og
signeres med Supabase Ireland Ltd. (EU-enhet). Supabase Inc. (US-moderselskap)
er bundet via intra-group DPA.

### 2.2 Adequacy / DPF

Supabase Inc. er **ikke** sertifisert under EU-US Data Privacy Framework (DPF)
på vurderingstidspunktet (2026-04-20). DPF kan derfor ikke benyttes som
supplerende grunnlag. Hele overføringsvurderingen hviler på **SCC + supplerende
tiltak**.

### 2.3 Underbehandlere

Se full liste i §1.3. Supabase publiserer også offisielle liste på
<https://supabase.com/docs/company/terms#subprocessors> og gjeldende TIA-
snapshot på <https://supabase.com/downloads/docs/Supabase+TIA+250314.pdf>
(sist lastet ned og arkivert i
`docs/legal/attachments/supabase/TIA_20250314.pdf`).

Vår DBA Vedlegg B.1 godkjenner Supabases offisielle underbehandler-liste
ved dynamisk referanse med 30-dagers objektfrist iht. DBA §5.1 og B.3.

---

## Steg 3 — Vurdering av mottakerlandets lovverk

### 3.1 USA — problematiske overvåkingslover

Se drøfting i `TIA_Vercel.md` Steg 3.1 — samme lovverk, samme analyse
(FISA 702, EO 12333, CLOUD Act, EO 14086). Oppsummering:

- **CLOUD Act:** Rammer Supabase Inc. direkte som amerikansk selskap.
  Gjelder uavhengig av at dataen ligger i Frankfurt.
- **FISA 702:** Kan potensielt ramme Supabase som «electronic communication
  service provider», men praksis tilsier at dette primært rettes mot store
  telekom- og meldingstjenester.
- **EO 12333:** Metadata i transitt mellom EU og US (f.eks. support-sesjoner,
  administrativ tilgang fra Supabase-ansatte i US).

### 3.2 Schrems II-vurdering

Se `TIA_Vercel.md` Steg 3.2. Relevant her: data i Boly omfatter ikke særlige
kategorier etter GDPR art. 9, men konteksten (boligsosial formidling til
personer som trenger kommunal bistand) kan gjøre selv nøytrale data
*kontekstuelt sensitive*. Dette gir grunn til ekstra forsiktighet — ikke
minst fordi chat-meldinger kan uforvarende inneholde helse- eller
sosialopplysninger selv om plattformen ikke oppfordrer til det.

### 3.3 CLOUD Act — praktisk risiko

Som for Vercel er Supabase Inc. underlagt CLOUD Act. Forskjellen er at
Supabase holder *hele applikasjonsdatabasen* — det er ikke bare transient
prosessering. En teoretisk US-myndighetsforespørsel kunne kreve utlevering
av hele Boly-databasen.

**Vurdering for Boly:**

- Trusselmodell: Lav. Ingen klassifiserte data, ingen US-etterretnings-mål.
- Dataens natur: Kommunal boligformidling. Kontekstuelt sensitiv, men ikke
  en prioritet for US-overvåking.
- Praktisk: AWS `eu-central-1` er fysisk i Tyskland, driftet av AWS EMEA.
  Fysisk tilgang fra US-gov krever kooperasjon fra Supabase Inc. eller
  kryptografisk angrep.

### 3.4 Praksis fra Supabase

- Supabase publiserer en **Trust Center** (`https://trust.supabase.com`)
  med SOC 2 Type II, ISO 27001 og HIPAA-dokumentasjon.
- Supabase forplikter seg til å varsle kunder om myndighetsforespørsler
  der det er lovlig.
- Supabase **publiserer ikke** egen årlig Transparency Report, men
  bekrefter eksplisitt i sin offisielle TIA (14. mars 2025, side 13) at
  selskapet **ikke har utlevert** kunde- eller partner-personopplysninger
  til myndigheter under FISA 702, EO 12333 eller andre rettsgrunnlag.

### 3.5 Singapore — sekundært tredjeland

Supabase Pte. Ltd (Singapore) eksisterer som intra-konsern-enhet og kan
i teorien motta Boly-data som del av support- eller administrative
operasjoner. Supabase Inc.'s offisielle TIA identifiserer Singapore som
et mulig destinasjonsland for kundedata.

**Vurdering for Boly:**

| Risikodimensjon | Vurdering |
|---|---|
| Aktiv dataflyt i dag | **Ingen verifisert** — Boly-prosjektet er pinnet til `eu-central-1` og all support håndteres av Supabase Ireland Ltd. |
| Singapore-lover (CPC, TA, OSA, PCA, FICA) | Gir myndigheter bred tilgang til data ved rettskjennelse, men krever typisk spesifikk etterforskning — ikke masseinnsamling |
| Personal Data Protection Act (PDPA) | Gir registrerte individuelle rettigheter tilsvarende GDPR, men gjelder **ikke** offentlige myndigheter |
| Oversight | Personal Data Protection Commission (PDPC) + domstoler + appell-panel |
| Samlet Schrems II-risiko | **Lav** — sammenlignbar med USA, og ingen faktisk dataflyt identifisert |

**Tiltak:**
- Kontinuerlig verifikasjon av at Supabase-prosjektet forblir pinnet til
  `eu-central-1` (automatisk kontroll i årlig audit).
- Dersom Supabase *initierer* intra-konsern-flyt til Singapore, krever
  Gamechanging skriftlig forhåndsvarsel iht. DBA §5.1 (30 dagers objektfrist).
- Dekkes uansett av samme SCC 2021/914 modul 2 som US-overføringen.

---

## Steg 4 — Supplerende tiltak

### 4.1 Tekniske tiltak

| Tiltak | Effekt | Implementert |
|---|---|---|
| Region `eu-central-1` (Frankfurt) | All persistent data i EU | ✅ Supabase-prosjektkonfigurasjon |
| Kryptering i ro (AES-256) | Data på disk kan ikke leses uten nøkler | ✅ AWS EBS + Supabase standard |
| TLS 1.2+ for all klient- og admin-trafikk | Beskytter data i transitt | ✅ Plattformstandard |
| Row Level Security (RLS) | Fingranulert tilgangskontroll per tabell | ✅ Alle brukerdata-tabeller |
| RLS InitPlan-caching (`(select auth.uid())`) | Ytelse + reduserer feiltilganger ved rask opprettelse | ✅ Migrasjon 20260425120000 |
| Passord-hashing (bcrypt/argon2) | Passord kan ikke utledes fra dump | ✅ Supabase Auth standard |
| Signering av JWT | Sesjonstokens kan ikke forfalskes | ✅ HMAC-signatur per prosjekt |
| Separate storage-bøtter med RLS | Filer isolert per bruker/rolle | ✅ `handover-reports`, `documents`, etc. |
| Daglig automatisk backup | Gjenoppretting ved tap | ✅ AWS-region-intern |
| Rate limiting på signering | 3 forsøk per konto per døgn | ✅ `sign-agreement` Edge Function |
| Audit logging | Alle viktige handlinger spores | ✅ `public.audit_logs` |
| Automatisk retention (cron) | Data slettes etter fastsatt frist | ✅ Migrasjon 20260426120000 |
| Ingen fødselsnummer-lagring | Kritisk minimering | ✅ Verifisert 2026-04-20 |

### 4.2 Organisatoriske tiltak

| Tiltak | Effekt |
|---|---|
| Rollebasert tilgang til Supabase Dashboard | Kun navngitte utviklere har admin-tilgang |
| 2FA for alle dashboard-kontoer | Forhindrer kontoovertakelse |
| Månedlig gjennomgang av Supabase audit-logs | Oppdager unormal tilgang |
| Årlig gjennomgang av SOC 2-rapport fra Supabase | Verifiserer kontinuerlige kontroller |
| Rutine for håndtering av myndighetsforespørsler | Sikrer varsling der lovlig |
| Opplæring: «Ingen sensitiv info i chat» | Reduserer inadvertent art. 9-data |
| Vedlagt DPA med SCC 2021/914 modul 2 | Formaliserer forpliktelser |

### 4.3 Kontraktuelle tiltak

- Supabase DPA (vedlagt databehandleravtalen som Vedlegg B.3) inkluderer:
  - SCC 2021/914 modul 2 (controller-to-processor).
  - Varslingsplikt ved myndighetsforespørsler der lovlig.
  - Plikt til å utfordre ulovlige forespørsler.
  - Sletteplikt ved avtaleavslutning (innen 30 dager).
  - Revisjonsrett: årlig SOC 2-rapport + ad-hoc revisjonsanmodning.
  - Underleverandør-varsling med 30 dagers oppsigelsesrett.

### 4.4 Vurdering av tiltakenes effektivitet

- **Mot passiv avlytting:** TLS + kryptering i ro eliminerer praktisk risiko.
- **Mot CLOUD Act:** Tiltakene *reduserer* risikoen, men eliminerer den ikke.
  En US-myndighetsforespørsel kunne teoretisk kreve utlevering.
- **Mot inadvertent eksponering:** RLS + audit + minimering (ingen
  fødselsnummer) reduserer skadevirkning ved eventuelt brudd.

**Konklusjon Steg 4:** Restrisikoen vurderes som **lav til moderat**.
Tiltakene er sterkere enn for Vercel fordi Supabase holder persistent data
og dermed krever mer robuste kompenserende tiltak — som er innført.

---

## Steg 5 — Formalisering

### 5.1 Dokumentasjon

- Dette TIA-dokumentet vedlegges databehandleravtalen som Vedlegg B.4.
- Supabase DPA med SCC vedlegges som Vedlegg B.3.
- `docs/legal/PRIVACY_NOTICE.md` (og publisert `/personvern`) omtaler
  Supabase som underleverandør eksplisitt.

### 5.2 Ansvar

- **Behandlingsansvarlig (kommunen):** Godkjenner TIA, signerer DBA.
- **Databehandler (Gamechanging):** Opprettholder dokumentasjonen,
  overvåker Supabase-varsler, gjennomfører årlig re-vurdering.
- **Underleverandør (Supabase):** Etterlever SCC + DPA, varsler om
  myndighetsforespørsler og infrastrukturendringer.

### 5.3 Prosedyre ved brudd

- Supabase skal varsle Gamechanging **uten ugrunnet opphold**; DPA sier
  innen 72 timer.
- Gamechanging krever i sin egen DBA at **Supabase-varsler videreformidles
  til kommunen innen 24 timer** etter mottak.
- Kommunen har 72-timers frist til Datatilsynet (GDPR art. 33).
- For brudd som berører leietakere / utleiere direkte skal de varsles etter
  GDPR art. 34 uten ugrunnet opphold.

### 5.4 Sletting ved avtaleavslutning

Hvis kommunen sier opp avtalen med Gamechanging, gjelder følgende:

- Gamechanging eksporterer kommunens data i strukturert format (SQL dump +
  Storage-ZIP) og leverer til kommunen innen 30 dager.
- Gamechanging initierer sletting i Supabase innen ytterligere 30 dager.
- Supabase sletter dataen innen deres egne interne frister (typisk 30 dager
  etter oppsigelse av Supabase-prosjektet).
- Skriftlig slette-bekreftelse fra Supabase innhentes og oppbevares.

---

## Steg 6 — Re-vurdering

### 6.1 Plan for re-vurdering

- **Årlig:** Full gjennomgang (neste: 2027-04-20).
- **Ad-hoc:** Umiddelbart ved:
  - Ny rettsavgjørelse (Schrems III, DPF 2.0).
  - Endringer i Supabase-prosjektkonfigurasjon (ny region, skalering).
  - Ny underleverandør hos Supabase (nytt CDN, ny database-tilbyder).
  - Endringer i US-lovgivning.
  - Ny behandling introdusert i Boly (f.eks. AI-indeksering, retargeting,
    eksport til BI-verktøy).

### 6.2 Triggerpunkter for alternativ leverandør

Dersom en av følgende inntreffer, vurder alternativ EU-leverandør:

- DPF ugyldiggjort **og** Supabase mister SCC-adekvans.
- Supabase mottar og ikke kan utfordre en US-myndighetsforespørsel som
  berører Boly-data.
- Supabase skifter til US-primær region uten EU-opt-out.
- Kritisk sårbarhet i Supabase-plattformen som ikke fikses innen SLA.

Aktuelle EU-alternativer kartlagt i `docs/legal/VENDOR_ALTERNATIVES.md`
(self-hosted Postgres på Hetzner, Neon EU, Nhost EU).

---

## Vedlegg A — Referanser

- **GDPR:** Forordning (EU) 2016/679.
- **SCC:** Kommisjonens gjennomføringsavgjørelse (EU) 2021/914.
- **CJEU Schrems II:** Sak C-311/18 (16. juli 2020).
- **EDPB Recommendations 01/2020 v2.0** om supplerende tiltak.
- **EDPB Recommendations 02/2020** om European Essential Guarantees.
- **Datatilsynets veileder** om overføring til tredjeland (2022).
- **EO 14086 (2022).**
- **Supabase DPA:** https://supabase.com/legal/dpa
- **Supabase offisielle TIA** (14. mars 2025) — arkivert:
  `docs/legal/attachments/supabase/TIA_20250314.pdf`
- **Supabase Subprocessors:** https://supabase.com/docs/company/terms#subprocessors
- **Supabase Trust Center:** https://trust.supabase.com
- **Supabase SOC 2 Type II-rapport** (forespørres via Trust Center — se
  også dokumentasjonskjede-drøfting i `docs/legal/attachments/README.md`).

---

## Vedlegg B — Endringslogg

| Dato | Versjon | Endring | Ansvarlig |
|---|---|---|---|
| 2026-04-20 | 1.0 | Første utkast opprettet | Gamechanging AS |
| 2026-04-21 | 1.1 | Harmonisert med Supabase Inc.'s offisielle TIA (14. mars 2025): Supabase Pte. Ltd (Singapore) og sekundær-tredjelandsvurdering §3.5; utvidet Tier 1/Tier 2 underbehandler-oversikt inkl. DPF-status; OpenAI-verifikasjon (ikke aktiv i produksjon); presisert at Supabase ikke publiserer årlig Transparency Report, men bekrefter null myndighetsutleveringer i sin TIA | Gamechanging AS |
