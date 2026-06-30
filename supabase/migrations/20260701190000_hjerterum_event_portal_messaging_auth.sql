-- Event staff boligbank RPC, booking-meldinger uten mottaker-konto, demo-passord reset

-- ─── Event staff: boliger for tildelte arrangement ───
create or replace function public.get_listings_for_event_staff_paged(
  p_limit integer default 800,
  p_offset integer default 0
)
returns setof public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := greatest(1, least(coalesce(nullif(p_limit, 0), 800), 2000));
  off integer := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_event_staff() then
    return;
  end if;

  return query
  select distinct l.*
  from public.listings l
  inner join public.listing_event_availability lea on lea.listing_id = l.id
  where lea.status = 'active'
    and lea.event_id in (select public.event_staff_event_ids())
  order by l.created_at desc nulls last
  limit lim
  offset off;
end;
$$;

comment on function public.get_listings_for_event_staff_paged(integer, integer) is
  'Event saksbehandler: alle boliger med aktiv event opt-in for tildelte arrangement.';

revoke all on function public.get_listings_for_event_staff_paged(integer, integer) from public;
grant execute on function public.get_listings_for_event_staff_paged(integer, integer) to authenticated;

create or replace function public.get_listing_by_id_for_event_staff(p_listing_id uuid)
returns setof public.listings
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_event_staff() then
    return;
  end if;

  return query
  select l.*
  from public.listings l
  inner join public.listing_event_availability lea on lea.listing_id = l.id
  where l.id = p_listing_id
    and lea.status = 'active'
    and lea.event_id in (select public.event_staff_event_ids());
end;
$$;

revoke all on function public.get_listing_by_id_for_event_staff(uuid) from public;
grant execute on function public.get_listing_by_id_for_event_staff(uuid) to authenticated;

-- ─── Booking chat: utleier kan svare selv om gjest ikke har konto ennå ───
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
  v_is_landlord boolean;
begin
  if v_uid is null or p_content is null or length(trim(p_content)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select b.* into v_booking from public.bookings b where b.id = p_booking_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select l.owner_id into v_owner_id from public.listings l where l.id = v_booking.listing_id;
  v_is_landlord := v_uid = v_owner_id or public.is_listing_cohost(v_booking.listing_id, v_uid);

  if v_is_landlord then
    v_receiver := v_booking.guest_user_id;
  elsif v_uid = v_booking.guest_user_id then
    v_receiver := v_owner_id;
  elsif exists (
    select 1 from public.booking_guests bg
    where bg.booking_id = p_booking_id and bg.guest_user_id = v_uid
  ) then
    v_receiver := v_owner_id;
  elsif public.is_boly_operator() then
    v_receiver := v_owner_id;
  else
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_receiver is null and not v_is_landlord and not public.is_boly_operator() then
    return jsonb_build_object('ok', false, 'error', 'no_receiver');
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

  if v_is_landlord and v_booking.guest_user_id is not null then
    insert into public.notifications (owner_id, type, title, message, status, listing_id)
    values (
      v_booking.guest_user_id,
      'NEW_MESSAGE',
      'Ny melding om booking',
      left(trim(p_content), 200),
      'unread',
      v_booking.listing_id
    );
  elsif v_uid = v_booking.guest_user_id and v_owner_id is not null then
    insert into public.notifications (owner_id, type, title, message, status, listing_id)
    values (
      v_owner_id,
      'NEW_MESSAGE',
      'Ny melding fra gjest',
      left(trim(p_content), 200),
      'unread',
      v_booking.listing_id
    );
  end if;

  return jsonb_build_object('ok', true, 'message_id', v_msg_id);
end;
$$;

-- Seed initial melding fra booking.message som første chat-rad (idempotent)
create or replace function public.ensure_booking_initial_chat_message(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_owner_id uuid;
begin
  select b.* into v_booking from public.bookings b where b.id = p_booking_id;
  if not found or v_booking.message is null or length(trim(v_booking.message)) = 0 then
    return;
  end if;

  if exists (
    select 1 from public.chat_messages cm
    where cm.booking_id = p_booking_id and cm.channel_type = 'guest_booking'
  ) then
    return;
  end if;

  select l.owner_id into v_owner_id from public.listings l where l.id = v_booking.listing_id;
  insert into public.chat_messages (
    sender_id, receiver_id, listing_id, content, channel_type, booking_id, created_at
  )
  values (
    coalesce(v_booking.guest_user_id, v_owner_id),
    case when v_booking.guest_user_id is not null then v_owner_id else null end,
    v_booking.listing_id,
    trim(v_booking.message),
    'guest_booking',
    p_booking_id,
    coalesce(v_booking.created_at, now())
  );
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

  perform public.ensure_booking_initial_chat_message(p_booking_id);

  return query
  select cm.*
  from public.chat_messages cm
  where cm.booking_id = p_booking_id
    and cm.channel_type = 'guest_booking'
  order by cm.created_at asc;
end;
$$;

revoke all on function public.ensure_booking_initial_chat_message(uuid) from public;
grant execute on function public.ensure_booking_initial_chat_message(uuid) to authenticated;

-- ─── Demo-kontoer: reset passord + bekreft e-post ───
update auth.users
set
  encrypted_password = extensions.crypt('Ofoten2026!', extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where lower(email) like '%@demo.ofoten.no';
