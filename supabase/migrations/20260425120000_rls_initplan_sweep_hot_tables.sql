-- Performance: wrap auth.uid() i skalarsubquery for hot-table RLS så Postgres evaluerer én gang per statement (InitPlan)
-- i stedet for per rad. Ingen endring i sikkerhetssemantikk — identiske predikater, kun optimalisert evaluering.
-- Forrige sweep (20260420180000) dekket profiles + 2 listings-policies. Denne dekker resten av hot-tablene.
--
-- Kilde: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ==========================================================================
-- push_subscriptions: enbruker-eid tabell, leses + skrives ved hver PWA-sync
-- ==========================================================================
drop policy if exists "Users can manage own push subscriptions" on public.push_subscriptions;
create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- ==========================================================================
-- user_terms_acceptances: leses ofte av utleier-dashboard og signeringsflyt
-- ==========================================================================
drop policy if exists "Users read own terms acceptances" on public.user_terms_acceptances;
create policy "Users read own terms acceptances"
  on public.user_terms_acceptances for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ==========================================================================
-- landlord_resign_requests: utleier-SELECT (kommune-SELECT bruker is_kommune_staff() allerede)
-- ==========================================================================
drop policy if exists "Landlord read own resign requests" on public.landlord_resign_requests;
create policy "Landlord read own resign requests"
  on public.landlord_resign_requests for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ==========================================================================
-- handover_reports: eier leser + insert for egne bolig-rapporter
-- ==========================================================================
drop policy if exists "Users can view reports for their own listings" on public.handover_reports;
create policy "Users can view reports for their own listings"
  on public.handover_reports for select
  using (
    exists (
      select 1 from public.listings
      where id = handover_reports.listing_id
        and owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners can insert reports for own listings" on public.handover_reports;
create policy "Owners can insert reports for own listings"
  on public.handover_reports for insert
  with check (
    exists (
      select 1 from public.listings
      where id = handover_reports.listing_id
        and owner_id = (select auth.uid())
    )
  );

-- ==========================================================================
-- listing_invoice_basis: eier-eid + kommune lesbar, hovedsakelig eier-skriv
-- ==========================================================================
drop policy if exists "listing_invoice_basis_select" on public.listing_invoice_basis;
create policy "listing_invoice_basis_select"
  on public.listing_invoice_basis for select
  using (
    public.is_kommune_staff()
    or exists (
      select 1 from public.listings l
      where l.id = listing_invoice_basis.listing_id
        and l.owner_id = (select auth.uid())
    )
  );

drop policy if exists "listing_invoice_basis_insert" on public.listing_invoice_basis;
create policy "listing_invoice_basis_insert"
  on public.listing_invoice_basis for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_invoice_basis.listing_id
        and l.owner_id = (select auth.uid())
    )
  );

drop policy if exists "listing_invoice_basis_update" on public.listing_invoice_basis;
create policy "listing_invoice_basis_update"
  on public.listing_invoice_basis for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_invoice_basis.listing_id
        and l.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_invoice_basis.listing_id
        and l.owner_id = (select auth.uid())
    )
  );

-- ==========================================================================
-- listing_availability: tre kommune-skriv + eier-SELECT
-- (Kommune-rolle bruker exists-subquery på profiles; wrap auth.uid() i InitPlan)
-- ==========================================================================
drop policy if exists "Kommune can read availability" on public.listing_availability;
create policy "Kommune can read availability"
  on public.listing_availability for select
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'kommune_ansatt'
    )
  );

drop policy if exists "Kommune with edit can insert availability" on public.listing_availability;
create policy "Kommune with edit can insert availability"
  on public.listing_availability for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'kommune_ansatt'
        and (kommune_can_edit is null or kommune_can_edit = true)
    )
  );

drop policy if exists "Kommune with edit can update availability" on public.listing_availability;
create policy "Kommune with edit can update availability"
  on public.listing_availability for update
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'kommune_ansatt'
        and (kommune_can_edit is null or kommune_can_edit = true)
    )
  );

drop policy if exists "Kommune with edit can delete availability" on public.listing_availability;
create policy "Kommune with edit can delete availability"
  on public.listing_availability for delete
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'kommune_ansatt'
        and (kommune_can_edit is null or kommune_can_edit = true)
    )
  );

drop policy if exists "Owners can read availability for own listings" on public.listing_availability;
create policy "Owners can read availability for own listings"
  on public.listing_availability for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_availability.listing_id
        and l.owner_id = (select auth.uid())
    )
  );

-- ==========================================================================
-- Merknad om policies som bevisst IKKE endres her:
--   - terms_documents (INSERT/UPDATE/DELETE): bruker public.kommune_can_publish_terms(kommune_region)
--     som er SECURITY DEFINER + STABLE; Postgres cacher stabile funksjonskall.
--   - audit_logs ("Kommune can view non-kommune user history"): bruker public.is_kommune_staff(),
--     også STABLE + SECURITY DEFINER.
--   - landlord_resign_requests ("Kommune read resign requests in region"): bruker
--     public.is_kommune_staff() + public.kommune_listing_region_ok(); samme resonnement.
--   - chat_messages / notifications / user_agreements: policies er ikke repo-versjonert
--     (opprinnelig oppsett via dashboard) og skal ikke røres av sweepen. Håndteres eget PR
--     ved behov.
-- ==========================================================================

comment on policy "Users can manage own push subscriptions" on public.push_subscriptions is
  'InitPlan-wrapped auth.uid() for RLS perf.';
comment on policy "Users read own terms acceptances" on public.user_terms_acceptances is
  'InitPlan-wrapped auth.uid() for RLS perf.';
comment on policy "Landlord read own resign requests" on public.landlord_resign_requests is
  'InitPlan-wrapped auth.uid() for RLS perf.';
