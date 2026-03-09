-- Tabell må finnes før vi legger til policies (f.eks. hvis 20250226 ikke er kjørt)
create table if not exists listing_tenant_tokens (
  listing_id uuid primary key references listings(id) on delete cascade,
  token uuid unique not null default gen_random_uuid(),
  created_at timestamp with time zone default now() not null
);

alter table listing_tenant_tokens enable row level security;

-- Eksisterende policy (så kommune og eier-view fungerer selv om 20250226/20250307 ikke er kjørt)
drop policy if exists "Kommune can manage tenant tokens" on listing_tenant_tokens;
create policy "Kommune can manage tenant tokens" on listing_tenant_tokens for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'kommune_ansatt')
);

drop policy if exists "Listing owner can view tenant token" on listing_tenant_tokens;
create policy "Listing owner can view tenant token"
  on listing_tenant_tokens for select
  using (exists (select 1 from listings where id = listing_id and owner_id = auth.uid()));

-- Nye policies: eier kan opprette/oppdatere token (så "Lenke til leietaker" genereres)
drop policy if exists "Listing owner can insert tenant token" on listing_tenant_tokens;
create policy "Listing owner can insert tenant token"
  on listing_tenant_tokens for insert
  with check (exists (select 1 from listings where id = listing_id and owner_id = auth.uid()));

drop policy if exists "Listing owner can update tenant token" on listing_tenant_tokens;
create policy "Listing owner can update tenant token"
  on listing_tenant_tokens for update
  using (exists (select 1 from listings where id = listing_id and owner_id = auth.uid()))
  with check (exists (select 1 from listings where id = listing_id and owner_id = auth.uid()));
