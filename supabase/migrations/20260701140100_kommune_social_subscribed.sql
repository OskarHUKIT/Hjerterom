-- L-7: whether a city is in a paying Boly kommune (social lane eligible)
create or replace function public.is_kommune_social_subscribed(p_city text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kommuner k
    where k.status in ('pilot', 'active')
      and public.city_matches_region_keys(p_city, k.region_keys)
  );
$$;

comment on function public.is_kommune_social_subscribed(text) is
  'True when p_city maps to a kommune with active/pilot subscription (social formidling).';

grant execute on function public.is_kommune_social_subscribed(text) to authenticated, anon;
