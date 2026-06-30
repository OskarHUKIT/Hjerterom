-- Hjerterum P1: guest↔landlord booking messages, instant book, cancel, map coords

-- Approximate map pins (city centroids — not exact addresses for privacy)
alter table public.listings
  add column if not exists map_lat double precision,
  add column if not exists map_lng double precision;

comment on column public.listings.map_lat is 'Public map pin (approximate — city/area level for Finn).';
comment on column public.listings.map_lng is 'Public map pin longitude.';

-- Backfill from city names (Northern Norway sample)
update public.listings l
set
  map_lat = case lower(trim(l.city))
    when 'tromsø' then 69.6492
    when 'tromso' then 69.6492
    when 'narvik' then 68.4384
    when 'bodø' then 67.2804
    when 'bodo' then 67.2804
    when 'harstad' then 68.7983
    when 'alta' then 69.9689
    when 'hammerfest' then 70.6634
    when 'mo i rana' then 66.3128
    when 'oslo' then 59.9139
    else map_lat
  end,
  map_lng = case lower(trim(l.city))
    when 'tromsø' then 18.9553
    when 'tromso' then 18.9553
    when 'narvik' then 17.4272
    when 'bodø' then 14.4049
    when 'bodo' then 14.4049
    when 'harstad' then 16.5417
    when 'alta' then 23.2717
    when 'hammerfest' then 23.6821
    when 'mo i rana' then 14.1428
    when 'oslo' then 10.7522
    else map_lng
  end
where l.tourism_enabled = true
  and (map_lat is null or map_lng is null)
  and l.city is not null;

-- ─── Booking messaging helpers ───
create or replace function public._booking_message_participant(p_booking_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.listings l on l.id = b.listing_id
    where b.id = p_booking_id
      and (
        b.guest_user_id = p_uid
        or l.owner_id = p_uid
        or public.is_boly_operator()
      )
  );
$$;

