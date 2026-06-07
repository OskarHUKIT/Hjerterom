-- Betaling ved registrering (konto → fakturagrunnlag ved formidling) + lagring av utfylt grunnlag

alter table public.listings
  add column if not exists payment_method text not null default 'faktura';

alter table public.listings
  drop constraint if exists listings_payment_method_check;

alter table public.listings
  add constraint listings_payment_method_check
  check (payment_method in ('konto', 'faktura'));

comment on column public.listings.payment_method is
  'faktura = standard; konto = utleier varsles om fakturagrunnlag når boligen formidles.';

create table if not exists public.listing_invoice_basis (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  creditor_name text,
  organization_number text,
  account_number text,
  kid_reference text,
  amount_nok numeric(12, 2),
  period_description text,
  notes text,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.listing_invoice_basis is
  'Utleier fyller ut; kommune kan lese og generere PDF. Én rad per bolig.';

alter table public.listing_invoice_basis enable row level security;

drop policy if exists "listing_invoice_basis_select" on public.listing_invoice_basis;
drop policy if exists "listing_invoice_basis_insert" on public.listing_invoice_basis;
drop policy if exists "listing_invoice_basis_update" on public.listing_invoice_basis;

create policy "listing_invoice_basis_select"
  on public.listing_invoice_basis for select
  using (
    public.is_kommune_staff()
    or exists (
      select 1 from public.listings l
      where l.id = listing_invoice_basis.listing_id
        and l.owner_id = auth.uid()
    )
  );

create policy "listing_invoice_basis_insert"
  on public.listing_invoice_basis for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_invoice_basis.listing_id
        and l.owner_id = auth.uid()
    )
  );

create policy "listing_invoice_basis_update"
  on public.listing_invoice_basis for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_invoice_basis.listing_id
        and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_invoice_basis.listing_id
        and l.owner_id = auth.uid()
    )
  );

grant select, insert, update on public.listing_invoice_basis to authenticated;
