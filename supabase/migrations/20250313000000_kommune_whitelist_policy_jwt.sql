-- Fiks: "permission denied for table users" – autentisert bruker kan ikke lese auth.users.
-- Bruk auth.jwt() (e-post i JWT) i stedet for å spørre auth.users.

drop policy if exists "Kommune can read own whitelist row" on kommune_access_list;
create policy "Kommune can read own whitelist row"
  on kommune_access_list for select
  using (
    public.is_kommune_ansatt()
    and is_active = true
    and lower(trim(kommune_access_list.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
