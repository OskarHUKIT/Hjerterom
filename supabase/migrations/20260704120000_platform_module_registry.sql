-- Platform module registry: explicit social module, dependency enforcement, tourism booking gate.

alter table public.platform_settings
  add column if not exists social_module_enabled boolean not null default true;

comment on column public.platform_settings.social_module_enabled is
  'Sosial formidling (utleier + kommune boligbank). Los requires this.';

-- Existing Boly deployments: social on; Hjerterum rows keep module flags as-is.
update public.platform_settings ps
set social_module_enabled = true
where ps.id = 1;

-- ─── Module helper (used by RPC guards) ───
create or replace function public.platform_module_enabled(p_module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case lower(trim(p_module))
        when 'social' then ps.social_module_enabled
        when 'tourism' then ps.tourism_lane_enabled
        when 'finn' then ps.finn_portal_enabled and ps.tourism_lane_enabled
        when 'los' then ps.los_portal_enabled and ps.social_module_enabled
        when 'events' then ps.central_events_enabled
        when 'stripe' then ps.stripe_bookings_enabled and ps.tourism_lane_enabled
        else false
      end
      from public.platform_settings ps
      where ps.id = 1
    ),
    false
  );
$$;

comment on function public.platform_module_enabled(text) is
  'Effective module flag with dependency rules (Los→Social, Stripe→Tourism, Finn→Tourism).';

revoke all on function public.platform_module_enabled(text) from public;
grant execute on function public.platform_module_enabled(text) to anon, authenticated;

-- ─── Read settings (retire product_mode from API) ───
create or replace function public.get_platform_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'social_module_enabled', ps.social_module_enabled,
    'finn_portal_enabled', ps.finn_portal_enabled,
    'los_portal_enabled', ps.los_portal_enabled,
    'central_events_enabled', ps.central_events_enabled,
    'tourism_lane_enabled', ps.tourism_lane_enabled,
    'stripe_bookings_enabled', ps.stripe_bookings_enabled,
    'updated_at', ps.updated_at
  )
  from public.platform_settings ps
  where ps.id = 1;
$$;

-- ─── Write settings with dependency enforcement ───
create or replace function public.ops_set_platform_settings(
  p_social_module_enabled boolean default null,
  p_finn_portal_enabled boolean default null,
  p_los_portal_enabled boolean default null,
  p_central_events_enabled boolean default null,
  p_tourism_lane_enabled boolean default null,
  p_stripe_bookings_enabled boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_social boolean;
  v_finn boolean;
  v_los boolean;
  v_events boolean;
  v_tourism boolean;
  v_stripe boolean;
begin
  perform public.ops_assert_operator();

  v_before := public.get_platform_settings();

  select
    coalesce(p_social_module_enabled, ps.social_module_enabled),
    coalesce(p_finn_portal_enabled, ps.finn_portal_enabled),
    coalesce(p_los_portal_enabled, ps.los_portal_enabled),
    coalesce(p_central_events_enabled, ps.central_events_enabled),
    coalesce(p_tourism_lane_enabled, ps.tourism_lane_enabled),
    coalesce(p_stripe_bookings_enabled, ps.stripe_bookings_enabled)
  into v_social, v_finn, v_los, v_events, v_tourism, v_stripe
  from public.platform_settings ps
  where ps.id = 1;

  -- Los requires social
  if v_los and not v_social then
    v_los := false;
  end if;

  -- Stripe requires tourism; auto-disable when tourism off
  if not v_tourism then
    v_stripe := false;
    v_finn := false;
  elsif v_stripe and not v_tourism then
    v_stripe := false;
  end if;

  -- Disabling social turns Los off
  if not v_social then
    v_los := false;
  end if;

  update public.platform_settings ps
  set
    social_module_enabled = v_social,
    finn_portal_enabled = v_finn,
    los_portal_enabled = v_los,
    central_events_enabled = v_events,
    tourism_lane_enabled = v_tourism,
    stripe_bookings_enabled = v_stripe,
    -- Legacy column kept for DB compat; synced from modules
    product_mode = case
      when v_tourism or v_los or v_events or v_finn then 'hjerterum'
      else 'boly'
    end,
    updated_at = now(),
    updated_by = auth.uid()
  where ps.id = 1;

  if not found then
    raise exception 'platform_settings row missing' using errcode = 'P0002';
  end if;

  v_after := public.get_platform_settings();

  perform public.ops_write_audit(
    'OPS_PLATFORM_SETTINGS',
    null,
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  return jsonb_build_object('ok', true, 'settings', v_after);
end;
$$;

revoke all on function public.ops_set_platform_settings(boolean, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.ops_set_platform_settings(boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;

-- Drop old signature if present
drop function if exists public.ops_set_platform_settings(text, boolean, boolean, boolean, boolean, boolean);

-- ─── Presets (module-based) ───
create or replace function public.ops_apply_platform_preset(p_preset text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();

  if p_preset = 'boly_only' or p_preset = 'social_only' then
    return public.ops_set_platform_settings(
      true, false, false, false, false, false
    );
  elsif p_preset = 'hjerterum_full' then
    return public.ops_set_platform_settings(
      true, true, true, true, true, true
    );
  elsif p_preset = 'hjerterum_pilot' then
    return public.ops_set_platform_settings(
      true, false, true, false, true, false
    );
  else
    raise exception 'Unknown preset: %', p_preset using errcode = '22023';
  end if;
end;
$$;

-- ─── Block new tourism bookings when module off; existing bookings unchanged ───
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
