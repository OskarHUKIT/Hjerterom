alter table public.bookings
  add column if not exists platform_fee_cents integer
    check (platform_fee_cents is null or platform_fee_cents >= 0);

comment on column public.bookings.platform_fee_cents is
  'Platform take on paid tourism bookings (~10% all-in per PRD §8.2).';
