-- La kommune oppdatere overtakelsesrapporter (approval_status = rejected, request_change_comment)
-- Uten denne policyen blokkerer RLS UPDATE og rapporten forblir uendret.
drop policy if exists "Kommune can update report approval" on handover_reports;
create policy "Kommune can update report approval"
  on handover_reports for update
  using (public.is_kommune_ansatt())
  with check (public.is_kommune_ansatt());

drop policy if exists "Kommune can view handover reports" on handover_reports;
create policy "Kommune can view handover reports"
  on handover_reports for select
  using (public.is_kommune_ansatt());

drop policy if exists "Listing owner can view tenant token" on listing_tenant_tokens;
create policy "Listing owner can view tenant token"
  on listing_tenant_tokens for select
  using (exists (select 1 from listings where id = listing_id and owner_id = auth.uid()));
