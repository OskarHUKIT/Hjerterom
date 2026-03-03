-- Whitelist of emails that automatically get kommune access + region when they register
-- Manage this list in Supabase Table Editor or via an admin page

-- Ensure kommune_can_edit exists (used in policy below)
alter table profiles add column if not exists kommune_can_edit boolean default true;

create table if not exists kommune_access_list (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  region text not null,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table kommune_access_list enable row level security;

-- Allow kommune staff with edit rights to manage (for admin UI)
-- First entries: add via Supabase Dashboard → Table Editor (service role bypasses RLS)
drop policy if exists "Kommune admins can manage access list" on kommune_access_list;
create policy "Kommune admins can manage access list"
  on kommune_access_list for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'kommune_ansatt'
      and coalesce(kommune_can_edit, true) = true
    )
  );

-- Add region column to profiles (which municipality/region this user has access to)
alter table profiles add column if not exists kommune_region text;

-- Update handle_new_user: check whitelist and auto-assign kommune role + region
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text := 'homeowner';
  user_region text := null;
begin
  -- Check if this email is in the kommune access whitelist
  select a.region into user_region
  from kommune_access_list a
  where lower(trim(a.email)) = lower(trim(new.email))
  and a.is_active = true
  limit 1;

  if user_region is not null then
    user_role := 'kommune_ansatt';
  end if;

  insert into public.profiles (id, full_name, email, role, contact_phone, kommune_region, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', user_role),
    new.raw_user_meta_data->>'contact_phone',
    case when user_role = 'kommune_ansatt' then user_region else null end,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Index for fast whitelist lookup
create index if not exists idx_kommune_access_list_email_lower 
  on kommune_access_list (lower(trim(email))) 
  where is_active = true;

-- RPC for Edge Functions / server: get region for email (case-insensitive)
create or replace function public.get_whitelist_region_for_email(p_email text)
returns text language sql security definer set search_path = public
as $$
  select region from kommune_access_list
  where lower(trim(email)) = lower(trim(nullif(p_email, '')))
  and is_active = true
  limit 1;
$$;
