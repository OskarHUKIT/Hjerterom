# Plattformkontroll — sentral drift (Boly vs Hjerterum)

## Hva dette er

**`/ops/platform`** er det sentrale kontrollpanelet for hele produksjonen.

| Modus | Hva brukere ser |
|-------|-----------------|
| **Boly** (standard) | Klassisk formidling: utleier, kommune, boligbank, meldinger, varsler |
| **Hjerterum** | Valgfrie moduler: Finn, Los, arrangement, turisme, Stripe |

Migrasjonen seed-er **`product_mode = boly`** med alle Hjerterum-moduler av — trygt for eksisterende Boly-drift.

## Kom i gang (lokal / staging)

### 1. Migrasjon

```bash
cd supabase && supabase db push
```

Ny fil: `20260630210000_platform_control_panel.sql`

### 2. Platform operator

Du må være i `platform_operators` for å åpne `/ops`:

```sql
insert into public.platform_operators (user_id, is_active, notes)
values ('YOUR_AUTH_USER_UUID', true, 'Initial ops')
on conflict do nothing;
```

### 3. Åpne kontrollpanelet

1. Logg inn på appen
2. Gå til **`/ops/platform`** (eller **Drift → Plattform** i sidemenyen)
3. Velg **«Kun Boly»** for dagens produksjonsatferd
4. Når Hjerterum er klart: **«Hjerterum pilot»** eller **«Full Hjerterum»**

Endringer trer i kraft innen ~30 sekunder (cache i middleware og klient).

## Produksjon online

### Domener (Vercel)

| Host | Formål |
|------|--------|
| `app.hjerterum.no` eller `app.bolynorge.no` | Boly/Hjerterum app |
| `ops.hjerterum.no` | Drift (redirect `/` → `/ops`) |
| `finn.hjerterum.no` | Leietaker (kun når aktivert) |
| `los.hjerterum.no` | Digital Los (kun når aktivert) |

Legg alle som domener i Vercel-prosjektet. Middleware håndterer subdomain-routing.

### Anbefalt lanseringsrekkefølge

1. Deploy med migrasjon → **Boly-modus** (default)
2. Smoke test formidling (utleier, kommune, boligbank)
3. Aktiver **Hjerterum pilot** for én kommune (Los + turisme)
4. Aktiver **Finn** + **Stripe** når betaling er testet
5. Aktiver **sentrale arrangement** når ops-workflow er kjent

### Hva som gates

| Flag | Effekt |
|------|--------|
| `product_mode = boly` | Alle Hjerterum-moduler av |
| `finn_portal_enabled` | `/finn`, `finn.*`, landing-kort |
| `los_portal_enabled` | `/los`, `los.*`, Los-innboks i nav |
| `central_events_enabled` | Ops events, event-filter, event opt-in |
| `tourism_lane_enabled` | Turisme-innstillinger hos utleier |
| `stripe_bookings_enabled` | Stripe Connect + booking-forespørsler |

Middleware blokkerer deaktiverte ruter. Klient skjuler nav og landing-kort.

## API (for utviklere)

- **Les (public):** `get_platform_settings()` — anon + authenticated
- **Les (ops):** `ops_get_platform_settings()`
- **Skriv (ops):** `ops_set_platform_settings(...)`
- **Presets:** `ops_apply_platform_preset('boly_only' | 'hjerterum_pilot' | 'hjerterum_full')`

Audit: `OPS_PLATFORM_SETTINGS` i audit log.

## Feilsøking

| Problem | Løsning |
|---------|---------|
| Ser fortsatt Finn/Los | Hard refresh; vent 30s; sjekk `/ops/platform` |
| «Ingen tilgang» til /ops | Legg bruker i `platform_operators` |
| Endring lagres ikke | Sjekk at migrasjon er kjørt; RPC finnes i Supabase |
| finn.* vises men /finn redirect | Subdomain rewrite — slå av Finn i kontrollpanel |

Se også `docs/hjerterum/SUPABASE_DEPLOY.md`.
