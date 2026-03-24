-- Kommunebrukere uten redigeringstilgang (kommune_can_edit = false) skal kun lese listing_availability, ikke legge inn/fjerne formidling.
-- Les: alle kommune_ansatt. Skriv (insert/update/delete): kun når kommune_can_edit er satt og ikke false.

drop policy if exists "Kommune can manage availability" on listing_availability;
drop policy if exists "Kommune can read availability" on listing_availability;
drop policy if exists "Kommune with edit can insert availability" on listing_availability;
drop policy if exists "Kommune with edit can update availability" on listing_availability;
drop policy if exists "Kommune with edit can delete availability" on listing_availability;

-- Alle kommune_ansatt kan lese availability (inkl. kun-les-brukere)
create policy "Kommune can read availability"
  on listing_availability for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'kommune_ansatt')
  );

-- Kun kommune med redigeringstilgang kan legge inn, oppdatere og slette (formidling m.m.)
create policy "Kommune with edit can insert availability"
  on listing_availability for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'kommune_ansatt'
      and (kommune_can_edit is null or kommune_can_edit = true)
    )
  );

create policy "Kommune with edit can update availability"
  on listing_availability for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'kommune_ansatt'
      and (kommune_can_edit is null or kommune_can_edit = true)
    )
  );

create policy "Kommune with edit can delete availability"
  on listing_availability for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'kommune_ansatt'
      and (kommune_can_edit is null or kommune_can_edit = true)
    )
  );
