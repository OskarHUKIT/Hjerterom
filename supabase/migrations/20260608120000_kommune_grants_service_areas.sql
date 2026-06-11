-- Kommune access overhaul: service areas, explicit grants, listing kommune_id, chat scoping.

-- =============================================================================
-- 1) Service areas + members
-- =============================================================================
create table if not exists public.kommune_service_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kommune_service_areas is
  'Ops-defined chat/admin buckets grouping one or more legal kommuner (e.g. Nav Narvik region).';

create table if not exists public.kommune_service_area_members (
  service_area_id uuid not null references public.kommune_service_areas (id) on delete cascade,
  kommune_id uuid not null references public.kommuner (id) on delete cascade,
  is_primary boolean not null default false,
  primary key (service_area_id, kommune_id)
);

create index if not exists idx_service_area_members_kommune
  on public.kommune_service_area_members (kommune_id);

-- =============================================================================
-- 2) Staff grants + pre-signup invitations
-- =============================================================================
create table if not exists public.user_kommune_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kommune_id uuid not null references public.kommuner (id) on delete cascade,
  grant_role text not null default 'staff' check (grant_role in ('staff', 'admin')),
  can_edit boolean not null default true,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists idx_user_kommune_grants_active
  on public.user_kommune_grants (user_id, kommune_id)
  where revoked_at is null;

create index if not exists idx_user_kommune_grants_kommune
  on public.user_kommune_grants (kommune_id)
  where revoked_at is null;

create table if not exists public.kommune_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kommune_id uuid not null references public.kommuner (id) on delete cascade,
  grant_role text not null default 'staff' check (grant_role in ('staff', 'admin')),
  can_edit boolean not null default true,
  is_active boolean not null default true,
  invited_by uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_kommune_invitations_active
  on public.kommune_invitations (lower(trim(email)), kommune_id)
  where is_active = true;

-- =============================================================================
-- 3) listings.kommune_id
-- =============================================================================
alter table public.listings
  add column if not exists kommune_id uuid references public.kommuner (id) on delete set null;

create index if not exists idx_listings_kommune_id on public.listings (kommune_id);

-- =============================================================================
-- 4) chat_messages.service_area_id
-- =============================================================================
alter table public.chat_messages
  add column if not exists service_area_id uuid references public.kommune_service_areas (id) on delete set null;

create index if not exists idx_chat_messages_service_area
  on public.chat_messages (service_area_id, created_at desc);

