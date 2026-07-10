# Navnekonvensjoner — Boly / Hjerterom / Hjerterum

Produktet heter i dag **Hjerterom**. Kodebasen bærer fortsatt tre eldre navn.
Dette dokumentet er kartet til full rename (blueprint Tier 3.7).

| Navn | Hvor det lever | Status |
|---|---|---|
| **Hjerterom** | UI-tekster, metadata, markedsføring | Gjeldende produktnavn |
| **Hjerterum** | Migrasjonsfiler (`hjerterum_*`), enkelte CSS-filer | Historisk stavevariant — behold i migrasjonsnavn (immutable) |
| **Boly** | ~59 kodefiler: pakkenavn, loggprefikser, `boly-*` localStorage-nøkler (`boly-theme`, `boly-locale`, `boly-theme-guest`), ikonfiler | Legacy — rename krever migreringsshim for storage-nøkler |
| **Boligbank(en)** | Eldre docs | Legacy — kun tekst, kan renames fritt |

**Viktig ved rename av `boly-*` storage-nøkler:** eksisterende brukere har
verdier under gamle nøkler. Shim må lese gammel nøkkel én gang, skrive ny,
og slette gammel — ellers mister brukere tema-/språkvalg.
