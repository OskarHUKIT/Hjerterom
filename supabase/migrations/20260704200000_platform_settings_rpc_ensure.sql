-- Ensure platform module RPCs match frontend (social_module_enabled signature).
-- Safe to re-run if 20260704120000 was partially applied or PostgREST cache lagged.

alter table public.platform_settings
  add column if not exists social_module_enabled boolean not null default true;

update public.platform_settings ps
set social_module_enabled = true
where ps.id = 1
  and ps.social_module_enabled is distinct from true;

-- Drop legacy overload (product_mode first arg) so PostgREST cannot bind wrong function.
drop function if exists public.ops_set_platform_settings(text, boolean, boolean, boolean, boolean, boolean);

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

revoke all on function public.get_platform_settings() from public;
grant execute on function public.get_platform_settings() to anon, authenticated;

create or replace function public.ops_get_platform_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();
  return public.get_platform_settings();
end;
$$;

revoke all on function public.ops_get_platform_settings() from public;
grant execute on function public.ops_get_platform_settings() to authenticated;

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

  if v_los and not v_social then
    v_los := false;
  end if;

  if not v_tourism then
    v_stripe := false;
    v_finn := false;
  elsif v_stripe and not v_tourism then
    v_stripe := false;
  end if;

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

create or replace function public.ops_apply_platform_preset(p_preset text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();

  if p_preset in ('boly_only', 'social_only') then
    return public.ops_set_platform_settings(true, false, false, false, false, false);
  elsif p_preset = 'hjerterum_full' then
    return public.ops_set_platform_settings(true, true, true, true, true, true);
  elsif p_preset = 'hjerterum_pilot' then
    return public.ops_set_platform_settings(true, false, true, false, true, false);
  else
    raise exception 'Unknown preset: %', p_preset using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.ops_apply_platform_preset(text) from public;
grant execute on function public.ops_apply_platform_preset(text) to authenticated;
