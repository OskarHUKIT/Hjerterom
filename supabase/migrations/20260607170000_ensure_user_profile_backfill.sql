-- =============================================================================
-- Sikre at alle auth.users har en rad i public.profiles.
--
-- Årsak: brukere kan finnes i Authentication uten profil hvis triggeren
-- (on_auth_user_created) ikke var aktiv ved registrering, profil ble slettet
-- manuelt, eller bruker ble gjenopprettet uten ny INSERT i auth.users.
-- =============================================================================

create or replace function public.sync_profile_for_auth_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  u record;
  user_role text := 'homeowner';
  user_region text := null;
  resolved_role text;
begin
  select id, email, raw_user_meta_data
  into u
  from auth.users
  where id = p_user_id;

  if u.id is null then
    return;
  end if;

  select a.region
  into user_region
  from public.kommune_access_list a
  where lower(trim(a.email)) = lower(trim(u.email))
    and a.is_active = true
  limit 1;

  if user_region is not null then
    user_role := 'kommune_ansatt';
  end if;

  resolved_role := coalesce(u.raw_user_meta_data->>'role', user_role);

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    contact_phone,
    kommune_region,
    updated_at
  )
  values (
    u.id,
    coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, ''), '@', 1)),
    u.email,
    resolved_role,
    u.raw_user_meta_data->>'contact_phone',
    case
      when resolved_role in ('kommune_ansatt', 'kommune_admin')
        then coalesce(u.raw_user_meta_data->>'kommune_region', user_region)
      else null
    end,
    now()
  )
  on conflict (id) do update
  set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    contact_phone = coalesce(public.profiles.contact_phone, excluded.contact_phone),
    updated_at = now();
end;
$$;

comment on function public.sync_profile_for_auth_user(uuid) is
  'Oppretter eller fyller inn manglende profilfelter fra auth.users. Kalles av trigger og ensure_own_profile().';

revoke all on function public.sync_profile_for_auth_user(uuid) from public;

-- Oppdater trigger til delt logikk
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.sync_profile_for_auth_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC: innlogget bruker kan sikre egen profil (f.eks. etter gammel konto uten trigger)
create or replace function public.ensure_own_profile()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform public.sync_profile_for_auth_user(uid);
  return uid;
end;
$$;

comment on function public.ensure_own_profile() is
  'Idempotent: oppretter public.profiles-rad for innlogget bruker hvis den mangler.';

grant execute on function public.ensure_own_profile() to authenticated;

-- Backfill: alle auth-brukere uten profilrad
do $$
declare
  r record;
begin
  for r in
    select u.id
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    perform public.sync_profile_for_auth_user(r.id);
  end loop;
end;
$$;
