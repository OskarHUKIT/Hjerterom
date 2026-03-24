-- Kommune-admin rolle, tilganger, vilkårssjekk ved publisering, RPC for saksbehandlere.

-- === Roller: kommune-staff (saksbehandler + admin) ===
create or replace function public.is_kommune_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'kommune_admin',
    false
  );
$$;

create or replace function public.is_kommune_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('kommune_ansatt', 'kommune_admin'),
    false
  );
$$;

drop policy if exists "Kommune can view all profiles" on public.profiles;
create policy "Kommune can view all profiles"
  on public.profiles for select
  using (public.is_kommune_staff());

-- === RPC: liste brukere ===
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
  order by coalesce(p.full_name, u.raw_user_meta_data->>'full_name', u.email) asc nulls last;
end;
$$;

-- === Listings for kommune ===
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
  return query select * from public.listings;
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
  return query select * from public.listings where id = p_listing_id;
end;
$$;

-- === Visningsnavn / enkeltbruker ===
create or replace function public.get_user_display_name(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  result text;
begin
  if auth.uid() != p_user_id and not public.is_kommune_staff() then
    return null;
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

-- === Vilkår: publisering for kommune_admin (uten kommune_can_edit-krav) ===
create or replace function public.kommune_can_publish_terms(p_kommune_region text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_edit boolean;
  v_regions text[];
  p_email text;
  wl text;
  target text;
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then
    return false;
  end if;
  if v_role not in ('kommune_ansatt', 'kommune_admin') then
    return false;
  end if;
  if v_role = 'kommune_ansatt' then
    select coalesce(kommune_can_edit, true) into v_edit from public.profiles where id = auth.uid();
    if coalesce(v_edit, true) = false then
      return false;
    end if;
  end if;
  if p_kommune_region is null or trim(p_kommune_region) = '' then
    return true;
  end if;
  target := lower(trim(p_kommune_region));
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
  return target = any (v_regions);
end;
$$;

-- === Sync etter signering: ikke mass-supersede; gamle rader forblir aktive til ny signering erstatter per dokument ===
create or replace function public.sync_terms_acceptance_after_sign(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  tid := public.get_latest_terms_document_id_for_user(p_user_id);
  if tid is null then
    return;
  end if;
  insert into public.user_terms_acceptances (user_id, terms_document_id, signed_at, status)
  values (p_user_id, tid, now(), 'active')
  on conflict (user_id, terms_document_id) do update
  set signed_at = excluded.signed_at, status = 'active';
end;
$$;

-- === Påkrevde vilkårsdokument-ID-er for en bolig (global + ev. regional) ===
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
    select td.id into r
    from public.terms_documents td
    where lower(trim(td.kommune_region)) = lower(trim(p_city))
    order by td.version desc, td.effective_from desc nulls last
    limit 1;
    if r is not null and r is distinct from g then
      out := array_append(out, r);
    end if;
  end if;

  return out;
end;
$$;

-- === Kan utleier publisere bolig i denne kommunen (versjonerte vilkår) ===
create or replace function public.listing_publish_terms_ok(p_city text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req uuid[];
  tid uuid;
begin
  if uid is null then
    return false;
  end if;
  req := public.get_required_terms_document_ids_for_city(p_city);
  if req is null or coalesce(array_length(req, 1), 0) = 0 then
    return true;
  end if;
  foreach tid in array req loop
    if not exists (
      select 1 from public.user_terms_acceptances u
      where u.user_id = uid
        and u.terms_document_id = tid
        and u.status = 'active'
    ) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

grant execute on function public.get_required_terms_document_ids_for_city(text) to authenticated;
grant execute on function public.listing_publish_terms_ok(text) to authenticated;

-- === Hjelper: regionliste for innlogget bruker (profil + whitelist) ===
create or replace function public.current_user_kommune_regions()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  wl text;
  p_email text;
  v_regions text[];
begin
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
  return coalesce(v_regions, array[]::text[]);
end;
$$;

create or replace function public.regions_overlap(a text[], b text[])
returns boolean
language sql
immutable
as $$
  select coalesce(a, array[]::text[]) && coalesce(b, array[]::text[]);
$$;

-- === Kommune-admin: sett redigering for saksbehandler i overlappende region ===
create or replace function public.kommune_admin_set_staff_can_edit(
  p_target_user_id uuid,
  p_can_edit boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_regions text[];
  target_regions text[];
  tr text;
  treg text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_kommune_admin() then
    raise exception 'forbidden';
  end if;
  select role, kommune_region into tr, treg from public.profiles where id = p_target_user_id;
  if tr is distinct from 'kommune_ansatt' then
    raise exception 'target must be kommune_ansatt';
  end if;

  admin_regions := public.current_user_kommune_regions();
  if coalesce(array_length(admin_regions, 1), 0) = 0 then
    raise exception 'admin has no regions';
  end if;

  target_regions := public.parse_kommune_regions_sql(treg);
  if coalesce(array_length(target_regions, 1), 0) = 0 then
    raise exception 'target has no kommune_region';
  end if;

  if not public.regions_overlap(admin_regions, target_regions) then
    raise exception 'regions do not overlap';
  end if;

  update public.profiles
  set kommune_can_edit = p_can_edit, updated_at = now()
  where id = p_target_user_id;
end;
$$;

grant execute on function public.kommune_admin_set_staff_can_edit(uuid, boolean) to authenticated;

-- === Liste saksbehandlere kommune-admin kan administrere ===
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
  admin_regions text[];
begin
  if not public.is_kommune_admin() then
    return;
  end if;
  admin_regions := public.current_user_kommune_regions();
  if coalesce(array_length(admin_regions, 1), 0) = 0 then
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
  inner join public.profiles p on p.id = u.id and p.role = 'kommune_ansatt'
  where public.regions_overlap(admin_regions, public.parse_kommune_regions_sql(p.kommune_region))
  order by 2 asc nulls last;
end;
$$;

grant execute on function public.get_kommune_staff_for_admin() to authenticated;

-- === Mediation: les for hele kommune-personell (inkl. admin) ===
drop policy if exists "Kommune can read mediation reservations" on public.listing_mediation_reservations;
create policy "Kommune can read mediation reservations"
  on public.listing_mediation_reservations for select
  using (public.is_kommune_staff());

-- === Audit: kommune-staff ser historikk for ikke-kommune-kontoer ===
drop policy if exists "Kommune can view non-kommune user history" on public.audit_logs;
create policy "Kommune can view non-kommune user history" on public.audit_logs for select using (
  public.is_kommune_staff()
  and exists (
    select 1 from profiles p
    where p.id = audit_logs.user_id
    and (p.role is null or p.role not in ('kommune_ansatt', 'kommune_admin'))
  )
);

-- === Whitelist: kommune-staff (inkl. admin) leser egen rad ===
drop policy if exists "Kommune can read own whitelist row" on public.kommune_access_list;
create policy "Kommune can read own whitelist row"
  on public.kommune_access_list for select
  using (
    public.is_kommune_staff()
    and is_active = true
    and lower(trim(kommune_access_list.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
