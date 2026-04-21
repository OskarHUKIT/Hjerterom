# Personvernkonsekvensvurdering (DPIA) — Boly

> **Tjeneste:** Boly — plattform for sosial boligformidling (bolynorge.no)
> **Databehandler:** Gamechanging AS (org.nr. [FYLL INN])
> **Behandlingsansvarlig:** Kommunen som har aktivert Boly (pilot: Narvik
> kommune, org.nr. 959 469 059)
> **Rettslig ramme:** GDPR art. 35 og 36, personopplysningsloven §§ 17–18,
> Datatilsynets DPIA-mal (2019, oppdatert 2023)
> **Sist oppdatert / Last reviewed:** 2026-04-20
> **Neste gjennomgang:** 2027-04-20 (årlig) eller ad-hoc ved vesentlig endring
> **Versjon:** 1.0 — utkast til vurdering av kommunens personvernombud (DPO)

---

## Om dette dokumentet

Dette er en Personvernkonsekvensvurdering (Data Protection Impact
Assessment, DPIA) etter **GDPR art. 35**. Vurderingen dekker pkt.
35 (7) (a)–(d):

1. **(a)** Systematisk beskrivelse av behandlingen og formålet
2. **(b)** Nødvendighet og proporsjonalitet
3. **(c)** Risiko for de registrertes rettigheter og friheter
4. **(d)** Tiltak som håndterer risikoene

DPIA-en skal godkjennes av Behandlingsansvarlig (kommunen) før lansering
i henhold til DBA § 7.2 og Vedlegg D.1. Databehandler (Gamechanging AS)
leverer teknisk grunnlag; personvernombudet til kommunen er rådgiver.

### Hvorfor DPIA er påkrevd

Behandlingen treffer flere av kriteriene i **EDPB WP 248 (rev. 01)** og
Datatilsynets egen DPIA-liste:

| Kriterium | Treff | Begrunnelse |
|---|---|---|
| Sårbare registrerte | **Ja** | Kommunale boligsøkere, ofte i en vanskelig livssituasjon |
| Systematisk overvåking av offentlig område | Nei | — |
| Storskala | **Delvis** | Skalerer fra pilotkommune til nasjonalt nivå |
| Kombinere datasett | **Ja** | Offentlig myndighet + private utleiere + BankID |
| Blokkere utøvelse av rettighet / tjeneste | **Ja** | Uten Boly vanskeligere tilgang til kommunal boligbistand |
| Innovativ teknologi | Nei | Standard web-stack |
| Automatiserte beslutninger med rettsvirkning | Nei | Ingen ADM i dag |
| Særlige kategorier (art. 9) | Nei | **Designet for ikke å lagre** |
| Biometri | Nei | BankID utføres av Signicat; Boly lagrer ikke biometri |

**Konklusjon:** To eller flere treffere ⇒ DPIA obligatorisk.

---

## Del 1 — Systematisk beskrivelse av behandlingen (art. 35 (7) (a))

### 1.1 Formål og kontekst

Boly er en digital mellom­ledd-tjeneste som hjelper kommuner med å
formidle kontakt mellom **private utleiere** og **personer med behov
for kommunal boligbistand**. Tjenesten er designet for å redusere
tiden en saksbehandler bruker på å finne egnet bolig, og gi
leietakeren et verdig, digitalt inngangspunkt til tilbud som tidligere
krevde telefonkøer og personlig oppmøte.

**Hovedformål (i prioritert rekkefølge):**

1. Formidle utleieboliger fra godkjente utleiere til kvalifiserte
   leietakere innen samme kommune.
2. Autentisere parter via BankID (Signicat) ved inngåelse av leie-
   eller brukervilkåravtaler.
3. Administrere leieavtale-signering og overtakelses-/tilbakelevering­
   sprosesser.
4. Gi kommunen revisjonsspor og rapportering.
5. Gi alle parter en trygg kanal for kommunikasjon (chat) og
   dokumentdeling.

**Formål som eksplisitt IKKE er dekket:**

- Markedsføring eller re-targeting.
- Profilering / automatiserte beslutninger med rettsvirkning.
- Videresalg eller lisensiering av data til tredjeparter.
- Statistikk som kan reidentifisere enkeltpersoner.

