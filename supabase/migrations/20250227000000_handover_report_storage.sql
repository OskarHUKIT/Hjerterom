-- Storage bucket for uploaded handover report PDFs
insert into storage.buckets (id, name, public) 
values ('handover-reports', 'handover-reports', true) 
on conflict (id) do nothing;

-- Allow authenticated users and anon (for tenant token flow) to upload
-- We use RLS on storage.objects - allow insert for the handover-reports path
create policy "Allow handover report uploads" on storage.objects
for insert with check (bucket_id = 'handover-reports');

create policy "Public read handover reports" on storage.objects
for select using (bucket_id = 'handover-reports');
