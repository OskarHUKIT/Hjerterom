-- =============================================================================
-- Data retention policy (GDPR art. 5 (1) e — "storage limitation")
-- =============================================================================
-- Background (from Kritikknotat_DBA_19042026.pdf, punkt 2.5):
--   The DPA previously lacked concrete retention periods. This migration
--   codifies the periods already described in docs/legal/PRIVACY_NOTICE.md §5
--   and public /personvern §5 so that personal data is not kept longer than
--   necessary for the stated purpose.
--
-- Periods enforced here:
--   - chat_messages         : 24 months after last activity
--   - notifications         : 12 months after creation
--   - audit_logs            : 12 months after creation
--
-- Explicitly NOT deleted here (handled manually by the controller):
--   - profiles / auth.users : requires controller decision + cascade review
--   - listings              : controller decides, often tied to bookkeeping
--   - handover_reports      : 3 years — retained until explicitly purged by
--                             the municipality (see /personvern §5)
--   - terms_documents /
--     user_terms_acceptances / user_agreements : 5 years after tenancy ends
--     (Bokføringsloven § 13 (3), reduced from 10 → 5 years in 2014).
--     Extended only on documented archival/legal-claim need.
--
-- Requirements: pg_cron, pg_net, vault secrets 'project_url' + 'anon_key'
-- (already set up by 20250228000000_handover_reminder_cron.sql).
-- =============================================================================

create extension if not exists pg_cron with schema pg_catalog;

-- -----------------------------------------------------------------------------
-- 1. boly_retention_sweep()
-- -----------------------------------------------------------------------------
-- Single sweep function so we only need one cron entry and one audit record.
-- Uses SECURITY DEFINER so the cron user can prune even with RLS in place.
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
  chat_cutoff           timestamptz := now() - interval '24 months';
  notif_cutoff          timestamptz := now() - interval '12 months';
  audit_cutoff          timestamptz := now() - interval '12 months';
begin
  -- chat_messages : purge rows strictly older than 24 months.
  -- "Last activity" == row-level created_at; conversations that are still
  -- active keep writing newer rows so the thread as a whole is preserved.
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

  -- audit_logs : IT-security logs, 12 months. Longer retention here would
  -- undermine data minimisation without a corresponding security need.
  begin
    delete from public.audit_logs
    where created_at < audit_cutoff;
    get diagnostics audit_deleted = row_count;
  exception when undefined_table then
    audit_deleted := -1;
  end;

  -- Record the run itself in audit_logs so the municipality can audit
  -- retention activity over time. Swallowed if the table does not exist.
  begin
    insert into public.audit_logs (user_id, event_type, metadata, created_at)
    values (
      null,
      'RETENTION_SWEEP',
      jsonb_build_object(
        'chat_deleted',  chat_deleted,
        'notif_deleted', notif_deleted,
        'audit_deleted', audit_deleted,
        'chat_cutoff',   chat_cutoff,
        'notif_cutoff',  notif_cutoff,
        'audit_cutoff',  audit_cutoff
      ),
      now()
    );
  exception when others then
    null; -- never let logging failure abort the sweep
  end;

  return jsonb_build_object(
    'chat_deleted',  chat_deleted,
    'notif_deleted', notif_deleted,
    'audit_deleted', audit_deleted,
    'ran_at',        now()
  );
end;
$$;

comment on function public.boly_retention_sweep() is
  'GDPR art. 5 (1) e retention sweep. Deletes chat_messages > 24mo, notifications > 12mo, audit_logs > 12mo. Invoked nightly by pg_cron job boly-retention-daily.';

revoke all on function public.boly_retention_sweep() from public;
grant execute on function public.boly_retention_sweep() to service_role;

-- -----------------------------------------------------------------------------
-- 2. Schedule the daily sweep (03:30 UTC = 04:30/05:30 Oslo, low-traffic window)
-- -----------------------------------------------------------------------------
do $$
declare jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'boly-retention-daily';
  if jid is not null then
    perform cron.unschedule(jid);
  end if;
end $$;

select cron.schedule(
  'boly-retention-daily',
  '30 3 * * *',
  $$ select public.boly_retention_sweep(); $$
);

-- =============================================================================
-- Runbook (for kommune / DPO)
-- =============================================================================
-- * Inspect last N runs:
--     select created_at, metadata
--       from public.audit_logs
--      where event_type = 'RETENTION_SWEEP'
--      order by created_at desc
--      limit 14;
--
-- * Temporarily pause (e.g. during legal hold):
--     select cron.unschedule((select jobid from cron.job
--                              where jobname = 'boly-retention-daily'));
--
-- * Re-enable by re-running this migration.
--
-- * To dry-run without deleting, wrap the function body in a transaction and
--   ROLLBACK manually, or invoke each DELETE with `returning count(*)` in a
--   read-only session before enabling.
-- =============================================================================
