# Testkontoer og tilgang — Hjerterum

Oversikt over **hvilken tilgang hver kontotype trenger** for å teste Boly-formidling og Hjerterum-moduler (Finn, Los, arrangement, turisme, Stripe).

Gjelder **nytt Hjerterum Supabase-prosjekt** — ikke eksisterende Boly-produksjon.

---

## 1. Rolleoversikt (hvem ser hva)

| Kontotype | Hvor tilgang settes | `profiles.role` | Ekstra i database | Hoved-URLer |
|-----------|---------------------|-----------------|-------------------|-------------|
| **Plattform / Ops** | `platform_operators` | `homeowner` (eller kommune — ikke `platform_operators`!) | Rad i `platform_operators` med `is_active = true` | `/ops`, `/ops/platform`, `/ops/events`, `/ops/kommuner` |
| **Utleier** | Automatisk ved registrering | `homeowner` | Ingen grant — omfang fra egne `listings` | `/homeowner/manage`, `/nav/messages`, `/nav/notifications` |
| **Kommune saksbehandler** | Invitasjon eller grant | `kommune_ansatt` | `user_kommune_grants` (minst én kommune) | `/nav/database`, `/nav/users`, `/nav/messages`, … |
| **Kommune admin** | Grant med admin-rolle | `kommune_admin` | `user_kommune_grants` med `grant_role = 'admin'` | Som saksbehandler + `/nav/terms-documents`, `/nav/kommune-access` |
| **Gjest (Finn)** | Ingen forhåndsoppsett | — | Opprettes ved booking / magic link | `/finn`, `/finn/mine` |
| **Offentlig (Finn/Los)** | Ingen innlogging | — | — | `/finn`, `/los` (når modul er på i `/ops/platform`) |

### Viktig om Ops

- **Ikke** sett `profiles.role = 'platform_operators'` — den rollen finnes ikke i appen.
- Ops-tilgang = **`platform_operators`**-tabellen (se `supabase/scripts/seed_platform_operator.sql`).

### Viktig om kommune

- **`profiles.role` alene er ikke nok** — brukeren må ha **`user_kommune_grants`** (eller ha registrert seg etter **invitasjon** i `kommune_invitations`).
- **`can_edit = false`**: kan lese boligbank, men ikke markere formidling.
- **`grant_role = 'admin'`**: kommune-admin (vilkår, invitere saksbehandlere).

### Hjerterum-moduler (globalt)

Moduler slås **ikke** på per bruker, men i **`/ops/platform`** (krever Ops-konto):

| Modul | Effekt |
|-------|--------|
| Kun Boly | Klassisk formidling only |
| Finn-portal | `/finn`, booking |
| Los-portal | `/los`, `/nav/los-inbox` |
| Sentrale arrangement | `/ops/events`, event-filter, `/nav/event-inquiries` |
| Turisme-lane | Turisme hos utleier |
| Stripe-bookinger | Betaling via Stripe Connect |

Per **kommune** (Ops → `/ops/kommuner/[slug]`): aktiver **Digital Los** og **Turisme** for den kommunen.

---

## 2. Anbefalt testoppsett (5 kontoer)

| # | E-post (eksempel) | Type | Formål |
|---|-------------------|------|--------|
| 1 | `ops@test.hjerterum.no` | Ops | Plattform, arrangement, kommune-toggles |
| 2 | `utleier@test.hjerterum.no` | Utleier | Boliger, turisme, booking, Stripe |
| 3 | `kommune@test.hjerterum.no` | Kommune saksbehandler | Boligbank, formidling, meldinger |
| 4 | `kommune-admin@test.hjerterum.no` | Kommune admin | Vilkår, invitere saksbehandlere |
| 5 | (valgfritt) | Gjest | Book på `/finn` → magic link på e-post |

---

## 3. Steg-for-steg: opprett testkontoer

### A) Ops (plattformdrift)

1. Registrer deg på `/login` med f.eks. `ops@test.hjerterum.no`
2. Bekreft e-post (Supabase → Authentication → Users → Confirm, eller klikk lenke)
3. Kjør i **SQL Editor** (bytt e-post):

```sql
-- supabase/scripts/seed_platform_operator.sql
-- Endre e-post i scriptet, kjør hele filen
```

4. Logg inn → gå til **`/ops/platform`**
5. For testing: start med **Kun Boly**, slå deretter moduler på én og én

**Tilgang:** hele `/ops/*`, inkl. plattformkontroll, arrangement, kommuner, kontoer, tjenesteområder.

---

### B) Utleier

1. `/login` → **Registrer deg**
   - Navn: `Test Utleier`
   - E-post: `utleier@test.hjerterum.no`
   - Passord: velg et testpassord
2. Bekreft e-post
3. Logg inn → signer vilkår på **`/homeowner/sign-terms`**
4. Legg til testbolig på **`/homeowner/manage`**

**For Hjerterum-test (når moduler er på):**

