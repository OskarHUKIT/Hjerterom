# Transfer Impact Assessment — Vercel Inc.

> **Tjeneste:** Hosting av Next.js-frontend og Serverless/Edge-funksjoner for Boly
> **Databehandler:** Gamechanging AS (for Boly-plattformen)
> **Behandlingsansvarlig:** Kommunen som har aktivert Boly (f.eks. Narvik kommune)
> **Mottakerselskap:** Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA
> **EU-entitet:** Vercel Netherlands B.V. (Amsterdam) — kontraktspart i EU-avtaler
> **Produkt:** Vercel Platform (Next.js hosting)
> **Sist oppdatert / Last reviewed:** 2026-04-21
> **Neste gjennomgang:** 2027-04-20 (årlig)
> **Versjon:** 1.1 — harmonisert med Vercel Inc.'s DPA (virkedato 31. mars 2026,
> sist oppdatert 17. mars 2026); Pro-plan-bekreftelse, Service-Generated Data
> som Controller-rolle, og 5-dagers subprocessor-varslingsfrist lagt til.

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

Dokumentet er et arbeidsdokument og skal gjennomgås av DPO / juridisk
rådgiver før det vedlegges databehandleravtalen.

---

## Steg 1 — Kartlegging av overføringer

### 1.1 Hvilke data overføres

| Datakategori | Sensitivitet | Overført til edge? | Overført til US? |
|---|---|---|---|
| Sesjonscookie (Supabase JWT) | Indirekte personlig (sesjon) | Ja (transient) | Kun hvis bruker befinner seg i US-område |
| IP-adresse (som en del av forespørselen) | Personlig | Ja (transient ved edge) | Kun hvis bruker fysisk er i US |
| URL-sti + query-parametre | Varierer | Ja (transient) | Samme |
| User-Agent / request headers | Teknisk | Ja (transient) | Samme |
| HTTP-body (innsendte skjema, f.eks. annonser) | Inneholder PII | Nei — kun via `arn1`-regionen | Nei |
| Databaseinnhold | — | Nei — ligger i Supabase | Nei |
| Loggdata (Runtime Logs) | Metadata | Lagres innenfor region | Nei |

### 1.2 Hvor ligger dataene

- **Serverless Functions / Route Handlers / RSC / Server Actions:** Pinnet til
  Vercel-region `arn1` (Stockholm, Sverige) via `vercel.json`. Verifisert i
  produksjon via `x-vercel-id: arn1::*`-header.
- **Edge Middleware:** Kjører på Vercels globalt distribuerte edge-CDN.
  Ingen lagring, kun transient prosessering av forespørsel-headere og cookies
  for å avgjøre om forespørselen skal rutes eller redirectes.
- **Statiske assets (`/_next/static/**`, bilder):** Serveres fra Vercels
  globale CDN. Inneholder ikke personopplysninger.
- **Build artifacts:** Lagres i Vercels kontrollplan (US).
- **Runtime Logs:** Lagres i samme region som funksjonen (Stockholm). Kan
  eksporteres til 3.parts logg-tjeneste kun ved eksplisitt konfigurasjon.

### 1.3 Hvem behandler

- **Vercel Inc.** (USA, Delaware reg. 5857312, 440 N Barranca Ave #4133,
  Covina, CA 91723) — morselskap og primær avtalepart iht. DPA.
- **Vercel Netherlands B.V.** (EU) — mulig kontraktspart for EU-kunder
  (ikke benyttet for Boly p.t.; Gamechanging inngår DPA direkte med
  Vercel Inc.).
- **AWS, Microsoft Azure, Google Cloud Platform** (som Vercel-
  underleverandører) — Vercels infrastruktur kjører på alle tre;
  Boly-funksjoner pinnes til AWS `arn1` (Stockholm).

**Rolleseparasjon iht. Vercel DPA §4:**

| Datatype | Vercel-rolle |
|---|---|
| **Customer Data** (forespørsler, HTTP-body, sesjonscookies, bilder som passerer funksjoner) | **Processor** — prosesseres utelukkende iht. Gamechanging's dokumenterte instrukser |
| **Service-Generated Data** (bruksmetrikker, feiloggers, usage-analytics) | **Controller** — Vercel bruker dette for drift/forbedring/marketing-meldinger |
| **Contact Data** (kontoeier, faktura, support-henvendelser) | **Controller** — Vercels egen Privacy Notice gjelder |

For Boly er dette relevant fordi Vercel som Controller har *selvstendig*
GDPR-ansvar for Service-Generated Data. Vi har imidlertid ingen realistisk
kontroll over dette utover å minimere PII som havner i logger (allerede
håndtert — ingen PII-logging i Boly-koden).

### 1.4 Formålet med behandlingen

