-- Harden submit_tourism_booking against direct RPC calls that bypass the client-side
-- validation in features/tourism/components/BookingRequestForm.tsx. Everything below is
-- enforced server-side; the RPC no longer trusts anything from the caller except the
-- listing id, dates, and contact fields it already validated.
--
-- Changes:
--   1. assert_tourism_booking_available now also rejects a check-in date in the past, and
--      treats 'completed' bookings (not just pending/accepted/paid) as occupying their date
--      range for the overlap check.
--   2. submit_tourism_booking now requires the authenticated guest to have accepted the
--      current tourism terms (public.guest_has_tourism_terms_accepted) before a booking can
--      be created.
--   3. Total amount was already computed server-side from
--      listings.tourism_nightly_price_cents * nights (the RPC signature has no client-supplied
--      amount parameter) — unchanged, called out here for the record.
--
-- Signature of public.submit_tourism_booking is unchanged, so no frontend call-site update is
-- required. RLS policies are untouched (separate task).

-- ─── 1. assert_tourism_booking_available: reject past check-in; widen overlap check ───
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

  if p_check_in < current_date then
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
      and b.status in ('pending', 'accepted', 'paid', 'completed')
      and b.check_in < p_check_out
      and b.check_out > p_check_in
  ) then
    return jsonb_build_object('ok', false, 'error', 'dates_conflict');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.assert_tourism_booking_available(uuid, date, date) from public;
grant execute on function public.assert_tourism_booking_available(uuid, date, date) to anon, authenticated;

-- ─── 2. submit_tourism_booking: add server-side terms gate; keep everything else, including
--        instant-book status logic and server-computed amount, exactly as before ───
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
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_auth_email text;
  v_listing public.listings%rowtype;
  v_booking_id uuid;
  v_nights int;
  v_amount int;
  v_status text := 'pending';
  v_avail jsonb;
  v_event_mode text;
begin
  if not public.platform_module_enabled('tourism') then
    return jsonb_build_object('ok', false, 'error', 'tourism_module_disabled');
  end if;

  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;

  select u.email into v_auth_email from auth.users u where u.id = v_uid;
  if v_auth_email is null or length(trim(v_auth_email)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;

  if p_guest_email is not null
    and length(trim(p_guest_email)) > 0
    and lower(trim(p_guest_email)) <> lower(trim(v_auth_email))
  then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  -- Server-side terms gate: returns true when there is no active turisme click-wrap
  -- document (nothing to accept yet), false when one exists and this guest hasn't
  -- accepted it. Never trusts a client-side checkbox.
  if not public.guest_has_tourism_terms_accepted(v_uid) then
    return jsonb_build_object('ok', false, 'error', 'terms_not_accepted');
  end if;

  perform public.ensure_guest_profile(p_guest_name, p_guest_phone);

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

  select * into v_listing from public.listings where id = p_listing_id and tourism_enabled = true;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  v_avail := public.assert_tourism_booking_available(p_listing_id, p_check_in, p_check_out);
  if (v_avail->>'ok')::boolean is not true then
    return v_avail;
  end if;

  -- Amount is always computed server-side from the listing's current nightly price.
  -- This RPC signature intentionally has no client-supplied amount parameter, so there
  -- is nothing here for a caller to override.
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
    trim(v_auth_email),
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
grant execute on function public.submit_tourism_booking(uuid, text, text, date, date, text, text, uuid) to authenticated;