### 1.2 Behandlingsflyter (primære user journeys)

1. **Registrering (utleier):** Bruker oppretter konto → bekrefter e-post
   → fyller ut utleier-profil → kommunen godkjenner manuelt → utleier
   kan publisere annonse.
2. **Registrering (leietaker):** Saksbehandler oppretter konto eller
   bruker registrerer seg etter invitasjon → BankID (valgfritt ved
   leietakerstart; obligatorisk ved signering) → knyttes til kommune­
   region.
3. **Annonsering:** Utleier publiserer annonse, låst til egen
   kommuneregion.
4. **Matching:** Saksbehandler ser kun annonser i sin egen region.
5. **Signering:** Signicat BankID-flyt → Boly lagrer kun signerings­
   bevis (session-id + tidsstempel), aldri fødselsnummer.
6. **Overtakelse / tilbakelevering:** Strukturert rapport med bilder
   lastes opp til Supabase Storage (`handover-reports`-bucket).
7. **Kommunikasjon:** Chat mellom utleier ↔ saksbehandler ↔ leietaker.
8. **Avslutning:** Data slettes iht. retensjonsplan (se § 2.4).

### 1.3 Aktører og roller

| Rolle | Hvem | GDPR-posisjon | Kilde |
|---|---|---|---|
| Behandlingsansvarlig | Kommunen (pilot: Narvik) | Controller (art. 24) | DBA § 1 |
| Databehandler | Gamechanging AS | Processor (art. 28) | DBA § 2 |
| Underdatabehandlere | Supabase Inc., Vercel Inc., Signicat AS | Sub-processor (art. 28 (2)) | Vedlegg B + TIA-er |
| Registrerte | Utleiere, leietakere, saksbehandlere, kommune-admin | Art. 4 (1) | — |

**Intern rolleinndeling i applikasjonen** (teknisk):

- `tenant` (leietaker)
- `homeowner` (utleier)
- `kommune_ansatt` (saksbehandler / Nav-veileder)
- `kommune_admin` (administrator i kommunen)
- Public / guest (uautentisert — begrenset til marketing-sider)

Tilgang håndheves via **Postgres Row-Level Security (RLS)** og
kommune-region-taint (migrasjon
`20260423120000_kommune_region_security_hardening.sql`).

### 1.4 Datakategorier og rettslig grunnlag

Hentes ordrett fra `docs/legal/PRIVACY_NOTICE.md` § 2 og DBA Vedlegg
A.3 (etter harmonisering). Sammendrag:

| Kategori | Formål | Rettslig grunnlag |
|---|---|---|
| Navn, e-post, telefon | Konto, innlogging, varsler | Art. 6 (1) b (avtale) + art. 6 (1) e (utleierspor: kommunens myndighets­utøvelse) |
| Rolle | Tilgangsstyring | Art. 6 (1) b |
| Kommuneregion | Knytte bruker til riktig kommune | Art. 6 (1) e |
| Adresse/koordinater på bolig | Formidling av utleieobjekt | Art. 6 (1) b |
| Husregler, handover-rapporter + bilder | Leieforholdet | Art. 6 (1) b |
| Chat-meldinger og vedlegg | Kommunikasjon mellom partene | Art. 6 (1) b |
| Signeringslogg (Signicat session-id) | Gyldighetsbevis for signert avtale | Art. 6 (1) c (rettslig forpliktelse) |
| Bankkontonummer (valgfritt, kun ved `payment_method = 'konto'`) | Fakturagrunnlag ved formidling | Art. 6 (1) b |
| Audit-logger | IT-sikkerhet | Art. 6 (1) f |
| Cookie-preferanser (analytics) | Overholdelse av samtykke | Art. 6 (1) a |

**Ikke lagret** (verifisert 2026-04-20 mot Supabase-schema):

- Fødselsnummer / DUF-nummer (ingen kolonne eksisterer; DBA Vedlegg A.3
  inneholder en feil referanse som skal fjernes i DBA v3).
- Bankkort-PAN, CVV eller andre betalingsinstrumentslegitimasjoner.
- Helseopplysninger, etnisitet, politiske meninger, religion.
- Biometriske data.
- Passord i klartekst (Supabase Auth håndterer bcrypt/argon2).

