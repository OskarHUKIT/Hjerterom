-- Boly Platform Operations Console — Phase 2
-- Kommune registry, platform_events, region normalization, extended ops RPCs.

-- === Region normalization (align listing city with terms parser) ===
create or replace function public.normalize_region_key(p text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  s text;
begin
  if p is null then return ''; end if;
  s := lower(trim(p));
  if s = '' then return ''; end if;
  s := translate(s, 'æøåäöü', 'aoaaou');
  s := regexp_replace(s, '\s+kommune\s*$', '', 'i');
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := trim(s);
  return s;
end;
$$;

comment on function public.normalize_region_key(text) is
  'Canonical region key for matching listings.city to kommune region_keys.';

create or replace function public.city_matches_region_keys(p_city text, p_region_keys text[])
returns boolean
language sql
immutable
as $$
  select coalesce(
    public.normalize_region_key(p_city) = any (
      select public.normalize_region_key(unnest) from unnest(coalesce(p_region_keys, array[]::text[]))
    ),
    false
  );
$$;

-- === Kommune registry ===
create table if not exists public.kommuner (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  org_nr text,
  status text not null default 'draft'
    check (status in ('draft', 'pilot', 'active', 'suspended')),
  region_keys text[] not null default array[]::text[],
  primary_contact_email text,
  launched_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kommuner is
  'Canonical kommune tenants for Boly platform operations and scaling.';

create index if not exists idx_kommuner_status on public.kommuner (status);

alter table public.kommuner enable row level security;

drop policy if exists "Active kommuner readable by authenticated" on public.kommuner;
create policy "Active kommuner readable by authenticated"
  on public.kommuner for select
  to authenticated
  using (status in ('pilot', 'active'));

-- === Platform events (GDPR-safe error/health inbox) ===
create table if not exists public.platform_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  severity text not null check (severity in ('info', 'warn', 'error')),
  source text not null,
  code text not null,
  message text not null,
  user_id uuid references auth.users (id) on delete set null,
  kommune_id uuid references public.kommuner (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_platform_events_created on public.platform_events (created_at desc);
create index if not exists idx_platform_events_severity on public.platform_events (severity, created_at desc);
create index if not exists idx_platform_events_kommune on public.platform_events (kommune_id, created_at desc);

comment on table public.platform_events is
  'Structured operator-visible events. No chat bodies or secrets. Insert via service role from Edge Functions.';

alter table public.platform_events enable row level security;

-- === FK columns (optional, legacy region text kept) ===
alter table public.kommune_access_list
  add column if not exists kommune_id uuid references public.kommuner (id) on delete set null;

alter table public.kommune_dpo_contacts
  add column if not exists kommune_id uuid references public.kommuner (id) on delete set null;

alter table public.terms_documents
  add column if not exists kommune_id uuid references public.kommuner (id) on delete set null;

create index if not exists idx_kommune_access_list_kommune on public.kommune_access_list (kommune_id);
create index if not exists idx_terms_documents_kommune on public.terms_documents (kommune_id);

-- === Seed kommuner from existing data ===
insert into public.kommuner (slug, display_name, status, region_keys, launched_at)
select
  regexp_replace(public.normalize_region_key(src.label), '[^a-z0-9]+', '-', 'g'),
  initcap(src.label),
  case when src.label ilike '%narvik%' then 'active' else 'pilot' end,
  array[public.normalize_region_key(src.label)],
  now()
from (
  select distinct trim(region) as label
  from public.kommune_dpo_contacts
  where not fallback and trim(region) <> '' and region <> '__fallback__'
  union
  select distinct trim(region) from public.kommune_access_list where is_active and trim(region) <> ''
  union
  select distinct trim(city) from public.listings where city is not null and trim(city) <> ''
) src
where public.normalize_region_key(src.label) <> ''
on conflict (slug) do nothing;

-- Backfill kommune_id on whitelist / DPO / terms where region matches
update public.kommune_access_list kal
set kommune_id = k.id
from public.kommuner k
where kal.kommune_id is null
  and public.city_matches_region_keys(kal.region, k.region_keys);

update public.kommune_dpo_contacts kdc
set kommune_id = k.id
from public.kommuner k
where kdc.kommune_id is null
  and not kdc.fallback
  and public.city_matches_region_keys(kdc.region, k.region_keys);

update public.terms_documents td
set kommune_id = k.id
from public.kommuner k
where td.kommune_id is null
  and td.kommune_region is not null
  and trim(td.kommune_region) <> ''
  and public.city_matches_region_keys(td.kommune_region, k.region_keys);

-- === Listing region check uses normalized keys ===
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
  r text;
begin
  if (select auth.uid()) is null then
    return false;
  end if;

  select public.normalize_region_key(city) into v_city
  from public.listings where id = p_listing_id;
  if v_city is null or v_city = '' then
    return false;
  end if;

  v_regions := public.current_user_kommune_regions();
  if coalesce(array_length(v_regions, 1), 0) = 0 then
    return false;
  end if;

  foreach r in array v_regions loop
    if public.normalize_region_key(r) = v_city then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

create or replace function public.resolve_kommune_id_from_city(p_city text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select k.id
  from public.kommuner k
  where public.city_matches_region_keys(p_city, k.region_keys)
  order by case k.status when 'active' then 0 when 'pilot' then 1 else 2 end
  limit 1;
$$;

grant execute on function public.resolve_kommune_id_from_city(text) to authenticated, service_role;

-- === Kommune health metrics (internal) ===
create or replace function public.ops_kommune_health_metrics(p_kommune_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_keys text[];
  v_status text;
  v_total_listings int;
  v_matched_listings int;
  v_staff int;
  v_admins int;
  v_has_dpo boolean;
  v_dpo_fallback_only boolean;
  v_terms_approved int;
  v_terms_pending int;
  v_sign_initiated int;
  v_sign_completed int;
  v_match_rate numeric;
  v_health text := 'green';
begin
  select region_keys, status into v_keys, v_status
  from public.kommuner where id = p_kommune_id;
  if v_keys is null then
    return '{}'::jsonb;
  end if;

  select count(*)::int into v_matched_listings
  from public.listings l
  where public.city_matches_region_keys(l.city, v_keys);

  v_match_rate := case when v_matched_listings > 0 then 100 else 100 end;

  select count(*)::int into v_total_listings
  from public.listings l
  where public.normalize_region_key(l.city) <> ''
    and exists (
      select 1 from unnest(v_keys) rk
      where public.normalize_region_key(l.city) like public.normalize_region_key(rk) || '%'
         or public.normalize_region_key(rk) like public.normalize_region_key(l.city) || '%'
    );

  if v_total_listings > 0 then
    v_match_rate := round(100.0 * v_matched_listings / v_total_listings, 1);
  else
    v_match_rate := 100;
  end if;

  select count(*)::int into v_staff
  from public.profiles p
  where p.role in ('kommune_ansatt', 'kommune_admin')
    and exists (
      select 1 from unnest(public.parse_kommune_regions_sql(p.kommune_region)) pr
      where public.normalize_region_key(pr) = any (
        select public.normalize_region_key(unnest) from unnest(v_keys)
      )
    );

  select count(*)::int into v_admins
  from public.profiles p
  where p.role = 'kommune_admin'
    and exists (
      select 1 from unnest(public.parse_kommune_regions_sql(p.kommune_region)) pr
      where public.normalize_region_key(pr) = any (
        select public.normalize_region_key(unnest) from unnest(v_keys)
      )
    );

  select exists (
    select 1 from public.kommune_dpo_contacts d
    where d.kommune_id = p_kommune_id and not d.fallback
  ) into v_has_dpo;

  v_dpo_fallback_only := not v_has_dpo;

  select count(*)::int into v_terms_approved
  from public.terms_documents td
  where td.kommune_id = p_kommune_id and td.approved_for_utleier_signing = true;

  select count(*)::int into v_terms_pending
  from public.terms_documents td
  where td.kommune_id = p_kommune_id and td.approved_for_utleier_signing = false;

  select count(*)::int into v_sign_initiated
  from public.audit_logs al
  where al.action_type = 'SIGN_INITIATED'
    and al.created_at >= now() - interval '7 days';

  select count(*)::int into v_sign_completed
  from public.audit_logs al
  where al.action_type = 'SIGN_TERMS_BANKID'
    and al.created_at >= now() - interval '7 days';

  if v_admins = 0 or v_staff = 0 then v_health := 'red';
  elsif v_dpo_fallback_only or v_terms_approved = 0 or v_match_rate < 80 then v_health := 'amber';
  elsif v_match_rate < 95 then v_health := 'amber';
  end if;

  if v_status = 'suspended' then v_health := 'red'; end if;

  return jsonb_build_object(
    'health', v_health,
    'staff_count', v_staff,
    'admin_count', v_admins,
    'has_dpo', v_has_dpo,
    'dpo_fallback_only', v_dpo_fallback_only,
    'terms_approved', v_terms_approved,
    'terms_pending', v_terms_pending,
    'listings_matched', v_matched_listings,
    'region_match_rate', v_match_rate,
    'sign_initiated_7d', v_sign_initiated,
    'sign_completed_7d', v_sign_completed
  );
end;
$$;

-- === Ops RPCs: kommuner ===

create or replace function public.ops_list_kommuner()
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
          k.id,
          k.slug,
          k.display_name,
          k.org_nr,
          k.status,
          k.region_keys,
          k.primary_contact_email,
          k.launched_at,
          k.created_at,
          public.ops_kommune_health_metrics(k.id) as health_metrics
        from public.kommuner k
        order by k.display_name
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.ops_list_kommuner() to authenticated;

create or replace function public.ops_get_kommune_detail(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_k public.kommuner%rowtype;
  v_staff jsonb;
  v_whitelist jsonb;
  v_terms jsonb;
  v_dpo jsonb;
  v_events jsonb;
begin
  perform public.ops_assert_operator();

  select * into v_k from public.kommuner where slug = p_slug;
  if v_k.id is null then
    raise exception 'kommune not found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) into v_staff
  from (
    select
      p.id,
      coalesce(p.full_name, split_part(u.email, '@', 1)) as full_name,
      public.ops_mask_email(u.email) as email_masked,
      p.role,
      p.kommune_region,
      coalesce(p.kommune_can_edit, true) as kommune_can_edit
    from public.profiles p
    inner join auth.users u on u.id = p.id
    where p.role in ('kommune_ansatt', 'kommune_admin')
      and exists (
        select 1 from unnest(public.parse_kommune_regions_sql(p.kommune_region)) pr
        where public.normalize_region_key(pr) = any (
          select public.normalize_region_key(unnest) from unnest(v_k.region_keys)
        )
      )
    order by p.role desc, 2
  ) s;

  select coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) into v_whitelist
  from (
    select id, email, region, is_active, notes, created_at
    from public.kommune_access_list
    where kommune_id = v_k.id or (
      kommune_id is null and public.city_matches_region_keys(region, v_k.region_keys)
    )
    order by created_at desc
  ) w;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_terms
  from (
    select id, title, version, approved_for_utleier_signing, created_at
    from public.terms_documents
    where kommune_id = v_k.id
       or (kommune_id is null and public.city_matches_region_keys(kommune_region, v_k.region_keys))
    order by created_at desc
    limit 20
  ) t;

  select to_jsonb(d) into v_dpo
  from public.kommune_dpo_contacts d
  where d.kommune_id = v_k.id
  limit 1;

  select coalesce(jsonb_agg(row_to_json(e)), '[]'::jsonb) into v_events
  from (
    select id, severity, source, code, message, created_at
    from public.platform_events
    where kommune_id = v_k.id
    order by created_at desc
    limit 30
  ) e;

  return jsonb_build_object(
    'kommune', row_to_json(v_k),
    'health_metrics', public.ops_kommune_health_metrics(v_k.id),
    'staff', v_staff,
    'whitelist', v_whitelist,
    'terms', v_terms,
    'dpo', v_dpo,
    'recent_events', v_events
  );
end;
$$;

grant execute on function public.ops_get_kommune_detail(text) to authenticated;

create or replace function public.ops_upsert_kommune(
  p_slug text,
  p_display_name text,
  p_org_nr text default null,
  p_status text default 'draft',
  p_region_keys text[] default null,
  p_primary_contact_email text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_keys text[];
begin
  perform public.ops_assert_operator();

  if p_slug is null or trim(p_slug) = '' or p_display_name is null or trim(p_display_name) = '' then
    raise exception 'slug and display_name required' using errcode = '22023';
  end if;

  v_keys := coalesce(
    (select array_agg(distinct public.normalize_region_key(k)) from unnest(coalesce(p_region_keys, array[p_display_name])) k where public.normalize_region_key(k) <> ''),
    array[]::text[]
  );

  insert into public.kommuner (slug, display_name, org_nr, status, region_keys, primary_contact_email, notes, updated_at)
  values (
    lower(trim(p_slug)),
    trim(p_display_name),
    nullif(trim(coalesce(p_org_nr, '')), ''),
    coalesce(nullif(trim(p_status), ''), 'draft'),
    v_keys,
    nullif(trim(coalesce(p_primary_contact_email, '')), ''),
    p_notes,
    now()
  )
  on conflict (slug) do update set
    display_name = excluded.display_name,
    org_nr = coalesce(excluded.org_nr, kommuner.org_nr),
    status = excluded.status,
    region_keys = case when coalesce(array_length(excluded.region_keys, 1), 0) > 0 then excluded.region_keys else kommuner.region_keys end,
    primary_contact_email = coalesce(excluded.primary_contact_email, kommuner.primary_contact_email),
    notes = coalesce(excluded.notes, kommuner.notes),
    updated_at = now()
  returning id into v_id;

  perform public.ops_write_audit(
    'OPS_KOMMUNE_UPSERT',
    null,
    jsonb_build_object('kommune_id', v_id, 'slug', lower(trim(p_slug)), 'status', p_status)
  );

  return jsonb_build_object('ok', true, 'id', v_id, 'slug', lower(trim(p_slug)));
end;
$$;

grant execute on function public.ops_upsert_kommune(text, text, text, text, text[], text, text) to authenticated;

create or replace function public.ops_set_kommune_status(p_slug text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.ops_assert_operator();
  if p_status not in ('draft', 'pilot', 'active', 'suspended') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  update public.kommuner
  set status = p_status, updated_at = now(),
      launched_at = case when p_status = 'active' and launched_at is null then now() else launched_at end
  where slug = p_slug
  returning id into v_id;

  if v_id is null then
    raise exception 'kommune not found' using errcode = 'P0002';
  end if;

  perform public.ops_write_audit(
    'OPS_KOMMUNE_STATUS',
    null,
    jsonb_build_object('kommune_id', v_id, 'slug', p_slug, 'status', p_status)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.ops_set_kommune_status(text, text) to authenticated;

create or replace function public.ops_bulk_whitelist(
  p_kommune_id uuid,
  p_emails text[],
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_region text;
  v_status text;
  v_email text;
  v_count int := 0;
begin
  perform public.ops_assert_operator();

  select
    coalesce(array_to_string(k.region_keys, ', '), k.display_name),
    k.status
  into v_region, v_status
  from public.kommuner k where k.id = p_kommune_id;

  if v_region is null then
    raise exception 'kommune not found' using errcode = 'P0002';
  end if;
  if v_status = 'suspended' then
    raise exception 'kommune suspended' using errcode = '42501';
  end if;

  foreach v_email in array coalesce(p_emails, array[]::text[]) loop
    v_email := lower(trim(v_email));
    if v_email = '' or position('@' in v_email) = 0 then continue; end if;
    insert into public.kommune_access_list (email, region, is_active, notes, kommune_id, updated_at)
    values (v_email, v_region, true, p_notes, p_kommune_id, now())
    on conflict (email) do update
    set region = excluded.region, is_active = true, kommune_id = excluded.kommune_id,
        notes = coalesce(excluded.notes, kommune_access_list.notes), updated_at = now();
    v_count := v_count + 1;
  end loop;

  perform public.ops_write_audit(
    'OPS_KOMMUNE_WHITELIST_BULK',
    null,
    jsonb_build_object('kommune_id', p_kommune_id, 'count', v_count)
  );

  return jsonb_build_object('ok', true, 'count', v_count);
end;
$$;

grant execute on function public.ops_bulk_whitelist(uuid, text[], text) to authenticated;

create or replace function public.ops_deactivate_whitelist(p_whitelist_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();

  update public.kommune_access_list
  set is_active = false, updated_at = now()
  where id = p_whitelist_id;

  if not found then
    raise exception 'whitelist row not found' using errcode = 'P0002';
  end if;

  perform public.ops_write_audit('OPS_WHITELIST_DEACTIVATED', null, jsonb_build_object('whitelist_id', p_whitelist_id));
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.ops_deactivate_whitelist(uuid) to authenticated;

create or replace function public.ops_upsert_dpo(
  p_kommune_id uuid,
  p_dpo_email text,
  p_dpo_name text default null,
  p_dpo_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_region text;
begin
  perform public.ops_assert_operator();

  select display_name into v_region from public.kommuner where id = p_kommune_id;
  if v_region is null then
    raise exception 'kommune not found' using errcode = 'P0002';
  end if;
  if p_dpo_email is null or trim(p_dpo_email) = '' then
    raise exception 'dpo_email required' using errcode = '22023';
  end if;

  insert into public.kommune_dpo_contacts (region, dpo_email, dpo_name, dpo_phone, kommune_id, fallback, updated_at)
  values (v_region, lower(trim(p_dpo_email)), p_dpo_name, p_dpo_phone, p_kommune_id, false, now())
  on conflict (region) do update set
    dpo_email = excluded.dpo_email,
    dpo_name = coalesce(excluded.dpo_name, kommune_dpo_contacts.dpo_name),
    dpo_phone = coalesce(excluded.dpo_phone, kommune_dpo_contacts.dpo_phone),
    kommune_id = excluded.kommune_id,
    updated_at = now();

  perform public.ops_write_audit('OPS_KOMMUNE_DPO_UPSERT', null, jsonb_build_object('kommune_id', p_kommune_id));
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.ops_upsert_dpo(uuid, text, text, text) to authenticated;

create or replace function public.ops_region_mismatch_report(p_kommune_id uuid, p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_keys text[];
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  perform public.ops_assert_operator();

  select region_keys into v_keys from public.kommuner where id = p_kommune_id;
  if v_keys is null then
    raise exception 'kommune not found' using errcode = 'P0002';
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(x))
      from (
        select l.id, l.address, l.city, public.normalize_region_key(l.city) as city_normalized
        from public.listings l
        where public.normalize_region_key(l.city) <> ''
          and not public.city_matches_region_keys(l.city, v_keys)
        order by l.created_at desc
        limit v_limit
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.ops_region_mismatch_report(uuid, int) to authenticated;

-- === Error overview ===

create or replace function public.ops_get_error_overview(
  p_since timestamptz default null,
  p_kommune_id uuid default null,
  p_limit int default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := coalesce(p_since, now() - interval '7 days');
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_by_code jsonb;
  v_by_source jsonb;
  v_recent jsonb;
  v_funnel jsonb;
begin
  perform public.ops_assert_operator();

  select coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) into v_by_code
  from (
    select code, severity, count(*)::int as count
    from public.platform_events
    where created_at >= v_since
      and (p_kommune_id is null or kommune_id = p_kommune_id)
    group by code, severity
    order by count desc
    limit 30
  ) c;

  select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) into v_by_source
  from (
    select source, count(*)::int as count
    from public.platform_events
    where created_at >= v_since
      and severity in ('warn', 'error')
      and (p_kommune_id is null or kommune_id = p_kommune_id)
    group by source
    order by count desc
  ) s;

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_recent
  from (
    select pe.id, pe.severity, pe.source, pe.code, pe.message, pe.user_id, pe.kommune_id, pe.created_at,
           k.display_name as kommune_name, k.slug as kommune_slug
    from public.platform_events pe
    left join public.kommuner k on k.id = pe.kommune_id
    where pe.created_at >= v_since
      and (p_kommune_id is null or pe.kommune_id = p_kommune_id)
    order by pe.created_at desc
    limit v_limit
  ) r;

  select jsonb_build_object(
    'sign_initiated', (select count(*)::int from public.audit_logs where action_type = 'SIGN_INITIATED' and created_at >= v_since),
    'sign_completed', (select count(*)::int from public.audit_logs where action_type = 'SIGN_TERMS_BANKID' and created_at >= v_since),
    'errors_24h', (select count(*)::int from public.platform_events where severity = 'error' and created_at >= now() - interval '24 hours'),
    'warnings_24h', (select count(*)::int from public.platform_events where severity = 'warn' and created_at >= now() - interval '24 hours')
  ) into v_funnel;

  return jsonb_build_object(
    'since', v_since,
    'by_code', v_by_code,
    'by_source', v_by_source,
    'recent', v_recent,
    'funnel', v_funnel
  );
end;
$$;

grant execute on function public.ops_get_error_overview(timestamptz, uuid, int) to authenticated;

-- === Growth: per-kommune stats + funnel ===

create or replace function public.ops_get_kommune_growth_stats()
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
      select jsonb_agg(row_to_json(x) order by x.listings desc)
      from (
        select
          k.id,
          k.slug,
          k.display_name,
          k.status,
          (select count(*)::int from public.listings l where public.city_matches_region_keys(l.city, k.region_keys)) as listings,
          (select count(distinct l.owner_id)::int from public.listings l where public.city_matches_region_keys(l.city, k.region_keys)) as landlords,
          (select count(*)::int from public.profiles p where p.role in ('kommune_ansatt','kommune_admin')
            and exists (select 1 from unnest(public.parse_kommune_regions_sql(p.kommune_region)) pr
              where public.normalize_region_key(pr) = any (select public.normalize_region_key(unnest) from unnest(k.region_keys)))) as staff,
          public.ops_kommune_health_metrics(k.id) as health_metrics
        from public.kommuner k
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.ops_get_kommune_growth_stats() to authenticated;

create or replace function public.ops_get_funnel_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();
  return jsonb_build_object(
    'users_total', (select count(*)::int from auth.users),
    'users_confirmed', (select count(*)::int from auth.users where email_confirmed_at is not null),
    'landlords', (select count(*)::int from public.profiles where role = 'homeowner'),
    'listings_total', (select count(*)::int from public.listings),
    'agreements_signed', (select count(*)::int from public.user_agreements where coalesce(is_terminated, false) = false and signed_at is not null),
    'sign_initiated_30d', (select count(*)::int from public.audit_logs where action_type = 'SIGN_INITIATED' and created_at >= now() - interval '30 days'),
    'sign_completed_30d', (select count(*)::int from public.audit_logs where action_type = 'SIGN_TERMS_BANKID' and created_at >= now() - interval '30 days')
  );
end;
$$;

grant execute on function public.ops_get_funnel_stats() to authenticated;

-- === Whitelist RLS: scope edits to own kommune (kommune staff) ===
drop policy if exists "Kommune admins can manage access list" on public.kommune_access_list;

drop policy if exists "Kommune staff manage own kommune whitelist" on public.kommune_access_list;
create policy "Kommune staff manage own kommune whitelist"
  on public.kommune_access_list for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('kommune_ansatt', 'kommune_admin')
        and coalesce(p.kommune_can_edit, true) = true
        and (
          kommune_access_list.kommune_id is not null
          and exists (
            select 1 from public.kommuner k
            where k.id = kommune_access_list.kommune_id
              and k.status <> 'suspended'
              and public.regions_overlap(
                public.current_user_kommune_regions(),
                k.region_keys
              )
          )
        )
    )
    or public.is_boly_operator()
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('kommune_ansatt', 'kommune_admin')
        and coalesce(p.kommune_can_edit, true) = true
    )
    or public.is_boly_operator()
  );

-- Operators can read all kommuner
drop policy if exists "Operators read all kommuner" on public.kommuner;
create policy "Operators read all kommuner"
  on public.kommuner for select
  to authenticated
  using (public.is_boly_operator());
