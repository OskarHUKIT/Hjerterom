# Gjerterum — digital lukket del

*Rapport og prosjektsøknad for oppstart med partnere*

> **Versjon:** 1.0  
> **Dato:** 30. juni 2026  
> **Status:** Utkast til deling med UiT Narvik og Nav Narvik  
> **Utarbeidet av:** Gamechanging AS (Boly) i samarbeid med prosjektpartnere

---

## Dokumentinformasjon

| Felt | Verdi |
|------|-------|
| **Prosjektnavn** | Gjerterum — digital lukket del |
| **Formål** | Etablere et helhetlig, trygt og forskningsbasert botilbud med digital infrastruktur |
| **Primære mottakere av dokumentet** | UiT Narvik, Nav Narvik |
| **Øvrige partnere** | Narvik kommune, Gamechanging AS / Game Changing Eyes, nytt øyesenter i Narvik |
| **Digital plattform** | Boly (sosial boligformidling og tjenestekobling) |
| **Kontakt** | info@bolynorge.no |

---

## Sammendrag

Gjerterum skal utvikles som et helhetlig botilbud der **fysisk trygghet**, **helhetlig oppfølging** og **moderne digital infrastruktur** henger sammen. Kjernen i dette dokumentet er den **digitale lukkede delen**: et avgrenset, sikkert og personvernvennlig digitalt lag som binder sammen bolig, helse, forskning og offentlig oppfølging — uten at sensitive data eller tjenestefløyter eksponeres i åpne kanaler.

Prosjektet bygger på et partnerskap mellom **Narvik kommune**, **Nav Narvik**, **UiT Narvik**, **Gamechanging AS** (utvikler av Boly) og **Game Changing Eyes** — et satsingsområde knyttet til det nye øyesenteret og investering i øyehelse i regionen. Den digitale lukkede delen skal ikke erstatte menneskelig oppfølging, men gjøre den mer presis, dokumenterbar og skalerbar — med tydelig ansvarsfordeling, sporbarhet og etterlevelse av personvernregelverket.

Dette dokumentet fungerer som **rapport** (idé, behov, løsningsarkitektur og gevinstrealisering) og **prosjektsøknad** (mål, aktiviteter, finansieringsgrunnlag og oppstart). Det er utformet for å deles med UiT Narvik og Nav Narvik som grunnlag for felles prosess, mandat og videre søknadsarbeid mot blant annet **Husbanken** og relevante forskningsmidler.

**Hovedanbefaling:** Opprette et felles oppstartsmøte (kommune, Nav, UiT, Gamechanging/Game Changing Eyes) med mandat for forprosjekt (3–6 måneder), inkludert behovskartlegging, DPIA-forberedelse, forskningsdesign og konkretisering av Husbanken-søknad.

---

# Del I — Rapport

## 1. Bakgrunn og behov

Kommuner og Nav møter en økende andel innbyggere som trenger **koordinert bolig- og helseoppfølging** — ofte med nedsatt funksjonsevne, synshemming, psykisk helse, rus eller kombinerte utfordringer. Tradisjonelle siloer mellom bolig, helse, arbeid og velferd fører til forsinkelser, duplisering og utilstrekkelig dokumentasjon.

I Narvik er det etablert et sterkt grunnlag gjennom:

- **Boly** — digital plattform for sosial boligformidling, utviklet i samarbeid mellom Gamechanging og Nav Narvik, med støtte fra Narvik kommune.
- **Regional satsing på øyehelse** — nytt øyesenter og investering i øye («Game Changing Eyes»), med potensial for tidlig oppdagelse, rehabilitering og livskvalitet.
- **UiT Narvik** — akademisk og forskningsmessig kompetanse innen helse, teknologi og samfunn.

**Gjerterum** skal adressere et gap: et botilbud der den **lukkede** (avgrensede, trygge) delen av tjenesten også er **digitalt forankret** — slik at rett person får rett informasjon til rett tid, innenfor lovpålagte rammer.

### 1.1 Hva menes med «digital lukket del»?