-- =============================================================================
-- 5) Ensure legal kommune row for a normalized city key (single region_keys element)
-- =============================================================================
create or replace function public.ensure_kommune_for_region_key(p_key text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := public.normalize_region_key(p_key);
  v_id uuid;
  v_slug text;
  v_name text;
begin
  if v_key = '' then
    return null;
  end if;

  select k.id into v_id
  from public.kommuner k
  where v_key = any (
    select public.normalize_region_key(unnest) from unnest(k.region_keys)
  )
  order by case k.status when 'active' then 0 when 'pilot' then 1 else 2 end
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  v_slug := regexp_replace(v_key, '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  v_name := initcap(replace(v_key, '-', ' '));

  insert into public.kommuner (slug, display_name, status, region_keys, launched_at)
  values (v_slug, v_name, 'pilot', array[v_key], now())
  on conflict (slug) do update set
    region_keys = case
      when coalesce(array_length(kommuner.region_keys, 1), 0) = 0 then excluded.region_keys
      when v_key = any (select public.normalize_region_key(unnest) from unnest(kommuner.region_keys)) then kommuner.region_keys
      else array[v_key]
    end,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- =============================================================================
-- 6) Data cleanup: ensure kommuner from listings; split comma-blob rows
-- =============================================================================
do $$
declare
  r record;
  part text;
  v_kid uuid;
  v_bogus_id uuid;
begin
  for r in
    select distinct public.normalize_region_key(city) as city_key
    from public.listings
    where city is not null and trim(city) <> ''
  loop
    if r.city_key <> '' then
      perform public.ensure_kommune_for_region_key(r.city_key);
    end if;
  end loop;

  for r in
    select id, display_name, region_keys
    from public.kommuner
    where display_name like '%,%'
       or (coalesce(array_length(region_keys, 1), 0) = 1
           and region_keys[1] like '%,%')
  loop
    v_bogus_id := r.id;
    for part in
      select distinct public.normalize_region_key(x)
      from unnest(public.parse_kommune_regions_sql(
        coalesce(r.display_name, array_to_string(r.region_keys, ', '))
      )) as t(x)
      where public.normalize_region_key(x) <> ''
    loop
      v_kid := public.ensure_kommune_for_region_key(part);
      if v_kid is not null then
        update public.kommune_access_list set kommune_id = v_kid
        where kommune_id = v_bogus_id or (
          kommune_id is null and public.city_matches_region_keys(region, array[part])
        );
        update public.terms_documents set kommune_id = v_kid where kommune_id = v_bogus_id;
        update public.kommune_dpo_contacts set kommune_id = v_kid where kommune_id = v_bogus_id;
      end if;
    end loop;
    update public.kommuner set status = 'suspended', notes = coalesce(notes, '') || ' [merged legacy combined row]'
    where id = v_bogus_id;
  end loop;
end;
$$;

-- Default 1:1 service area per active kommune
insert into public.kommune_service_areas (slug, display_name, status)
select
  k.slug || '-area',
  k.display_name || ' (område)',
  case when k.status = 'suspended' then 'suspended' else 'active' end
from public.kommuner k
where k.status <> 'suspended'
on conflict (slug) do nothing;

insert into public.kommune_service_area_members (service_area_id, kommune_id, is_primary)
select sa.id, k.id, true
from public.kommuner k
inner join public.kommune_service_areas sa on sa.slug = k.slug || '-area'
where k.status <> 'suspended'
on conflict do nothing;

-- Narvik region shared service area (Nav administers Gratangen + Evenes)
insert into public.kommune_service_areas (slug, display_name, status, notes)
values (
  'narvik-region',
  'Nav Narvik (Narvik, Gratangen, Evenes)',
  'active',
  'Shared chat/administration for Narvik-region kommuner'
)
on conflict (slug) do update set display_name = excluded.display_name, notes = excluded.notes;

insert into public.kommune_service_area_members (service_area_id, kommune_id, is_primary)
select sa.id, k.id, (public.normalize_region_key(k.display_name) = 'narvik')
from public.kommune_service_areas sa
cross join public.kommuner k
where sa.slug = 'narvik-region'
  and public.normalize_region_key(k.display_name) in ('narvik', 'gratangen', 'evenes')
  and k.status <> 'suspended'
on conflict do nothing;

-- Backfill listings.kommune_id
update public.listings l
set kommune_id = public.resolve_kommune_id_from_city(l.city)
where l.kommune_id is null and l.city is not null;

-- Backfill staff grants from profiles
insert into public.user_kommune_grants (user_id, kommune_id, grant_role, can_edit, granted_at)
select distinct
  p.id,
  public.ensure_kommune_for_region_key(rk),
  case when p.role = 'kommune_admin' then 'admin' else 'staff' end,
  coalesce(p.kommune_can_edit, true),
  now()
from public.profiles p
cross join lateral unnest(public.parse_kommune_regions_sql(p.kommune_region)) as rk
where p.role in ('kommune_ansatt', 'kommune_admin')
  and public.ensure_kommune_for_region_key(rk) is not null
on conflict do nothing;

-- Backfill invitations from whitelist (one row per parsed kommune)
insert into public.kommune_invitations (email, kommune_id, grant_role, can_edit, is_active, notes)
select distinct
  lower(trim(kal.email)),
  public.ensure_kommune_for_region_key(rk),
  'staff',
  true,
  kal.is_active,
  kal.notes
from public.kommune_access_list kal
cross join lateral unnest(public.parse_kommune_regions_sql(kal.region)) as rk
where public.ensure_kommune_for_region_key(rk) is not null
on conflict do nothing;

-- Invitations → grants (must exist before backfill loop)
create or replace function public.apply_kommune_invitations_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  u record;
  inv record;
begin
  select id, email into u from auth.users where id = p_user_id;
  if u.id is null then return; end if;

  for inv in
    select i.kommune_id, i.grant_role, i.can_edit
    from public.kommune_invitations i
    where i.is_active and lower(trim(i.email)) = lower(trim(u.email))
  loop
    insert into public.user_kommune_grants (user_id, kommune_id, grant_role, can_edit, granted_at)
    values (p_user_id, inv.kommune_id, inv.grant_role, inv.can_edit, now())
    on conflict do nothing;
  end loop;
end;
$$;

-- Apply invitations for existing users
do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.apply_kommune_invitations_for_user(u.id);
  end loop;
end;
$$;

-- Backfill chat service_area_id (best effort: first listing kommune -> area)
update public.chat_messages cm
set service_area_id = sub.area_id
from (
  select distinct on (cm2.id)
    cm2.id as msg_id,
    (
      select sam.service_area_id
      from public.listings l
      inner join public.kommune_service_area_members sam on sam.kommune_id = l.kommune_id
      where l.owner_id = case
        when exists (select 1 from public.profiles p where p.id = cm2.sender_id and p.role = 'homeowner')
          then cm2.sender_id
        else cm2.receiver_id
      end
      order by l.created_at asc nulls last
      limit 1
    ) as area_id
  from public.chat_messages cm2
  where cm2.service_area_id is null
) sub
where cm.id = sub.msg_id and sub.area_id is not null;

-- =============================================================================
-- 7) Core access functions
-- =============================================================================
create or replace function public.user_kommune_ids(p_user_id uuid default auth.uid())
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array(
      select distinct g.kommune_id
      from public.user_kommune_grants g
      where g.user_id = p_user_id and g.revoked_at is null
    ),
    array[]::uuid[]
  );
$$;

grant execute on function public.user_kommune_ids(uuid) to authenticated, service_role;

create or replace function public.user_service_area_ids(p_user_id uuid default auth.uid())
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array(
      select distinct sam.service_area_id
      from public.user_kommune_grants g
      inner join public.kommune_service_area_members sam on sam.kommune_id = g.kommune_id
      where g.user_id = p_user_id and g.revoked_at is null
    ),
    array[]::uuid[]
  );
