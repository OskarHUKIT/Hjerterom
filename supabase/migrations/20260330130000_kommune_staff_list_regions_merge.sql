-- 1) Slå sammen regioner fra profil og kommune_access_list slat seer-/hviteliste-kontoer får samme områdeliste som kollegaer.
-- 2) Liste saksbehandlere: inkluder kommune_admin og ekskluder innlogget bruker (tidligere kun kommune_ansatt).

create or replace function public.current_user_kommune_regions()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  prof_raw text;
  wl_raw text;
  p_email text;
  merged text[];
begin
  select kommune_region into prof_raw from public.profiles where id = auth.uid();

  select email into p_email from auth.users where id = auth.uid();
  if p_email is not null then
    select region into wl_raw
    from public.kommune_access_list
    where is_active = true and lower(trim(email)) = lower(trim(p_email))
    limit 1;
  end if;

  merged :=
    coalesce(public.parse_kommune_regions_sql(prof_raw), array[]::text[])
    || coalesce(public.parse_kommune_regions_sql(wl_raw), array[]::text[]);

  return coalesce(
    array(
      select distinct m
      from unnest(merged) as t(m)
      where m is not null and trim(m) <> ''
    ),
    array[]::text[]
  );
end;
$$;

create or replace function public.get_kommune_staff_for_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  kommune_region text,
  kommune_can_edit boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_regions text[];
begin
  if not public.is_kommune_staff() then
    return;
  end if;
  viewer_regions := public.current_user_kommune_regions();
  if coalesce(array_length(viewer_regions, 1), 0) = 0 then
    return;
  end if;

  return query
  select
    u.id,
    coalesce(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))::text as full_name,
    u.email::text,
    p.kommune_region::text,
    coalesce(p.kommune_can_edit, true) as kommune_can_edit,
    coalesce(p.updated_at, u.created_at)::timestamptz as updated_at
  from auth.users u
  inner join public.profiles p on p.id = u.id and p.role in ('kommune_ansatt', 'kommune_admin')
  where u.id <> auth.uid()
    and public.regions_overlap(viewer_regions, public.parse_kommune_regions_sql(p.kommune_region))
  order by 2 asc nulls last;
end;
$$;