**Særlig om bankkontonummer:** Dette er eneste finansielle PII som
persisteres. Lagres i `public.listing_invoice_basis.account_number` (én
rad per bolig) kun når utleier aktivt har valgt kontobetaling. Beskyttet av
region-scoped RLS (migrasjon
`20260427120000_listing_invoice_basis_region_scoped_rls.sql`), kryptering i
hvile (AES-256), og automatisk sletting via `boly_retention_sweep()` (24 mnd
etter siste oppdatering når boligen ikke lenger er aktivt formidlet).

### 1.5 Teknisk arkitektur (kort)

| Lag | Komponent | Region | Dokumentasjon |
|---|---|---|---|
| Frontend | Next.js på Vercel | `arn1` (Stockholm) | TIA_Vercel.md |
| Database / Auth / Storage | Supabase | `eu-central-1` (Frankfurt) | TIA_Supabase.md |
| BankID / signering | Signicat | Norge / EU | DBA Vedlegg B.1 |
| E-post | Mailjet (EU) | EU | Separat DBA |
| Web push | Web Push / VAPID (ingen tredjepart) | — | `supabase/functions/send-push` |

### 1.6 Overføringer til tredjeland

Eneste overføringer til USA er til **morselskapene** til Supabase og
Vercel for support-tilgang. Begge er dekket av:

- **SCC** (Kommisjonens gjennomførings­avgjørelse (EU) 2021/914).
- **TIA** (`docs/legal/TIA_Supabase.md`, `docs/legal/TIA_Vercel.md`).
- **DPF** (Data Privacy Framework) — Vercel er sertifisert; status for
  Supabase skal verifiseres.

Ingen rutinemessig overføring av persondata til tredjeland skjer ved
vanlig brukerflyt. Se TIA-dokumentene for detaljert vurdering.

---

## Del 2 — Nødvendighet og proporsjonalitet (art. 35 (7) (b))

### 2.1 Er behandlingen nødvendig?

| Spørsmål | Vurdering |
|---|---|
| Er det et legitimt formål? | **Ja** — sosial boligformidling er en lovpålagt kommunal oppgave (sosialtjenesteloven § 15) |
| Er det et klart behov? | **Ja** — dagens manuelle prosess er ressurskrevende og gir lavere tilgjengelighet for boligsøkere |
| Finnes mindre inngripende alternativer? | Manuell telefon/e-post er eksisterende; lite skalerbart og gir dårligere revisjonsspor. Boly er mer, ikke mindre, personvernvennlig |
| Er omfanget proporsjonalt med formålet? | **Ja**, gitt dataminimeringen beskrevet i § 2.2 |

### 2.2 Dataminimering (art. 5 (1) c og art. 25)

Boly er designet etter *data minimization by design*:

- BankID-identifikator (Signicat `sub`) er transient og lagres aldri.
- Leietakerens fødselsnummer, inntekt, helsedata, etc. er eksplisitt
  utenfor datamodellen.
- Chat-meldinger lagres, men databasen har tydelig UI-advarsel om at
  særlige kategorier ikke skal deles der.
- Handover-bilder komprimeres og lagres kun i relasjon til et aktivt
  leieforhold.
- Audit-logger inneholder bruker-id, ikke full PII.

Verifisert i:

- `docs/legal/PRIVACY_NOTICE.md` (appendix A: full data minimization map).
- Migrasjoner i `supabase/migrations/` — ingen fødselsnummer­kolonner.
- Signicat-integrasjon: `supabase/functions/auth-signicat/` bruker
  session-id, ikke persistert identitet.

### 2.3 Alternativer vurdert

| Alternativ | Valg | Begrunnelse |
|---|---|---|
| Selv-hostet løsning | Nei | Ressurser / sikkerhets­kompetanse for liten operatør |
| Rent manuell prosess | Nei | Allerede er status quo; gir dårligere spor og tilgjengelighet |
| US-basert leverandør uten EU-region | Nei | Ikke akseptabelt tredjelandsnivå |
| **Supabase (EU-region) + Vercel (EU-region)** | **Ja** | SaaS med SOC 2, DPF, SCC, EU-data-lokasjon, rask iterasjon |

### 2.4 Oppbevaringstid (retensjon)

