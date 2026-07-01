alter table public.bookings
  add column if not exists landlord_payout_cents integer
    check (landlord_payout_cents is null or landlord_payout_cents >= 0);

comment on column public.bookings.landlord_payout_cents is
  'Amount due to landlord after platform fee (Vipps settles to platform; Stripe via Connect transfer).';
