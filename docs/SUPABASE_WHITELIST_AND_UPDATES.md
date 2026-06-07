# Whitelist og Supabase-oppdateringer

Dokument for å vedlikeholde kommune-whitelist og vanlige Supabase-endringer.

---

## Hvor setter jeg tilgang for regioner?

Du setter **regiontilgang** på to steder, avhengig av om brukeren er ny eller finnes fra før:

| Situasjon | Hvor | Hva du setter |
|-----------|------|----------------|
| **Ny kommune-bruker** (skal få tilgang når de registrerer seg) | **kommune_access_list** (via appen eller Supabase) | `email` + `region` (f.eks. `Narvik` eller `Narvik,Gratangen`) |
| **Eksisterende bruker** (allerede opprettet) | **profiles** i Supabase Table Editor | `kommune_region` (f.eks. `Narvik` eller `Narvik,Gratangen`) |

- **I appen:** Logg inn som kommune-ansatt → **Kommune-tilgang** i menyen → legg til e-post og region. Nyregistrerte med den e-posten får automatisk `kommune_region` satt.
- **I Supabase:** Table Editor → **kommune_access_list** (nye brukere) eller **profiles** (eksisterende) → feltet `region` / `kommune_region`. Region må matche `listings.city` (kommunenavn, f.eks. Salangen, Narvik).

Kommune-brukeren ser da kun boliger i de kommunene som står i deres region, og under **Brukere** kun brukere som har eller har hatt en bolig i samme region.

**Fallback:** Hvis `profiles.kommune_region` er tom for en kommune-bruker, henter appen region fra **kommune_access_list** (whitelist) ut fra brukerens e-post. Sørg for at enten profilen har `kommune_region` satt, eller at whitelist har riktig `region` for den e-posten.

---

## 1. Whitelist (kommune_access_list)

E-poster som får kommune-tilgang automatisk ved registrering.

### Legg til ny rad

| E-post | Region | Notater |
|--------|--------|---------|
| testkommune@boly.no | Narvik | Evenes | Gratangen |
| | | |

**Region** må matche `listings.city` (f.eks. Narvik, Gratangen, Evenes). For flere kommuner: `Narvik,Gratangen`.

### Hvordan legge til

**Alternativ A – i appen:** Kommune-tilgang → Legg til e-post  
**Alternativ B – Supabase:** Table Editor → kommune_access_list → Insert row

### SQL (bulk-insert)

```sql
INSERT INTO kommune_access_list (email, region) VALUES
  ('ansatt1@narvik.kommune.no', 'Narvik'),
  ('ansatt2@narvik.kommune.no', 'Narvik');
```

---

## 2. Vanlige Supabase-oppdateringer

### Slette brukere

1. Kjør først: `supabase/scripts/fix_user_delete_cascade.sql` (hvis ikke allerede kjørt)
2. Authentication → Users → Velg bruker → Delete

**Merk:** Sletting i Authentication fjerner også `profiles`-raden (CASCADE). Slett **ikke** bare profilen i Table Editor — da blir brukeren usynlig i appen men kan fortsatt logge inn.

### Bruker finnes i Authentication men ikke i profiles

Kjør migrasjon `20260607170000_ensure_user_profile_backfill.sql` (eller `supabase db push`). Den backfiller manglende profiler og legger til RPC `ensure_own_profile()`. Etter deploy oppretter appen profil automatisk ved innlogging.

Manuell backfill i SQL Editor:

```sql
select public.sync_profile_for_auth_user(u.id)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```

*(Krever at migrasjonen er kjørt — funksjonen `sync_profile_for_auth_user` finnes da.)*

### Endre rolle (kommune / utleier)

**Table Editor → profiles**
- `role`: `kommune_ansatt` eller `homeowner`
- `kommune_region`: f.eks. `Narvik` eller `Narvik,Gratangen`

**Authentication → Users → Edit user**
- User Metadata: `{"role": "kommune_ansatt"}`

### Kun visning (kommune uten redigering)

**Table Editor → profiles**
- `kommune_can_edit`: `false`

### Rydde testdata

Kjør: `supabase/scripts/cleanup_for_testing.sql` i SQL Editor  
Slett deretter brukere manuelt i Authentication → Users.

---

## 3. Migrasjoner

Hvis `npx supabase db push` feiler:

- Kjør SQL direkte i **Supabase Dashboard → SQL Editor**
- Migrasjonsfiler: `supabase/migrations/`
- Scripts: `supabase/scripts/`

---

## 4. Edge Functions

Deploy:

```bash
npx supabase functions deploy sign-callback
npx supabase functions deploy auth-signicat
```

---

## 5. Sjekkliste ved ny kommune-ansatt

- [ ] Legg e-post inn i whitelist (kommune_access_list) eller oppdater eksisterende bruker
- [ ] Sett `region` til riktig kommune
- [ ] Verifiser at bruker har `role = kommune_ansatt` i profiles
- [ ] Sett `kommune_can_edit` hvis de bare skal ha visning