Implementert som automatisert `pg_cron`-jobb i migrasjon
`20260426120000_data_retention_cron.sql` (`boly_retention_sweep()`
daglig kl 03:30 UTC):

| Datakategori | Slettefrist | Mekanisme |
|---|---|---|
| Brukerkontoer (leietakere) | 12 måneder etter siste aktive leieforhold | Manuell + varsling |
| Brukerkontoer (utleiere) | 12 måneder etter siste aktive kontrakt | Manuell + varsling |
| Brukerkontoer (saksbehandlere) | Senest 30 dager etter avsluttet arbeidsforhold | Manuell (kommunen varsler) |
| Chat-meldinger | 24 måneder | Automatisert (pg_cron) |
| Notifikasjoner | 12 måneder | Automatisert (pg_cron) |
| Audit-logger | 12 måneder | Automatisert (pg_cron) |
| Bankkontonummer / fakturagrunnlag | 24 måneder etter siste oppdatering + inaktiv bolig | Automatisert (pg_cron) + `on delete cascade` |
| Handover-bilder | Levetid av leieforhold + 12 mnd | **Åpent punkt** — se § 4 risiko R-10 |
| Signerte kontrakter | Iht. arkivloven (inntil 10 år) | Kommunens ansvar |

### 2.5 Transparens

| Krav | Implementert |
|---|---|
| Personvernerklæring (art. 13/14) | `docs/legal/PRIVACY_NOTICE.md` + `/personvern` på nett |
| Cookie-banner med lik-vekt valg | `frontend/app/components/CookieBanner.tsx` |
| Informasjon ved innhenting fra tredjepart | Kommunen skal informere leietakeren ved konto­opprettelse |
| Varsling ved endring | Versjonert samtykke (`v: 2`) + banner-visning på nytt |

### 2.6 Registrertes rettigheter (art. 15–22)

| Rettighet | Mekanisme | Frist |
|---|---|---|
| Innsyn (art. 15) | Egen konto-eksport + forespørsel til `personvern@gamechanging.no` | 30 dager |
| Retting (art. 16) | Selvbetjening i profil + backend-endring på forespørsel | 30 dager |
| Sletting (art. 17) | Konto-sletting i UI; systemsletting innen 30 dager | 30 dager |
| Begrensning (art. 18) | Admin-håndtert via kommunen | 30 dager |
| Dataportabilitet (art. 20) | Strukturert eksport (JSON/CSV) | 30 dager |
| Protest (art. 21) | E-post-kanal; vurderes per sak | Uten opphold |
| Ikke bli utsatt for ADM (art. 22) | Ikke relevant — ingen ADM i Boly | — |

### 2.7 Proporsjonalitetskonklusjon

Behandlingen er **nødvendig og proporsjonal** for formålet, gitt at:

- Ingen særlige kategorier eller høy-sensitive identifikatorer lagres.
- All data er innenfor EU/EØS ved primær-lagring.
- Registrerte har lett tilgjengelige rettigheter.
- Sletting er automatisert for største volumdatasett.

---

## Del 3 — Risiko for de registrertes rettigheter og friheter (art. 35 (7) (c))

Risikovurdering følger Datatilsynets 3×3-matrise. Sannsynlighet (S)
og Konsekvens (K) er Lav (L), Moderat (M), Høy (H). Risikonivå er før
tiltak; restrisiko etter tiltak vises i Del 4.

### 3.1 Risikoregister

