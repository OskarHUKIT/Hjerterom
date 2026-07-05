-- Ordered alt text per gallery image (parallel to image_urls by index).
alter table public.listings
  add column if not exists image_alts text[];

comment on column public.listings.image_alts is
  'Alt text per image in image_urls (same order; first = cover).';
