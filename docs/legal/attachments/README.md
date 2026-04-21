# DBA-vedlegg — sertifiseringer og revisjonsrapporter

Denne mappen samler dokumentasjon som Gamechanging AS plikter å stille til
rådighet for Behandlingsansvarlig (Narvik kommune) i henhold til:

- DBA v3.1 §10 (Revisjon) og Vedlegg C.8 (Revisjon av underdatabehandlere)
- DBA v3.1 Vedlegg D.5 (status-tabell — SOC 2 / ISO 27001 innen 30 dager etter signering)

## Struktur

```
attachments/
├── supabase/
│   ├── SOC2_TypeII_YYYY-MM-DD.pdf
│   ├── ISO27001_certificate_YYYY-MM-DD.pdf
│   └── DPA_YYYYMMDD.pdf
├── vercel/
│   ├── SOC2_TypeII_YYYY-MM-DD.pdf
│   ├── ISO27001_certificate_YYYY-MM-DD.pdf
│   └── DPA_YYYYMMDD.pdf
└── signicat/
    └── DPA_YYYYMMDD.pdf
```

## Nedlastingskilder (offisielle trust centers)

| Leverandør | URL | Krever innlogging? |
|---|---|---|
| Supabase | <https://trust.supabase.com/> | Delvis — noen dokumenter bak NDA-klikk |
| Vercel | <https://trust.vercel.com/> | Delvis — NDA-klikk for SOC 2 |
| Signicat | <https://www.signicat.com/trust-center> eller kundeportal | Kundeportal-innlogging |

## Rutine

1. **Innen 30 dager etter DBA-signering:** Last ned SOC 2 Type II + ISO 27001 for
   Supabase og Vercel og legg i respektive undermapper. Navngi med utstedelsesdato.
2. **Årlig:** Sjekk at rapportene ikke er utløpt (SOC 2 Type II er typisk gyldig
   12 måneder). Erstatt utløpte med nye utgaver.
3. **Ad-hoc:** Hvis en leverandør får alvorlig funn i revisjon, oppdater
   `TIA_<leverandør>.md` og varsle Behandlingsansvarlig iht. DBA §8.

## Status-sporing

| Dokument | Status | Utløper | Sist verifisert |
|---|---|---|---|
| Supabase SOC 2 Type II | Ikke lastet ned ennå | — | — |
| Supabase ISO 27001 | Ikke lastet ned ennå | — | — |
| Vercel SOC 2 Type II | Ikke lastet ned ennå | — | — |
| Vercel ISO 27001 | Ikke lastet ned ennå | — | — |
| Signicat DPA | Ikke lastet ned ennå | — | — |

## Konfidensialitet

Filer i denne mappen er underlagt NDA med respektive leverandører.
**Ikke publiser på bolynorge.no, GitHub public repo, eller deles med tredjepart uten
skriftlig samtykke.** Hvis repoet gjøres offentlig, må disse filene flyttes til
intern/privat lagring og refereres via .gitignore.
