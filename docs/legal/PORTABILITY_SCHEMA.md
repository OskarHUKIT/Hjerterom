# Portability Schema — Boly brukerdataeksport

> **Versjon:** 1.0.0
> **Sist oppdatert:** 2026-04-21
> **Schema URI:** `https://bolynorge.no/schemas/user-data-export/v1`
> **Standarder:** GDPR art. 20, W3C Best Practices for Publishing Linked Data

## Formål

Dette dokumentet beskriver strukturen og innholdet i JSON-filen som lastes
ned av bruker via `/settings/privacy` → «Last ned mine data», eller
programmatisk via `GET /api/user/export`.

Formatet er **maskinlesbart**, tidssonenøytralt (all timestamps i ISO 8601
UTC) og kompatibelt med GDPR art. 20 (dataportabilitet).

## Top-level struktur

```jsonc
{
  "$schema": "https://bolynorge.no/schemas/user-data-export/v1",
  "export_version": "1.0.0",
  "exported_at": "2026-04-21T14:30:05Z",

  "subject": {
    "user_id": "uuid",
    "email": "string | null",
    "phone": "string | null"
  },

  "controller_contact": {
    "note": "Kommunen er behandlingsansvarlig ...",
    "region": "Narvik",
    "dpo_name": "Personvernombud Narvik kommune",
    "dpo_email": "personvernombud@narvik.kommune.no",
    "dpo_phone": "string | null",
    "processor_contact": "info@bolynorge.no",
    "supervisory_authority": "https://www.datatilsynet.no"
  },

  "retention_notice": {
    "account_data": "12 måneder etter siste innlogging",
    "signed_agreements": "5 år etter avsluttet leieforhold (bokføringsloven § 13 (3))",
    "chat_messages": "24 måneder etter siste aktivitet",
    "handover_reports": "3 år etter godkjenning",
    "invoice_basis": "24 måneder etter siste oppdatering ...",
    "notifications": "12 måneder",
    "audit_logs": "12 måneder",
    "reference": "docs/legal/PRIVACY_NOTICE.md §5"
  },

  "data": { /* se seksjoner nedenfor */ },
  "storage_objects": { /* se seksjon «Storage» */ }
}
```

## `data` — tabelldump

Hver nøkkel er en array av rader fra én tabell i `public`-skjemaet i
Supabase. Arrays er **tomme** hvis brukeren ikke har rader der.

| Nøkkel | Kilde | Filter | Merknad |
|---|---|---|---|
| `profile` | `public.profiles` | `id = auth.uid()` | Enkelt objekt (ikke array) |
| `auth` | `auth.users` (kun egne kolonner) | `id = auth.uid()` | E-post, telefon, sign-in-historikk |
| `listings` | `public.listings` | `owner_id = auth.uid()` | Alle boliger brukeren har registrert |
| `listing_invoice_basis` | `public.listing_invoice_basis` | via `listings` | Bankkontonummer, KID, beløp (kun hvis utleier har lagt inn) |
| `listing_availability` | `public.listing_availability` | via `listings` | Formidlingsperioder |
| `listing_mediation_reservations` | `public.listing_mediation_reservations` | via `listings` | Reservasjonsdata |
| `user_agreements` | `public.user_agreements` | `user_id = auth.uid()` | Signert vilkårsavtale (BankID-ankret) |
| `user_terms_acceptances` | `public.user_terms_acceptances` | `user_id = auth.uid()` | Versjonerte vilkår-signeringer |
| `chat_messages` | `public.chat_messages` | `sender_id = uid OR receiver_id = uid` | Begge retninger |
| `notifications` | `public.notifications` | `owner_id = uid OR related_user_id = uid` | Varsler til eller om brukeren |
| `handover_reports` | `public.handover_reports` | via `listings` | Overtakelsesrapporter |
| `audit_logs` | `public.audit_logs` | `user_id = auth.uid()` | Kun egne handlinger. `performed_by_user_id` er strippet fra `details` for å ikke lekke kommune-saksbehandleres ID |
| `push_subscriptions` | `public.push_subscriptions` | `owner_id = auth.uid()` | Kun `id`, `endpoint`, `created_at` — ikke krypto-nøkler |
| `landlord_resign_requests` | `public.landlord_resign_requests` | `user_id = auth.uid()` | Forespørsler om ny vilkårssignering |

### Ekskludert fra eksport (bevisst)

Følgende data returneres **ikke**, selv om de indirekte handler om brukeren:

- **Kommunens interne notater** (`internal_notes`, `nav_notes`) — dette er
  kommunens egne saksbehandlingsnotater og utgis via ordinær
  innsynsforespørsel til behandlingsansvarlig (GDPR art. 15), ikke som
  selvbetjent eksport fra databehandler.
- **Andre brukeres rader** — f.eks. en kommune-ansatts identitet som har
  godkjent en vilkårsavtale om deg. Disse kan forespørres fra kommunen.
- **Passord-hash** — umulig å gjenopprette, ingen verdi for bruker.
- **Krypto-nøkler fra `push_subscriptions`** (p256dh, auth) — disse er
  device-bundet og har ingen portabilitetsverdi.

## `storage_objects` — filer i Supabase Storage

Denne seksjonen lister **stier** (ikke blob-innhold) til bucket-objekter
som er knyttet til brukerens konto. Filene selv kan lastes ned direkte via
app-en eller via signerte URL-er.

```jsonc
{
  "note": "Stier til filer i Supabase Storage ...",
  "listings_bucket": [
    { "name": "<listing-id>/bilde-1.jpg", "created_at": "...", "size_bytes": "123456" }
  ],
  "chat_images_bucket": [ ... ],
  "handover_reports_bucket": [ ... ]
}
```

Hvis Storage-scannet feiler (manglende rettigheter e.l.), returneres
`{ "error": "<feilmelding>", "note": "Kontakt info@bolynorge.no..." }`.

## Tidsstempler

Alle timestamps er ISO 8601 i UTC (Z-suffix). Eksempel: `2026-04-21T14:30:05Z`.

Postgres-felter av typen `timestamptz` kan inneholde tidssonesuffix
(f.eks. `+00:00`) — dette er semantisk likeverdig med Z.

## Identifikatorer

- `user_id`: UUID v4 fra Supabase Auth
- `listing_id`, `id`: UUID v4 generert serverside
- `signingSessionId` (i `audit_logs.details`): ugjennomsiktig streng fra
  Signicat, ≤ 400 tegn

## Versjonering

Ved bakoverkompatible endringer (nye nøkler) økes `export_version`
patch-versjon (1.0.1). Ved breaking changes økes major (2.0.0) og et nytt
schema-URL publiseres.

## Sikkerhet

- Endpoint krever gyldig Bearer JWT
- RPC bruker `auth.uid()` internt — ingen parametre
- `Cache-Control: no-store` forhindrer mellomlagring
- Responsstørrelse typisk 10–500 KB; gir ikke egen rate-limit i dag, men
  kan bli lagt til i Vercel edge hvis misbruk observeres.

## Referanser

- GDPR art. 15, 20, 12 (3)
- W3C *Data on the Web Best Practices* (BP 8, 9, 12)
- docs/legal/PRIVACY_NOTICE.md §6
- supabase/migrations/20260429122000_rpc_user_data_export.sql