- Hosting og servering av applikasjonen (Next.js-rendering).
- Utføring av middleware-logikk (auth-sjekk).
- Utføring av Route Handlers (server-side API-kall).
- CDN-distribusjon av statiske ressurser.

### 1.5 Rettslig grunnlag for behandling

- GDPR art. 6 (1) b (avtale med registrert).
- GDPR art. 6 (1) f (berettiget interesse, for IT-sikkerhet og drift).

---

## Steg 2 — Overføringsgrunnlag

### 2.1 Hovedgrunnlag

**Standard Contractual Clauses (SCC)** vedtatt av Europakommisjonen
**4. juni 2021** (Decision 2021/914). Vercels DPA (Schedule 3 §3)
aktiverer alle tre moduler avhengig av scenario:

- **Modul 1** (controller-to-controller) — for Service-Generated Data
  og Contact Data hvor Vercel er Controller.
- **Modul 2** (controller-to-processor) — for Customer Data hvor
  Gamechanging er Controller.
- **Modul 3** (processor-to-processor) — for Customer Data hvor
  kommunen er Controller og Gamechanging er Processor (dette er Boly-
  scenarioet på andre nivå).

SCC-ene styres av **irsk lov** (Clause 17) og tvister løses ved
**irske domstoler** (Clause 18). Vercel DPA gjelder **kun for Enterprise-
og Pro-planer** — verifisert 2026-04-21 at Boly kjører på **Pro-plan**
(se `docs/gdpr/COMPLIANCE_MASTER.md` §4 og
`docs/gdpr/STAKEHOLDER_QUESTIONNAIRE.md` spm. 36).

**UK IDTA** (International Data Transfer Addendum, Schedule 5) er også
inkorporert for eventuelle UK-overføringer — ikke aktuelt for Boly, men
sikrer fleksibilitet ved fremtidig ekspansjon.

### 2.2 Supplerende grunnlag

- **EU-US Data Privacy Framework (DPF):** Vercel Inc. er sertifisert under
  DPF (fra juli 2023). Dette kan fungere som overføringsgrunnlag for
  *visse* US-baserte behandlingsaktiviteter, men dekker **ikke**
  edge-prosessering utenfor USA.
- **GDPR art. 49 unntak:** Ikke benyttet — overføringen er ikke
  leilighetsvis eller strengt nødvendig for avtale.

### 2.3 Hvilket grunnlag er operativt her

For Boly er det **SCC + supplerende tiltak (Steg 4)** som er operativt
grunnlag. DPF benyttes supplerende for Vercel Inc.'s kontrollplan-
operasjoner i USA (build-logger, konto-metadata). Edge-prosessering
dekkes kun av SCC.

---

## Steg 3 — Vurdering av mottakerlandets lovverk

### 3.1 USA — problematiske overvåkingslover

| Lov / EO | Rekkevidde | Relevans for Boly |
|---|---|---|
| **FISA 702** | Elektronisk overvåking av ikke-US-personer utenfor USA for «foreign intelligence» | Kan teoretisk ramme Vercel hvis de klassifiseres som «electronic communication service provider» |
| **Executive Order 12333** | Utenlandsetterretning, inkl. under-kabel-avlytting | Metadata i transitt kan rammes |
| **CLOUD Act (2018)** | Pålegger US-selskaper å utlevere data uansett hvor de lagres | Rammer Vercel Inc. direkte som amerikansk selskap |
| **Executive Order 14086 (2022) + DPF** | Begrenser «bulk»-innsamling, innfører Data Protection Review Court | Reduserer — men eliminerer ikke — FISA 702-risiko |

### 3.2 Schrems II-vurdering

CJEU-dom C-311/18 (16. juli 2020) slo fast at FISA 702 + EO 12333 utgjør en
overvåkingsrisiko som amerikanske selskaper kan være underlagt. Selv med
SCC må databehandler og behandlingsansvarlig vurdere om kompenserende
tiltak er tilstrekkelige.

EO 14086 + DPF (etablert 2023) adresserer noen av kritikkpunktene fra
Schrems II, men det er ikke endelig avgjort at disse oppfyller GDPR-kravene.
Schrems III er under behandling.

### 3.3 CLOUD Act — praktisk risiko

CLOUD Act gir amerikanske føderale myndigheter adgang til å kreve data fra
amerikanske selskaper, også data som er lagret i EU. Vercel Inc. som
amerikansk selskap er direkte underlagt loven. Dette gjelder **uavhengig
av regionvalg** (`arn1` vs `fra1` vs hvor som helst).

**Vurdering for Boly:**
- Trusselmodell: Lav. Boly inneholder ingen klassifiserte data, ingen data
  av særlig interesse for US-etterretning, og ingen US-borgere som er mål
  for US-etterforskning.
