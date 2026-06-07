-- =============================================================================
-- handover_reports + bilder: 36 måneders retensjon (GDPR art. 5 (1) e)
-- =============================================================================
-- Bakgrunn:
--   docs/legal/PRIVACY_NOTICE.md § 5 og /personvern § 5 lover «Handover
--   reports: 3 years after the report is approved». Dette var ikke
--   håndhevet teknisk — rapporter og bilder levde uendelig. Se også
--   DPIA_Boly.md risikoregister R-10 og DBA_v3 Vedlegg D.5.
--
-- Hva denne migrasjonen gjør:
--   1) Utvider `public.boly_retention_sweep()` til også å slette:
--        a) handover_reports hvor coalesce(approved_at, signed_at, created_at)
--           er eldre enn 36 måneder.
--        b) objekter i `handover-reports`-bucketen som er eldre enn 36 måneder
--           (dvs. bilder fra rapporter som er expired).
--   2) storage.objects administreres som vanlig Postgres-tabell i Supabase.
--      Sletting av rad fjerner metadata umiddelbart → filen er ikke lenger
--      tilgjengelig via Storage-APIet. Underliggende blob GC-es av Supabase
--      på plattform-nivå; dette er tilstrekkelig for GDPR siden data ikke
--      lenger er aksesserbar for Boly-applikasjonen eller kommunens brukere.
--
-- Referanser:
--   - supabase/migrations/20260426120000_data_retention_cron.sql
--   - supabase/migrations/20260427120000_listing_invoice_basis_region_scoped_rls.sql
-- =============================================================================

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
  handover_deleted      bigint := 0;
  handover_obj_deleted  bigint := 0;
  chat_cutoff           timestamptz := now() - interval '24 months';
  notif_cutoff          timestamptz := now() - interval '12 months';
  audit_cutoff          timestamptz := now() - interval '12 months';
  invoice_cutoff        timestamptz := now() - interval '24 months';
  invoice_active_window timestamptz := now() - interval '3 months';
  handover_cutoff       timestamptz := now() - interval '36 months';
begin
  -- chat_messages : 24 månader.
  begin
    delete from public.chat_messages
    where created_at < chat_cutoff;
    get diagnostics chat_deleted = row_count;
  exception when undefined_table then
    chat_deleted := -1;
  end;

  -- notifications : 12 månader.
  begin
    delete from public.notifications
    where created_at < notif_cutoff;
    get diagnostics notif_deleted = row_count;
  exception when undefined_table then
    notif_deleted := -1;
  end;

  -- audit_logs : 12 månader.
  begin
    delete from public.audit_logs
    where created_at < audit_cutoff;
    get diagnostics audit_deleted = row_count;
  exception when undefined_table then
    audit_deleted := -1;
  end;

  -- listing_invoice_basis : 24 måneder siden siste oppdatering, bare når
  -- listingen ikke lenger er aktivt formidlet.
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

  -- handover_reports : 36 måneder etter godkjenning / signering / opprettelse.
  -- Vi bruker coalesce for å dekke rapporter som aldri ble godkjent eller
  -- signert (disse havner i retensjonsvinduet basert på created_at i stedet).
  begin
    delete from public.handover_reports hr
    where coalesce(hr.approved_at, hr.signed_at, hr.created_at) < handover_cutoff;
    get diagnostics handover_deleted = row_count;
  exception when undefined_table then
    handover_deleted := -1;
  end;

  -- handover-reports bucket : slett objekter eldre enn 36 måneder.
  -- Supabase Storage bruker storage.objects som kildetabell; delete fjerner
  -- metadata umiddelbart. Filen er deretter ikke lenger tilgjengelig via
  -- Storage-APIet (getPublicUrl gir 404). Sletting kjøres i egen EXCEPTION-
  -- blokk slik at manglende rettigheter eller skjema-endringer ikke stopper
  -- hele sweep-en.
  begin
    delete from storage.objects o
    where o.bucket_id = 'handover-reports'
      and o.created_at < handover_cutoff;
    get diagnostics handover_obj_deleted = row_count;
  exception
    when undefined_table then handover_obj_deleted := -1;
    when insufficient_privilege then handover_obj_deleted := -2;
    when others then handover_obj_deleted := -3;
  end;

  -- Loggfør kjøringen for revisjonsspor.
  begin
    insert into public.audit_logs (user_id, event_type, metadata, created_at)
    values (
      null,
      'RETENTION_SWEEP',
      jsonb_build_object(
        'chat_deleted',         chat_deleted,
        'notif_deleted',        notif_deleted,
        'audit_deleted',        audit_deleted,
        'invoice_deleted',      invoice_deleted,
        'handover_deleted',     handover_deleted,
        'handover_obj_deleted', handover_obj_deleted,
        'chat_cutoff',          chat_cutoff,
        'notif_cutoff',         notif_cutoff,
        'audit_cutoff',         audit_cutoff,
        'invoice_cutoff',       invoice_cutoff,
        'handover_cutoff',      handover_cutoff
      ),
      now()
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'chat_deleted',         chat_deleted,
    'notif_deleted',        notif_deleted,
    'audit_deleted',        audit_deleted,
    'invoice_deleted',      invoice_deleted,
    'handover_deleted',     handover_deleted,
    'handover_obj_deleted', handover_obj_deleted,
    'ran_at',               now()
  );
end;
$$;

comment on function public.boly_retention_sweep() is
  'GDPR art. 5 (1) e retensjon-sweep. Sletter chat_messages > 24mo, notifications > 12mo, audit_logs > 12mo, listing_invoice_basis > 24mo (når listing ikke lenger aktivt formidlet), handover_reports > 36mo, og tilhørende storage.objects i handover-reports bucket > 36mo.';

revoke all on function public.boly_retention_sweep() from public;
grant execute on function public.boly_retention_sweep() to service_role;