Med *digital lukket del* menes et **avgrenset digitalt tjenestemiljø** som:

1. **Er lukket** i betydningen *tilgangsstyrt og konfidensielt* — ikke åpent for uvedkommende, ikke delt på ustrukturerte kanaler (e-post, SMS, papir).
2. **Er digital** i betydningen *integrert, sporbar og skalerbar* — koblet til Boly, godkjente helsedatakilder og forskning der samtykke og etikk tillater det.
3. **Er en del** av Gjerterum som helhet — fysisk botilbud, menneskelig oppfølging og digital infrastruktur utgjør én modell.

Den digitale lukkede delen omfatter blant annet:

| Komponent | Beskrivelse |
|-----------|-------------|
| **Identitet og tilgang** | BankID/Navy ID-lignende sterke innlogginger; rollebasert tilgang (Nav, kommune, helse, beboer, pårørende der aktuelt). |
| **Bolig- og tjenestekobling** | Formidling, avtaler, overtakelsesrapporter og oppfølging via Boly — tilpasset lukket botilbud. |
| **Helse- og synstjenester** | Kobling til øyesenter og relevante helsetjenester; strukturert registrering av behov (f.eks. syn, tilrettelegging i bolig). |
| **Kommunikasjon** | Sikker meldingskanal mellom autoriserte aktører; ingen uformell deling av sensitive opplysninger. |
| **Dokumentasjon og sporbarhet** | Revisjonslogg, versjonerte dokumenter, etterlevelse av GDPR og kommunale rutiner. |
| **Forskningsmodul (valgfri)** | Anonymisert/pseudonymisert datainnsamling med REK-godkjenning og informert samtykke. |

*«Lukket» refererer altså primært til **informasjonssikkerhet og tjenesteavgrensning**, ikke til å isolere beboere fra samfunnet. Målet er trygg digital infrastruktur som støtter deltakelse, mestring og utdanning/arbeid der det er mulig.*

### 1.2 Målgruppe

Typiske brukergrupper (kan presiseres i forprosjekt):

- Personer med behov for **omsorgsbolig** eller **tilrettelagt botilbud** med tett oppfølging.
- Personer med **synshemming eller øyehelseutfordringer** som påvirker bolig, arbeid og daglig mestring.
- Personer i **Navs målgrupper** som trenger koordinert bolig- og livsopplegg.
- Pårørende og samarbeidspartnere med **begrenset, tydelig definert** tilgang.

---

## 2. Prosjektidé — Gjerterum som helhet

Gjerterum skal være et **regionalt referansepunkt** for hvordan kommune, Nav, akademia og næringsliv kan samarbeide om:

- **Trygg bolig** — fysisk utforming etter prinsipper for universell utforming, synstilrettelegging og livsløpsstandard der det er relevant.
- **Helhetlig oppfølging** — Nav, kommune og helse koordinert gjennom felles digitale flater.
- **Forskning og innovasjon** — UiT Narvik som partner for evaluering, teknologiutvikling og kompetanseheving.
- **Bærekraftig drift** — gjenbruk av Boly-plattformen og modulær utvidelse fremfor parallelle IT-systemer.

### 2.1 Rollefordeling mellom partnere

| Partner | Rolle i prosjektet |
|---------|-------------------|
| **Narvik kommune** | Behandlingsansvarlig for kommunale tjenester; eier av boligpolitisk mandat; Husbanken-søknader; lokale vedtak. |
| **Nav Narvik** | Arbeids- og velferdsorientert oppfølging; boligformidling; integrasjon med eksisterende Boly-samarbeid. |
| **UiT Narvik** | Forskning, evaluering, studentoppgaver, REK-søknader; fagmiljøer innen helse og teknologi. |
| **Gamechanging AS / Boly** | Utvikling og drift av digital plattform; databehandleravtaler; teknisk sikkerhet. |
| **Game Changing Eyes / øyesenter** | Faglig innhold innen øyehelse; tilrettelegging; potensial for klinisk samarbeid og innovasjon. |

### 2.3 Verdiskaping

