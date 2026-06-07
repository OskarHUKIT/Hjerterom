-- Alle kommune-saksbehandlere (ikke bare admin) skal kunne liste kollegaer på Kontoer-siden.

create or replace function public.get_kommune_staff_for_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  kommune_region text,
  kommune_can_edit boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_regions text[];
begin
  if not public.is_kommune_staff() then
    return;
  end if;
  viewer_regions := public.current_user_kommune_regions();
  if coalesce(array_length(viewer_regions, 1), 0) = 0 then
    return;
  end if;

  return query
  select
    u.id,
    coalesce(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))::text as full_name,
    u.email::text,
    p.kommune_region::text,
    coalesce(p.kommune_can_edit, true) as kommune_can_edit,
    coalesce(p.updated_at, u.created_at)::timestamptz as updated_at
  from auth.users u
  inner join public.profiles p on p.id = u.id and p.role = 'kommune_ansatt'
  where public.regions_overlap(viewer_regions, public.parse_kommune_regions_sql(p.kommune_region))
  order by 2 asc nulls last;
end;
$$;
