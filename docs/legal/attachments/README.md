# DBA-vedlegg — sertifiseringer og revisjonsrapporter

Denne mappen samler dokumentasjon som Gamechanging AS plikter å stille til
rådighet for Behandlingsansvarlig (Narvik kommune) i henhold til:

- DBA v3.2 §10 (Revisjon) og Vedlegg B.3 (dokumentasjonskjede for
  sikkerhetskontroller)
- DBA v3.2 Vedlegg D.5 (status-tabell)

## Tilnærming: «tilsvarende dokumentasjon»

DBA v3.2 §10.2 anerkjenner eksplisitt at GDPR art. 28 (3) (h)-
forpliktelsen om revisjonsrett kan oppfylles gjennom en **kombinasjon** av:

- offentlige DPA-er med SCC,
- leverandørens TIA,
- leverandørens Trust Center / Security-portal,
- underleverandørers sertifikater (f.eks. AWS SOC 2 for infrastruktur),
- Transparency Reports.

Direkte SOC 2 Type II-rapport fra **Supabase Inc.** er kun tilgjengelig
under NDA på **Team-plan eller høyere** (relativt kostbart). Dette er
**ikke** et hinder for GDPR-compliance — Vedlegg B.3 i DBA viser
hvordan AWS SOC 2 + Supabase Trust Center + Supabase's offisielle TIA
samlet dekker art. 28 (3) (h) for Supabase-infrastrukturen.

## Struktur

```
attachments/
├── supabase/
│   ├── TIA_20250314.pdf          ✅ Hentet 2026-04-21 (offisiell, mars 2025)
│   ├── DPA_YYYYMMDD.pdf          (tilgjengelig på https://supabase.com/legal/dpa)
│   └── SOC2_TypeII_YYYY-MM-DD.pdf (krever Team-plan + NDA — valgfritt)
├── vercel/
│   ├── DPA_20260317.pdf          ✅ Hentet 2026-04-21 (offisiell, mars 2026)
│   └── SOC2_TypeII_YYYY-MM-DD.pdf (tilgjengelig under NDA via security.vercel.com)
└── signicat/
    └── DPA_YYYYMMDD.pdf          (innhentes via Signicat kundeportal)
```

## Nedlastingskilder (offisielle trust centers)

| Leverandør | URL | Krever innlogging? |
|---|---|---|
| Supabase Trust Center | <https://trust.supabase.com/> | Delvis — SOC 2 bak NDA/plan |
| Supabase DPA (offentlig) | <https://supabase.com/legal/dpa> | Nei |
| Supabase TIA (offentlig PDF) | <https://supabase.com/downloads/docs/Supabase+TIA+250314.pdf> | Nei |
| Vercel Security / Trust | <https://security.vercel.com> | Delvis — SOC 2 bak NDA-klikk |
| Vercel DPA (offentlig) | <https://vercel.com/legal/dpa> | Nei |
| Signicat | <https://www.signicat.com/trust-center> eller kundeportal | Kundeportal-innlogging |

## Rutine

1. **Ved DBA-signering:** Bekreft at denne mappen inneholder aktuelle
   offentlige DPA-er og TIA-er (ikke utløpt). De to kritiske er
   allerede arkivert (se status-tabell).
2. **Ved første revisjon eller myndighetsforespørsel:** Innhent Vercel
   SOC 2 Type 2 under NDA via `security.vercel.com`. Legg i mappen,
   men IKKE commit til offentlig repo (se §Konfidensialitet).
3. **Årlig:** Sjekk at DPA-ene ikke er oppdatert (sjekk «Last Updated»-
   dato på offentlig side). Erstatt ved behov og oppdater status-
   tabellen under.
4. **Ad-hoc:** Hvis en leverandør får alvorlig funn i revisjon, oppdater
   `TIA_<leverandør>.md` og varsle Behandlingsansvarlig iht. DBA §8.

## Status-sporing

| Dokument | Status | Dato | Sist verifisert |
|---|---|---|---|
| **Supabase offisielle TIA** | ✅ Arkivert | 2025-03-14 | 2026-04-21 |
| Supabase DPA (offentlig) | Ikke arkivert lokalt — tilgjengelig online | — | 2026-04-21 |
| Supabase SOC 2 Type II | Valgfritt — dekket av AWS SOC 2 + Trust Center (se DBA B.3) | — | — |
| Supabase ISO 27001 | Valgfritt — dekket av AWS ISO 27001 (se DBA B.3) | — | — |
| **Vercel offisielle DPA** | ✅ Arkivert | 2026-03-17 | 2026-04-21 |
| Vercel SOC 2 Type 2 | Innhentes via `security.vercel.com` ved første revisjon | — | — |
| Signicat DPA | Innhentes via kundeportal ved første revisjon | — | — |
| Mailjet DPA | Offentlig på Mailjet.com — arkiveres ved behov | — | — |

## Konfidensialitet

- **Offentlige DPA-er og TIA-er** (som de to allerede arkiverte) kan
  trygt oppbevares i versjonskontroll.
- **SOC 2 Type II / ISO 27001-rapporter under NDA** må **ikke** committes
  til offentlig repo. Hvis repoet gjøres offentlig: legg dem i intern
  lagring og refererer via `.gitignore` eller Git LFS med restricted
  access.
- Ikke deles med tredjepart uten skriftlig samtykke fra leverandøren.