**For innbyggere:** Raskere vei til egnet bolig, bedre tilrettelegging (inkl. syn), mindre fragmentert kommunikasjon.

**For Nav og kommune:** Lavere sakshåndteringstid, bedre dokumentasjon, færre avvik, sterkere etterlevelse.

**For UiT Narvik:** Relevant forskningsarena, praksisnær innovasjon, regional forankring.

**For regionen:** Profilering av Narvik som kompetansesenter for digital velferdsteknologi og øyehelse i nord.

---

## 3. Den digitale lukkede delen — løsningsarkitektur

### 3.1 Prinsipper

1. **Privacy by design** — minimér datamengde, tydelig formålsbegrensning, kryptering, tilgangslogg.
2. **Én inngang — mange roller** — samme plattform (Boly-økosystem), ulike visninger etter rolle.
3. **Åpen for inspeksjon** — kommune og Nav kan dokumentere etterlevelse (DPIA, behandlingsprotokoll).
4. **Forskning som tilvalg** — ikke forutsetning for tjenesten; krever eget samtykke og godkjenning.
5. **Menneske først** — digitalisering skal frigjøre tid til relasjon, ikke erstatte den.

### 3.2 Teknisk kobling til Boly

Boly er allerede i bruk i Narvik-regionen for **sosial boligformidling** mellom private utleiere og kommune/Nav. For Gjerterum utvides plattformen med en **lukket sone** (tenant/logisk avgrensning):

