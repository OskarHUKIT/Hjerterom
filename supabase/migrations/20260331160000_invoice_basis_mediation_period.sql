-- Fakturagrunnlag knyttet til konkret formidlingsperiode (dato i PDF)

alter table public.listing_invoice_basis
  add column if not exists listing_availability_id uuid references public.listing_availability (id) on delete set null;

comment on column public.listing_invoice_basis.listing_availability_id is
  'Formidlingsperiode (listing_availability, status Formidla) som fakturagrunnlaget gjelder – brukes til sted/dato i PDF.';

-- Utleiere må kunne lese egne perioder for å velge periode i skjema (kommune hadde allerede select)
drop policy if exists "Owners can read availability for own listings" on public.listing_availability;
create policy "Owners can read availability for own listings"
  on public.listing_availability for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_availability.listing_id
        and l.owner_id = auth.uid()
    )
  );
