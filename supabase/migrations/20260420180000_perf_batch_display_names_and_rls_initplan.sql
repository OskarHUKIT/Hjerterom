-- Performance: batch resolve display names for messages (one round-trip vs N× get_user_display_name).
-- RLS: wrap auth.uid() / auth.role() in scalar subqueries so Postgres evaluates once per statement (initplan).

-- === Batch RPC (same semantics as get_user_display_name: self or kommune staff) ===
create or replace function public.get_user_display_names_batch(p_user_ids uuid[])
returns table (user_id uuid, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  if p_user_ids is null or cardinality(p_user_ids) = 0 then
    return;
  end if;

  if not public.is_kommune_staff() then
    return query
    select
      x.id,
      coalesce(
        (select full_name from public.profiles where id = x.id limit 1),
        (select raw_user_meta_data->>'full_name' from auth.users where id = x.id limit 1),
        (select split_part(email, '@', 1) from auth.users where id = x.id limit 1),
        (select owner_name from public.listings where owner_id = x.id limit 1),
        'Ukjent bruker'
      )::text
    from unnest(p_user_ids) as x(id)
    where x.id = v_uid;
    return;
  end if;

  return query
  select
    x.id,
    coalesce(
      p.full_name,
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1),
      (select l.owner_name from public.listings l where l.owner_id = x.id limit 1),
      'Ukjent bruker'
    )::text
  from unnest(p_user_ids) as x(id)
  left join auth.users u on u.id = x.id
  left join public.profiles p on p.id = x.id;
end;
$$;

comment on function public.get_user_display_names_batch(uuid[]) is
  'Returns display_name for each user id in one call. Non–kommune staff: only own id is returned.';

grant execute on function public.get_user_display_names_batch(uuid[]) to authenticated;

-- === RLS initplan (hot paths) ===
alter policy "Users can select own profile"
  on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can update own profile"
  on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy "Authenticated users can view all listings"
  on public.listings
  using ((select auth.role()) = 'authenticated');

-- Replaced monolithic owner policy in 20260419120000 — initplan on split policies:
alter policy "Owners can insert own listings"
  on public.listings
  with check ((select auth.uid()) = owner_id);

alter policy "Owners can update own listings when not formidlet"
  on public.listings
  using (
    (select auth.uid()) = owner_id
    and not public.listing_locked_for_landlord_edit(id)
  )
  with check (
    (select auth.uid()) = owner_id
    and not public.listing_locked_for_landlord_edit(id)
  );

alter policy "Owners can delete own listings when not formidlet"
  on public.listings
  using (
    (select auth.uid()) = owner_id
    and not public.listing_locked_for_landlord_edit(id)
  );
