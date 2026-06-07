-- Reservasjon av bolig for intern avklaring: RLS, unik aktiv rad per bolig, RPC for reserver / frigi / avbryt.
-- Utløpte reservasjoner markeres som expired ved kall til reserve/release eller manuelt.

create unique index if not exists idx_one_active_mediation_per_listing
  on public.listing_mediation_reservations (listing_id)
  where status = 'active';

alter table public.listing_mediation_reservations enable row level security;

drop policy if exists "Kommune can read mediation reservations" on public.listing_mediation_reservations;
create policy "Kommune can read mediation reservations"
  on public.listing_mediation_reservations for select
  using (public.is_kommune_ansatt());

grant select on public.listing_mediation_reservations to authenticated;

-- Normaliser kommune_region (streng eller JSON-array tekst) til små bokstaver per område
create or replace function public.parse_kommune_regions_sql(p text)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  s text;
  j jsonb;
begin
  if p is null then return array[]::text[]; end if;
  s := trim(p);
  if s = '' then return array[]::text[]; end if;
  if s ~ '^\s*\[' then
    begin
      j := s::jsonb;
      if jsonb_typeof(j) = 'array' then
        return array(
          select lower(trim(value))
          from jsonb_array_elements_text(j)
          where trim(value) <> ''
        );
      end if;
    exception when others then
      null;
    end;
  end if;
  s := trim(both '"' from s);
  s := regexp_replace(s, '\s+og\s+', ',', 'gi');
  return array(
    select lower(trim(regexp_replace(regexp_replace(x, '^[\"''\s\\]+|[\"''\s\\]+$', '', 'g'), '\\', '', 'g')))
    from unnest(string_to_array(s, ',')) as u(x)
    where trim(x) <> ''
  );
end;
$$;

create or replace function public.kommune_listing_region_ok(p_listing_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_city text;
  v_uid uuid := auth.uid();
  prof_regions text;
  v_regions text[];
  p_email text;
  wl_region text;
begin
  if v_uid is null then return false; end if;
  select lower(trim(city)) into v_city from public.listings where id = p_listing_id;
  if v_city is null or v_city = '' then return false; end if;

  select kommune_region into prof_regions from public.profiles where id = v_uid;
  v_regions := public.parse_kommune_regions_sql(prof_regions);

  if coalesce(array_length(v_regions, 1), 0) = 0 then
    select email into p_email from auth.users where id = v_uid;
    if p_email is not null then
      select region into wl_region
      from public.kommune_access_list
      where is_active = true and lower(trim(email)) = lower(trim(p_email))
      limit 1;
      v_regions := public.parse_kommune_regions_sql(wl_region);
    end if;
  end if;

  if coalesce(array_length(v_regions, 1), 0) = 0 then return false; end if;
  return v_city = any (v_regions);
end;
$$;

create or replace function public.expire_stale_mediation_reservations()
returns void
language sql
security definer
set search_path = public
as $$
  update public.listing_mediation_reservations
  set status = 'expired', updated_at = now()
  where status = 'active' and expires_at < now();
$$;

create or replace function public.reserve_listing_mediation(p_listing_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_edit boolean;
  v_id uuid;
  v_now timestamptz := now();
  v_exp timestamptz := now() + interval '2 hours';
begin
  perform public.expire_stale_mediation_reservations();

  if not public.is_kommune_ansatt() then
    raise exception 'not_kommune';
  end if;

  select coalesce(kommune_can_edit, true) into v_edit from public.profiles where id = auth.uid();
  if coalesce(v_edit, true) = false then
    raise exception 'read_only';
  end if;

  if not public.kommune_listing_region_ok(p_listing_id) then
    raise exception 'region_denied';
  end if;

  if exists (
    select 1 from public.listing_mediation_reservations
    where listing_id = p_listing_id and status = 'active' and reserved_by is distinct from auth.uid()
  ) then
    raise exception 'already_reserved';
  end if;

  if exists (
    select 1 from public.listing_mediation_reservations
    where listing_id = p_listing_id and status = 'active' and reserved_by = auth.uid()
  ) then
    update public.listing_mediation_reservations
    set internal_note = coalesce(p_note, internal_note),
        expires_at = v_exp,
        updated_at = v_now
    where listing_id = p_listing_id and status = 'active' and reserved_by = auth.uid()
    returning id into v_id;
    return v_id;
  end if;

  insert into public.listing_mediation_reservations (listing_id, reserved_by, reserved_at, expires_at, status, internal_note)
  values (p_listing_id, auth.uid(), v_now, v_exp, 'active', nullif(trim(p_note), ''))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.release_listing_mediation(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.expire_stale_mediation_reservations();

  if not public.is_kommune_ansatt() then
    raise exception 'not_kommune';
  end if;

  if not public.kommune_listing_region_ok(p_listing_id) then
    raise exception 'region_denied';
  end if;

  update public.listing_mediation_reservations
  set status = 'released', updated_at = now()
  where listing_id = p_listing_id
    and status = 'active'
    and reserved_by = auth.uid();
end;
$$;

create or replace function public.cancel_listing_mediation(p_listing_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.expire_stale_mediation_reservations();

  if not public.is_kommune_ansatt() then
    raise exception 'not_kommune';
  end if;

  if not public.kommune_listing_region_ok(p_listing_id) then
    raise exception 'region_denied';
  end if;

  update public.listing_mediation_reservations
  set status = 'cancelled',
      cancelled_reason = nullif(trim(p_reason), ''),
      updated_at = now()
  where listing_id = p_listing_id
    and status = 'active'
    and reserved_by = auth.uid();
end;
$$;

grant execute on function public.reserve_listing_mediation(uuid, text) to authenticated;
grant execute on function public.release_listing_mediation(uuid) to authenticated;
grant execute on function public.cancel_listing_mediation(uuid, text) to authenticated;
grant execute on function public.expire_stale_mediation_reservations() to authenticated;