- Slå på **turisme** + nattpris på bolig
- Legg til tilgjengelighetsperiode med lane **turisme**
- Eventuelt: event opt-in, Stripe Connect

**Tilgang:** egne boliger, meldinger/varsler — **ikke** `/nav/database`.

---

### C) Kommune saksbehandler

#### Metode 1 — Invitasjon (anbefalt)

1. Ops logger inn → **`/ops/kommuner/[slug]`** → **bulk-invitasjon**  
   E-post: `kommune@test.hjerterum.no`, velg kommune (f.eks. Narvik)
2. Bruker registrerer seg med **samme e-post**
3. Ved første innlogging: rolle og grants opprettes automatisk

#### Metode 2 — Manuelt (SQL etter registrering)

1. Registrer `kommune@test.hjerterum.no` på `/login`
2. Supabase → Authentication → Users → User Metadata: `{"role": "kommune_ansatt"}`
3. SQL Editor:

```sql
-- Rolle i profiles
update public.profiles
set role = 'kommune_ansatt'
where email = 'kommune@test.hjerterum.no';

-- Grant til én kommune (bytt slug)
insert into public.user_kommune_grants (user_id, kommune_id, grant_role, can_edit)
select p.id, k.id, 'staff', true
from public.profiles p
cross join public.kommuner k
where lower(trim(p.email)) = 'kommune@test.hjerterum.no'
  and k.slug = 'narvik'
on conflict do nothing;
```

4. Logg inn → du skal se **Boligbanken**, **Brukere**, **Meldinger**, osv.

**Tilgang (når Hjerterum-moduler er på):**

- `/nav/event-inquiries` — arrangement
- `/nav/los-inbox` — Digital Los

---

### D) Kommune admin

Samme som saksbehandler, men:

```sql
update public.profiles
set role = 'kommune_admin', kommune_can_edit = true
where email = 'kommune-admin@test.hjerterum.no';

insert into public.user_kommune_grants (user_id, kommune_id, grant_role, can_edit)
select p.id, k.id, 'admin', true
from public.profiles p
cross join public.kommuner k
where lower(trim(p.email)) = 'kommune-admin@test.hjerterum.no'
  and k.slug = 'narvik'
on conflict do nothing;
```

**Ekstra tilgang:**

- **`/nav/terms-documents`** — last opp/godkjenne vilkår
- **`/nav/kommune-access`** — invitere nye saksbehandlere

---

### E) Gjest (Finn / turisme)

**Ingen forhåndskonto nødvendig.**

1. Aktiver **Finn** i `/ops/platform`
2. Utleier har turisme på + ledig periode
3. Gå til **`/finn`** (ikke innlogget) → send booking-forespørsel med e-post
4. Magic link → **`/finn/mine`**

---

### F) Offentlig Digital Los

**Ingen konto.**

1. Aktiver **Los** i `/ops/platform`
2. Ops aktiverer Los for kommune i `/ops/kommuner/[slug]`
3. Gå til **`/los`** → chat → overlevering
4. Kommune ser saken i **`/nav/los-inbox`**

---

## 4. Matrise: modul → minimum tilgang

| Funksjon | Ops | Utleier | Kommune | Gjest | Merknad |
|----------|-----|---------|---------|-------|---------|
| Formidling / boligbank | — | ✓ egne boliger | ✓ med grant | — | Standard Boly |
| `/ops/platform` | ✓ | — | — | — | `platform_operators` |
| Sentrale arrangement | ✓ opprett/publiser | ✓ opt-in | ✓ filter + henvendelser | — | Modul på i plattform |
| Finn / booking | — | ✓ turisme på | — | ✓ forespørsel | Modul + turisme-lane |
| Stripe | — | ✓ Connect | — | ✓ betaling | Modul + Stripe env |
| Digital Los | — | — | ✓ innboks | ✓ chat | Modul + kommune-toggle |

---

## 5. E-postbekreftelse (Supabase)

For testmiljø kan du **auto-bekrefte** brukere:

Supabase → **Authentication → Users** → velg bruker → **Confirm user**

Eller slå av «Confirm email» under Authentication → Providers → Email (kun test).

---

## 6. Rydde testdata

```sql
-- supabase/scripts/cleanup_for_testing.sql
-- Deretter: Authentication → Users → slett alle
```

Se `docs/hjerterum/FRESH_SUPABASE_INSTALL.md` for Supabase-oppsett.

---

## 7. Relaterte dokumenter

| Dokument | Innhold |
|----------|---------|
| `docs/hjerterum/BRUKERVEILEDNING.md` | Teste alle Hjerterum-moduler |
| `docs/hjerterum/PLATFORM_CONTROL_PANEL.md` | Plattformkontroll |
| `docs/KOMMUNE_ACCESS_WHITELIST.md` | Grants og invitasjoner (detalj) |
| `docs/SUPABASE_WHITELIST_AND_UPDATES.md` | Ops: kontoer og tilgang |
| `supabase/scripts/seed_platform_operator.sql` | Ops-tilgang |
