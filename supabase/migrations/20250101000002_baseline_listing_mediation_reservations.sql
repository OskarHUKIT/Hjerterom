-- Baseline: kreves av policy-endringer i senere migrasjoner (kommune-admin m.m.).
-- Samme struktur som 20260324120000 / indekser som 20260324140000 (IF NOT EXISTS er idempotent).

create table if not exists public.listing_mediation_reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reserved_by uuid not null references auth.users (id) on delete cascade,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'released', 'expired', 'cancelled')),
  internal_note text,
  cancelled_reason text,
  updated_at timestamptz default now()
);

create unique index if not exists idx_one_active_mediation_per_listing
  on public.listing_mediation_reservations (listing_id)
  where status = 'active';

create index if not exists idx_mediation_res_listing on public.listing_mediation_reservations (listing_id);
create index if not exists idx_mediation_res_expires on public.listing_mediation_reservations (expires_at) where status = 'active';

alter table public.listing_mediation_reservations enable row level security;

grant select on public.listing_mediation_reservations to authenticated;

comment on table public.listing_mediation_reservations is 'Kort reservasjon (f.eks. 2t) ved intern avklaring. Opprettet av baseline hvis manglet.';
