-- Reservasjon av bolig for intern avklaring (Nav) — UI og cron kommer i eget steg.
create table if not exists public.listing_mediation_reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  reserved_by uuid not null references auth.users on delete cascade,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'released', 'expired', 'cancelled')),
  internal_note text,
  cancelled_reason text,
  updated_at timestamptz default now()
);

create index if not exists idx_mediation_res_listing on public.listing_mediation_reservations (listing_id);
create index if not exists idx_mediation_res_expires on public.listing_mediation_reservations (expires_at) where status = 'active';

comment on table public.listing_mediation_reservations is 'Short-term lock (e.g. 2h) while kommune coordinates on mediation; see product spec.';
