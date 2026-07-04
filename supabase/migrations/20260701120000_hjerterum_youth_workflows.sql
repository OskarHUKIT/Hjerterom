-- Hjerterum: Los handoff workflow, kommune routing, event inquiry RPCs

-- ─── Los handoffs: kommune + case reference ───
alter table public.los_handoffs
  add column if not exists kommune_id uuid references public.kommuner (id) on delete set null;

alter table public.los_handoffs
  add column if not exists case_reference text;

alter table public.los_handoffs drop constraint if exists los_handoffs_status_check;
alter table public.los_handoffs add constraint los_handoffs_status_check
  check (status in ('new', 'assigned', 'in_progress', 'closed'));

create index if not exists los_handoffs_kommune_idx
  on public.los_handoffs (kommune_id, status, created_at desc);

-- ─── Replace handoff RPC (kommune slug optional) ───
create or replace function public.los_create_handoff(
  p_session_id uuid,
  p_summary text,
  p_kommune_slug text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_kommune_id uuid;
  v_ref text;
begin
  if p_kommune_slug is not null and trim(p_kommune_slug) <> '' then
    select k.id into v_kommune_id
    from public.kommuner k
    where k.slug = lower(trim(p_kommune_slug))
      and k.digital_los_enabled = true
    limit 1;
  end if;

  v_ref := 'LOS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.los_handoffs (session_id, summary_text, kommune_id, case_reference, status)
  values (
    p_session_id,
    coalesce(nullif(trim(p_summary), ''), 'Digital Los-henvendelse'),
    v_kommune_id,
    v_ref,
    'new'
  )
  returning id into v_id;

  update public.los_sessions
  set
    handed_off_at = now(),
    kommune_id = coalesce(v_kommune_id, kommune_id)
  where id = p_session_id;

  return v_id;
end;
$$;

revoke all on function public.los_create_handoff(uuid, text, text) from public;
grant execute on function public.los_create_handoff(uuid, text, text) to anon, authenticated;

-- Drop old 2-arg overload if present (fresh installs only have 3-arg after this migration)
drop function if exists public.los_create_handoff(uuid, text);

-- ─── Kommune: assign Los handoff to self ───
create or replace function public.kommune_assign_los_handoff(p_handoff_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.is_kommune_staff() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.los_handoffs h
  set
    assigned_profile_id = v_uid,
    status = case when status = 'new' then 'assigned' else status end,
    updated_at = now()
  where h.id = p_handoff_id
    and h.status in ('new', 'assigned', 'in_progress');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found_or_closed');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.kommune_assign_los_handoff(uuid) from public;
grant execute on function public.kommune_assign_los_handoff(uuid) to authenticated;

-- ─── Kommune: mark Los handoff in progress (formidling started) ───
create or replace function public.kommune_progress_los_handoff(p_handoff_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_kommune_staff() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.los_handoffs
  set status = 'in_progress', updated_at = now()
  where id = p_handoff_id and status in ('new', 'assigned', 'in_progress');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.kommune_progress_los_handoff(uuid) from public;
grant execute on function public.kommune_progress_los_handoff(uuid) to authenticated;

-- ─── Public: list kommuner with Digital Los enabled (for youth picker) ───
create or replace function public.list_los_enabled_kommuner()
returns table (slug text, name text)
language sql
stable
security definer
set search_path = public
as $$
  select k.slug, k.display_name as name
  from public.kommuner k
  where k.digital_los_enabled = true
  order by k.display_name;
$$;

revoke all on function public.list_los_enabled_kommuner() from public;
grant execute on function public.list_los_enabled_kommuner() to anon, authenticated;

-- ─── Event inquiry workflow RPC ───
create or replace function public.kommune_update_event_inquiry(
  p_inquiry_id uuid,
  p_status text,
  p_assign_to_self boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_kommune_staff() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_status not in ('new', 'assigned', 'mediated', 'closed') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  update public.event_inquiries
  set
    status = p_status,
    assigned_profile_id = case
      when p_assign_to_self then v_uid
      when p_status = 'new' then null
      else assigned_profile_id
    end,
    updated_at = now()
  where id = p_inquiry_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.kommune_update_event_inquiry(uuid, text, boolean) from public;
grant execute on function public.kommune_update_event_inquiry(uuid, text, boolean) to authenticated;

-- ─── Tourism search RPC (date-aware, MVP) ───
create or replace function public.search_tourism_listings(
  p_city text default null,
  p_check_in date default null,
  p_check_out date default null,
  p_limit int default 60
)
returns table (
  id uuid,
  address text,
  city text,
  tourism_nightly_price_cents int,
  image_url text,
  type text,
  beds int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.address,
    l.city,
    l.tourism_nightly_price_cents,
    l.image_url,
    l.type,
    l.beds
  from public.listings l
  where l.tourism_enabled = true
    and (p_city is null or trim(p_city) = '' or l.city ilike '%' || trim(p_city) || '%')
    and (
      p_check_in is null
      or p_check_out is null
      or exists (
        select 1
        from public.listing_availability la
        where la.listing_id = l.id
          and la.lane = 'turisme'
          and la.start_date <= p_check_in
          and la.end_date >= p_check_out
      )
    )
  order by l.city, l.address
  limit greatest(1, least(coalesce(p_limit, 60), 120));
$$;

revoke all on function public.search_tourism_listings(text, date, date, int) from public;
grant execute on function public.search_tourism_listings(text, date, date, int) to anon, authenticated;
