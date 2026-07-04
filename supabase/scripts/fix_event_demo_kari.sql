-- =============================================================================
-- NPD-0B: Ensure event demo account kari.event@demo.ofoten.no on phi/staging
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor when product-growth audit fails on
-- persona event_sb (login or missing central_event_staff).
-- Password: Ofoten2026!
-- Idempotent — safe to re-run.
-- =============================================================================

create extension if not exists pgcrypto;

create or replace function public._npd_fix_event_demo_kari()
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
  v_pw text := 'Ofoten2026!';
begin
  select id into v_id from auth.users where lower(email) = 'kari.event@demo.ofoten.no';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      v_id, '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'kari.event@demo.ofoten.no',
      extensions.crypt(v_pw, extensions.gen_salt('bf')),
      now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Kari Nordgård","role":"event_ansatt","demo_seed":"narvik_ofoten_2026"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', 'kari.event@demo.ofoten.no', 'email_verified', true),
      'email', now(), now(), now()
    );
  else
    update auth.users
    set
      encrypted_password = extensions.crypt(v_pw, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || '{"full_name":"Kari Nordgård","role":"event_ansatt","demo_seed":"narvik_ofoten_2026"}'::jsonb,
      updated_at = now()
    where id = v_id;
  end if;

  insert into public.profiles (id, full_name, email, role, email_notifications_enabled, updated_at)
  values (v_id, 'Kari Nordgård', 'kari.event@demo.ofoten.no', 'event_ansatt', true, now())
  on conflict (id) do update set
    role = 'event_ansatt',
    full_name = 'Kari Nordgård',
    email = 'kari.event@demo.ofoten.no',
    email_notifications_enabled = true,
    updated_at = now();

  insert into public.central_event_staff (event_id, profile_id, role)
  select ce.id, v_id, 'coordinator'
  from public.central_events ce
  where ce.slug in ('veidekke-ofotbanen-2026', 'nav-sommerleir-gratangen-2026')
  on conflict do nothing;

  return v_id;
end;
$$;

select public._npd_fix_event_demo_kari() as kari_profile_id;

drop function if exists public._npd_fix_event_demo_kari();
