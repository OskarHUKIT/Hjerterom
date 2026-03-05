-- La kommune oppdatere overtakelsesrapporter (approval_status = rejected, request_change_comment)
-- Uten denne policyen blokkerer RLS UPDATE og rapporten forblir uendret.

create policy "Kommune can update report approval"
  on handover_reports for update
  using (public.is_kommune_ansatt())
  with check (public.is_kommune_ansatt());

-- La kommune lese rapporter for å vise liste og godkjenne/avvise (f.eks. for listings de har tilgang til)
create policy "Kommune can view handover reports"
  on handover_reports for select
  using (public.is_kommune_ansatt());

-- La boligeier lese tenant-token for egne boliger (for å vise "Lenke til leietaker" på Mine boliger)
create policy "Listing owner can view tenant token"
  on listing_tenant_tokens for select
  using (exists (select 1 from listings where id = listing_id and owner_id = auth.uid()));
