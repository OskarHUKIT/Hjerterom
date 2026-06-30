-- Baseline: listing_availability (formidlingsperioder per bolig)
-- Manglet i eldre oppsett — påkrevd før 20250213_kommune_listing_availability.sql

create table if not exists public.listing_availability (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'Tilgjengelig'
    check (status in ('Formidla', 'Utilgjengelig', 'Tilgjengelig')),
  constraint listing_availability_dates_check check (start_date <= end_date)
);

create index if not exists listing_availability_listing_idx
  on public.listing_availability (listing_id, start_date);

alter table public.listing_availability enable row level security;

comment on table public.listing_availability is
  'Perioder for formidling/utilgjengelig per bolig. Utvides av senere migrasjoner (lane, notater).';