$$;

grant execute on function public.user_service_area_ids(uuid) to authenticated, service_role;

create or replace function public.landlord_service_area_ids(p_landlord_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array(
      select distinct sam.service_area_id
      from public.listings l
      inner join public.kommune_service_area_members sam on sam.kommune_id = l.kommune_id
      where l.owner_id = p_landlord_id and l.kommune_id is not null
    ),
    array[]::uuid[]
  );
$$;

grant execute on function public.landlord_service_area_ids(uuid) to authenticated, service_role;

create or replace function public.landlord_kommune_ids(p_landlord_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array(
      select distinct l.kommune_id
      from public.listings l
      where l.owner_id = p_landlord_id and l.kommune_id is not null
    ),
    array[]::uuid[]
  );
$$;

grant execute on function public.landlord_kommune_ids(uuid) to authenticated, service_role;

create or replace function public.current_user_kommune_regions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array(
      select distinct public.normalize_region_key(rk)
      from unnest(public.user_kommune_ids(auth.uid())) uk
      inner join public.kommuner k on k.id = uk
      cross join unnest(k.region_keys) rk
      where public.normalize_region_key(rk) <> ''
    ),
    array[]::text[]
  );
$$;

create or replace function public.kommune_listing_region_ok(p_listing_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kommune_id uuid;
  v_grants uuid[];
begin
  if auth.uid() is null then
    return false;
  end if;

  select l.kommune_id into v_kommune_id from public.listings l where l.id = p_listing_id;
  if v_kommune_id is null then
    select public.resolve_kommune_id_from_city(l.city) into v_kommune_id
    from public.listings l where l.id = p_listing_id;
  end if;
  if v_kommune_id is null then
    return false;
  end if;

  v_grants := public.user_kommune_ids(auth.uid());
  if coalesce(array_length(v_grants, 1), 0) > 0 then
    return v_kommune_id = any (v_grants);
  end if;

  return public.kommune_listing_region_ok_legacy(p_listing_id);
end;
$$;

create or replace function public.kommune_listing_region_ok_legacy(p_listing_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_city text;
  v_regions text[];
  prof_raw text;
  wl_raw text;
  r text;
begin
  select public.normalize_region_key(city) into v_city
  from public.listings where id = p_listing_id;
  if v_city is null or v_city = '' then return false; end if;

  select kommune_region into prof_raw from public.profiles where id = auth.uid();
  v_regions := public.parse_kommune_regions_sql(prof_raw);
  if coalesce(array_length(v_regions, 1), 0) = 0 then
    select kal.region into wl_raw
    from public.kommune_access_list kal
    inner join auth.users u on lower(trim(u.email)) = lower(trim(kal.email))
    where u.id = auth.uid() and kal.is_active
    limit 1;
    v_regions := public.parse_kommune_regions_sql(wl_raw);
  end if;
  if coalesce(array_length(v_regions, 1), 0) = 0 then return false; end if;

  foreach r in array v_regions loop
    if public.normalize_region_key(r) = v_city then return true; end if;
  end loop;
  return false;
end;
$$;

create or replace function public.kommune_may_view_user_profile(p_target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  viewer_kommunes uuid[];
  target_role text;
  target_kommunes uuid[];
begin
  if viewer is null then return false; end if;
  if not public.is_kommune_staff() then return false; end if;
  if p_target_user_id = viewer then return true; end if;

  viewer_kommunes := public.user_kommune_ids(viewer);

  if coalesce(array_length(viewer_kommunes, 1), 0) > 0 then
    if exists (
      select 1 from public.listings l
      where l.owner_id = p_target_user_id
        and l.kommune_id = any (viewer_kommunes)
    ) then
      return true;
    end if;

    select p.role into target_role from public.profiles p where p.id = p_target_user_id;
    if target_role in ('kommune_ansatt', 'kommune_admin') then
      target_kommunes := public.user_kommune_ids(p_target_user_id);
      return viewer_kommunes && target_kommunes;
    end if;
    return false;
  end if;

  return public.kommune_may_view_user_profile_legacy(p_target_user_id);
end;
$$;

create or replace function public.kommune_may_view_user_profile_legacy(p_target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer_regions text[];
  tr text;
  treg text;
begin
  viewer_regions := public.current_user_kommune_regions();
  if coalesce(array_length(viewer_regions, 1), 0) = 0 then return false; end if;

  if exists (
    select 1 from public.listings l
    where l.owner_id = p_target_user_id and public.kommune_listing_region_ok_legacy(l.id)
  ) then return true; end if;

  select p.role, p.kommune_region into tr, treg from public.profiles p where p.id = p_target_user_id;
  if tr in ('kommune_ansatt', 'kommune_admin') then
    return public.regions_overlap(viewer_regions, public.parse_kommune_regions_sql(treg));
  end if;
  return false;
end;
$$;

create or replace function public.staff_may_access_landlord_in_area(
  p_landlord_id uuid,
  p_service_area_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_kommune_staff()
    and p_service_area_id = any (public.user_service_area_ids(auth.uid()))
    and p_service_area_id = any (public.landlord_service_area_ids(p_landlord_id))
    and public.kommune_may_view_user_profile(p_landlord_id);
$$;

grant execute on function public.staff_may_access_landlord_in_area(uuid, uuid) to authenticated;

-- Listing kommune_id trigger
create or replace function public.trg_listings_set_kommune_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.city is not null and trim(new.city) <> '' then
    new.kommune_id := public.resolve_kommune_id_from_city(new.city);
  else
    new.kommune_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_set_kommune_id on public.listings;
create trigger listings_set_kommune_id
  before insert or update of city on public.listings
  for each row execute function public.trg_listings_set_kommune_id();

create or replace function public.sync_profile_for_auth_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  u record;
  user_role text := 'homeowner';
  user_region text := null;
  resolved_role text;
  has_inv boolean;
begin
  select id, email, raw_user_meta_data into u from auth.users where id = p_user_id;
  if u.id is null then return; end if;

  select exists (
    select 1 from public.kommune_invitations i
    where i.is_active and lower(trim(i.email)) = lower(trim(u.email))
  ) into has_inv;

  if not has_inv then
    select a.region into user_region
    from public.kommune_access_list a
    where lower(trim(a.email)) = lower(trim(u.email)) and a.is_active = true
    limit 1;
  end if;

  if has_inv or user_region is not null then
    user_role := 'kommune_ansatt';
  end if;

  resolved_role := coalesce(u.raw_user_meta_data->>'role', user_role);

  insert into public.profiles (id, full_name, email, role, contact_phone, kommune_region, updated_at)
  values (
    u.id,
    coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, ''), '@', 1)),
    u.email,
    resolved_role,
    u.raw_user_meta_data->>'contact_phone',
    case
      when resolved_role in ('kommune_ansatt', 'kommune_admin') then
        coalesce(
          u.raw_user_meta_data->>'kommune_region',
          user_region,
          (
            select string_agg(distinct rk, ', ' order by rk)
            from public.kommune_invitations i
            inner join public.kommuner k on k.id = i.kommune_id
            cross join unnest(k.region_keys) rk
            where i.is_active and lower(trim(i.email)) = lower(trim(u.email))
          )
        )
      else null
    end,
    now()
  )
  on conflict (id) do update set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    contact_phone = coalesce(public.profiles.contact_phone, excluded.contact_phone),
    updated_at = now();

  perform public.apply_kommune_invitations_for_user(p_user_id);
end;
$$;

-- kommune_admin_set_staff_can_edit → update grant
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
  admin_kommunes uuid[];
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_kommune_admin() then raise exception 'forbidden'; end if;

  admin_kommunes := public.user_kommune_ids(auth.uid());
  if coalesce(array_length(admin_kommunes, 1), 0) = 0 then
    admin_kommunes := array(
      select public.ensure_kommune_for_region_key(rk)
      from unnest(public.parse_kommune_regions_sql(
        (select kommune_region from public.profiles where id = auth.uid())
      )) rk
      where public.ensure_kommune_for_region_key(rk) is not null
    );
  end if;

  update public.user_kommune_grants g
  set can_edit = p_can_edit
  where g.user_id = p_target_user_id
    and g.revoked_at is null
    and g.kommune_id = any (admin_kommunes);

  update public.profiles
  set kommune_can_edit = p_can_edit, updated_at = now()
  where id = p_target_user_id and role = 'kommune_ansatt';
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
  viewer_kommunes uuid[];
begin
  if not public.is_kommune_staff() then return; end if;
  viewer_kommunes := public.user_kommune_ids(auth.uid());
  if coalesce(array_length(viewer_kommunes, 1), 0) = 0 then return; end if;

  return query
  select
    u.id,
    coalesce(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))::text,
    u.email::text,
    (
      select string_agg(distinct k.display_name, ', ' order by k.display_name)
      from public.user_kommune_grants g
      inner join public.kommuner k on k.id = g.kommune_id
      where g.user_id = u.id and g.revoked_at is null
    )::text as kommune_region,
    coalesce(p.kommune_can_edit, true),
    coalesce(p.updated_at, u.created_at)::timestamptz
  from auth.users u
  inner join public.profiles p on p.id = u.id and p.role in ('kommune_ansatt', 'kommune_admin')
  where u.id <> auth.uid()
    and exists (
      select 1 from public.user_kommune_grants g
      where g.user_id = u.id and g.revoked_at is null and g.kommune_id = any (viewer_kommunes)
    )
  order by 2 asc nulls last;
end;
$$;

-- =============================================================================
-- 8) Chat RPCs (service area scoped)
-- =============================================================================
-- Return type / signature changed vs 20260430140000 — must drop before replace.
drop function if exists public.get_kommune_landlord_thread_summaries();
drop function if exists public.get_kommune_landlord_thread_messages(uuid);

