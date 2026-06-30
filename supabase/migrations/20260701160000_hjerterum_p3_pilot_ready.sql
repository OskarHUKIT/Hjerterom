-- Hjerterum P3: pilot-ready — Los token RLS, handoff varsler, booking conflict, event geography

-- ─── Los: contact email on handoff ───
alter table public.los_handoffs
  add column if not exists contact_email text;

-- ─── Los: token-scoped session access (no open UUID read) ───
create or replace function public.los_start_session()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token text;
begin
  insert into public.los_sessions (consent_level)
  values ('anonymous')
  returning id, anonymous_token into v_id, v_token;

  return jsonb_build_object('ok', true, 'session_id', v_id, 'anonymous_token', v_token);
end;
$$;

create or replace function public.los_resume_session(p_anonymous_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.los_sessions%rowtype;
begin
  if p_anonymous_token is null or length(trim(p_anonymous_token)) < 16 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select * into v_row
  from public.los_sessions
  where anonymous_token = trim(p_anonymous_token);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_row.id,
    'messages', v_row.messages,
    'handed_off_at', v_row.handed_off_at
  );
end;
$$;

create or replace function public._los_assert_token(p_session_id uuid, p_anonymous_token text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.los_sessions s
    where s.id = p_session_id
      and s.anonymous_token = trim(p_anonymous_token)
      and s.handed_off_at is null
  );
$$;

