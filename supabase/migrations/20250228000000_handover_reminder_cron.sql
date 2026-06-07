-- Schedule daily reminder for overtakelsesrapport when formidlet starts in 1 day
-- Requires: pg_cron, pg_net, and vault secrets 'project_url' and 'anon_key'
-- Setup vault first (run in SQL Editor if not done):
--   select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
--   select vault.create_secret('YOUR_ANON_OR_SERVICE_KEY', 'anon_key');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Remove if exists (for idempotent migrations)
do $$
declare jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'remind-handover-report-daily';
  if jid is not null then perform cron.unschedule(jid); end if;
end $$;

-- Run daily at 07:00 UTC (08:00 Norway winter, 09:00 Norway summer)
select cron.schedule(
  'remind-handover-report-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/remind-handover-report',
    headers:= jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body:= '{}'::jsonb
  ) as request_id;
  $$
);