create or replace function public.get_kommune_landlord_thread_messages(
  p_landlord_id uuid,
  p_service_area_id uuid default null
)
returns setof public.chat_messages
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_area uuid := p_service_area_id;
begin
  if not public.is_kommune_staff() then return; end if;
  if v_area is null then
    select unnest(public.landlord_service_area_ids(p_landlord_id)) into v_area limit 1;
  end if;
  if v_area is null or not public.staff_may_access_landlord_in_area(p_landlord_id, v_area) then
    return;
  end if;

  return query
  select cm.*
  from public.chat_messages cm
  where cm.service_area_id = v_area
    and (
      (cm.sender_id = p_landlord_id and (
        cm.receiver_id is null
        or exists (select 1 from public.profiles p where p.id = cm.receiver_id and p.role in ('kommune_ansatt', 'kommune_admin'))
      ))
      or (cm.receiver_id = p_landlord_id and exists (
        select 1 from public.profiles p where p.id = cm.sender_id and p.role in ('kommune_ansatt', 'kommune_admin')
      ))
    )
  order by cm.created_at asc;
end;
$$;

create or replace function public.get_kommune_landlord_thread_summaries()
returns table (
  landlord_id uuid,
  service_area_id uuid,
  service_area_name text,
  last_at timestamptz,
  last_preview text,
  last_sender_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_kommune_staff() then return; end if;

  return query
  with scoped as (
    select distinct l.owner_id as lid, sam.service_area_id as aid
    from public.listings l
    inner join public.kommune_service_area_members sam on sam.kommune_id = l.kommune_id
    where public.kommune_listing_region_ok(l.id)
      and sam.service_area_id = any (public.user_service_area_ids(auth.uid()))
  ),
  thread_msgs as (
    select cm.*, s.lid, s.aid
    from public.chat_messages cm
    inner join scoped s on cm.service_area_id = s.aid
      and (
        (cm.sender_id = s.lid and (cm.receiver_id is null or exists (
          select 1 from public.profiles p where p.id = cm.receiver_id and p.role in ('kommune_ansatt', 'kommune_admin')
        )))
        or (cm.receiver_id = s.lid and exists (
          select 1 from public.profiles p where p.id = cm.sender_id and p.role in ('kommune_ansatt', 'kommune_admin')
        ))
      )
  ),
  ranked as (
    select
      tm.lid,
      tm.aid,
      tm.created_at as ca,
      tm.content as ct,
      tm.image_urls as imgs,
      tm.sender_id as sid,
      row_number() over (partition by tm.lid, tm.aid order by tm.created_at desc) as rn
    from thread_msgs tm
  )
  select
    r.lid,
    r.aid,
    sa.display_name,
    r.ca,
    left(
      case
        when coalesce(trim(r.ct), '') <> '' then trim(r.ct)
        when coalesce(array_length(r.imgs, 1), 0) > 0 then '[Bilde]'
        else ''
      end,
      240
    ),
    r.sid
  from ranked r
  inner join public.kommune_service_areas sa on sa.id = r.aid
  where r.rn = 1
  order by r.ca desc;
end;
$$;

create or replace function public.get_landlord_kommune_thread_messages(p_service_area_id uuid)
returns setof public.chat_messages
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.role = 'homeowner') then return; end if;
  if p_service_area_id is null or p_service_area_id <> all (public.landlord_service_area_ids(v_uid)) then return; end if;

  return query
  select cm.*
  from public.chat_messages cm
  where cm.service_area_id = p_service_area_id
    and (
      (cm.sender_id = v_uid and (cm.receiver_id is null or exists (
        select 1 from public.profiles p where p.id = cm.receiver_id and p.role in ('kommune_ansatt', 'kommune_admin')
      )))
      or (cm.receiver_id = v_uid and exists (
        select 1 from public.profiles p where p.id = cm.sender_id and p.role in ('kommune_ansatt', 'kommune_admin')
      ))
    )
  order by cm.created_at asc;
