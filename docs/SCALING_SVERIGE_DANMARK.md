# Skalering til Sverige og Danmark

Kort vurdering av hva som må endres for å støtte Sverige og Danmark med nåværende oppsett.

## Nåværende Norge-spesifikke deler

| Område | Hva som er land-spesifikt | Vanskelighetsgrad |
|--------|---------------------------|-------------------|
| **Adresse/geokoding** | `geocodeAddress`: hardkodet `, Norway` i Nominatim-spørring; by/kommune fra norsk struktur | Lav – bytt land-parameter og evt. feltmapping (county/kommun) |
| **Språk** | Norsk som hovedspråk; i18n finnes (no/en/sme) | Lav – legge til sv/dk og oversettelser |
| **BankID / signering** | Signicat-integrasjon med norsk BankID (idpName: "nbid"); vilkårsavtale på norsk | Medium – Sverige: BankID SE; Danmark: MitID/NemID. Signicat støtter flere land; bytt idp og avtaledokumenter |
| **Kommuner** | `kommune_region` og filtrering basert på norske kommunenavn | Lav – samme logikk; bytt til svenske/danske kommuner i profiler |
| **Valuta** | Priser uten eksplisitt valuta (antatt NOK) | Lav – f.eks. valuta-felt per listing eller per bruker/kommune |
| **Postnummer** | 4 siffer (norsk format) | Lav – format validering per land (SE 3+2, DK 4) |
| **Juridisk/avtaler** | Vilkårsavtale, kontaktinfoskjema, tekster under norsk lov | Medium – tilpasse avtaler og tekster til svensk/dansk lov |
| **Varsler/e-post** | Norsk språk i maler | Lav – følger i18n |

## Anbefalt tilnærming

1. **Fase 1 (rask)**  
   - i18n: språk sv/dk og oversettelser.  
   - Geokoding: land-parameter (evt. bruker/kommune-valgt land).  
   - Kommune: samme `kommune_region`-logikk med svenske/danske kommunenavn.

2. **Fase 2 (medium)**  
   - BankID/Signicat: konfigurer signeringsflyt for Sverige og Danmark (idp, redirect-URLer, avtaledokumenter).  
   - Valuta: valgfritt valuta-felt eller standard per land (SEK/DKK).  
   - Postnummer: validering og formatering per land.

3. **Fase 3 (juridisk)**  
   - Tilpasse vilkårsavtale og andre juridiske tekster til svensk og dansk lov og praksis.

**Oppsummert:** Med nåværende rigg er det **moderat arbeid** (ikke veldig vanskelig): mye er allerede generisk (kommune, lister, brukere, RLS). Hovedjobben er BankID/signering, geokoding per land, i18n og juridiske tekster.
