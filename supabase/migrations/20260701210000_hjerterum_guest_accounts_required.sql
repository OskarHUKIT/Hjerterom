-- Leietakere må ha konto: booking krever innlogging, leietaker-rolle og guest_profiles.

-- ─── 1. leietaker role ───
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role is null
  or role in ('homeowner', 'kommune_ansatt', 'kommune_admin', 'event_ansatt', 'leietaker')
);

create or replace function public.is_leietaker()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'leietaker'
  );
$$;

revoke all on function public.is_leietaker() from public;
grant execute on function public.is_leietaker() to authenticated;

-- ─── 2. Sikre guest_profiles etter innlogging / registrering ───
create or replace function public.ensure_guest_profile(
  p_display_name text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;

  perform public.ensure_own_profile();

  select u.email into v_email from auth.users u where u.id = v_uid;

  select coalesce(
    nullif(trim(p_display_name), ''),
    p.full_name,
    split_part(coalesce(v_email, ''), '@', 1)
  )
  into v_name
  from public.profiles p
  where p.id = v_uid;

  -- Turistkonto uten utleieraktivitet → leietaker (ikke overskriv kommune/event/utleier)
  update public.profiles p
  set role = 'leietaker', updated_at = now()
  where p.id = v_uid
    and p.role = 'homeowner'
    and not exists (select 1 from public.listings l where l.owner_id = v_uid)
    and not exists (
      select 1 from public.user_agreements ua
      where ua.user_id = v_uid and coalesce(ua.is_terminated, false) = false
    );

  insert into public.guest_profiles (id, email, display_name, phone, updated_at)
  values (
    v_uid,
    v_email,
    v_name,
    nullif(trim(coalesce(p_phone, '')), ''),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(nullif(trim(excluded.display_name), ''), guest_profiles.display_name),
    phone = coalesce(excluded.phone, guest_profiles.phone),
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.ensure_guest_profile(text, text) from public;
grant execute on function public.ensure_guest_profile(text, text) to authenticated;

-- ─── 3. Booking krever innlogget bruker ───
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

-- booking_groups: koble til innlogget bruker
drop policy if exists "Guest insert booking groups" on public.booking_groups;
create policy "Guest insert booking groups"
  on public.booking_groups for insert
  to authenticated
  with check (
    guest_user_id is null
    or guest_user_id = auth.uid()
  );

-- Demo-gjester: oppdater rolle der seed allerede finnes
update public.profiles p
set role = 'leietaker', updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) in (
    'emma.becker@demo.ofoten.no',
    'pierre.martin@demo.ofoten.no',
    'ole.nordmann@demo.ofoten.no'
  )
  and p.role = 'homeowner';
