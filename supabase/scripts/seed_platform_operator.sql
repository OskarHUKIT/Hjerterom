-- Grant platform operator access (GameChanging /ops console).
--
-- IMPORTANT: Do NOT set profiles.role = 'platform_operators'.
-- profiles.role only allows: homeowner | kommune_ansatt | kommune_admin
-- Operator access is a separate allowlist in public.platform_operators.
--
-- Prerequisites:
--   1. User must already exist in auth.users (sign up at /login first).
--   2. Migration 20260607120000_platform_ops_console.sql must be applied.
--
-- Replace the email below, then run in Supabase SQL Editor.

do $$
declare
  v_email text := lower(trim('oskar@gamechanging.no'));
  v_user_id uuid;
begin
  select u.id into v_user_id
  from auth.users u
  where lower(trim(u.email)) = v_email;

  if v_user_id is null then
    raise exception 'No auth.users row for %. Sign up at /login first, then re-run this script.', v_email;
  end if;

  -- Ensure profile exists with a VALID role (not platform_operators)
  insert into public.profiles (id, full_name, email, role)
  select
    u.id,
    coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.email,
    'homeowner'
  from auth.users u
  where u.id = v_user_id
  on conflict (id) do update set
    role = case
      when profiles.role is null or profiles.role = 'platform_operators' then 'homeowner'
      else profiles.role
    end,
    email = coalesce(excluded.email, profiles.email),
    full_name = coalesce(profiles.full_name, excluded.full_name);

  -- Operator allowlist (this is what unlocks /ops/*)
  insert into public.platform_operators (user_id, granted_by, is_active, notes)
  values (v_user_id, v_user_id, true, 'Initial operator seed')
  on conflict (user_id) do update
  set is_active = true, notes = excluded.notes;

  raise notice 'Operator access granted for user_id % (%)', v_user_id, v_email;
end;
$$;