| ID | Risiko | Berørte | S | K | Nivå før tiltak |
|---|---|---|---|---|---|
| R-01 | **Kontekstuell sensitivitet** — medlemskap i Boly avslører implisitt behov for kommunal boligbistand | Leietakere | M | H | **Høy** |
| R-02 | **Kryss-kommunal eksponering** — bruker fra én kommune får tilgang til annen kommunes data via RLS-feil | Alle registrerte | L | H | **Moderat** |
| R-03 | **Rollebrudd** — utleier ser annen utleiers leietakere | Utleiere, leietakere | L | H | **Moderat** |
| R-04 | **BankID / Signicat-flyt kompromittert** — session hijacking eller delt enhet fører til signering i annens navn | Alle signerende | L | H | **Moderat** |
| R-05 | **Chat inneholder uforvarende særlige kategorier** — bruker deler helse- eller straffedata i chat | Leietakere, utleiere | M | M | **Moderat** |
| R-06 | **Tredjelandsoverføring** — US-myndighet krever ut data fra Supabase eller Vercel | Alle registrerte | L | H | **Moderat** |
| R-07 | **Uteblivende sletting** — data overlever avtaleavslutning pga. manuell feil | Alle registrerte | M | M | **Moderat** |
| R-08 | **Sikkerhetsbrudd hos underdatabehandler** (Supabase/Vercel) | Alle registrerte | L | H | **Moderat** |
| R-09 | **Phishing / passord-reset-misbruk** — angriper overtar konto | Alle brukere | M | M | **Moderat** |
| R-10 | **Handover-bilder lever for lenge / stigma** — bilder av bolig kan avsløre identitet og livssituasjon | Leietakere | M | M | **Moderat** |
| R-11 | **Audit-logger avslører bosted / identitet** ved intern lekkasje | Leietakere | L | M | **Lav** |
| R-12 | **E-post-varsler avsløres** — varsler om signering sendes til feil adresse | Alle registrerte | L | M | **Lav** |
| R-13 | **Utilstrekkelig transparens** — bruker forstår ikke rettighet til sletting | Alle registrerte | M | L | **Lav** |
| R-14 | **Cookie-samtykke omgås** — pre-utfylt analytics til tross for avslag | Besøkende | L | L | **Lav** |
| R-15 | **Tap av data (availability)** — databasefeil uten recovery | Alle registrerte | L | M | **Lav** |
| R-16 | **Eksponering av bankkontonummer** — kryss-kommunal lesing av `listing_invoice_basis` via utilstrekkelig RLS, eller langtidslagring etter at behovet er borte | Utleiere | L | M | **Moderat** |

**Samlet risikoprofil:** Én høy-risiko (R-01, kontekstuell
sensitivitet) og ni moderate. Denne risikoprofilen tvinger frem
grundig tiltaksvurdering (Del 4), men **reise ikke terskelen for
art. 36 forhåndskonsultasjon** — det kreves «gjenstående høy risiko
etter tiltak», ikke «høy risiko før tiltak» (EDPB WP 248 pkt. IV.B).

---

## Del 4 — Tiltak som håndterer risikoene (art. 35 (7) (d))

For hver risiko: planlagte tekniske og organisatoriske tiltak (TOM),
eier og restrisiko.

### R-01 — Kontekstuell sensitivitet

**Tiltak (teknisk):**
- Ingen offentlig URL avslører at en konkret person er i Boly-systemet.
- Ingen indeksering i søkemotorer (`robots.txt` + `noindex` på brukerruter).
- Varslings-e-post fra `info@bolynorge.no` uten sosialtjenestebranding.
- Annonser for utleieobjekter er offentlig synlige, men bygger ikke
  kobling mellom annonse og en spesifikk leietaker.

**Tiltak (organisatoriske):**
- Opplæring av saksbehandlere i konfidensialitet.
- Taushetspliktserklæring ved ansettelse (DBA § 3).

**Ansvarlig:** Gamechanging AS (teknisk) + kommunen (opplæring).
**Restrisiko:** **Lav–Moderat.** Restrisikoen er iboende i selve
tjenestens eksistens og aksepteres som uunngåelig tradeoff for
formålet.

### R-02 — Kryss-kommunal eksponering

**Tiltak (teknisk):**
- Postgres RLS på alle tabeller med `kommune_region`-kolonne.
- Migrasjon `20260423120000_kommune_region_security_hardening.sql`
  med taint-analyse og security-definer-funksjoner.
- Regresjonstester på RLS ved hver migrasjon.

**Tiltak (organisatoriske):**
- Kodegjennomgang av alle database-endringer.
- Auditsignoff ved lansering (`docs/deployment/LAUNCH_DRIFT_SIGNOFF.md`).

**Ansvarlig:** Gamechanging AS.
**Restrisiko:** **Lav.**

### R-03 — Rollebrudd

**Tiltak (teknisk):**
- Rollebasert tilgang håndhevet både i RLS og i applikasjons­laget.
- Ingen felles tabeller der utleier-A kan `SELECT` utleier-B’s data.

