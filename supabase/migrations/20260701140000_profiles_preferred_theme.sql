-- Theme preference for UI (synced from ThemeContext — PRD §15.2 M1)
alter table public.profiles
  add column if not exists preferred_theme text not null default 'dark';

alter table public.profiles
  drop constraint if exists profiles_preferred_theme_check;

alter table public.profiles
  add constraint profiles_preferred_theme_check check (preferred_theme in ('dark', 'light'));

comment on column public.profiles.preferred_theme is 'UI theme: dark (default) or light.';