- Dataen som finnes er: kommunale utleiesamarbeid for personer med behov for
  bolig — en kontekst som likevel kan være sensitiv (sårbare grupper).
- Risikoen er ikke null, men sannsynlighet for målrettet US-etterretning
  mot en norsk kommunal boligformidlingstjeneste vurderes som svært lav.

### 3.4 Praksis fra Vercel

Vercel publiserer halvårig en **Transparency Report** som dokumenterer antall
myndighetsforespørsler de har mottatt. Per siste rapport (H2 2025, utgitt
januar 2026) har ikke Vercel mottatt noen National Security Letters eller
FISA-forespørsler som berører kunder i EU-region.

Vercel forplikter seg til å utfordre overvåkingsforespørsler rettslig der
det er mulig, og til å varsle kunder om myndighetsforespørsler med mindre
lovlig gag-order forhindrer det.

---

## Steg 4 — Supplerende tiltak

### 4.1 Tekniske tiltak

| Tiltak | Effekt | Implementert |
|---|---|---|
| Region-pinning til `arn1` (Stockholm) | Alle kjente serverside-kjøringer holder seg innenfor EU | ✅ `vercel.json` |
| TLS 1.2+ for all trafikk | Beskytter data i transitt mot passiv avlytting | ✅ Vercel standard |
| HTTP Strict Transport Security (HSTS) | Tvinger TLS, blokkerer nedgradering | ✅ Next.js standard |
| Smal middleware-matcher | Kun `/homeowner/**`, `/nav/**`, `/documents/**` — ikke offentlige ruter | ✅ `frontend/middleware.ts` |
| Ingen persistent PII-lagring på edge | Edge prosesserer kun cookies/headers transient | ✅ Arkitektur |
| Kryptering i ro | Vercel krypterer alle persistente data med AES-256 | ✅ Vercel-plattformstandard |
| Ingen tredjeparts-analytics-skript | Ingen trackere som kan lekke PII til USA | ✅ Arkitektur |
| Cookies: SameSite=Lax + Secure + HttpOnly | Begrenser eksponering av sesjonstokens | ✅ Supabase SSR standard |

### 4.2 Organisatoriske tiltak

| Tiltak | Effekt |
|---|---|
| Rollebasert tilgang internt i Gamechanging | Begrenser antall personer som kan hente data fra Vercel |
| Dokumentert rutine for håndtering av myndighetsforespørsler | Sikrer at informasjon gis behandlingsansvarlig der lovlig mulig |
| Årlig gjennomgang av Vercels Transparency Report | Oppdager eventuelle US-myndighetsforespørsler |
| Opplæring av utviklere i dataminimering | Reduserer mengden PII som overhodet havner på Vercel |
| Vedlagt DPA med SCC 2021/914 modul 2 | Formaliserer leverandørens forpliktelser |

### 4.3 Kontraktuelle tiltak

- Vercel DPA (sist oppdatert **17. mars 2026**, virkedato **31. mars 2026**,
  arkivert: `docs/legal/attachments/vercel/DPA_20260317.pdf`) inkluderer:
  - **SCC 2021/914** — moduler 1, 2 og 3 aktivert (se §2.1).
  - **UK IDTA** for eventuelle UK-overføringer.
  - Plikt for Vercel til å varsle om Security Incidents uten ugrunnet
    opphold (DPA §8.c).
  - Plikt til å videresende forespørsler fra registrerte til Gamechanging
    (DPA §11).
  - Plikt til å slette Customer Data ved avslutning (DPA §12).
  - **Audit-rett dekkes av SOC 2 Type 2 Audit Report** (DPA §9.b) — ikke
    selvstendig on-site inspeksjonsrett. Dette er iht. GDPR art. 28(3)(h)
    og samsvarer med vår DBA §10.3.
  - **Underbehandler-varslingsfrist: 5 kalenderdager** (DPA §7.c) — dette
    er **kortere** enn vår egen DBA §5.1 (30 dager til kommunen).
    Gamechanging håndterer denne differansen ved å videresende Vercel-
    varsler til kommunen umiddelbart og deretter holde åpen en 30-dagers
    intern vurderingsperiode før eventuell DBA-opphør iverksettes.
  - **GDPR-bøter**: Hver part bærer egne bøter (DPA Schedule 4 §2.c).
    Narvik kommune kan ikke kreve refusjon fra Vercel for bøter kommunen
    ilegges pga. Vercel-brudd — men kan kreve det fra Gamechanging iht.
    vår DBA §11.

### 4.4 Vurdering av tiltakenes effektivitet

Tiltakene over eliminerer ikke CLOUD Act-risikoen fullstendig, men de:

- Reduserer volumet og sensitiviteten av data som faktisk havner i US-
  kontrollerte systemer (tilnærmet null for ordinær drift).
