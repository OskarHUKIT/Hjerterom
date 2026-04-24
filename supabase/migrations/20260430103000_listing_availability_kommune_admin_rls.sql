-- kommune_admin manglet i RLS for listing_availability (kun kommune_ansatt), som ga
-- 42501 «new row violates row-level security policy» ved formidling for administratorer.
-- Justerer SELECT/INSERT/UPDATE/DELETE: kommune_admin alltid; kommune_ansatt som før med kommune_can_edit.

drop policy if exists "Kommune can read availability" on public.listing_availability;
create policy "Kommune can read availability"
  on public.listing_availability for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('kommune_ansatt', 'kommune_admin')
    )
  );

drop policy if exists "Kommune with edit can insert availability" on public.listing_availability;
create policy "Kommune with edit can insert availability"
  on public.listing_availability for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and (
          p.role = 'kommune_admin'
          or (
            p.role = 'kommune_ansatt'
            and (p.kommune_can_edit is null or p.kommune_can_edit = true)
          )
        )
    )
  );

drop policy if exists "Kommune with edit can update availability" on public.listing_availability;
create policy "Kommune with edit can update availability"
  on public.listing_availability for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and (
          p.role = 'kommune_admin'
          or (
            p.role = 'kommune_ansatt'
            and (p.kommune_can_edit is null or p.kommune_can_edit = true)
          )
        )
    )
  );

drop policy if exists "Kommune with edit can delete availability" on public.listing_availability;
create policy "Kommune with edit can delete availability"
  on public.listing_availability for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and (
          p.role = 'kommune_admin'
          or (
            p.role = 'kommune_ansatt'
            and (p.kommune_can_edit is null or p.kommune_can_edit = true)
          )
        )
    )
  );
