-- Husordensregler som valgfritt PDF-vedlegg per bolig (Storage: listings-bøtte, sti house-rules/{listing_id}/…)

alter table public.listings
  add column if not exists house_rules_pdf_path text;

comment on column public.listings.house_rules_pdf_path is
  'Objektsti i Storage bucket «listings», f.eks. house-rules/<listing_id>/<uuid>.pdf. Null = ikke lastet opp.';

-- Bucket brukes også til boligbilder (listing-images/…); opprett hvis den kun finnes i Dashboard
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do nothing;

-- Les: hele listings-bøtta (boligbilder + husordens-PDF) — samme som typisk public asset-bøtte
drop policy if exists "Listings bucket: public read" on storage.objects;
create policy "Listings bucket: public read"
  on storage.objects for select
  using (bucket_id = 'listings');

-- Skriv: kun eier av boligen som matcher første mappe etter house-rules/
drop policy if exists "Listings house rules PDF: listing owner insert" on storage.objects;
create policy "Listings house rules PDF: listing owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listings'
    and name like 'house-rules/%/%.pdf'
    and exists (
      select 1
      from public.listings l
      where l.id = split_part(name, '/', 2)::uuid
        and l.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Listings house rules PDF: listing owner delete" on storage.objects;
create policy "Listings house rules PDF: listing owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listings'
    and name like 'house-rules/%/%.pdf'
    and exists (
      select 1
      from public.listings l
      where l.id = split_part(name, '/', 2)::uuid
        and l.owner_id = (select auth.uid())
    )
  );