**Ansvarlig:** Gamechanging AS.
**Restrisiko:** **Lav.**

### R-04 — BankID / Signicat-kompromittering

**Tiltak (teknisk):**
- Signicat er norsk leverandør under norsk GDPR/tilsyn.
- Signicat OIDC-flyt bruker PKCE + state + nonce.
- Boly håndhever daglig limit på 3 signerings­initieringer per konto
  (anti-missbruk, implementert i `sign-agreement`-Edge Function).
- Session-token fra Signicat persisteres aldri; kun signerings­bevis
  (tidsstempel + session-id).

**Tiltak (organisatoriske):**
- Brukerinformasjon om at BankID må brukes på egen enhet.

**Ansvarlig:** Gamechanging AS + Signicat.
**Restrisiko:** **Lav.**

### R-05 — Uforvarende særlige kategorier i chat

**Tiltak (teknisk):**
- Tydelig inline-advarsel øverst i chat-UI: *«Ikke del sensitive
  personopplysninger her.»*
- Retensjon 24 måneder begrenser eksponeringstid.

**Tiltak (organisatoriske):**
- Opplæring av saksbehandlere.
- Kommunen skal informere leietakere ved oppstart.

**Ansvarlig:** Gamechanging AS + kommunen.
**Restrisiko:** **Lav–Moderat.** Iboende i enhver chat-funksjon.

### R-06 — Tredjelandsoverføring

**Tiltak:** Dekket i `docs/legal/TIA_Supabase.md` og
`docs/legal/TIA_Vercel.md`. Hovedtiltak:
- SCC + DPF.
- EU-region pinning (Vercel `arn1`, Supabase `eu-central-1`).
- Kryptering i transport (TLS 1.2+) og i hvile (AES-256).
- Transparens-rapportering fra begge leverandører overvåkes.

**Ansvarlig:** Gamechanging AS (overvåking) + Supabase/Vercel.
**Restrisiko:** **Lav–Moderat** (se TIA-er).

### R-07 — Uteblivende sletting

**Tiltak (teknisk):**
- `boly_retention_sweep()` kjører daglig og logger sletting i
  `audit_logs`.
- Eksport ved konto-sletting er automatisk.

**Tiltak (organisatoriske):**
- Årlig stikkprøve av retensjonskjøringer.
- DPO-review av retensjonstider.

**Ansvarlig:** Gamechanging AS.
**Restrisiko:** **Lav.**

### R-08 — Sikkerhetsbrudd hos underdatabehandler

**Tiltak:** Dekket i TIA-ene samt DBA § 8.
- 24-timers varslingsfrist fra underdatabehandler.
- Årlige SOC 2-rapporter fra Supabase og Vercel.
- Overvåking av trust.supabase.com / vercel.com/trust.

**Restrisiko:** **Lav–Moderat.**

### R-09 — Phishing / passord-reset-misbruk

**Tiltak (teknisk):**
- Supabase Auth-tokens har 1-times gyldighet.
- E-poster sendes fra verifisert DKIM/SPF/DMARC-domene
  (`bolynorge.no`).
- Rate-limiting på passord-reset.
- PKCE-flyt ved passord-reset.

**Tiltak (organisatoriske):**
- Brukerinformasjon: advarsel mot å klikke på mistenkelige lenker.

**Restrisiko:** **Lav.**

### R-10 — Handover-bilder

**Åpent punkt:** Eksplisitt slettefrist for
`handover-reports`-bucket skal settes. Forslag:

- **6 måneder etter at leieforholdet er avsluttet** (samme som chat-
  meldinger i DBA Vedlegg C.4).
- Implementeres i `boly_retention_sweep()` i ny migrasjon.

**Ansvarlig:** Gamechanging AS.
**Frist:** Innen lansering.
**Restrisiko etter implementering:** **Lav.**

### R-11 — Audit-loggeksponering

**Tiltak:**
- Kun operatør-tilgang (minste privilegium).
- Logger er kryptert i hvile.
- 12-måneders sletting (automatisert).

**Restrisiko:** **Lav.**

### R-12 — E-post-varsler til feil adresse

**Tiltak:**
- E-postverifisering ved registrering.
- Ikke inkludere sensitive detaljer i e-post (kun «Logg inn for å se»).

