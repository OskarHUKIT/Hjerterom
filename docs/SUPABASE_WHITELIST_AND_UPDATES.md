# Whitelist og Supabase-oppdateringer

Dokument for å vedlikeholde kommune-whitelist og vanlige Supabase-endringer.

---

## 1. Whitelist (kommune_access_list)

E-poster som får kommune-tilgang automatisk ved registrering.

### Legg til ny rad

| E-post | Region | Notater |
|--------|--------|---------|
| ansatt1@narvik.kommune.no | Narvik | |
| ansatt2@narvik.kommune.no | Narvik | |
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
