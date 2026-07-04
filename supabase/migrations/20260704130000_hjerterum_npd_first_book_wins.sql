-- NPD-3D: First-book-wins + row lock on tourism booking submit (concurrency-safe).

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

create or replace function public.submit_tourism_booking(
  p_listing_id uuid,
  p_guest_email text,
  p_guest_name text,
  p_check_in date,
  p_check_out date,
  p_guest_phone text default null,
  p_message text default null,
  p_event_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_booking_id uuid;
  v_nights int;
  v_amount int;
  v_status text := 'pending';
  v_avail jsonb;
  v_event_mode text;
begin
  if p_guest_email is null or length(trim(p_guest_email)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'email_required');
  end if;

  if p_event_id is not null then
    select ce.routing_mode into v_event_mode
    from public.central_events ce
    where ce.id = p_event_id and ce.status = 'published';
    if not found then
      return jsonb_build_object('ok', false, 'error', 'event_not_found');
    end if;
    if v_event_mode <> 'turisme' then
      return jsonb_build_object('ok', false, 'error', 'event_not_bookable');
    end if;
  end if;

  -- Serialize concurrent booking attempts on the same listing (NPD-3D).
  select * into v_listing
  from public.listings
  where id = p_listing_id and tourism_enabled = true
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  v_avail := public.assert_tourism_booking_available(p_listing_id, p_check_in, p_check_out);
  if (v_avail->>'ok')::boolean is not true then
    return v_avail;
  end if;

  v_nights := greatest(1, (p_check_out - p_check_in));
  v_amount := coalesce(v_listing.tourism_nightly_price_cents, 0) * v_nights;

  if v_listing.tourism_instant_book then
    v_status := 'accepted';
  end if;

  insert into public.bookings (
    listing_id, event_id, guest_user_id, guest_email, guest_name, guest_phone,
    check_in, check_out, message, amount_cents, currency, status
  )
  values (
    p_listing_id,
    p_event_id,
    v_uid,
    trim(p_guest_email),
    nullif(trim(coalesce(p_guest_name, '')), ''),
    nullif(trim(coalesce(p_guest_phone, '')), ''),
    p_check_in,
    p_check_out,
    nullif(trim(coalesce(p_message, '')), ''),
    v_amount,
    'NOK',
    v_status
  )
  returning id into v_booking_id;

  return jsonb_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'instant_book', v_listing.tourism_instant_book,
    'status', v_status
  );
end;
$$;

revoke all on function public.submit_tourism_booking(uuid, text, text, date, date, text, text, uuid) from public;
grant execute on function public.submit_tourism_booking(uuid, text, text, date, date, text, text, uuid) to anon, authenticated;

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
