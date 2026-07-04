-- Theme preference for cross-session / cross-device persistence (PRD §15.2 M1)
alter table public.profiles
  add column if not exists preferred_theme text not null default 'dark';

alter table public.profiles
  drop constraint if exists profiles_preferred_theme_check;

alter table public.profiles
  add constraint profiles_preferred_theme_check check (preferred_theme in ('dark', 'light'));

comment on column public.profiles.preferred_theme is 'UI theme: dark or light. Synced from app on change.';

-- L-7: kommune social subscription check by listing city
create or replace function public.is_kommune_social_active_for_city(p_city text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kommuner k
    where public.city_matches_region_keys(p_city, k.region_keys)
      and k.status in ('active', 'pilot')
  );
$$;

grant execute on function public.is_kommune_social_active_for_city(text) to authenticated, anon;
