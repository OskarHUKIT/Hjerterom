-- Storage bucket for uploaded handover report PDFs
insert into storage.buckets (id, name, public) 
values ('handover-reports', 'handover-reports', true) 
on conflict (id) do nothing;

drop policy if exists "Allow handover report uploads" on storage.objects;
create policy "Allow handover report uploads" on storage.objects
for insert with check (bucket_id = 'handover-reports');

drop policy if exists "Public read handover reports" on storage.objects;
create policy "Public read handover reports" on storage.objects
for select using (bucket_id = 'handover-reports');
