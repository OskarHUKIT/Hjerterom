-- Kommune can list all users (including new BankID users who might not be in profiles yet)
-- Uses auth.users + profiles - returns everyone who has signed up
create or replace function public.get_all_users_for_kommune()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  updated_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_kommune_ansatt() then
    return;  -- empty result for non-kommune
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
  order by coalesce(p.full_name, u.raw_user_meta_data->>'full_name', u.email) asc nulls last;
end;
$$;