create or replace function public.send_booking_message(
  p_booking_id uuid,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_owner_id uuid;
  v_receiver uuid;
  v_msg_id uuid;
begin
  if v_uid is null or p_content is null or length(trim(p_content)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select b.*, l.owner_id into v_booking, v_owner_id
  from public.bookings b
  join public.listings l on l.id = b.listing_id
  where b.id = p_booking_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_uid = v_owner_id then
    v_receiver := v_booking.guest_user_id;
  elsif v_uid = v_booking.guest_user_id then
    v_receiver := v_owner_id;
  elsif public.is_boly_operator() then
    v_receiver := v_owner_id;
  else
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  insert into public.chat_messages (
    sender_id, receiver_id, listing_id, content, channel_type, booking_id
  )
  values (
    v_uid,
    v_receiver,
    v_booking.listing_id,
    trim(p_content),
    'guest_booking',
    p_booking_id
  )
  returning id into v_msg_id;

  return jsonb_build_object('ok', true, 'message_id', v_msg_id);
end;
$$;

create or replace function public.get_booking_messages(p_booking_id uuid)
returns setof public.chat_messages
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public._booking_message_participant(p_booking_id, v_uid) then
    return;
  end if;

  return query
  select cm.*
  from public.chat_messages cm
  where cm.booking_id = p_booking_id
    and cm.channel_type = 'guest_booking'
  order by cm.created_at asc;
end;
$$;

create or replace function public.list_landlord_guest_booking_threads()
returns table (
  booking_id uuid,
  guest_label text,
  listing_address text,
  last_preview text,
  last_at timestamptz,
  booking_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id as booking_id,
    coalesce(nullif(trim(b.guest_name), ''), b.guest_email) as guest_label,
    l.address as listing_address,
    left(trim(coalesce(last_msg.content, b.message, '')), 80) as last_preview,
    coalesce(last_msg.created_at, b.created_at) as last_at,
    b.status as booking_status
  from public.bookings b
  join public.listings l on l.id = b.listing_id
  left join lateral (
    select cm.content, cm.created_at
    from public.chat_messages cm
    where cm.booking_id = b.id and cm.channel_type = 'guest_booking'
    order by cm.created_at desc
    limit 1
  ) last_msg on true
  where l.owner_id = auth.uid()
    and b.status in ('pending', 'accepted', 'paid', 'completed')
  order by coalesce(last_msg.created_at, b.created_at) desc
  limit 50;
$$;

create or replace function public.list_guest_booking_threads()
returns table (
  booking_id uuid,
  listing_address text,
  listing_city text,
  last_preview text,
  last_at timestamptz,
  booking_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id as booking_id,
    l.address as listing_address,
    l.city as listing_city,
    left(trim(coalesce(last_msg.content, b.message, '')), 80) as last_preview,
    coalesce(last_msg.created_at, b.created_at) as last_at,
    b.status as booking_status
  from public.bookings b
  join public.listings l on l.id = b.listing_id
  left join lateral (
    select cm.content, cm.created_at
    from public.chat_messages cm
    where cm.booking_id = b.id and cm.channel_type = 'guest_booking'
    order by cm.created_at desc
    limit 1
  ) last_msg on true
  where b.guest_user_id = auth.uid()
    and b.status not in ('rejected', 'cancelled')
  order by coalesce(last_msg.created_at, b.created_at) desc
  limit 50;
$$;

-- ─── Guest cancel booking ───
create or replace function public.guest_cancel_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_booking.guest_user_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_booking.status not in ('pending', 'accepted') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if v_booking.check_in <= current_date then
    return jsonb_build_object('ok', false, 'error', 'too_late');
  end if;

  update public.bookings
  set status = 'cancelled', updated_at = now()
  where id = p_booking_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ─── Tourism booking with optional instant book ───
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
begin
  if p_guest_email is null or length(trim(p_guest_email)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'email_required');
  end if;

  select * into v_listing from public.listings where id = p_listing_id and tourism_enabled = true;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
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

  if v_listing.tourism_instant_book and v_amount > 0 then
    update public.bookings set status = 'accepted', amount_cents = v_amount where id = v_booking_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'instant_book', v_listing.tourism_instant_book,
    'status', v_status
  );
end;
$$;

-- Tourism listings for map
create or replace function public.list_tourism_map_pins(p_city text default null)
returns table (
  id uuid,
  address text,
  city text,
  map_lat double precision,
  map_lng double precision,
  tourism_nightly_price_cents int
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
    l.map_lat,
    l.map_lng,
    l.tourism_nightly_price_cents
  from public.listings l
  where l.tourism_enabled = true
    and l.map_lat is not null
    and l.map_lng is not null
    and (p_city is null or trim(p_city) = '' or l.city ilike '%' || trim(p_city) || '%')
  limit 120;
$$;

revoke all on function public.send_booking_message(uuid, text) from public;
grant execute on function public.send_booking_message(uuid, text) to authenticated;
revoke all on function public.get_booking_messages(uuid) from public;
grant execute on function public.get_booking_messages(uuid) to authenticated;
revoke all on function public.list_landlord_guest_booking_threads() from public;
grant execute on function public.list_landlord_guest_booking_threads() to authenticated;
revoke all on function public.list_guest_booking_threads() from public;
grant execute on function public.list_guest_booking_threads() to authenticated;
revoke all on function public.guest_cancel_booking(uuid) from public;
grant execute on function public.guest_cancel_booking(uuid) to authenticated;
revoke all on function public.submit_tourism_booking(uuid, text, text, date, date, text, text, uuid) from public;
grant execute on function public.submit_tourism_booking(uuid, text, text, date, date, text, text, uuid) to anon, authenticated;
revoke all on function public.list_tourism_map_pins(text) from public;
grant execute on function public.list_tourism_map_pins(text) to anon, authenticated;

-- Include scope in ops terms queue (tourism/event/kommune)
create or replace function public.ops_list_pending_terms(
  p_region text default null,
  p_limit int default 25,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_region text := nullif(trim(coalesce(p_region, '')), '');
  v_items jsonb;
  v_total int;
begin
  perform public.ops_assert_operator();

  select count(*)::int into v_total
  from public.terms_documents td
  where td.approved_for_utleier_signing = false
    and (v_region is null or td.kommune_region ilike '%' || v_region || '%');

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into v_items
  from (
    select
      td.id,
      td.title,
      td.version,
      td.kommune_region,
      td.scope,
      td.effective_from,
      td.created_at,
      td.pdf_bucket,
      td.pdf_storage_path,
      td.approved_for_utleier_signing,
      p.full_name as created_by_name
    from public.terms_documents td
    left join public.profiles p on p.id = td.created_by
    where td.approved_for_utleier_signing = false
      and (v_region is null or td.kommune_region ilike '%' || v_region || '%')
    order by td.created_at desc nulls last
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('items', v_items, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
end;
$$;
