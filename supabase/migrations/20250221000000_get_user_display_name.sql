-- RPC to resolve user display name (from auth.users + profiles + listings)
-- Callable by: self (own name) or kommune (any user)
create or replace function public.get_user_display_name(p_user_id uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare
  result text;
begin
  -- Allow: viewing own name, or kommune viewing any
  if auth.uid() != p_user_id and not public.is_kommune_ansatt() then
    return null;
  end if;
  select coalesce(
    (select full_name from public.profiles where id = p_user_id limit 1),
    (select raw_user_meta_data->>'full_name' from auth.users where id = p_user_id limit 1),
    (select split_part(email, '@', 1) from auth.users where id = p_user_id limit 1),
    (select owner_name from public.listings where owner_id = p_user_id limit 1)
  ) into result;
  return coalesce(result, 'Ukjent bruker');
end;
$$;

-- RPC to get single user for kommune (auth.users + profiles - inkl. BankID-brukere uten profil-rad)
create or replace function public.get_single_user_for_kommune(p_user_id uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  updated_at timestamptz
) language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_kommune_ansatt() then
    return;
  end if;
  return query
  select
    u.id,
    coalesce(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))::text as full_name,
    u.email::text,
    coalesce(p.role, 'homeowner')::text as role,
    coalesce(p.updated_at, u.created_at)::timestamptz as updated_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;
end;
$$;