**Restrisiko:** **Lav.**

### R-13 — Utilstrekkelig transparens

**Tiltak:**
- Personvernerklæring lenket fra footer + cookie-banner.
- Lett tilgjengelig sletteknapp i profil.
- Norske + engelske versjoner.

**Restrisiko:** **Lav.**

### R-14 — Cookie-samtykke omgås

**Tiltak (teknisk):**
- Ingen analytics-SDK initialiseres før samtykke er registrert.
- Standardvalg er `analytics: false`.
- `localStorage`-basert samtykke er versjonert (`v: 2`).

**Restrisiko:** **Lav.**

### R-15 — Tap av data (availability)

**Tiltak:**
- Daglig automatisk Supabase-backup (PITR i betalt plan).
- RTO < 4 timer, RPO < 24 timer (DBA Vedlegg C.2).
- Manuelle eksporter + restore-øvelse årlig.

**Restrisiko:** **Lav.**

### R-16 — Eksponering av bankkontonummer

**Tiltak (teknisk):**
- Region-scopet RLS på `listing_invoice_basis` (migrasjon
  `20260427120000_listing_invoice_basis_region_scoped_rls.sql`):
  kommune-staff ser kun rader for boliger i egen region;
  utleier ser kun egne rader.
- Kryptering i hvile (AES-256) og i transport (TLS 1.2+) via
  Supabase-plattformen.
- Automatisk sletting etter 24 mnd siden siste oppdatering når
  boligen ikke lenger er aktivt formidlet (utvidelse av
  `boly_retention_sweep()` i samme migrasjon).
- `on delete cascade` mot `listings` sikrer at
  fakturagrunnlag slettes når boligen slettes.
- Ingen klartekst i server-logger (`devLog` logger kun timing og
  `request-id`, ikke feltinnhold).

**Tiltak (organisatoriske):**
- UI-varsel ved valg av kontobetaling: «Kontonummeret blir synlig
  for saksbehandlere i din kommune.»
- DPO-årlig stikkprøve mot `audit_logs` for `RETENTION_SWEEP`-kjøringer.

**Ansvarlig:** Gamechanging AS.
**Restrisiko:** **Lav.**

---

## Del 5 — Forhåndskonsultasjon med Datatilsynet (GDPR art. 36)

### 5.1 Terskelspørsmål

Art. 36 (1) krever at Behandlingsansvarlig rådfører seg med
Datatilsynet «når en vurdering av personvernkonsekvenser viser at
behandlingen ville medføre en høy risiko dersom den
behandlings­ansvarlige ikke treffer tiltak for å begrense risikoen.»

Terskelen er altså **høy restrisiko etter tiltak**, ikke før.

### 5.2 Vurdering

Etter tiltakene i Del 4:

- Ingen restrisiko klassifiseres høyere enn **Lav–Moderat**.
- Ingen særlige kategorier (art. 9) eller straffedata (art. 10)
  behandles.
- Data er innenfor EU/EØS, med SCC+TIA for underdatabehandlernes
  US-morselskap.
- Automatiserte beslutninger med rettsvirkning utføres ikke.
- Registrerte har effektive rettigheter via applikasjonsflyten.

### 5.3 Konklusjon

**Forhåndskonsultasjon etter art. 36 er sannsynligvis ikke påkrevd.**

Behandlingsansvarlig bør likevel:

1. Ha DPIA-en klar til fremvisning dersom Datatilsynet ber om det.
2. Oppdatere DPIA-en når Boly utvider til nye kommuner eller når
   automatiserte beslutningsflyter vurderes.
3. Registrere DPIA-en i kommunens behandlingsprotokoll (art. 30).

Dersom Behandlingsansvarlig (kommunens DPO) er uenig i denne
vurderingen, skal art. 36-konsultasjon initieres før lansering.

---

## Del 6 — Re-vurdering og oppfølging

### 6.1 Plan

