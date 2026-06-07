-- Flere kommuner per vilkårsdokument (JSON/kommaseparert som i profiler).
-- BankID: get_latest_terms_document_id_for_user matcher nå overlapp mellom bolig/by og dokumentets regionliste.

create or replace function public.same_kommune_region_bucket(a text, b text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(z order by z)
      from unnest(public.parse_kommune_regions_sql(a)) as t(z)
    ),
    array[]::text[]
  ) = coalesce(
    (
      select array_agg(z order by z)
      from unnest(public.parse_kommune_regions_sql(b)) as t(z)
    ),
    array[]::text[]
  );
$$;

-- Kun kommune-admin (samme regel som 20260330120000_terms_publish_and_upload_admin_only.sql)
create or replace function public.kommune_can_publish_terms(p_kommune_region text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_regions text[];
  p_email text;
  wl text;
  targets text[];
  tr text;
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'kommune_admin' then
    return false;
  end if;
  if p_kommune_region is null or trim(p_kommune_region) = '' then
    return false;
  end if;

  targets := public.parse_kommune_regions_sql(p_kommune_region);
  if coalesce(array_length(targets, 1), 0) = 0 then
    return false;
  end if;

  select kommune_region into wl from public.profiles where id = auth.uid();
  v_regions := public.parse_kommune_regions_sql(wl);
  if coalesce(array_length(v_regions, 1), 0) = 0 then
    select email into p_email from auth.users where id = auth.uid();
    if p_email is not null then
      select region into wl
      from public.kommune_access_list
      where is_active = true and lower(trim(email)) = lower(trim(p_email))
      limit 1;
      v_regions := public.parse_kommune_regions_sql(wl);
    end if;
  end if;
  if coalesce(array_length(v_regions, 1), 0) = 0 then
    return false;
  end if;

  foreach tr in array targets loop
    if not (tr = any (v_regions)) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create or replace function public.get_latest_terms_document_id_for_user(p_user_id uuid, p_city text default null)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cities text[];
  rid uuid;
  use_city text;
  city_parts text[];
begin
  use_city := nullif(trim(coalesce(p_city, '')), '');

  if use_city is not null then
    city_parts := public.parse_kommune_regions_sql(use_city);
    if coalesce(array_length(city_parts, 1), 0) = 0 then
      city_parts := array[lower(trim(use_city))];
    end if;
    select td.id into rid
    from public.terms_documents td
    where td.kommune_region is not null
      and trim(td.kommune_region) <> ''
      and public.regions_overlap(
        public.parse_kommune_regions_sql(td.kommune_region),
        city_parts
      )
    order by td.version desc, td.effective_from desc nulls last
    limit 1;
    if rid is not null then
      return rid;
    end if;
  end if;

  select coalesce(
    (select array_agg(t.x order by t.x)
     from (
       select distinct u.x
       from public.listings l,
       lateral unnest(public.parse_kommune_regions_sql(l.city)) as u(x)
       where l.owner_id = p_user_id
         and l.city is not null
         and trim(l.city) <> ''
     ) t),
    array[]::text[]
  )
  into cities;

  if cities is not null and array_length(cities, 1) > 0 then
    select td.id into rid
    from public.terms_documents td
    where td.kommune_region is not null
      and trim(td.kommune_region) <> ''
      and public.regions_overlap(
        public.parse_kommune_regions_sql(td.kommune_region),
        cities
      )
    order by td.version desc, td.effective_from desc nulls last
    limit 1;
    if rid is not null then
      return rid;
    end if;
  end if;

  select td.id into rid
  from public.terms_documents td
  where td.kommune_region is null or trim(td.kommune_region) = ''
  order by td.version desc, td.effective_from desc nulls last
  limit 1;

  return rid;
end;
$$;

create or replace function public.get_required_terms_document_ids_for_city(p_city text)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  g uuid;
  r uuid;
  out uuid[] := array[]::uuid[];
  city_parts text[];
begin
  select td.id into g
  from public.terms_documents td
  where td.kommune_region is null or trim(td.kommune_region) = ''
  order by td.version desc, td.effective_from desc nulls last
  limit 1;

  if g is not null then
    out := array_append(out, g);
  end if;

  if p_city is not null and trim(p_city) <> '' then
    city_parts := public.parse_kommune_regions_sql(p_city);
    if coalesce(array_length(city_parts, 1), 0) = 0 then
      city_parts := array[lower(trim(p_city))];
    end if;
    select td.id into r
    from public.terms_documents td
    where td.kommune_region is not null
      and trim(td.kommune_region) <> ''
      and public.regions_overlap(
        public.parse_kommune_regions_sql(td.kommune_region),
        city_parts
      )
    order by td.version desc, td.effective_from desc nulls last
    limit 1;
    if r is not null and r is distinct from g then
      out := array_append(out, r);
    end if;
  end if;

  return out;
end;
$$;

create or replace function public.sync_terms_acceptance_after_sign(p_user_id uuid, p_city text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
  reg_new text;
begin
  tid := public.get_latest_terms_document_id_for_user(p_user_id, p_city);
  if tid is null then
    return;
  end if;

  select nullif(trim(coalesce(kommune_region, '')), '') into reg_new
  from public.terms_documents
  where id = tid;

  update public.user_terms_acceptances uta
  set status = 'superseded'
  from public.terms_documents td_old
  where uta.user_id = p_user_id
    and uta.status = 'active'
    and uta.terms_document_id = td_old.id
    and uta.terms_document_id is distinct from tid
    and (
      (reg_new is null and (td_old.kommune_region is null or trim(td_old.kommune_region) = ''))
      or
      (
        reg_new is not null
        and td_old.kommune_region is not null
        and public.same_kommune_region_bucket(reg_new, td_old.kommune_region)
      )
    );

  insert into public.user_terms_acceptances (user_id, terms_document_id, signed_at, status)
  values (p_user_id, tid, now(), 'active')
  on conflict (user_id, terms_document_id) do update
  set signed_at = excluded.signed_at, status = 'active';
end;
$$;
