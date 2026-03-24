-- Kun kommune-admin kan publisere og laste opp vilkårs-PDF (ikke vanlige saksbehandlere).

create or replace function public.kommune_can_publish_terms(p_kommune_region text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_regions text[];
  p_email text;
  wl text;
  target text;
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'kommune_admin' then
    return false;
  end if;
  if p_kommune_region is null or trim(p_kommune_region) = '' then
    return false;
  end if;
  target := lower(trim(p_kommune_region));
  select kommune_region into wl from public.profiles where id = auth.uid();
  v_regions := public.parse_kommune_regions_sql(wl);
  if coalesce(array_length(v_regions, 1), 0) = 0 then
    select email into p_email from auth.users where id = auth.uid();
    if p_email is not null then
      select region into wl
      from public.kommune_access_list
      where is_active = true and lower(trim(email)) = lower(trim(p_email))
      limit 1;
      v_regions := public.parse_kommune_regions_sql(wl);
    end if;
  end if;
  if coalesce(array_length(v_regions, 1), 0) = 0 then
    return false;
  end if;
  return target = any (v_regions);
end;
$$;

create or replace function public.kommune_can_upload_terms_pdf()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_kommune_admin();
$$;
