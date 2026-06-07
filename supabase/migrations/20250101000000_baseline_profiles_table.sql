-- Baseline: `profiles` forutsettes av mange senere migrasjoner, men fantes ikke alltid
-- i eldre manuelle Supabase-oppsett. Sikrer at tabellen finnes før ALTER/RLS/policies.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text default 'homeowner',
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

comment on table public.profiles is 'Brukerprofil (koblet til auth.users). Opprettet av baseline hvis manglet.';