```
┌─────────────────────────────────────────────────────────────────┐
│                    GJERTERUM — DIGITAL LUKKET DEL               │
├─────────────────────────────────────────────────────────────────┤
│  Beboer / pårørende  │  Nav Narvik  │  Kommune  │  Helse/øye  │
│         ▼                  ▼              ▼            ▼        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Boly — lukket tjenesteområde                 │   │
│  │  • Boligprofil & tilrettelegging  • Sikker melding       │   │
│  │  • Overtakelse / dokumenter       • Varsler & oppfølging │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                              │                        │
│         ▼                              ▼                        │
│  ┌──────────────┐              ┌──────────────────┐            │
│  │ BankID /     │              │ Forskningsmodul  │            │
│  │ sterkt login │              │ (UiT, REK)       │            │
│  └──────────────┘              └──────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

Eksisterende funksjoner i Boly som kan gjenbrukes:

- Kommune- og Nav-tilgangsstyring (service areas, roller)
- Boligbank / listing med tilgjengelighetsdata
- Sikker melding og varsler
- BankID-signering av avtaler
- Dokumentlagring med revisjon
- GDPR-pakke (DPIA-mal, behandlingsprotokoll, databehandleravtale)

### 3.3 Syn og øyehelse — Game Changing Eyes

Game Changing Eyes knytter prosjektet til **investering i øye** og det **nye øyesenteret** i Narvik. I den digitale lukkede delen kan dette uttrykkes som:

- **Strukturert kartlegging** av synrelaterte behov ved innflytting (med samtykke).
- **Tilretteleggingsplan** for bolig (belysning, kontrast, smarte hjelpemidler) koblet til boligprofil i Boly.
- **Henvisnings- og oppfølgingslogg** mellom Nav/kommune og øyehelse — innenfor lukket kanal.
- **Forskningspotensial:** effekt av tidlig intervensjon på boligstabilitet, arbeidsevne og livskvalitet (UiT).

Dette skaper en unik profil: Gjerterum er ikke bare «enda et botilbud», men et **inkluderende og synsspesifikt** referanseprosjekt i Nord-Norge.

---

## 4. Kobling til forskningsressurser — UiT Narvik

### 4.1 Relevante fagmiljøer

UiT Norges arktiske universitet, campus Narvik, kan bidra innen:

| Område | Mulig bidrag |
|--------|----------------|
| **Helse- og sosialfag** | Evaluering av botilbud, livskvalitet, brukerinvolvering. |
| **Ingeniør- og datateknologi** | Sensorer, tilgjengelighet, UX for svaksynte, datasikkerhet. |
| **Samfunnsvitenskap** | Organisasjonslæring, tverrfaglig samarbeid, policy-analyse. |
| **Øyehelse / medisin** | Samarbeid med øyesenter; kliniske og rehabiliteringsstudier. |

### 4.2 Forskningsdesign (utkast)

**Overordnet spørsmål:** Hvordan kan en digital lukket del av et botilbud forbedre koordinering, mestring og utfall for sårbare grupper — særlig med synrelaterte behov?

**Mulige delprosjekter:**

1. **Implementeringsstudie** — hvordan innføre digital lukket del i praksis (organisasjon, opplæring, endring).
2. **Utcome-studie** — boligstabilitet, sykefravær/arbeidsdeltakelse, henvisninger, brukertilfredshet.
3. **Teknologistudie** — tilgjengelighet i app for svaksynte; WCAG; stemme/gestus.
4. **Økonomisk evaluering** — samfunnsøkonomisk gevinst vs. tradisjonell sakshåndtering.

### 4.3 Finansieringskilder for forskning

| Kilde | Relevans |
|-------|----------|
| **Norges forskningsråd** | Helse, velferd, teknologi, regionale innovasjonssystemer. |
| **Regionalt forskningsfond / Troms og Finnmark** | Lokalt forankrede prosjekter. |
| **Helse Nord RHF** | Pasientforløp, øyehelse, velferdsteknologi. |
| **Innovasjon Norge** | Kommersialisering og skalering av Boly-moduler. |
| **UiT interne midler** | Masteroppgaver, ph.d.-prosjekter, småskalaprosjekter. |
| **EU (Horizon / Interreg)** | Ved nordisk/nordlig partnerskap. |

### 4.4 Etikk og REK

All forskning på helse- og personopplysninger krever:

- **Informert samtykke** fra deltakere (eller lovlig grunnlag etter GDPR).
- **REK-godkjenning** ved helseforskning.
- **DPIA** i samarbeid med Narvik kommune som behandlingsansvarlig.
- **Pseudonymisering** og separate forskningsdatasett der mulig.

UiT bør involveres tidlig for å co-designe forskningsplanen — slik at den digitale lukkede delen bygges med **forskningsvennlig datamodell** uten å kompromittere personvern.

---

## 5. Ressurser fra Boly og Husbanken

### 5.1 Boly som eksisterende digital ressurs

Boly er allerede en **operasjonell ressurs** i Narvik-regionen:

| Ressurs | Beskrivelse |
|---------|-------------|
| **Plattform** | Web og mobil (PWA/Capacitor); produksjonsklar arkitektur (Supabase, Vercel, BankID). |
| **Organisatorisk erfaring** | Samarbeid Nav Narvik — kommune — utleiere er etablert. |
| **Juridisk pakke** | Databehandleravtale, DPIA-mal, personvernerklæring, TIA. |
| **Kompetanse** | Gamechanging AS — formålsdrevet selskap med fokus på sosial bærekraft og teknologi. |

**For Gjerterum:** Boly reduserer oppstartskostnad og tid ved **modulær utvidelse** av lukket sone fremfor nytt IT-prosjekt fra scratch.

### 5.2 Husbanken — relevante ordninger

Husbanken forvalter statlige virkemidler for bolig og bomiljø. For Gjerterum er følgende særlig relevante (nærmere vilkår må avklares med Husbanken og kommunen):

| Ordning | Anvendelse i Gjerterum |
|---------|------------------------|
| **Tilskudd til utleieboliger** | Bygging/tilpasning av omsorgs- eller tilrettelagte utleieboliger. |
| **Startlån** | Kommunalt startlån via Husbanken for eierboliger til vanskeligstilte (der modellen inkluderer eie). |
| **Tilskudd til utbedring** | Tilpasning for syn, mobilitet og universell utforming i eksisterende bygg. |
| **Kvalitetsløft og bomiljø** | Planlegging, universell utforming, miljøtiltak. |
| **Kompetansetiltak** | Rådgivning om boligpolitikk og gjennomføring. |

**Narvik kommune** er søker/tildelingsmyndighet for de fleste Husbanken-ordninger. Nav Narvik bidrar med **målgruppekunnskap** og dokumentasjon av behov. Boly kan levere **digital dokumentasjon** av boligbehov, tilrettelegging og oppfølging som styrker søknadsgrunnlaget.

### 5.3 Sammenheng: fysisk (Husbanken) + digital (Boly)

```
Behovskartlegging (Nav/kommune)
        │
        ▼
