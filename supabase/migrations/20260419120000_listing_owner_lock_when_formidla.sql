-- Utleier kan ikke oppdatere/slette listings-rad når boligen er markert formidlet (status og/eller Formidla-periode).
-- Kommune-personell beholder oppdatering i egen region (samme som praksis i appen).

create or replace function public.listing_locked_for_landlord_edit(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        (l.status = 'Formidla')
        or exists (
          select 1
          from public.listing_availability la
          where la.listing_id = l.id
            and la.status = 'Formidla'
        )
      from public.listings l
      where l.id = p_listing_id
    ),
    false
  );
$$;

comment on function public.listing_locked_for_landlord_edit(uuid) is
  'True når utleier ikke skal kunne endre listings-rad (Formidla-status eller aktiv Formidla-periode).';

grant execute on function public.listing_locked_for_landlord_edit(uuid) to authenticated;

drop policy if exists "Owners can manage their own listings" on public.listings;

create policy "Owners can insert own listings"
  on public.listings for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can update own listings when not formidlet"
  on public.listings for update
  to authenticated
  using (
    (select auth.uid()) = owner_id
    and not public.listing_locked_for_landlord_edit(id)
  )
  with check (
    (select auth.uid()) = owner_id
    and not public.listing_locked_for_landlord_edit(id)
  );

create policy "Owners can delete own listings when not formidlet"
  on public.listings for delete
  to authenticated
  using (
    (select auth.uid()) = owner_id
    and not public.listing_locked_for_landlord_edit(id)
  );

create policy "Kommune staff can update listings in their region"
  on public.listings for update
  to authenticated
  using (public.is_kommune_staff() and public.kommune_listing_region_ok(id))
  with check (public.is_kommune_staff() and public.kommune_listing_region_ok(id));
