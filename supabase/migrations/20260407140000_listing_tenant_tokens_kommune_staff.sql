-- Leietaker-lenke (overtakelsesrapport): eldre policy tillot kun kommune_ansatt.
-- kommune_admin ble blokkert av RLS → upsert/select returnerte ingenting uten synlig feil i UI.
drop policy if exists "Kommune can manage tenant tokens" on public.listing_tenant_tokens;
create policy "Kommune can manage tenant tokens"
  on public.listing_tenant_tokens for all
  using (public.is_kommune_staff())
  with check (public.is_kommune_staff());