create or replace function public.los_append_message(
  p_session_id uuid,
  p_role text,
  p_content text,
  p_anonymous_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg jsonb;
begin
  if p_session_id is null or p_content is null or length(trim(p_content)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if p_anonymous_token is not null and not public._los_assert_token(p_session_id, p_anonymous_token) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_msg := jsonb_build_object(
    'role', coalesce(nullif(trim(p_role), ''), 'user'),
    'content', trim(p_content),
    'at', now()
  );

  update public.los_sessions
  set messages = messages || v_msg
  where id = p_session_id and handed_off_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'session_closed');
  end if;

  return jsonb_build_object('ok', true, 'message', v_msg);
end;
$$;

drop policy if exists "Read los session by token" on public.los_sessions;
drop policy if exists "Update los session messages" on public.los_sessions;

-- ─── Notify kommune SB on Los handoff (grant-filtered) ───
create or replace function public.notify_kommune_los_handoff(p_handoff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handoff public.los_handoffs%rowtype;
  v_kommune_name text;
begin
  select * into v_handoff from public.los_handoffs where id = p_handoff_id;
  if not found then return; end if;

  select k.display_name into v_kommune_name
  from public.kommuner k where k.id = v_handoff.kommune_id;

  if v_handoff.kommune_id is not null then
    insert into public.notifications (owner_id, type, title, message, status)
    select distinct p.id,
      'LOS_HANDOFF',
      'Ny Digital Los-henvendelse',
      coalesce(v_handoff.case_reference, 'LOS') || ' — '
        || coalesce(v_handoff.contact_name, 'Ungdom')
        || coalesce(' · ' || v_kommune_name, '')
        || E'\n\nÅpne innboks: /nav/los-inbox',
      'unread'
    from public.profiles p
    join public.user_kommune_grants ukg on ukg.user_id = p.id
    where p.role in ('kommune_ansatt', 'kommune_admin')
      and ukg.kommune_id = v_handoff.kommune_id
      and ukg.revoked_at is null;
  else
    insert into public.notifications (owner_id, type, title, message, status)
    select p.id,
      'LOS_HANDOFF',
      'Ny Digital Los-henvendelse',
      coalesce(v_handoff.case_reference, 'LOS') || ' — ' || coalesce(v_handoff.contact_name, 'Ungdom')
        || E'\n\nÅpne innboks: /nav/los-inbox',
      'unread'
    from public.profiles p
    where p.role in ('kommune_ansatt', 'kommune_admin');
  end if;
end;
$$;

-- Outbox for guest transactional email (Los confirmation, booking receipt)
create table if not exists public.guest_email_outbox (
  id uuid primary key default gen_random_uuid(),
  template text not null check (template in ('los_confirmation', 'booking_receipt', 'booking_accepted')),
  recipient_email text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.guest_email_outbox enable row level security;

drop policy if exists "Ops read guest email outbox" on public.guest_email_outbox;
create policy "Ops read guest email outbox"
  on public.guest_email_outbox for select
  using (public.is_boly_operator());

create or replace function public.queue_guest_email(
  p_template text,
  p_email text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_email is null or length(trim(p_email)) = 0 then
    return null;
  end if;

  insert into public.guest_email_outbox (template, recipient_email, payload)
  values (p_template, lower(trim(p_email)), coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.los_create_handoff(
  p_session_id uuid,
  p_summary text,
  p_kommune_slug text default null,
  p_contact_name text default null,
  p_contact_phone text default null,
  p_contact_email text default null,
  p_anonymous_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_kommune_id uuid;
  v_kommune_name text;
  v_ref text;
  v_email text;
begin
  if p_contact_name is null or length(trim(p_contact_name)) = 0 then
    raise exception 'contact_name required';
  end if;

  if p_anonymous_token is not null and not public._los_assert_token(p_session_id, p_anonymous_token) then
    raise exception 'invalid session token';
  end if;

  if p_kommune_slug is not null and trim(p_kommune_slug) <> '' then
    select k.id, k.display_name into v_kommune_id, v_kommune_name
    from public.kommuner k
    where k.slug = lower(trim(p_kommune_slug))
      and k.digital_los_enabled = true
    limit 1;
  end if;

  v_ref := 'LOS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_email := nullif(trim(lower(coalesce(p_contact_email, ''))), '');

  insert into public.los_handoffs (
    session_id, summary_text, kommune_id, case_reference, status,
    contact_name, contact_phone, contact_email
  )
  values (
    p_session_id,
    coalesce(nullif(trim(p_summary), ''), 'Digital Los-henvendelse'),
    v_kommune_id,
    v_ref,
    'new',
    trim(p_contact_name),
    nullif(trim(coalesce(p_contact_phone, '')), ''),
    nullif(trim(lower(coalesce(p_contact_email, ''))), '')
  )
  returning id into v_id;

  update public.los_sessions
  set
    handed_off_at = now(),
    kommune_id = coalesce(v_kommune_id, kommune_id),
    consent_level = 'contact'
  where id = p_session_id;

  perform public.notify_kommune_los_handoff(v_id);

  if v_email is not null then
    perform public.queue_guest_email(
      'los_confirmation',
      v_email,
      jsonb_build_object(
        'case_reference', v_ref,
        'contact_name', trim(p_contact_name),
        'kommune_name', v_kommune_name
      )
    );
  end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'case_reference', v_ref);
end;
$$;

revoke all on function public.los_start_session() from public;
grant execute on function public.los_start_session() to anon, authenticated;
revoke all on function public.los_resume_session(text) from public;
grant execute on function public.los_resume_session(text) to anon, authenticated;
revoke all on function public.queue_guest_email(text, text, jsonb) from public;
grant execute on function public.queue_guest_email(text, text, jsonb) to service_role;
revoke all on function public.los_create_handoff(uuid, text, text, text, text, text, text) from public;
grant execute on function public.los_create_handoff(uuid, text, text, text, text, text, text) to anon, authenticated;
drop function if exists public.los_create_handoff(uuid, text, text, text, text);
drop function if exists public.los_create_handoff(uuid, text, text, text, text, text);
revoke all on function public.los_append_message(uuid, text, text, text) from public;
grant execute on function public.los_append_message(uuid, text, text, text) to anon, authenticated;

-- ─── Tourism booking availability guard ───
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

  select * into v_listing from public.listings where id = p_listing_id and tourism_enabled = true;
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

revoke all on function public.assert_tourism_booking_available(uuid, date, date) from public;
grant execute on function public.assert_tourism_booking_available(uuid, date, date) to anon, authenticated;
