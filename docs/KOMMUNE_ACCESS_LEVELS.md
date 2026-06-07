# Kommune-ansatte: to tilgangsnivåer (visning vs redigering)

## Oversikt

To nivåer for kommune-ansatte:
- **Visning** – kan se boligbank, brukere, meldinger, varsler, men kan ikke endre data
- **Redigering** – full tilgang inkl. markere formidlet, forlenge perioder, fjerne formidling, etc.

## Implementasjon

### 1. Database (Supabase)

Legg til kolonne i `profiles`:

```sql
alter table profiles add column if not exists kommune_can_edit boolean default true;
```

- `kommune_can_edit = true` → redigeringsrettigheter (standard for eksisterende)
- `kommune_can_edit = false` → kun visning

### 2. RLS-policy

Bruk `kommune_can_edit` i policies der kommune må kunne endre data. F.eks. for `listing_availability`:

```sql
-- Kun kommune med redigering kan endre
create policy "Kommune edit can manage availability" on listing_availability
  for all using (
    public.is_kommune_ansatt() and 
    (select kommune_can_edit from profiles where id = auth.uid() limit 1) = true
  );
```

### 3. Frontend

- Hent `kommune_can_edit` når brukeren logges inn (fra `profiles`)
- Skjul/disable knapper for "Markér formidlet", "Forleng", "Fjern formidling" hvis `!kommune_can_edit`
- Skjul redigerings-knapper i Brukere, Meldinger osv.

### 4. Administrasjon

En superbruker eller kommune-admin må kunne sette `kommune_can_edit` per bruker (f.eks. i Supabase Dashboard eller en egen admin-side).
