-- PRD §7.1: First-book-wins between Formidla (social commit) and paid tourism checkout.
-- Pending/unpaid bookings do not block Formidla; paid bookings block new Formidla.

-- ─── Shared overlap helpers ───
create or replace function public.listing_has_formidla_overlap(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_availability_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listing_availability la
    where la.listing_id = p_listing_id
      and la.status = 'Formidla'
      and (p_exclude_availability_id is null or la.id <> p_exclude_availability_id)
      and la.start_date <= p_end_date
      and la.end_date >= p_start_date
  );
$$;

revoke all on function public.listing_has_formidla_overlap(uuid, date, date, uuid) from public;
grant execute on function public.listing_has_formidla_overlap(uuid, date, date, uuid) to authenticated;

create or replace function public.listing_has_paid_booking_overlap(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_booking_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.listing_id = p_listing_id
      and b.status in ('paid', 'completed')
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and b.check_in < p_end_date
      and b.check_out > p_start_date
  );
$$;

revoke all on function public.listing_has_paid_booking_overlap(uuid, date, date, uuid) from public;
grant execute on function public.listing_has_paid_booking_overlap(uuid, date, date, uuid) to authenticated;

-- ─── Tourism availability: block when Formidla already committed ───
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

  if not exists (
    select 1
    from public.listing_availability la
    where la.listing_id = p_listing_id
      and la.lane = 'turisme'
      and la.start_date <= p_check_in
      and la.end_date >= p_check_out
  ) then
    return jsonb_build_object('ok', false, 'error', 'dates_unavailable');
  end if;

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

-- ─── Formidla commit: block when paid tourism already won ───
create or replace function public.trg_listing_availability_first_book_wins()
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
  end if;
  return new;
end;
$$;

drop trigger if exists listing_availability_first_book_wins on public.listing_availability;
create trigger listing_availability_first_book_wins
  before insert or update of status, start_date, end_date, listing_id
  on public.listing_availability
  for each row
  execute function public.trg_listing_availability_first_book_wins();

-- ─── Paid checkout: block when Formidla already committed ───
create or replace function public.trg_bookings_first_book_wins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    if public.listing_has_formidla_overlap(new.listing_id, new.check_in, new.check_out) then
      raise exception 'paid_blocked_formidla'
        using hint = 'Dates already committed by social Formidla (first-book-wins).';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_first_book_wins on public.bookings;
create trigger bookings_first_book_wins
  before insert or update of status, check_in, check_out, listing_id
  on public.bookings
  for each row
  execute function public.trg_bookings_first_book_wins();
