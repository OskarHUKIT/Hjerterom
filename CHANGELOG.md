# Endringslogg

## 13. feb – 3. mars 2026 (mobil, varsler, lys modus, utleier)

### Mobil / Responsivitet
- **Registrer ny bolig:** Mobilvennlig skjema – enkelt kolonne, mindre padding, fullbredde-knapp
- **Mine boliger:** Sidebar blir horisontale faner på mobil, boligkort stables vertikalt, touch-vennlige knapper
- **Database-siden:** Touch-vennlige ikonknapper (44px), MapView responsiv høyde
- **Header:** Safe-area padding, varsel-ikon ved siden av hamburger på mobil
- **Forside:** Hero mindre padding på små skjermer

### Varsler
- **TERMS_SIGNED:** Sendes kun til kommune-ansatte – utleier får aldri melding om egen signert avtale
- **«Løst av kollega»:** Vises kun for kommune når kollega har markert; utleier ser «Markert som ferdig» når de selv markerer
- **Varsel-ikon i header:** Synlig på mobil for rask tilgang til varsler

### Innlogging og roller
- **For boligeiere:** Når kommune er logget inn, vises melding «Du må logge inn på en annen konto» + Logg ut-knapp i stedet for lenker

### Lys modus
- **Lesbarhet:** Portalkort og Trust-seksjon får lys bakgrunn, beskrivelsestekst bruker mørkere farge (text-body) for bedre kontrast

### Utleier – forenklinger
- **Historikk fjernet:** Utleier trenger ikke historikk-siden – fanen og innhold er fjernet
- **Korte nav-labels:** På skjermer ≤600px: «Mine boliger»→«Boliger», «Signert avtale»→«Avtale», «Meldinger til Kommune»→«Meldinger»

### Diverse
- Rettet import av supabase-klient i forsiden
- Nye oversettelser: `loginWithOtherAccount`, `resolvedByYou`, `myPropertiesTabShort`, `signTermsNavShort`, `messagesToKommuneShort`

---

## Siste uke (ca. 13.–20. feb 2026)

- **Flerspråklighet:** Norsk, nordsamisk og engelsk – språkvelger i brukerpanelet
- **Tema:** Lys/mørk modus med veksling i brukerpanelet
- **Overtakelsesrapport:** Skjema for utleier og leietaker, med bildefunksjon
- **Påminnelse:** Automatisk påminnelse når formidlet periode starter om 1 dag uten rapport
- **Varsler:** Push-varsler på mobil (PWA), varselkort flyttet til varsler-fanen
- **Endringshistorikk:** Søk og datofilter i brukerprofil og hjemmeside-forvaltning
- **Kommune:** Kan se audit-logg for alle ikke-kommune-brukere
- **BankID:** Rettelser for signering av avtale (autorisation, URL)
- **Diverse:** Formidlet-visning justert, kontrastforbedringer i lys modus
