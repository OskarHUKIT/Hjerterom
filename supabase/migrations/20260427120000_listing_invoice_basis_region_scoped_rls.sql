-- =============================================================================
-- listing_invoice_basis: region-scoped RLS + retention
-- =============================================================================
-- Background:
--   Boly stores financial PII (bankkontonummer / account_number) in
--   public.listing_invoice_basis when a landlord opts in to `payment_method =
--   'konto'`. The original RLS (20260331150000 + 20260425120000) let ANY
--   authenticated kommune-staff SELECT from this table, regardless of their
--   region. That is inconsistent with the region-scoping we already enforce on
--   `listings` itself (20260423120000_kommune_region_security_hardening.sql,
--   20260419120000_listing_owner_lock_when_formidla.sql).
--
--   This migration:
--     1) Region-scopes SELECT so kommune-staff only see invoice basis rows for
--        listings in their own region.
--     2) Extends the existing retention sweep (boly_retention_sweep) to purge
--        stale invoice_basis rows — financial PII must not live longer than
--        the legitimate purpose (GDPR art. 5 (1) e).
--
-- References:
--   - docs/legal/DPIA_Boly.md § 3 R-16
--   - docs/legal/PRIVACY_NOTICE.md § 2, § 5
--   - DBA_Gamechanging_Boly_v2.pdf Vedlegg A.3
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) Region-scoped SELECT
-- -----------------------------------------------------------------------------
drop policy if exists "listing_invoice_basis_select" on public.listing_invoice_basis;

create policy "listing_invoice_basis_select"
  on public.listing_invoice_basis for select
  using (
    -- Owner (landlord) sees their own rows.
    exists (
      select 1 from public.listings l
      where l.id = listing_invoice_basis.listing_id
        and l.owner_id = (select auth.uid())
    )
    -- Kommune-staff only see rows for listings in their own region.
    or (
      public.is_kommune_staff()
      and public.kommune_listing_region_ok(listing_invoice_basis.listing_id)
    )
  );

comment on policy "listing_invoice_basis_select" on public.listing_invoice_basis is
  'Owner sees own rows. Kommune-staff see rows for listings in their region only. GDPR art. 5 (1) f.';


-- -----------------------------------------------------------------------------
-- 2) INSERT / UPDATE: unchanged (owner-only), re-declared for idempotency
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- 3) Retention: extend boly_retention_sweep() with invoice_basis purge
-- -----------------------------------------------------------------------------
-- Policy: delete rows whose last update is > 24 months old AND whose listing
-- does not have an active ("Formidla") availability window within the last
-- 3 months. Rationale:
--   - A signed invoice_basis row is proof of rental mediation; it must live
--     while the tenancy is active plus a short after-period.
--   - After that, the municipality keeps bookkeeping records elsewhere
--     (generated PDFs are already served on-demand and not persisted in this
--     table).
--   - 24 months aligns with chat_messages retention and leaves room for
--     audits.
-- -----------------------------------------------------------------------------
create or replace function public.boly_retention_sweep()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  chat_deleted          bigint := 0;
  notif_deleted         bigint := 0;
  audit_deleted         bigint := 0;
  invoice_deleted       bigint := 0;
  chat_cutoff           timestamptz := now() - interval '24 months';
  notif_cutoff          timestamptz := now() - interval '12 months';
  audit_cutoff          timestamptz := now() - interval '12 months';
  invoice_cutoff        timestamptz := now() - interval '24 months';
  invoice_active_window timestamptz := now() - interval '3 months';
begin
  -- chat_messages : purge rows strictly older than 24 months.
  begin
    delete from public.chat_messages
    where created_at < chat_cutoff;
    get diagnostics chat_deleted = row_count;
  exception when undefined_table then
    chat_deleted := -1;
  end;

  -- notifications : operational, 12 months.
  begin
    delete from public.notifications
    where created_at < notif_cutoff;
    get diagnostics notif_deleted = row_count;
  exception when undefined_table then
    notif_deleted := -1;
  end;

  -- audit_logs : IT-security logs, 12 months.
  begin
    delete from public.audit_logs
    where created_at < audit_cutoff;
    get diagnostics audit_deleted = row_count;
  exception when undefined_table then
    audit_deleted := -1;
  end;

  -- listing_invoice_basis : financial PII, 24 months since last update,
  -- only when the underlying listing is no longer actively mediated.
  begin
    delete from public.listing_invoice_basis lib
    where lib.updated_at < invoice_cutoff
      and not exists (
        select 1
        from public.listing_availability la
        where la.listing_id = lib.listing_id
          and la.status = 'Formidla'
          and coalesce(la.end_date, la.start_date) > invoice_active_window
      );
    get diagnostics invoice_deleted = row_count;
  exception when undefined_table then
    invoice_deleted := -1;
  end;

  -- Record the run in audit_logs.
  begin
    insert into public.audit_logs (user_id, event_type, metadata, created_at)
    values (
      null,
      'RETENTION_SWEEP',
      jsonb_build_object(
        'chat_deleted',    chat_deleted,
        'notif_deleted',   notif_deleted,
        'audit_deleted',   audit_deleted,
        'invoice_deleted', invoice_deleted,
        'chat_cutoff',     chat_cutoff,
        'notif_cutoff',    notif_cutoff,
        'audit_cutoff',    audit_cutoff,
        'invoice_cutoff',  invoice_cutoff
      ),
      now()
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'chat_deleted',    chat_deleted,
    'notif_deleted',   notif_deleted,
    'audit_deleted',   audit_deleted,
    'invoice_deleted', invoice_deleted,
    'ran_at',          now()
  );
end;
$$;

comment on function public.boly_retention_sweep() is
  'GDPR art. 5 (1) e retention sweep. Deletes chat_messages > 24mo, notifications > 12mo, audit_logs > 12mo, and listing_invoice_basis > 24mo when listing no longer actively mediated.';

revoke all on function public.boly_retention_sweep() from public;
grant execute on function public.boly_retention_sweep() to service_role;
