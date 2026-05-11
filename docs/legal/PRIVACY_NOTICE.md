# Personvernerklæring / Privacy Notice — Boly

> **Sist oppdatert / Last updated:** 2026-04-20
> **Versjon / Version:** 1.0
>
> Dette dokumentet er et arbeidsutkast som skal vurderes av kommunens
> personvernombud (DPO) før publisering. Erklæringen finnes både på norsk
> (bokmål) og engelsk; ved tvil er den **norske versjonen den autoritative**.
>
> *This notice is a working draft and should be reviewed by the
> municipality's Data Protection Officer (DPO) before publication. In case
> of conflict the Norwegian text prevails.*

---

## Innhold / Contents

1. [Norsk](#norsk)
2. [English](#english)
3. [Appendix A — Data minimization map (Boly data model)](#appendix-a--data-minimization-map-boly-data-model)

---

## Norsk

### 1. Hvem vi er

Boly er en tjeneste for formidling av kontakt mellom **utleiere** («homeowners»)
og **leietakere** i et regulert, kommune-godkjent kretsløp. **Gamechanging AS**
eier og drifter Boly. Nav har bidratt til utviklingen i partnerskap med
Gamechanging og er **ikke** databehandler for personopplysningene i plattformen.

**Behandlingsansvarlig (Data Controller):**
Kommunen/saksbehandler som har aktivert Boly for ditt område er
behandlingsansvarlig for opplysningene som behandles i tjenesten. Boly
(Gamechanging) opptrer som **databehandler** på vegne av behandlingsansvarlig.

**Kontakt:** [info@bolynorge.no](mailto:info@bolynorge.no)

### 2. Hvilke personopplysninger vi behandler

Vi behandler kun opplysninger som er nødvendige for å levere tjenesten
(prinsippet om **dataminimering**, GDPR art. 5 (1) c):

| Kategori | Formål | Rettslig grunnlag |
|---|---|---|
| Navn, e-post, telefon | Konto, innlogging, varsler | Avtale (art. 6 (1) b) |
| Foretrukket språk | Språkvalg for UI og e-post | Berettiget interesse (art. 6 (1) f) |
| Rolle (utleier / kommune/saksbehandler / leietaker) | Tilgangsstyring | Avtale |
| Kommuneregion | Knytte bruker til riktig område | Avtale |
| Adresse/koordinater på bolig | Formidling av utleieobjekt | Avtale |
| Husregler, visuelle rapporter (overtakelsesrapporter) | Leieforholdet | Avtale |
| Chat-meldinger, vedlegg | Kommunikasjon mellom partene | Avtale |
| Signeringslogg (teknisk referanse, tidsstempel) | Gyldighetsbevis for signert avtale | Rettslig forpliktelse (art. 6 (1) c) |
| Lyd/logg fra BankID-flyt | Kun som transient token; ikke lagret i klartekst | — |
| Bankkontonummer (valgfritt, kun hvis utleier velger kontobetaling for fakturagrunnlag) | Generere fakturagrunnlag til kommunen/saksbehandler ved formidling | Avtale (art. 6 (1) b) |
| Påloggingsstatistikk / audit logs | IT-sikkerhet, feilsøking | Berettiget interesse |

Bankkontonummer lagres i tabellen `public.listing_invoice_basis` (én rad per
bolig) kun dersom utleier aktivt har valgt *kontobetaling* i stedet for
standard *fakturabetaling*. Tilgang er begrenset til utleier selv og
autoriserte saksbehandlere i samme region (rolle- og områdefiltrering). Informasjonen
krypteres i hvile (AES-256) på databasenivå og slettes automatisk 24 måneder
etter siste oppdatering når boligen ikke lenger er aktivt formidlet (se §5).

**Vi lagrer IKKE:**
- fødselsnummer eller DUF-nummer,
- bankkort, betalingskort-PAN, CVV eller annen betalingsinstrumentslegitimasjon,
- helseopplysninger, etnisitet eller politiske meninger,
- passord i klartekst (håndteres av Supabase Auth med bcrypt/argon2).

### 3. Informasjonskapsler og samtykke

Boly bruker informasjonskapsler i to kategorier:

| Kategori | Aktivt nå | Samtykke |
|---|---|---|
| **Strengt nødvendige** (innlogging, sesjon, CSRF-tokens) | Ja | Ikke påkrevd (ekomloven § 2-7b) |
| **Statistikk** (anonymisert, aggregert) | Planlagt | Aktivt samtykke |

Boly benytter **ikke** markedsføringskapsler eller sporing på tvers av
nettsteder. Dersom dette introduseres senere, vil kategorien legges til
som et nytt formål og alle brukere re-konsulteres (GDPR art. 6 (1) a,
EDPB 03/2022).

Brukeren kan når som helst endre valg via **«Informasjonskapsler»**-knappen
i bunnen av nettsiden. **«Avvis alle»** er plassert like lett tilgjengelig
som **«Godta alle»**, i tråd med Datatilsynets veileder og E-COM ACT
(implementert i norsk rett via ekomloven).

### 4. Delingspartnere (databehandlere)

| Leverandør | Formål | Lokasjon |
|---|---|---|
| **Supabase** (Auth + DB + Storage) | Backend, autentisering | EU (Frankfurt) |
| **Vercel** | Hosting av frontend | EU (Stockholm, `arn1`) |
| **Mailjet** | Utsending av transaksjonelle e-poster | EU |
| **Signicat** | BankID-signering (sandbox under utvikling) | EU (Norge) |
| **Kartverket / Geonorge** | Adressesøk (ingen personidentifikasjon) | Norge |

Boly sender **ikke** personopplysninger til land utenfor EU/EØS.

### 5. Lagringstid

- **Kontoopplysninger:** Så lenge kontoen er aktiv; slettes 12 måneder etter
  siste innlogging (konfigurerbart hos behandlingsansvarlig).
- **Signerte avtaler:** 5 år etter at leieforholdet er avsluttet
  (bokføringsloven § 13 (3)). Behandlingsansvarlig kan forlenge dette ved
  dokumentert arkiv- eller rettsbehov.
- **Chat/meldinger:** 24 måneder etter siste aktivitet.
- **Overtakelsesrapporter:** 3 år etter at rapporten er godkjent.
- **Bankkontonummer / fakturagrunnlag:** 24 måneder etter siste oppdatering
  når boligen ikke lenger er aktivt formidlet; slettet automatisk ved
  sletting av boligannonsen.
- **Audit logs:** 12 måneder.

### 6. Dine rettigheter (GDPR kap. III)

Du har rett til å:
- få **innsyn** i opplysningene vi har om deg (art. 15),
- få **rettet** feil (art. 16),
- be om **sletting** (art. 17),
- **begrense** behandlingen (art. 18),
- få **dataportabilitet** (art. 20),
- **protestere** mot behandling basert på berettiget interesse (art. 21).

Henvendelser om behandlingsansvarliges plikter sendes til kommunen/saksbehandler for ditt
område, eller
til [info@bolynorge.no](mailto:info@bolynorge.no) som vil videreformidle.

**Klagerett:** Du kan klage til [Datatilsynet](https://www.datatilsynet.no)
dersom du mener behandlingen er i strid med loven.

### 7. Sikkerhet

- All kommunikasjon skjer over HTTPS (TLS 1.2+).
- Passord håndteres av Supabase Auth (bcrypt/argon2).
- Tilgang til data styres slik at brukere normalt bare ser egne opplysninger og
  det som er nødvendig for rollen og området de er knyttet til.
- Signering av avtaler gjøres med **BankID** (kvalifisert elektronisk signatur).
- Ratebegrensning: maks 3 signeringsforsøk per konto per døgn.

### 8. Endringer

Vesentlige endringer varsles via e-post og i appen minst 14 dager i forveien.

---

## English

### 1. Who we are

Boly is a service that mediates contact between **landlords** (homeowners)
and **tenants** in a regulated, municipality-approved loop. **Gamechanging AS**
owns and operates Boly. Nav has contributed to development in partnership with
Gamechanging and is **not** a data processor for personal data in the platform.

**Data Controller:** The municipality / case-handler organisation that has
activated Boly for your area is the controller for data processed in the
service. Boly (Gamechanging) acts as a **data processor** on behalf of the
controller.

**Contact:** [info@bolynorge.no](mailto:info@bolynorge.no)

### 2. What personal data we process

We only process data that is necessary to deliver the service (the
principle of **data minimization**, GDPR art. 5 (1) c):

| Category | Purpose | Legal basis |
|---|---|---|
| Name, email, phone | Account, login, notifications | Contract (art. 6 (1) b) |
| Preferred locale | UI and email language | Legitimate interest (art. 6 (1) f) |
| Role (landlord / municipality / case handler / tenant) | Access control | Contract |
| Municipality region | Linking user to the right area | Contract |
| Property address / coordinates | Mediating rental objects | Contract |
| House rules, handover reports | The tenancy | Contract |
| Chat messages, attachments | Party communication | Contract |
| Signing log (technical reference, timestamp) | Proof of signed agreement | Legal obligation (art. 6 (1) c) |
| Bank account number (optional, only if the landlord opts in to account-based invoicing) | Generating invoice basis for the municipality / case handler upon mediation | Contract (art. 6 (1) b) |
| Login / audit logs | IT security, troubleshooting | Legitimate interest |

Bank account numbers are stored in `public.listing_invoice_basis` (one row
per listing) only when the landlord has actively selected *account-based*
invoicing instead of the default *invoice-based* flow. Access is restricted
to the landlord and authorised case handlers in the same region (role- and
area-based access controls). The data is encrypted at rest (AES-256) at the database
level and automatically deleted 24 months after last update once the listing
is no longer actively mediated (see §5).

**We do NOT store:**
- Norwegian national identity number (fødselsnummer) or DUF-number,
- payment card PAN, CVV or any payment instrument credentials,
- health data, ethnicity or political opinions,
- passwords in plaintext (handled by Supabase Auth with bcrypt/argon2).

### 3. Cookies and consent

Boly uses cookies in two categories:

| Category | Active today | Consent |
|---|---|---|
| **Strictly necessary** (login, session, CSRF tokens) | Yes | Not required (Norwegian Electronic Communications Act § 2-7b) |
| **Analytics** (anonymised, aggregated) | Planned | Active consent |

Boly does **not** use marketing cookies or cross-site tracking. If this is
ever introduced, the category will be added as a new purpose and all users
will be re-consented (GDPR art. 6 (1) a, EDPB 03/2022).

Users can change their choice at any time via the **"Cookies"** button in
the footer. **"Reject all"** is placed just as easily accessible as
**"Accept all"**, in line with guidance from the Norwegian Data Protection
Authority and the E-COM ACT.

### 4. Data processors

| Provider | Purpose | Location |
|---|---|---|
| **Supabase** (Auth + DB + Storage) | Backend, authentication | EU (Frankfurt) |
| **Vercel** | Frontend hosting | EU (Stockholm, `arn1`) |
| **Mailjet** | Transactional email | EU |
| **Signicat** | BankID signing (sandbox during development) | EU (Norway) |
| **Kartverket / Geonorge** | Address lookup (no personal identification) | Norway |

Boly does **not** transfer personal data outside the EU/EEA.

### 5. Retention

- **Account data:** As long as the account is active; deleted 12 months
  after last login (configurable by the controller).
- **Signed agreements:** 5 years after the tenancy ends
  (Norwegian Bookkeeping Act § 13 (3)). The controller may extend this if an
  archival or legal-claim need is documented.
- **Chat/messages:** 24 months after last activity.
- **Handover reports:** 3 years after the report is approved.
- **Bank account number / invoice basis:** 24 months after last update,
  once the listing is no longer actively mediated; cascaded automatically
  when the listing itself is deleted.
- **Audit logs:** 12 months.

### 6. Your rights (GDPR ch. III)

You have the right to:
- **access** the data we hold about you (art. 15),
- **rectification** (art. 16),
- **erasure** (art. 17),
- **restriction** (art. 18),
- **data portability** (art. 20),
- **object** to processing based on legitimate interest (art. 21).

Requests about the controller’s obligations should be sent to your municipality
/ case-handler organisation for your area, or to
[info@bolynorge.no](mailto:info@bolynorge.no) who will forward them.

**Right to complain:** You may complain to
[Datatilsynet](https://www.datatilsynet.no) (the Norwegian DPA) if you
believe the processing violates the law.

### 7. Security

- All traffic is encrypted with HTTPS (TLS 1.2+).
- Passwords are handled by Supabase Auth (bcrypt/argon2).
- Access is designed so users normally only see their own data and what their
  role and assigned area require.
- Agreements are signed with **BankID** (qualified electronic signature).
- Rate limiting: max 3 signing attempts per account per 24h.

### 8. Changes

Material changes are announced by email and in-app at least 14 days in
advance.

---

## Appendix A — Data minimization map (Boly data model)

Actual columns present in the production schema, categorised. This is the
internal ground-truth used to keep the above plain-language description
in sync with the codebase.

### `public.profiles`
| Column | Classification | Notes |
|---|---|---|
| `id` (uuid, FK → `auth.users`) | Identifier | Opaque UUID |
| `full_name` | PII (low) | — |
| `email` | PII (low) | Also lives in `auth.users` |
| `role` | Not personal | Enum-like (`homeowner` / `kommune_ansatt` / `kommune_admin` / `tenant`) |
| `contact_phone` | PII (low) | Optional |
| `kommune_region` | Operational | Not personal in itself |
| `kommune_can_edit` | Operational | Boolean |
| `preferred_locale` | Preference | Non-sensitive |
| `email_notifications_enabled` | Preference | Non-sensitive |
| `updated_at` | System | — |

### `public.listings`
- Address / coordinates (PII about the property, not directly about person)
- `payment_method`, `pet_policy`, `house_rules_pdf_path` — operational
- Linked to `profiles.id` via owner

### `public.handover_reports`
- Images (stored in `handover-reports` bucket) — may incidentally show
  possessions; treat as sensitive contextual data
- `approval_status`, `approved_by`, `approved_at` — operational

### `public.audit_logs`
- `user_id`, `event_type`, `burst_count_before`, `daily_count_before`,
  timestamps — retained for 12 months (see §5)

### `auth.users` (Supabase managed)
- `email`, hashed password, `created_at`, `last_sign_in_at`
- **No** `raw_user_meta_data` stores fødselsnummer — verified 2026-04-20.

### What we deliberately do **not** store
- Fødselsnummer / DUF-number (Signicat `sub` is treated as a transient
  token and not persisted in our DB beyond the signing session id)
- Bank / payment card data
- IP addresses beyond Vercel edge / Supabase default logs
- Biometrics
