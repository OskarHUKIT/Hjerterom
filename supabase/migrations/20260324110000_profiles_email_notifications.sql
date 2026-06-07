alter table public.profiles
  add column if not exists email_notifications_enabled boolean not null default false;

comment on column public.profiles.email_notifications_enabled is 'When true, user opts in to duplicate in-app notifications via email (requires mailer to be configured).';
