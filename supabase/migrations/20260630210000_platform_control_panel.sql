-- Central platform control panel: Boly-only vs Hjerterum feature flags (singleton row)

create table if not exists public.platform_settings (
  id int primary key check (id = 1),
  product_mode text not null default 'boly'
    check (product_mode in ('boly', 'hjerterum')),
  finn_portal_enabled boolean not null default false,
  los_portal_enabled boolean not null default false,
  central_events_enabled boolean not null default false,
  tourism_lane_enabled boolean not null default false,
  stripe_bookings_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.platform_settings is
  'Singleton platform mode. product_mode=boly runs classic Boly; hjerterum enables optional modules via flags.';

insert into public.platform_settings (id, product_mode)
values (1, 'boly')
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

-- No direct table access; use RPCs only.

create or replace function public.get_platform_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'product_mode', ps.product_mode,
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

comment on function public.get_platform_settings() is
  'Public read of platform feature flags (no secrets). Used by app shell and middleware.';

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
  p_product_mode text default null,
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
begin
  perform public.ops_assert_operator();

  v_before := public.get_platform_settings();

  update public.platform_settings ps
  set
    product_mode = coalesce(p_product_mode, ps.product_mode),
    finn_portal_enabled = coalesce(p_finn_portal_enabled, ps.finn_portal_enabled),
    los_portal_enabled = coalesce(p_los_portal_enabled, ps.los_portal_enabled),
    central_events_enabled = coalesce(p_central_events_enabled, ps.central_events_enabled),
    tourism_lane_enabled = coalesce(p_tourism_lane_enabled, ps.tourism_lane_enabled),
    stripe_bookings_enabled = coalesce(p_stripe_bookings_enabled, ps.stripe_bookings_enabled),
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

revoke all on function public.ops_set_platform_settings(text, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.ops_set_platform_settings(text, boolean, boolean, boolean, boolean, boolean) to authenticated;

-- Apply Boly-only preset (all Hjerterum modules off)
create or replace function public.ops_apply_platform_preset(p_preset text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();

  if p_preset = 'boly_only' then
    return public.ops_set_platform_settings(
      'boly', false, false, false, false, false
    );
  elsif p_preset = 'hjerterum_full' then
    return public.ops_set_platform_settings(
      'hjerterum', true, true, true, true, true
    );
  elsif p_preset = 'hjerterum_pilot' then
    return public.ops_set_platform_settings(
      'hjerterum', false, true, false, true, false
    );
  else
    raise exception 'unknown preset: %', p_preset using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.ops_apply_platform_preset(text) from public;
grant execute on function public.ops_apply_platform_preset(text) to authenticated;
