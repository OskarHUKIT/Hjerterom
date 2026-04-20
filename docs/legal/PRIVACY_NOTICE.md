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

Boly er en tjeneste som hjelper **kommuner** med å formidle kontakt mellom
**utleiere** («homeowners») og **leietakere** i et regulert,
kommune-godkjent kretsløp. Tjenesten utvikles og driftes av **Nav Narvik**
i samarbeid med **Gamechanging**.

**Behandlingsansvarlig (Data Controller):**
Kommunen som har aktivert Boly for sitt område er behandlingsansvarlig
for personopplysningene om sine innbyggere. Boly opptrer som
**databehandler** på vegne av kommunen.

**Kontakt:** [info@bolynorge.no](mailto:info@bolynorge.no)

### 2. Hvilke personopplysninger vi behandler

Vi behandler kun opplysninger som er nødvendige for å levere tjenesten
(prinsippet om **dataminimering**, GDPR art. 5 (1) c):

| Kategori | Formål | Rettslig grunnlag |
|---|---|---|
| Navn, e-post, telefon | Konto, innlogging, varsler | Avtale (art. 6 (1) b) |
| Foretrukket språk | Språkvalg for UI og e-post | Berettiget interesse (art. 6 (1) f) |
| Rolle (utleier / kommune / leietaker) | Tilgangsstyring | Avtale |
| Kommuneregion | Knytte bruker til riktig kommune | Avtale |
| Adresse/koordinater på bolig | Formidling av utleieobjekt | Avtale |
| Husregler, visuelle rapporter (overtakelsesrapporter) | Leieforholdet | Avtale |
| Chat-meldinger, vedlegg | Kommunikasjon mellom partene | Avtale |
| Signeringslogg (Signicat session-id, tidsstempel) | Gyldighetsbevis for signert avtale | Rettslig forpliktelse (art. 6 (1) c) |
| Lyd/logg fra BankID-flyt | Kun som transient token; ikke lagret i klartekst | — |
| Påloggingsstatistikk / audit logs | IT-sikkerhet, feilsøking | Berettiget interesse |

**Vi lagrer IKKE:**
- fødselsnummer eller DUF-nummer,
- bankopplysninger,
- helseopplysninger, etnisitet eller politiske meninger,
- passord i klartekst (håndteres av Supabase Auth med bcrypt/argon2).

### 3. Informasjonskapsler og samtykke

Boly bruker informasjonskapsler i tre kategorier:

| Kategori | Aktivt nå | Samtykke |
|---|---|---|
| **Strengt nødvendige** (innlogging, sesjon, CSRF-tokens) | Ja | Ikke påkrevd (ekomlova § 2-7b) |
| **Statistikk** (anonymisert, aggregert) | Planlagt | Aktivt samtykke |
| **Markedsføring / tredjepart** | Nei | Aktivt samtykke |

Brukeren kan når som helst endre valg via **«Informasjonskapsler»**-knappen
i bunnen av nettsiden. **«Avvis alle»** er plassert like lett tilgjengelig
som **«Godta alle»**, i tråd med Datatilsynets veileder og E-COM ACT
(implementert i norsk rett via ekomlova).

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
  siste innlogging (konfigurerbart per kommune).
- **Signerte avtaler:** 10 år etter at leieforholdet er avsluttet (bokførings-
  og dokumentasjonshensyn).
- **Chat/meldinger:** 24 måneder etter siste aktivitet.
- **Overtakelsesrapporter:** 3 år etter at rapporten er godkjent.
- **Audit logs:** 12 måneder.

### 6. Dine rettigheter (GDPR kap. III)

Du har rett til å:
- få **innsyn** i opplysningene vi har om deg (art. 15),
- få **rettet** feil (art. 16),
- be om **sletting** (art. 17),
- **begrense** behandlingen (art. 18),
- få **dataportabilitet** (art. 20),
- **protestere** mot behandling basert på berettiget interesse (art. 21).

Henvendelser sendes til kommunen der du bor (behandlingsansvarlig), eller
til [info@bolynorge.no](mailto:info@bolynorge.no) som vil videreformidle.

