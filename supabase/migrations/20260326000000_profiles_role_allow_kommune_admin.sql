-- Tillat rolle kommune_admin i profiles (tidligere CHECK kan ha vært kun homeowner + kommune_ansatt).

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles add constraint profiles_role_check check (
  role is null
  or role in ('homeowner', 'kommune_ansatt', 'kommune_admin')
);
