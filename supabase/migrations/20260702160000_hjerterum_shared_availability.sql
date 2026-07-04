-- Shared availability model: unmarked default, overlapping open/closed periods,
-- exclusive Formidla mediation, aligned tourism search/booking, auto-reject pending Finn on Formidla.

-- ─── Lane: shared for landlord open/closed ───
alter table public.listing_availability
  drop constraint if exists listing_availability_lane_check;

alter table public.listing_availability
  add constraint listing_availability_lane_check
  check (lane in ('sosial', 'turisme', 'shared'));

update public.listing_availability
set lane = 'shared'
where status in ('Tilgjengelig', 'Utilgjengelig')
  and lane in ('sosial', 'turisme');

comment on column public.listing_availability.lane is
  'shared = landlord open/closed for all purposes; sosial/turisme legacy or Formidla mediation context.';

-- Optional mediation scope on Formidla (exclusive across scopes)
alter table public.listing_availability
  add column if not exists mediation_scope text
  check (mediation_scope is null or mediation_scope in ('sosial', 'turisme', 'arrangement'));

update public.listing_availability
set mediation_scope = 'sosial'
where status = 'Formidla' and mediation_scope is null;

-- ─── Day-level status (single source of truth for portals) ───
create or replace function public.listing_day_availability_status(
  p_listing_id uuid,
  p_day date
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with day_periods as (
    select la.status
    from public.listing_availability la
    where la.listing_id = p_listing_id
      and la.start_date <= p_day
      and la.end_date >= p_day
  )
  select case
    when not exists (select 1 from day_periods) then 'Ikke markert'
    when exists (select 1 from day_periods where status = 'Formidla') then 'Formidla'
    when exists (select 1 from day_periods where status = 'Utilgjengelig') then 'Utilgjengelig'
    when exists (select 1 from day_periods where status = 'Tilgjengelig') then 'Tilgjengelig'
    else 'Ikke markert'
  end;
$$;

revoke all on function public.listing_day_availability_status(uuid, date) from public;
grant execute on function public.listing_day_availability_status(uuid, date) to anon, authenticated;

-- ─── Conflict: only Formidla vs Formidla; open/closed may overlap ───
drop function if exists public.check_listing_availability_conflict(uuid, date, date, uuid);

create or replace function public.check_listing_availability_conflict(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_availability_id uuid default null,
  p_status text default 'Tilgjengelig'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict record;
begin
  if p_listing_id is null or p_start_date is null or p_end_date is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_range');
  end if;

  if p_start_date > p_end_date then
    return jsonb_build_object('ok', false, 'reason', 'invalid_range');
  end if;

  if p_status = 'Formidla' then
    select la.id, la.start_date, la.end_date, la.status, la.lane
    into v_conflict
    from public.listing_availability la
    where la.listing_id = p_listing_id
      and la.status = 'Formidla'
      and (p_exclude_availability_id is null or la.id <> p_exclude_availability_id)
      and la.start_date <= p_end_date
      and la.end_date >= p_start_date
    limit 1;

    if found then
      return jsonb_build_object(
        'ok', false,
        'reason', 'formidla_overlap',
        'conflict', jsonb_build_object(
          'id', v_conflict.id,
          'start_date', v_conflict.start_date,
          'end_date', v_conflict.end_date,
          'status', v_conflict.status,
          'lane', v_conflict.lane
        )
      );
    end if;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.check_listing_availability_conflict(uuid, date, date, uuid, text) from public;
grant execute on function public.check_listing_availability_conflict(uuid, date, date, uuid, text) to authenticated;

-- ─── Tourism: shared open periods + day resolver ───
create or replace function public.assert_tourism_booking_available(
  p_listing_id uuid,
  p_check_in date,
  p_check_out date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_day date;
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    return jsonb_build_object('ok', false, 'error', 'invalid_dates');
  end if;

  if not exists (
    select 1
    from public.listings l
    where l.id = p_listing_id and l.tourism_enabled = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  if public.listing_has_formidla_overlap(p_listing_id, p_check_in, p_check_out) then
    return jsonb_build_object('ok', false, 'error', 'dates_formidla_conflict');
  end if;

  v_day := p_check_in;
  while v_day < p_check_out loop
    if public.listing_day_availability_status(p_listing_id, v_day) is distinct from 'Tilgjengelig' then
      return jsonb_build_object('ok', false, 'error', 'dates_unavailable');
    end if;
    v_day := v_day + 1;
  end loop;

  if exists (
    select 1
    from public.bookings b
    where b.listing_id = p_listing_id
      and b.status in ('pending', 'accepted', 'paid')
      and b.check_in < p_check_out
      and b.check_out > p_check_in
  ) then
    return jsonb_build_object('ok', false, 'error', 'dates_conflict');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

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
      or not exists (
        select 1
        from generate_series(p_check_in, p_check_out - interval '1 day', interval '1 day') gs(d)
        where public.listing_day_availability_status(l.id, gs.d::date) is distinct from 'Tilgjengelig'
      )
    )
    and not public.listing_has_formidla_overlap(l.id, p_check_in, p_check_out)
    and not exists (
      select 1
      from public.bookings b
      where b.listing_id = l.id
        and b.status in ('pending', 'accepted', 'paid')
        and (p_check_in is null or p_check_out is null or (
          b.check_in < p_check_out and b.check_out > p_check_in
        ))
    )
  order by l.city, l.address
  limit greatest(1, least(coalesce(p_limit, 60), 120));
$$;

create or replace function public.get_tourism_availability(p_listing_id uuid)
returns table (
  start_date date,
  end_date date,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select la.start_date, la.end_date, la.status
  from public.listing_availability la
  where la.listing_id = p_listing_id
    and la.status in ('Tilgjengelig', 'Utilgjengelig')
  order by la.start_date asc;
$$;

-- ─── Formidla: reject overlapping pending/accepted tourism bookings ───
create or replace function public.trg_listing_availability_formidla_side_effects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Formidla' then
    if public.listing_has_paid_booking_overlap(new.listing_id, new.start_date, new.end_date) then
      raise exception 'formidla_blocked_paid_booking'
        using hint = 'Dates already committed by paid tourism booking (first-book-wins).';
    end if;

    update public.bookings b
    set
      status = 'rejected',
      updated_at = now()
    where b.listing_id = new.listing_id
      and b.status in ('pending', 'accepted')
      and b.check_in < new.end_date
      and b.check_out > new.start_date;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_availability_first_book_wins on public.listing_availability;
drop trigger if exists listing_availability_formidla_side_effects on public.listing_availability;

create trigger listing_availability_formidla_side_effects
  before insert or update of status, start_date, end_date, listing_id
  on public.listing_availability
  for each row
  execute function public.trg_listing_availability_formidla_side_effects();
