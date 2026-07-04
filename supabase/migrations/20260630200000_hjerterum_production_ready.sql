-- Hjerterum production readiness: ops kommune feature flags + booking payment prep

create or replace function public.ops_set_kommune_features(
  p_slug text,
  p_digital_los_enabled boolean default null,
  p_tourism_enabled boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.ops_assert_operator();

  update public.kommuner k
  set
    digital_los_enabled = coalesce(p_digital_los_enabled, k.digital_los_enabled),
    tourism_enabled = coalesce(p_tourism_enabled, k.tourism_enabled),
    updated_at = now()
  where k.slug = p_slug
  returning k.id into v_id;

  if v_id is null then
    raise exception 'kommune not found' using errcode = 'P0002';
  end if;

  perform public.ops_write_audit(
    'OPS_KOMMUNE_FEATURES',
    null,
    jsonb_build_object(
      'slug', p_slug,
      'digital_los_enabled', p_digital_los_enabled,
      'tourism_enabled', p_tourism_enabled
    )
  );

  return jsonb_build_object('ok', true, 'kommune_id', v_id);
end;
$$;

revoke all on function public.ops_set_kommune_features(text, boolean, boolean) from public;
grant execute on function public.ops_set_kommune_features(text, boolean, boolean) to authenticated;

create or replace function public.prepare_booking_payment(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_listing public.listings%rowtype;
  v_nights int;
  v_amount int;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_listing from public.listings where id = v_booking.listing_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'listing_not_found');
  end if;

  if v_listing.owner_id <> auth.uid() and not public.is_boly_operator() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_booking.status not in ('accepted', 'pending') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;

  v_nights := greatest(1, (v_booking.check_out - v_booking.check_in));
  v_amount := coalesce(v_listing.tourism_nightly_price_cents, 0) * v_nights;

  update public.bookings
  set
    status = 'accepted',
    amount_cents = v_amount,
    updated_at = now()
  where id = p_booking_id;

  return jsonb_build_object(
    'ok', true,
    'booking_id', p_booking_id,
    'amount_cents', v_amount,
    'currency', v_booking.currency,
    'stripe_account_id', v_listing.stripe_connect_account_id
  );
end;
$$;

revoke all on function public.prepare_booking_payment(uuid) from public;
grant execute on function public.prepare_booking_payment(uuid) to authenticated;