- Gjør tilgang til data i ro uten gyldig nøkkel praktisk umulig.
- Sikrer at eventuelle forespørsler blir oppdaget og dokumentert.

**Konklusjon Steg 4:** Med disse tiltakene vurderes restrisikoen som
**lav til moderat** og innenfor det Datatilsynet (jf. veileder 2022) anser
som akseptabelt for en kommunal tjeneste uten særlige kategorier av
personopplysninger.

---

## Steg 5 — Formalisering

### 5.1 Dokumentasjon

- Dette TIA-dokumentet vedlegges databehandleravtalen som Vedlegg B.2.
- Vercel DPA med SCC vedlegges som Vedlegg B.1.
- Oppdatert personvernerklæring for sluttbrukerne: se `docs/legal/PRIVACY_NOTICE.md`
  og publisert versjon på `https://www.bolynorge.no/personvern`.

### 5.2 Ansvar

- **Behandlingsansvarlig (kommunen):** Godkjenner TIA-en, signerer DBA.
- **Databehandler (Gamechanging):** Opprettholder dokumentasjonen, varsler om
  endringer, gjennomfører årlig re-vurdering.
- **Underleverandør (Vercel):** Etterlever SCC + DPA, publiserer Transparency
  Report.

### 5.3 Prosedyre ved brudd

- Vercel skal varsle Gamechanging **uten ugrunnet opphold** og senest innen
  24 timer ved mistanke om brudd.
- Gamechanging skal varsle kommunen innen ytterligere 24 timer.
- Kommunen har lovpålagt frist på 72 timer til Datatilsynet (GDPR art. 33).

---

## Steg 6 — Re-vurdering

### 6.1 Plan for re-vurdering

- **Årlig:** Full gjennomgang av TIA-en (neste: 2027-04-20).
- **Ad-hoc:** Umiddelbart ved:
  - Ny rettsavgjørelse som berører US-overføringer (Schrems III e.l.).
  - Endringer i Vercels infrastruktur (ny region, eierskapsendring).
  - Endringer i US-lovgivning (ny FISA-oppdatering, endringer i EO 14086).
  - Bytte av underleverandør (bytte fra AWS til annen tilbyder).
  - Utvidelse av Boly-tjenesten til nye databehandlinger (f.eks. retargeting,
    AI-tjenester).

### 6.2 Triggerpunkter for alternativ leverandør

Dersom en av følgende inntreffer skal alternativ EU-leverandør vurderes:

- DPF blir ugyldiggjort av CJEU (Schrems III).
- Vercel mottar en materiell US-myndighetsforespørsel som berører
  EU-kunder.
- Kritisk svakhet oppdaget i Vercels sikkerhetskontroller.

Aktuelle EU-alternativer er kartlagt i `docs/legal/VENDOR_ALTERNATIVES.md`
(Hetzner + Caddy, Scaleway, OVH).

---

## Vedlegg A — Referanser

- **GDPR:** Forordning (EU) 2016/679, særlig kap. V (art. 44–49).
- **SCC:** Kommisjonens gjennomføringsavgjørelse (EU) 2021/914.
- **CJEU Schrems II:** Sak C-311/18 (16. juli 2020).
- **EDPB Recommendations 01/2020 v2.0** om supplerende tiltak (juni 2021).
- **EDPB Recommendations 02/2020** om European Essential Guarantees.
- **Datatilsynets veileder** om overføring til tredjeland (norsk versjon, 2022).
- **EO 14086 (2022)** — Enhancing Safeguards for United States Signals
  Intelligence Activities.
- **EU-US Data Privacy Framework Adequacy Decision** — Kommisjonens
  avgjørelse 10. juli 2023.
- **Vercel DPA** (17. mars 2026): https://vercel.com/legal/dpa — arkivert:
  `docs/legal/attachments/vercel/DPA_20260317.pdf`
- **Vercel Subprocessors List:** https://security.vercel.com (lenket fra
  DPA §7.b).
- **Vercel Trust Center / Security:** https://security.vercel.com — tilgang
  til SOC 2 Type 2 Audit Report under NDA.
- **Vercel Transparency Report:** https://vercel.com/transparency.

---

## Vedlegg B — Endringslogg

| Dato | Versjon | Endring | Ansvarlig |
|---|---|---|---|
| 2026-04-20 | 1.0 | Første utkast opprettet | Gamechanging AS |
| 2026-04-21 | 1.1 | Harmonisert med Vercel DPA v17. mars 2026: bekreftet Pro-plan-dekning, SCC modul 1/2/3 (ikke bare 2), Service-Generated Data som Controller-rolle, 5-dagers subprocessor-varslingsfrist, SOC 2 Type 2 som audit-mekanisme, GDPR-bøte-ansvar | Gamechanging AS |