**Klagerett:** Du kan klage til [Datatilsynet](https://www.datatilsynet.no)
dersom du mener behandlingen er i strid med loven.

### 7. Sikkerhet

- All kommunikasjon skjer over HTTPS (TLS 1.2+).
- Passord håndteres av Supabase Auth (bcrypt/argon2).
- Database-tilgang er beskyttet av **Row Level Security (RLS)**; ingen bruker
  kan lese data som tilhører en annen kommune eller bruker.
- Signering av avtaler gjøres med **BankID via Signicat** (kvalifisert
  elektronisk signatur).
- Ratebegrensning: maks 3 signeringsforsøk per konto per døgn.

### 8. Endringer

Vesentlige endringer varsles via e-post og i appen minst 14 dager i forveien.

---

## English

### 1. Who we are

Boly is a service that helps **Norwegian municipalities** mediate rental
agreements between **landlords** (homeowners) and **tenants** in a
regulated, municipality-approved loop. The service is developed and
operated by **Nav Narvik** in cooperation with **Gamechanging**.

**Data Controller:** The municipality that activates Boly for its area
is the data controller for personal data about its residents. Boly acts
as a **data processor** on behalf of the municipality.

**Contact:** [info@bolynorge.no](mailto:info@bolynorge.no)

### 2. What personal data we process

We only process data that is necessary to deliver the service (the
principle of **data minimization**, GDPR art. 5 (1) c):

| Category | Purpose | Legal basis |
|---|---|---|
| Name, email, phone | Account, login, notifications | Contract (art. 6 (1) b) |
| Preferred locale | UI and email language | Legitimate interest (art. 6 (1) f) |
| Role (landlord / municipality / tenant) | Access control | Contract |
| Municipality region | Linking user to the right municipality | Contract |
| Property address / coordinates | Mediating rental objects | Contract |
| House rules, handover reports | The tenancy | Contract |
| Chat messages, attachments | Party communication | Contract |
| Signing log (Signicat session-id, timestamp) | Proof of signed agreement | Legal obligation (art. 6 (1) c) |
| Login / audit logs | IT security, troubleshooting | Legitimate interest |

**We do NOT store:**
- Norwegian national identity number (fødselsnummer) or DUF-number,
- banking information,
- health data, ethnicity or political opinions,
- passwords in plaintext (handled by Supabase Auth with bcrypt/argon2).

### 3. Cookies and consent

Boly uses cookies in three categories:

| Category | Active today | Consent |
|---|---|---|
| **Strictly necessary** (login, session, CSRF tokens) | Yes | Not required (Norwegian Electronic Communications Act § 2-7b) |
| **Analytics** (anonymised, aggregated) | Planned | Active consent |
| **Marketing / third-party** | No | Active consent |

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
  after last login (configurable per municipality).
- **Signed agreements:** 10 years after the tenancy ends (bookkeeping and
  documentation).
- **Chat/messages:** 24 months after last activity.
- **Handover reports:** 3 years after the report is approved.
- **Audit logs:** 12 months.

### 6. Your rights (GDPR ch. III)

You have the right to:
- **access** the data we hold about you (art. 15),
- **rectification** (art. 16),
- **erasure** (art. 17),
- **restriction** (art. 18),
- **data portability** (art. 20),
- **object** to processing based on legitimate interest (art. 21).

Requests should be sent to your municipality (the controller), or to
[info@bolynorge.no](mailto:info@bolynorge.no) who will forward them.

**Right to complain:** You may complain to
[Datatilsynet](https://www.datatilsynet.no) (the Norwegian DPA) if you
believe the processing violates the law.

### 7. Security

- All traffic is encrypted with HTTPS (TLS 1.2+).
- Passwords are handled by Supabase Auth (bcrypt/argon2).
- Database access is protected by **Row Level Security (RLS)**; no user
  can read data belonging to another municipality or user.
- Agreements are signed via **BankID through Signicat** (qualified
  electronic signature).
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
