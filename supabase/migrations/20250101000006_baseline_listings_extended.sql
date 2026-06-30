-- Extended listings columns (from legacy manual Boly setup — required for fresh Hjerterum install)

alter table public.listings
  add column if not exists owner_name text,
  add column if not exists postal_code text,
  add column if not exists contact_phone text,
  add column if not exists size_sqm numeric,
  add column if not exists bedrooms integer,
  add column if not exists floor_number text,
  add column if not exists accessibility text[],
  add column if not exists floor_detail text[],
  add column if not exists furnishing text,
  add column if not exists price_daily numeric,
  add column if not exists price_weekly numeric,
  add column if not exists price_monthly_short numeric,
  add column if not exists price_monthly_long numeric,
  add column if not exists includes text[],
  add column if not exists deposit_amount numeric,
  add column if not exists deposit_guarantee text[],
  add column if not exists parking_info text,
  add column if not exists max_occupants integer,
  add column if not exists additional_info text,
  add column if not exists last_verified timestamptz default now(),
  add column if not exists status text default 'Tilgjengelig',
  add column if not exists image_urls text[];

alter table public.profiles
  add column if not exists allowed_municipalities text[],
  add column if not exists folkeregistrert_kommune text;