┌───────────────────┐     ┌────────────────────┐
│ Husbanken-søknad  │     │ Boly — lukket del  │
│ (fysisk bolig)    │◄───►│ (digital oppfølging)│
└───────────────────┘     └────────────────────┘
        │                           │
        ▼                           ▼
   Bygg/tilpass              Innflytting, avtale,
   omsorgsbolig              synplan, forskning
```

Den digitale lukkede delen gjør **hele livsløpet** sporbar — fra behov til innflytting og oppfølging — noe som er verdifullt både for forvaltning og forskning.

---

## 6. Risiko og mitigering

| Risiko | Mitigering |
|--------|------------|
| Personvernbrudd | DPIA, tilgangsstyring, opplæring, penetrasjonstest |
| Lav digital kompetanse hos brukere | Opplæring, pårørendestøtte, tilgjengelig UX |
| Fragmentert eierskap | Tydelig styringsmodell, samarbeidsavtaler |
| Forskningsetikk | Tidlig REK, separat datastrøm |
| Finansieringsgap | Faseinndelt prosjekt; forprosjekt med lav kost |

---

# Del II — Prosjektsøknad og oppstart

## 7. Prosjektmål

### Hovedmål

Etablere **Gjerterum med digital lukket del** som pilot i Narvik, med partnere UiT Narvik, Nav Narvik, Narvik kommune og Game Changing Eyes — der Boly utgjør den digitale ryggraden.

### Delmål (SMART, år 1)

1. **M1:** Godkjent forprosjektrapport og styringsmodell innen 6 måneder.
2. **M2:** DPIA og behandlingsprotokoll godkjent av Narvik kommune.
3. **M3:** Teknisk MVP for lukket Boly-sone testet med minst 5 brukere/roller.
4. **M4:** REK-søknad eller forskningsprotokoll innsendt via UiT (der aktuelt).
5. **M5:** Husbanken-forprosjekt eller søknad med kommunalt vedtak igangsatt.

---

## 8. Aktivitetsplan — fase 0 til 2

### Fase 0 — Oppstart (måned 0–2)

| Aktivitet | Ansvar | Leveranse |
|-----------|--------|-----------|
| Oppstartsmøte med UiT og Nav | Alle partnere | Møtereferat, mandat |
| Behovskartlegging | Nav, kommune | Behovsnotat |
| Juridisk avklaring | Kommune, Gamechanging | Eierskap databehandling |
| Kick-off med øyesenter | Game Changing Eyes | Faglig ramme syn |

### Fase 1 — Forprosjekt (måned 2–6)

| Aktivitet | Ansvar | Leveranse |
|-----------|--------|-----------|
| Løsningsdesign lukket del | Gamechanging | Arkitekturdokument |
| DPIA | Kommune + Gamechanging | Godkjent DPIA |
| Forskningsplan | UiT | Protokoll / REK-kladd |
| Husbanken-vurdering | Kommune | Søknadsstrategi |
| Brukerinvolvering | Nav | Kravspesifikasjon |

### Fase 2 — Pilot (måned 6–18)

| Aktivitet | Ansvar | Leveranse |
|-----------|--------|-----------|
| Utvikling og test | Gamechanging | Produksjonspilot |
| Opplæring Nav/kommune | Nav, Gamechanging | Opplæringsprogram |
| Evaluering | UiT | Interimrapport |
| Fysisk etablering | Kommune | Botilbud i drift |

---

## 9. Budsjett — overslagsramme (forprosjekt)

| Post | Beløp (NOK) | Kommentar |
|------|-------------|-----------|
| Prosjektledelse | 300 000 | Delt mellom partnere |
| Utvikling lukket Boly-modul | 800 000 | Gamechanging |
| Juridisk / DPIA | 150 000 | Ekstern + intern |
| Forskningsforberedelse (UiT) | 200 000 | Timer, student, REK |
| Brukerinvolvering | 100 000 | Workshops |
| Opplæring | 100 000 | Nav/kommune |
| **Sum forprosjekt** | **1 650 000** | Søkes fra flere kilder |

*Husbanken og forskningsmidler kan dekke ulike poster; detaljert budsjett utarbeides i fellesskap.*

---

## 10. Organisering og beslutninger

### Foreslått styringsgruppe

- Representant Narvik kommune (leder)
- Representant Nav Narvik
- Representant UiT Narvik
- Daglig leder Gamechanging AS
- Fagrepresentant øyesenter / Game Changing Eyes

### Arbeidsgrupper

- **Digital:** Boly, IT-sikkerhet, tilgjengelighet
- **Fag:** Bolig, Nav, helse/syn
- **Forskning:** UiT, etikk, evaluering

---

## 11. Neste steg — foreslått prosess med UiT Narvik og Nav Narvik

1. **Deltak dette dokumentet** med kontaktpersoner ved UiT Narvik (dekan/faggruppe) og Nav Narvik (ledelse + Boly-ansvarlig).
2. **Avhold oppstartsmøte** innen 4–6 uker — mandat, roller, tidsplan.
3. **Signer intensjonsavtale** (MoU) mellom partnere — ikke-bindende, men tydelig forpliktelse til forprosjekt.
4. **Igangsett behovskartlegging** med reelle brukerhistorier fra Nav.
5. **Parallelt:** Kommune vurderer Husbanken-trapp og eiendom for Gjerterum.
6. **UiT:** Utnevn prosjektleder forskning og vurder REK-behov.
7. **Gamechanging:** Lever teknisk konseptnotat for lukket Boly-sone (2–3 uker etter oppstart).

---

## 12. Konklusjon

Gjerterum — digital lukket del — representerer en **moden, partnerskapsbasert** modell for fremtidens botilbud i Nord-Norge. Ved å kombinere **Husbankens fysiske virkemidler**, **Bolys digitale infrastruktur**, **Navs operative kompetanse**, **kommunens mandat** og **UiTs forskningskraft** — med **Game Changing Eyes** som faglig differentiator innen syn — skapes et prosjekt som er klart for oppstart.

Dette dokumentet er utarbeidet for å **starte prosessen** med UiT Narvik og Nav Narvik. Vi anbefaler at begge parter bekrefter mottak, nominerer kontaktpersoner og avtaler dato for oppstartsmøte.

---

## Vedlegg A — Ordliste

| Begrep | Forklaring |
|--------|------------|
| **Boly** | Digital plattform for sosial boligformidling (bolynorge.no) |
| **Digital lukket del** | Tilgangsstyrt, konfidensielt digitalt tjenestelag i Gjerterum |
| **Game Changing Eyes** | Satsing knyttet til øyehelse og nytt øyesenter i Narvik |
| **Husbanken** | Statlig virkemiddelapparat for bolig og bomiljø |
| **REK** | Regional komité for medisinsk og helsefaglig forskningsetikk |
| **DPIA** | Data protection impact assessment (konsekvensutredning) |

## Vedlegg B — Referanser

- Boly — bolynorge.no
- Narvik kommune — hjelp til bolig og kommunale boliger
- Husbanken — husbanken.no (tilskudd, startlån, rådgivning)
- Eksisterende samarbeid Gamechanging — Nav Narvik — Narvik kommune (Boly-pilot)

---

*Med vennlig hilsen*

**Gamechanging AS**  
Org.nr. 932 496 321  
info@bolynorge.no · bolynorge.no

*På vegne av prosjektpartnere: Narvik kommune, Nav Narvik, UiT Narvik, Game Changing Eyes*
