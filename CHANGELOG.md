# Endringslogg

## 2025-02-22

### App-ytelse og brukeropplevelse

- **Fjernet unødvendige lasteranimasjoner** – Alle fullskjerm-loadere (Loader2, animate-spin) er erstattet med enkle tomme bokser
- **Mine boliger, Brukere, Varsler, Boligbanken, Meldinger, Utløpte** – Viser nå tom kort/minimal placeholder i stedet for spinner mens data hentes
- **Knapper** – Loading-tilstand vises med statisk ikon (redusert opacity) i stedet for roterende spinner
- **Suspense-fallback** – Enkle tomme containere i stedet for «Laster...»-tekst

### Bruker- og chatvisning

- **«Ukjent bruker» i meldinger** – Ny RPC `get_user_display_name` henter navn fra auth.users, profiles og listings
- **Samtaler-listen** – Viser nå riktig brukernavn (ikke bare e-post)
- **Chat-header** – «Chat med Ukjent bruker» erstattet med faktisk navn
- **Brukerprofil «Bruker ikke funnet»** – Ny RPC `get_single_user_for_kommune` finner også BankID-brukere uten profil-rad i `profiles`

### BankID-innlogging

- **Ikke husk innlogging ved BankID** – BankID-sesjon bruker nå sessionStorage (utlogging når nettleser/tab lukkes)
- **URL-deteksjon** – Forbedret sjekk for bankid=1 i query og hash

### UI-tekst

- **Forside** – «For Kommune-ansatte» endret til «For kommuneansatte»

### PWA Push-varsler

- **Ny Edge Function** – `send-push` sender Web Push når ny varsel legges inn
- **Ny tabell** – `push_subscriptions` lagrer enhetens push-abonnement per bruker
- **Web App Manifest** – PWA kan installeres på hjemskjerm (Add to Home Screen)
- **Service Worker** – `sw.js` håndterer push-events og varselklikk
- **PushSubscription-komponent** – Ber automatisk om tillatelse og lagrer abonnement når bruker er innlogget
- **Dokumentasjon** – `docs/PWA_PUSH_SETUP.md` med oppsettinstrukser

### Tekniske endringer

- **Migration** – `20250221000000_get_user_display_name.sql` (get_user_display_name + get_single_user_for_kommune)
- **Migration** – `20250222000000_push_subscriptions.sql`
- **apply_rpc_manually.sql** – Utvidet med push_subscriptions-oppsett
- **Supabase Secrets** – Krever `VAPID_KEY` og `VAPID_PUBLIC_KEY` for push
- **Database Webhook** – Må konfigureres for INSERT på `notifications` → kall til `send-push`
