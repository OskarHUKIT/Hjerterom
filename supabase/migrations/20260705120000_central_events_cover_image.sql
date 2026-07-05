-- Event cover images for TravelCard UI on Finn arrangement pages

alter table public.central_events
  add column if not exists cover_image_url text;

comment on column public.central_events.cover_image_url is
  'Public URL to event hero/cover image (Supabase storage listings/event-covers/{slug}.png).';