end;
$$;

create or replace function public.get_landlord_service_area_threads()
returns table (
  service_area_id uuid,
  display_name text,
  last_at timestamptz,
  last_preview text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;

  return query
  with areas as (
    select unnest(public.landlord_service_area_ids(v_uid)) as aid
  ),
  msgs as (
    select cm.service_area_id as aid, cm.created_at, cm.content, cm.image_urls
    from public.chat_messages cm
    where cm.service_area_id in (select aid from areas)
      and (cm.sender_id = v_uid or cm.receiver_id = v_uid)
  ),
  ranked as (
    select aid, created_at, content, image_urls,
      row_number() over (partition by aid order by created_at desc) as rn
    from msgs
  )
  select
    a.aid,
    sa.display_name,
    r.created_at,
    left(
      case
        when r.created_at is null then ''
        when coalesce(trim(r.content), '') <> '' then trim(r.content)
        when coalesce(array_length(r.image_urls, 1), 0) > 0 then '[Bilde]'
        else ''
      end,
      240
    )
  from areas a
  inner join public.kommune_service_areas sa on sa.id = a.aid
  left join ranked r on r.aid = a.aid and r.rn = 1
  order by coalesce(r.created_at, '1970-01-01'::timestamptz) desc;
end;
$$;

grant execute on function public.get_kommune_landlord_thread_messages(uuid, uuid) to authenticated;
grant execute on function public.get_kommune_landlord_thread_summaries() to authenticated;
grant execute on function public.get_landlord_kommune_thread_messages(uuid) to authenticated;
grant execute on function public.get_landlord_service_area_threads() to authenticated;

-- =============================================================================
-- 9) Ops RPCs: grants + service areas
-- =============================================================================
create or replace function public.ops_get_user_grants(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();
  return coalesce(
    (
      select jsonb_agg(jsonb_build_object(
        'kommune_id', g.kommune_id,
        'slug', k.slug,
        'display_name', k.display_name,
        'region_keys', k.region_keys,
        'grant_role', g.grant_role,
        'can_edit', g.can_edit,
        'granted_at', g.granted_at
      ) order by k.display_name)
      from public.user_kommune_grants g
      inner join public.kommuner k on k.id = g.kommune_id
      where g.user_id = p_user_id and g.revoked_at is null
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.ops_set_user_grants(
  p_user_id uuid,
  p_grants jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g jsonb;
  v_kid uuid;
begin
  perform public.ops_assert_operator();

  update public.user_kommune_grants
  set revoked_at = now()
  where user_id = p_user_id and revoked_at is null;

  if p_grants is not null and jsonb_typeof(p_grants) = 'array' then
    for g in select * from jsonb_array_elements(p_grants) loop
      v_kid := (g->>'kommune_id')::uuid;
      if v_kid is null then continue; end if;
      insert into public.user_kommune_grants (user_id, kommune_id, grant_role, can_edit, granted_by, granted_at)
      values (
        p_user_id,
        v_kid,
        coalesce(nullif(g->>'grant_role', ''), 'staff'),
        coalesce((g->>'can_edit')::boolean, true),
        auth.uid(),
        now()
      );
    end loop;
  end if;

  update public.profiles p set
    kommune_region = (
      select string_agg(distinct array_to_string(k.region_keys, ', '), ', ' order by array_to_string(k.region_keys, ', '))
      from public.user_kommune_grants ug
      inner join public.kommuner k on k.id = ug.kommune_id
      where ug.user_id = p_user_id and ug.revoked_at is null
    ),
    updated_at = now()
  where p.id = p_user_id;

  perform public.ops_write_audit('OPS_USER_GRANTS_CHANGED', p_user_id, p_grants);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.ops_list_service_areas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();
  return coalesce(
    (
      select jsonb_agg(row_to_json(x) order by x.display_name)
      from (
        select
          sa.id,
          sa.slug,
          sa.display_name,
          sa.status,
          sa.notes,
          (
            select coalesce(jsonb_agg(jsonb_build_object(
              'kommune_id', k.id,
              'slug', k.slug,
              'display_name', k.display_name,
              'is_primary', sam.is_primary
            ) order by k.display_name), '[]'::jsonb)
            from public.kommune_service_area_members sam
            inner join public.kommuner k on k.id = sam.kommune_id
            where sam.service_area_id = sa.id
          ) as members
        from public.kommune_service_areas sa
        order by sa.display_name
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.ops_upsert_service_area(
  p_slug text,
  p_display_name text,
  p_status text default 'active',
  p_notes text default null,
  p_member_kommune_ids uuid[] default null,
  p_primary_kommune_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_kid uuid;
begin
  perform public.ops_assert_operator();

  insert into public.kommune_service_areas (slug, display_name, status, notes, updated_at)
  values (lower(trim(p_slug)), trim(p_display_name), coalesce(p_status, 'active'), p_notes, now())
  on conflict (slug) do update set
    display_name = excluded.display_name,
    status = excluded.status,
    notes = coalesce(excluded.notes, kommune_service_areas.notes),
    updated_at = now()
  returning id into v_id;

  if p_member_kommune_ids is not null then
    delete from public.kommune_service_area_members where service_area_id = v_id;
    foreach v_kid in array p_member_kommune_ids loop
      insert into public.kommune_service_area_members (service_area_id, kommune_id, is_primary)
      values (v_id, v_kid, v_kid = p_primary_kommune_id)
      on conflict do nothing;
    end loop;
  end if;

  return jsonb_build_object('id', v_id, 'slug', lower(trim(p_slug)));
end;
$$;

create or replace function public.ops_bulk_invite(
  p_kommune_ids uuid[],
  p_emails text[],
  p_grant_role text default 'staff',
  p_can_edit boolean default true,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_kid uuid;
  v_count int := 0;
begin
  perform public.ops_assert_operator();

  foreach v_email in array coalesce(p_emails, array[]::text[]) loop
    v_email := lower(trim(v_email));
    if v_email = '' or position('@' in v_email) = 0 then continue; end if;
    foreach v_kid in array coalesce(p_kommune_ids, array[]::uuid[]) loop
      insert into public.kommune_invitations (email, kommune_id, grant_role, can_edit, is_active, invited_by, notes)
      values (v_email, v_kid, coalesce(p_grant_role, 'staff'), coalesce(p_can_edit, true), true, auth.uid(), p_notes)
      on conflict do nothing;
      v_count := v_count + 1;
    end loop;
  end loop;

  return jsonb_build_object('ok', true, 'count', v_count);
end;
$$;

create or replace function public.ops_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
  v_whitelist jsonb;
  v_grants jsonb;
  v_landlord_scope jsonb;
begin
  perform public.ops_assert_operator();

  select
    u.id, u.email, u.created_at as auth_created_at, u.email_confirmed_at,
    p.full_name, p.role, p.kommune_region, coalesce(p.kommune_can_edit, true) as kommune_can_edit,
    p.contact_phone, ua.signed_at, coalesce(ua.is_terminated, false) as is_terminated,
    coalesce(ua.terminated_by_kommune, false) as terminated_by_kommune
  into v_row
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_agreements ua on ua.user_id = u.id
  where u.id = p_user_id;

  if v_row.id is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) into v_whitelist
  from (
    select id, email, region, is_active, notes, kommune_id, created_at
    from public.kommune_access_list where lower(trim(email)) = lower(trim(v_row.email))
  ) w;

  v_grants := public.ops_get_user_grants(p_user_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'kommune_id', k.id,
    'display_name', k.display_name,
    'service_areas', (
      select coalesce(jsonb_agg(sa.display_name), '[]'::jsonb)
      from public.kommune_service_area_members sam
      inner join public.kommune_service_areas sa on sa.id = sam.service_area_id
      where sam.kommune_id = k.id
    )
  )), '[]'::jsonb) into v_landlord_scope
  from (
    select distinct l.kommune_id as kid
    from public.listings l where l.owner_id = p_user_id and l.kommune_id is not null
  ) x
  inner join public.kommuner k on k.id = x.kid;

  return jsonb_build_object(
    'id', v_row.id,
    'email_full', v_row.email,
    'email_masked', public.ops_mask_email(v_row.email),
    'full_name', v_row.full_name,
    'role', v_row.role,
    'kommune_region', v_row.kommune_region,
    'kommune_can_edit', v_row.kommune_can_edit,
    'contact_phone', v_row.contact_phone,
    'auth_created_at', v_row.auth_created_at,
    'email_confirmed_at', v_row.email_confirmed_at,
    'signed_at', v_row.signed_at,
    'is_terminated', v_row.is_terminated,
    'terminated_by_kommune', v_row.terminated_by_kommune,
    'listing_count', (select count(*)::int from public.listings where owner_id = p_user_id),
    'whitelist_entries', v_whitelist,
    'kommune_grants', v_grants,
    'landlord_kommune_scope', v_landlord_scope,
    'is_platform_operator', exists (
      select 1 from public.platform_operators po
      where po.user_id = p_user_id and po.is_active
    )
  );
end;
$$;

create or replace function public.ops_set_user_role(
  p_user_id uuid,
  p_role text,
  p_kommune_region text default null,
  p_kommune_can_edit boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  perform public.ops_assert_operator();

  if p_role is not null and p_role not in ('homeowner', 'kommune_ansatt', 'kommune_admin') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  select jsonb_build_object('role', p.role, 'kommune_region', p.kommune_region, 'kommune_can_edit', p.kommune_can_edit)
  into v_before from public.profiles p where p.id = p_user_id;
  if v_before is null then raise exception 'user not found' using errcode = 'P0002'; end if;

  update public.profiles set
    role = coalesce(p_role, role),
    kommune_region = case when p_role in ('kommune_ansatt', 'kommune_admin') then p_kommune_region else null end,
    kommune_can_edit = case when p_role = 'kommune_ansatt' then coalesce(p_kommune_can_edit, true) else kommune_can_edit end,
    updated_at = now()
  where id = p_user_id;

  if p_role = 'homeowner' then
    update public.user_kommune_grants set revoked_at = now()
    where user_id = p_user_id and revoked_at is null;
  elsif p_kommune_region is not null and trim(p_kommune_region) <> '' then
    perform public.ops_set_user_grants(
      p_user_id,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'kommune_id', public.ensure_kommune_for_region_key(rk),
          'grant_role', case when p_role = 'kommune_admin' then 'admin' else 'staff' end,
          'can_edit', coalesce(p_kommune_can_edit, true)
        )), '[]'::jsonb)
        from unnest(public.parse_kommune_regions_sql(p_kommune_region)) rk
        where public.ensure_kommune_for_region_key(rk) is not null
      )
    );
  end if;

  select jsonb_build_object('role', p.role, 'kommune_region', p.kommune_region, 'kommune_can_edit', p.kommune_can_edit)
  into v_after from public.profiles p where p.id = p_user_id;

  perform public.ops_write_audit('OPS_USER_ROLE_CHANGED', p_user_id, jsonb_build_object('before', v_before, 'after', v_after));
  return jsonb_build_object('ok', true, 'after', v_after);
end;
$$;

grant execute on function public.ops_get_user_grants(uuid) to authenticated;
grant execute on function public.ops_set_user_grants(uuid, jsonb) to authenticated;
grant execute on function public.ops_list_service_areas() to authenticated;
grant execute on function public.ops_upsert_service_area(text, text, text, text, uuid[], uuid) to authenticated;
grant execute on function public.ops_bulk_invite(uuid[], text[], text, boolean, text) to authenticated;

create or replace function public.get_my_kommune_access()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'kommune_ids', public.user_kommune_ids(auth.uid()),
    'region_keys', public.current_user_kommune_regions(),
    'service_area_ids', public.user_service_area_ids(auth.uid())
  );
$$;

grant execute on function public.get_my_kommune_access() to authenticated;

-- RLS: grants readable by self; ops via RPC only
alter table public.user_kommune_grants enable row level security;
alter table public.kommune_invitations enable row level security;
alter table public.kommune_service_areas enable row level security;
alter table public.kommune_service_area_members enable row level security;

drop policy if exists "Users read own grants" on public.user_kommune_grants;
create policy "Users read own grants"
  on public.user_kommune_grants for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Authenticated read service areas" on public.kommune_service_areas;
create policy "Authenticated read service areas"
  on public.kommune_service_areas for select to authenticated
  using (status = 'active');

drop policy if exists "Authenticated read service area members" on public.kommune_service_area_members;
create policy "Authenticated read service area members"
  on public.kommune_service_area_members for select to authenticated
  using (true);

-- Resolve shared service area for staff ↔ landlord thread (intersection of scopes)
create or replace function public.resolve_staff_landlord_thread_area(p_landlord_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.aid
  from (
    select unnest(public.user_service_area_ids(auth.uid())) as aid
    intersect
    select unnest(public.landlord_service_area_ids(p_landlord_id)) as aid
  ) a
  limit 1;
$$;

grant execute on function public.resolve_staff_landlord_thread_area(uuid) to authenticated;

-- Kommune admin: manage invitations for granted kommuner
create or replace function public.kommune_list_my_invitations()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_kommune_staff() then return '[]'::jsonb; end if;

  return coalesce(
    (
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'email', i.email,
        'kommune_id', i.kommune_id,
        'kommune_name', k.display_name,
        'grant_role', i.grant_role,
        'can_edit', i.can_edit,
        'is_active', i.is_active,
        'notes', i.notes,
        'created_at', i.created_at
      ) order by i.email, k.display_name)
      from public.kommune_invitations i
      inner join public.kommuner k on k.id = i.kommune_id
      where i.kommune_id = any (public.user_kommune_ids(auth.uid()))
        and (
          exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'kommune_admin')
          or coalesce((select p.kommune_can_edit from public.profiles p where p.id = auth.uid()), true)
        )
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.kommune_upsert_invitation(
  p_email text,
  p_kommune_id uuid,
  p_can_edit boolean default true,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not public.is_kommune_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if p_kommune_id is null or p_kommune_id <> all (public.user_kommune_ids(auth.uid())) then
    raise exception 'kommune not in scope' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.user_kommune_grants g
    where g.user_id = auth.uid()
      and g.kommune_id = p_kommune_id
      and g.revoked_at is null
      and (g.grant_role = 'admin' or exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.role = 'kommune_admin'
      ))
  ) then
    raise exception 'admin grant required' using errcode = '42501';
  end if;

  update public.kommune_invitations i set
    can_edit = coalesce(p_can_edit, true),
    is_active = true,
    notes = coalesce(p_notes, i.notes),
    updated_at = now()
  where lower(trim(i.email)) = v_email and i.kommune_id = p_kommune_id and i.is_active;

  if not found then
    insert into public.kommune_invitations (email, kommune_id, grant_role, can_edit, is_active, invited_by, notes)
    values (v_email, p_kommune_id, 'staff', coalesce(p_can_edit, true), true, auth.uid(), p_notes);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.kommune_set_invitation_active(p_invitation_id uuid, p_is_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_kommune_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.kommune_invitations i set
    is_active = coalesce(p_is_active, false),
    updated_at = now()
  where i.id = p_invitation_id
    and i.kommune_id = any (public.user_kommune_ids(auth.uid()))
    and exists (
      select 1 from public.user_kommune_grants g
      where g.user_id = auth.uid()
        and g.kommune_id = i.kommune_id
        and g.revoked_at is null
        and (g.grant_role = 'admin' or exists (
          select 1 from public.profiles p where p.id = auth.uid() and p.role = 'kommune_admin'
        ))
    );

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.kommune_list_my_invitations() to authenticated;
grant execute on function public.kommune_upsert_invitation(text, uuid, boolean, text) to authenticated;
grant execute on function public.kommune_set_invitation_active(uuid, boolean) to authenticated;

create or replace function public.kommune_list_grantable_kommuner()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', k.id,
      'display_name', k.display_name,
      'slug', k.slug,
      'region_keys', k.region_keys
    ) order by k.display_name),
    '[]'::jsonb
  )
  from public.kommuner k
  where k.id = any (public.user_kommune_ids(auth.uid()))
    and k.status <> 'suspended'
    and exists (
      select 1 from public.user_kommune_grants g
      where g.user_id = auth.uid()
        and g.kommune_id = k.id
        and g.revoked_at is null
        and (
          g.grant_role = 'admin'
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'kommune_admin')
        )
    );
$$;

grant execute on function public.kommune_list_grantable_kommuner() to authenticated;
