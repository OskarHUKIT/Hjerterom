-- Auto-process guest_email_outbox via pg_net → process-guest-email-outbox
-- Krever vault: project_url + anon_key (samme som push/cron)

create extension if not exists pg_net with schema extensions;

create or replace function public.trigger_process_guest_email_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_url text;
  v_auth_key text;
  v_cron_secret text;
begin
  select decrypted_secret into v_project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret into v_auth_key
  from vault.decrypted_secrets
  where name = 'anon_key'
  limit 1;

  select decrypted_secret into v_cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if v_project_url is null or v_auth_key is null then
    return NEW;
  end if;

  perform net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/process-guest-email-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_cron_secret, v_auth_key)
    ),
    body := '{}'::jsonb
  );

  return NEW;
exception when others then
  return NEW;
end;
$$;

drop trigger if exists on_guest_email_outbox_process on public.guest_email_outbox;
create trigger on_guest_email_outbox_process
  after insert on public.guest_email_outbox
  for each row
  execute function public.trigger_process_guest_email_outbox();