| Utløser | Handling |
|---|---|
| Årlig | Full gjennomgang av DPIA-en (neste: 2027-04-20) |
| Ny kommune aktiveres | Kort delta-vurdering; kommunens DPO godkjenner |
| Ny datakategori | Full oppdatering av Del 1 + 3 |
| Ny underdatabehandler | Oppdatering av Del 1.6 + oppdatert TIA |
| Sikkerhetsbrudd | Ad-hoc re-vurdering |
| Ny lovgivning / DT-veileder | Ad-hoc re-vurdering |
| Introduksjon av ADM / profilering | **Fullt nytt DPIA-utkast** |

### 6.2 Oppfølgingsansvar

- **Gamechanging AS:** Tekniske tiltak, årlig oppdatering av
  risikoregister, eskalering til kommunen.
- **Kommunen (DPO):** Godkjenner DPIA, melder til Datatilsynet hvis
  art. 36 trigges, oppdaterer behandlingsprotokoll.

### 6.3 Åpne punkter (gjenstående)

| # | Punkt | Ansvarlig | Frist |
|---|---|---|---|
| 1 | Implementere retensjon for handover-bilder (R-10) | Gamechanging AS | Før lansering |
| 2 | DPO-gjennomgang av DPIA-en | Narvik kommune | Før lansering |
| 3 | Signert og versjonert lagring av DPIA-en sammen med DBA | Begge parter | Ved signering |
| 4 | Verifisere DPF-status for Supabase | Gamechanging AS | Innen 30 dager |
| 5 | Legge DPIA i kommunens behandlingsprotokoll (art. 30) | Narvik kommune | Før lansering |
| 6 | Fjerne `fødselsnummer` fra DBA Vedlegg A.3; presisere `bankkontonummer`-behandling (kun ved `payment_method = 'konto'`, region-scoped RLS, 24 mnd retensjon) | Gamechanging AS | Ved DBA v3 |
| 7 | Innføre sikkerhetsadresse `security@bolynorge.no` | Gamechanging AS | Før lansering |

---

## Vedlegg A — Kryssreferanse mot Datatilsynets DPIA-mal

| Datatilsynets mal (pkt.) | Dekket i |
|---|---|
| Beskrivelse av behandlingen | Del 1 |
| Formål og rettslig grunnlag | § 1.1, § 1.4 |
| Kategorier av personopplysninger og registrerte | § 1.4, PRIVACY_NOTICE § 2 |
| Mottakere | § 1.3, § 1.6 |
| Overføring til tredjeland | § 1.6, TIA-er |
| Lagringstider | § 2.4, migrasjon `20260426120000_data_retention_cron.sql` |
| Rettigheter for de registrerte | § 2.6 |
| Vurdering av nødvendighet og proporsjonalitet | Del 2 |
| Risikovurdering | Del 3 |
| Planlagte tiltak | Del 4 |
| Forhåndskonsultasjon | Del 5 |
| Oppdateringsrutine | § 6.1 |

---

## Vedlegg B — Referanser

- **GDPR:** Forordning (EU) 2016/679 — art. 5, 6, 9, 24, 25, 28, 30,
  32, 33, 34, 35, 36.
- **EDPB WP 248 rev.01** — Guidelines on Data Protection Impact
  Assessment (2017, vedtatt av EDPB 2018).
- **EDPB Recommendations 01/2020 v2.0** om supplerende tiltak ved
  tredjelandsoverføringer.
- **EDPB 03/2022** om designed-in samtykke.
- **Datatilsynets veileder** om personvern­konsekvens­vurdering (2019,
  oppdatert 2023).
- **Personopplysningsloven** §§ 17–18.
- **Sosialtjenesteloven § 15** (kommunal boligbistand).
- **Boly-dokumenter:**
  - `docs/legal/PRIVACY_NOTICE.md` (v1.0)
  - `docs/legal/TIA_Vercel.md` (v1.0)
  - `docs/legal/TIA_Supabase.md` (v1.0)
  - `supabase/migrations/20260423120000_kommune_region_security_hardening.sql`
  - `supabase/migrations/20260426120000_data_retention_cron.sql`
  - `supabase/migrations/20260427120000_listing_invoice_basis_region_scoped_rls.sql`
  - DBA v2 (vedlegg A–D)

---

## Vedlegg C — Endringslogg

| Dato | Versjon | Endring | Ansvarlig |
|---|---|---|---|
| 2026-04-20 | 1.0 | Første utkast opprettet | Gamechanging AS |

