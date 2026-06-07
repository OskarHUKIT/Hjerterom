-- Kommune-admin: ikke publisere globale vilkår (tom kommune_region). Storage-upload uavhengig av publish(null).

create or replace function public.kommune_can_publish_terms(p_kommune_region text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_edit boolean;
  v_regions text[];
  p_email text;
  wl text;
  target text;
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then
    return false;
  end if;
  if v_role not in ('kommune_ansatt', 'kommune_admin') then
    return false;
  end if;
  if v_role = 'kommune_ansatt' then
    select coalesce(kommune_can_edit, true) into v_edit from public.profiles where id = auth.uid();
    if coalesce(v_edit, true) = false then
      return false;
    end if;
  end if;
  -- Kommune-admin: aldri globale rader (ingen egen «alle kommuner»-mal i DB)
  if v_role = 'kommune_admin' then
    if p_kommune_region is null or trim(p_kommune_region) = '' then
      return false;
    end if;
  end if;
  if p_kommune_region is null or trim(p_kommune_region) = '' then
    return true;
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

-- Tillat opplasting til terms/* for kommune-staff med redigering eller kommune-admin (insert i terms_documents avgjør region).
create or replace function public.kommune_can_upload_terms_pdf()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_kommune_staff()
    and (
      public.is_kommune_admin()
      or coalesce((select kommune_can_edit from public.profiles where id = auth.uid()), true) = true
    );
$$;
