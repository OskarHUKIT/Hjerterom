-- Kommune-kontoer med kommune_can_edit=false skal kunne SE brukere og boliger.
-- De må kunne hente sin egen region fra whitelisten (profil kan mangle kommune_region).
-- 1) La alle kommune_ansatt lese sin egen rad i kommune_access_list (for region-fallback i frontend).
-- 2) Sikre at get_whitelist_region_for_email kan kalles av authenticated (RPC brukes når profil.kommune_region er null).

-- Kommune (inkl. read-only) kan SELECT egen rad i whitelisten for å få region
drop policy if exists "Kommune can read own whitelist row" on kommune_access_list;
create policy "Kommune can read own whitelist row"
  on kommune_access_list for select
  using (
    public.is_kommune_ansatt()
    and is_active = true
    and exists (
      select 1 from auth.users u
      where u.id = auth.uid()
      and lower(trim(u.email)) = lower(trim(kommune_access_list.email))
    )
  );

-- RPC for region-henting skal kunne kalles av alle innloggede (security definer bypasser RLS på tabell)
grant execute on function public.get_whitelist_region_for_email(text) to authenticated;
