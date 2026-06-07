-- =============================================================================
-- Push-varsler: pg_net-trigger på notifications INSERT → send-push Edge Function
-- =============================================================================
-- Bakgrunn:
--   Push avhenger tidligere av manuell Database Webhook i Supabase Dashboard.
--   Manglende/feil webhook = ingen push selv om brukeren har abonnert.
--
--   Denne migrasjonen kaller send-push automatisk ved hvert INSERT i notifications
--   via pg_net + vault-secrets (samme mønster som handover-reminder cron).
--
--   NB: Deaktiver manuell webhook «on-notification-insert» hvis den finnes,
--   ellers kan brukere få doble push-varsler.
--
-- Krever vault-secrets (kjør én gang i SQL Editor hvis ikke satt):
--   select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'project_url');
--   select vault.create_secret('<service_role eller anon key>', 'anon_key');
-- =============================================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_send_push_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_url text;
  v_auth_key text;
  v_payload jsonb;
begin
  select decrypted_secret into v_project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret into v_auth_key
  from vault.decrypted_secrets
  where name = 'anon_key'
  limit 1;

  if v_project_url is null or v_auth_key is null then
    return NEW;
  end if;

  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', jsonb_build_object(
      'id', NEW.id,
      'owner_id', NEW.owner_id,
      'type', NEW.type,
      'title', NEW.title,
      'message', coalesce(NEW.message, ''),
      'status', NEW.status,
      'listing_id', NEW.listing_id,
      'related_user_id', NEW.related_user_id
    )
  );

  perform net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_auth_key
    ),
    body := v_payload
  );

  return NEW;
exception when others then
  -- Push-feil skal aldri blokkere varsel-opprettelse
  return NEW;
end;
$$;

comment on function public.notify_send_push_on_insert() is
  'Kaller send-push Edge Function via pg_net når et varsel opprettes. Krever vault project_url + anon_key.';

drop trigger if exists on_notification_insert_send_push on public.notifications;
create trigger on_notification_insert_send_push
  after insert on public.notifications
  for each row
  execute function public.notify_send_push_on_insert();
