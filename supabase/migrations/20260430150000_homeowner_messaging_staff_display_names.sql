-- Utleier skal kunne hente visningsnavn for saksbehandlere/admin i delt meldingstråd
-- (tidligere returnerte get_user_display_names_batch berre eigen id for ikkje-kommune).

create or replace function public.homeowner_may_view_messaging_staff(p_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listings l
    join public.profiles sp on sp.id = p_staff_id
    where l.owner_id = (select auth.uid())
      and coalesce(lower(trim(l.city)), '') <> ''
      and sp.role in ('kommune_ansatt', 'kommune_admin')
      and public.regions_overlap(
        public.parse_kommune_regions_sql(sp.kommune_region),
        array[lower(trim(l.city))]
      )
  );
$$;

comment on function public.homeowner_may_view_messaging_staff(uuid) is
  'True når innlogget utleier har minst én bolig i ein kommune som saksbehandlaren (p_staff_id) dekkjer.';

grant execute on function public.homeowner_may_view_messaging_staff(uuid) to authenticated;

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
    if public.is_kommune_staff() then
      if not public.kommune_may_view_user_profile(p_user_id) then
        return null;
      end if;
    elsif public.homeowner_may_view_messaging_staff(p_user_id) then
      null;
    else
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
        p.full_name,
        u.raw_user_meta_data->>'full_name',
        split_part(u.email, '@', 1),
        (select l.owner_name from public.listings l where l.owner_id = x.id limit 1),
        'Ukjent bruker'
      )::text
    from unnest(p_user_ids) as x(id)
    left join auth.users u on u.id = x.id
    left join public.profiles p on p.id = x.id
    where x.id = v_uid or public.homeowner_may_view_messaging_staff(x.id);
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
  'Visningsnavn i batch. Utleier: eigen id + saksbehandlarar i meldingsskopet. Kommune: som før (kommune_may_view_user_profile).';
