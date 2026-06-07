-- Baseline: `listings` må finnes før funksjoner som `returns setof listings` kan opprettes.
-- Matcher SUPABASE_SETUP.md §2; senere migrasjoner legger til flere kolonner med ALTER.

create table if not exists public.listings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  address text not null,
  city text not null,
  price_per_night numeric not null,
  description text,
  is_available boolean default true,
  beds integer default 1,
  type text default 'Leilighet',
  image_url text
);

alter table public.listings enable row level security;

-- Grunnleggende policies (som i SUPABASE_SETUP) – trygt ved IF NOT EXISTS for policy-navn
drop policy if exists "Authenticated users can view all listings" on public.listings;
create policy "Authenticated users can view all listings"
  on public.listings for select
  using (auth.role() = 'authenticated');

drop policy if exists "Owners can manage their own listings" on public.listings;
create policy "Owners can manage their own listings"
  on public.listings for all
  using (auth.uid() = owner_id);

comment on table public.listings is 'Boliger. Utvides av senere migrasjoner (status, priser, bilder, m.m.).';
