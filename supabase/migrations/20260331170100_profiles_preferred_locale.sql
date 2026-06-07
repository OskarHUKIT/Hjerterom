-- Språkvalg for UI og e-postvarsler (synkroniseres fra appen)
alter table public.profiles
  add column if not exists preferred_locale text not null default 'no';

alter table public.profiles
  drop constraint if exists profiles_preferred_locale_check;

alter table public.profiles
  add constraint profiles_preferred_locale_check check (preferred_locale in ('no', 'se', 'en'));

comment on column public.profiles.preferred_locale is 'UI and notification email language: no, se, en.';
