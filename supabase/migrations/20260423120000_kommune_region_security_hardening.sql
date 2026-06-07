-- Region hardening for kommune: same merged region list everywhere, filter listing RPCs,
-- restrict profile/display-name surfaces to users kommune actually has business seeing.
-- Listings SELECT for all authenticated is unchanged (markededs-/app-visning); kommune reads go through RPCs + RLS updates.

-- === 1) Listing region check: bruk samme regionliste som current_user_kommune_regions (profil + hviteliste) ===
create or replace function public.kommune_listing_region_ok(p_listing_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_city text;
  v_regions text[];
begin
  if (select auth.uid()) is null then
    return false;
  end if;

  select lower(trim(city)) into v_city from public.listings where id = p_listing_id;
  if v_city is null or v_city = '' then
    return false;
  end if;

  v_regions := public.current_user_kommune_regions();
  if coalesce(array_length(v_regions, 1), 0) = 0 then
    return false;
  end if;

  return v_city = any (v_regions);
end;
$$;

comment on function public.kommune_listing_region_ok(uuid) is
  'True når innlogget brukers kommune-områder (profil + kommune_access_list, via current_user_kommune_regions) inkluderer listing.city.';

-- === 2) Hvem kommune-ansatt har lov å se profil / navn for (RPC + RLS) ===
create or replace function public.kommune_may_view_user_profile(p_target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer uuid := (select auth.uid());
  viewer_regions text[];
  tr text;
  treg text;
  target_regions text[];
begin
  if viewer is null then
    return false;
  end if;
  if not public.is_kommune_staff() then
    return false;
  end if;
  if p_target_user_id = viewer then
    return true;
  end if;

  viewer_regions := public.current_user_kommune_regions();
  if coalesce(array_length(viewer_regions, 1), 0) = 0 then
    return false;
  end if;

  if exists (
    select 1
    from public.listings l
    where l.owner_id = p_target_user_id
      and public.kommune_listing_region_ok(l.id)
  ) then
    return true;
  end if;

  select p.role, p.kommune_region into tr, treg
  from public.profiles p
  where p.id = p_target_user_id;

  if tr in ('kommune_ansatt', 'kommune_admin') then
    target_regions := public.parse_kommune_regions_sql(treg);
    return public.regions_overlap(viewer_regions, target_regions);
  end if;

  return false;
end;
$$;

comment on function public.kommune_may_view_user_profile(uuid) is
  'Kommune: se målprofil hvis egen konto, utleier med bolig i område, eller kollega med overlappende kommune_region.';

grant execute on function public.kommune_may_view_user_profile(uuid) to authenticated;

-- === 3) Profil-RLS: ikke «alle brukere» for kommune ===
drop policy if exists "Kommune can view all profiles" on public.profiles;
create policy "Kommune can view profiles in scope"
  on public.profiles for select
  to authenticated
  using (
    public.is_kommune_staff()
    and public.kommune_may_view_user_profile(id)
  );

-- === 4) Listing-RPC-er: kun rader i eget område ===
create or replace function public.get_listings_for_kommune()
returns setof listings
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_kommune_staff() then
    return;
  end if;
  return query
  select l.*
  from public.listings l
  where public.kommune_listing_region_ok(l.id);
end;
$$;

create or replace function public.get_listing_by_id_for_kommune(p_listing_id uuid)
returns setof listings
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_kommune_staff() then
    return;
  end if;
  return query
  select l.*
  from public.listings l
  where l.id = p_listing_id
    and public.kommune_listing_region_ok(l.id);
end;
$$;

create or replace function public.get_listings_for_kommune_paged(
  p_limit integer default 800,
  p_offset integer default 0
)
returns setof listings
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := greatest(1, least(coalesce(nullif(p_limit, 0), 800), 2000));
  off integer := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_kommune_staff() then
    return;
  end if;
  return query
  select l.*
  from public.listings l
  where public.kommune_listing_region_ok(l.id)
  order by l.created_at desc nulls last
  limit lim
  offset off;
end;
$$;

-- === 5) Brukerlister for kommune: kun innenfor område / kollegaer ===
create or replace function public.get_all_users_for_kommune()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_kommune_staff() then
    return;
  end if;
  return query
  select
    u.id,
    coalesce(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))::text as full_name,
    u.email::text,
    coalesce(p.role, 'homeowner')::text as role,
    coalesce(p.updated_at, u.created_at)::timestamptz as updated_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where public.kommune_may_view_user_profile(u.id)
  order by coalesce(p.full_name, u.raw_user_meta_data->>'full_name', u.email) asc nulls last;
end;
$$;

create or replace function public.get_single_user_for_kommune(p_user_id uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_kommune_staff() then
    return;
  end if;
  if not public.kommune_may_view_user_profile(p_user_id) then
    return;
  end if;
  return query
  select
    u.id,
    coalesce(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))::text as full_name,
    u.email::text,
    coalesce(p.role, 'homeowner')::text as role,
    coalesce(p.updated_at, u.created_at)::timestamptz as updated_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;
end;
$$;

-- === 6) Visningsnavn: begrens kommune til område ===
create or replace function public.get_user_display_name(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  result text;
begin
  if (select auth.uid()) is null then
    return null;
  end if;

  if (select auth.uid()) <> p_user_id then
    if not public.is_kommune_staff() then
      return null;
    end if;
    if not public.kommune_may_view_user_profile(p_user_id) then
      return null;
    end if;
  end if;

  select coalesce(
    (select full_name from public.profiles where id = p_user_id limit 1),
    (select raw_user_meta_data->>'full_name' from auth.users where id = p_user_id limit 1),
    (select split_part(email, '@', 1) from auth.users where id = p_user_id limit 1),
    (select owner_name from public.listings where owner_id = p_user_id limit 1)
  ) into result;

  return coalesce(result, 'Ukjent bruker');
end;
$$;

create or replace function public.get_user_display_names_batch(p_user_ids uuid[])
returns table (user_id uuid, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
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
  left join public.profiles p on p.id = x.id
  where x.id = v_uid or public.kommune_may_view_user_profile(x.id);
end;
$$;

comment on function public.get_user_display_names_batch(uuid[]) is
  'Visningsnavn i batch. Ikkje-kommune: berre eigen id. Kommune: berre id innanfor kommune_may_view_user_profile.';
