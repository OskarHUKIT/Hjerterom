-- Allow Kommune to add/remove Formidla periods in listing_availability
-- Run this in Supabase SQL Editor if kommune gets RLS errors when marking listings as formidlet

drop policy if exists "Kommune can manage availability" on listing_availability;
create policy "Kommune can manage availability" on listing_availability for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'kommune_ansatt')
);
