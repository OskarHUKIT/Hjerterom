-- Bildevedlegg i meldinger: kolonne på chat_messages + storage-bøtte for chat-bilder

-- 1. Kolonne for bilder (array av URL-er fra storage)
alter table chat_messages
  add column if not exists image_urls text[] default '{}';

comment on column chat_messages.image_urls is 'Offentlige URL-er til bilder lastet opp til chat-images-bøtten.';

-- 2. Storage-bøtte for chat-bilder (public read slik at img src fungerer)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3. RLS: innloggede brukere kan laste opp og lese
drop policy if exists "Chat images: authenticated upload" on storage.objects;
create policy "Chat images: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-images');

drop policy if exists "Chat images: authenticated read" on storage.objects;
create policy "Chat images: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'chat-images');
