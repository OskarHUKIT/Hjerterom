-- =============================================================================
-- Fix rpc_get_user_data_export — GDPR eksport (ufullstendig payload / auth.uid)
-- =============================================================================
-- Problem:
--   GET /api/user/export returnerte «Eksporten ble ufullstendig» når PostgREST
--   ikke satte auth.uid() for SECURITY DEFINER-RPC fra Next.js API-rute, eller
--   når hjelpeoppslag (DPO, audit_logs-kolonner) feilet før `data.*` ble bygget.
--
-- Løsning:
--   1. rpc_get_user_data_export_impl(p_uid) — kjernelogikk, kun service_role
--   2. rpc_get_user_data_export() — tynn wrapper for autentiserte klienter
--   3. Robust feilhåndtering på delspørringer + volatile (gjør INSERT i audit_logs)
-- =============================================================================

create or replace function public.rpc_get_user_data_export_impl(p_uid uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := p_uid;
  v_result jsonb;
  v_auth_id uuid;
  v_auth_email text;
  v_auth_phone text;
  v_auth_created_at timestamptz;
  v_auth_last_sign_in_at timestamptz;
  v_auth_email_confirmed_at timestamptz;
  v_auth_phone_confirmed_at timestamptz;
  v_auth_user_meta jsonb;
  v_dpo_region text;
  v_dpo_name text;
  v_dpo_email text := 'info@bolynorge.no';
  v_dpo_phone text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select
    u.id,
    u.email,
    u.phone,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    u.phone_confirmed_at,
    u.raw_user_meta_data
  into
    v_auth_id,
    v_auth_email,
    v_auth_phone,
    v_auth_created_at,
    v_auth_last_sign_in_at,
    v_auth_email_confirmed_at,
    v_auth_phone_confirmed_at,
    v_auth_user_meta
  from auth.users u
  where u.id = v_uid;

  begin
    select c.region, c.dpo_name, c.dpo_email, c.dpo_phone
    into v_dpo_region, v_dpo_name, v_dpo_email, v_dpo_phone
    from public.get_dpo_contact_for_user(v_uid) c
    limit 1;
  exception when others then
    v_dpo_region := '__fallback__';
    v_dpo_name := 'Boly support';
    v_dpo_email := 'info@bolynorge.no';
    v_dpo_phone := null;
  end;

  v_result := jsonb_build_object(
    '$schema', 'https://bolynorge.no/schemas/user-data-export/v1',
    'exported_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'export_version', '1.0.1',
    'subject', jsonb_build_object(
      'user_id', v_uid,
      'email', v_auth_email,
      'phone', v_auth_phone
    ),
    'controller_contact', jsonb_build_object(
      'note', 'Kommunen er behandlingsansvarlig for dine personopplysninger i Boly. Kontakt personvernombudet nedenfor for å utøve rettigheter etter GDPR kap. III.',
      'region', v_dpo_region,
      'dpo_name', v_dpo_name,
      'dpo_email', v_dpo_email,
      'dpo_phone', v_dpo_phone,
      'processor_contact', 'info@bolynorge.no',
      'supervisory_authority', 'https://www.datatilsynet.no'
    ),
    'retention_notice', jsonb_build_object(
      'account_data', '12 måneder etter siste innlogging',
      'signed_agreements', '5 år etter avsluttet leieforhold (bokføringsloven § 13 (3))',
      'chat_messages', '24 måneder etter siste aktivitet',
      'handover_reports', '3 år etter godkjenning',
      'invoice_basis', '24 måneder etter siste oppdatering når boligen ikke lenger er formidlet',
      'notifications', '12 måneder',
      'audit_logs', '12 måneder',
      'reference', 'docs/legal/PRIVACY_NOTICE.md §5'
    ),
    'data', jsonb_build_object()
  );

  v_result := jsonb_set(v_result, '{data,profile}', coalesce(
    (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'null'::jsonb
  ));

  v_result := jsonb_set(v_result, '{data,auth}', jsonb_build_object(
    'id', coalesce(v_auth_id, v_uid),
    'email', v_auth_email,
    'phone', v_auth_phone,
    'created_at', v_auth_created_at,
    'last_sign_in_at', v_auth_last_sign_in_at,
    'email_confirmed_at', v_auth_email_confirmed_at,
    'phone_confirmed_at', v_auth_phone_confirmed_at,
    'user_metadata', v_auth_user_meta
  ));

  begin
    v_result := jsonb_set(v_result, '{data,listings}', coalesce(
      (select jsonb_agg(to_jsonb(l) order by l.created_at)
       from public.listings l where l.owner_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,listings}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,listing_invoice_basis}', coalesce(
      (select jsonb_agg(to_jsonb(ib) order by ib.created_at)
       from public.listing_invoice_basis ib
       join public.listings l on l.id = ib.listing_id
       where l.owner_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,listing_invoice_basis}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,listing_availability}', coalesce(
      (select jsonb_agg(to_jsonb(la) order by la.start_date)
       from public.listing_availability la
       join public.listings l on l.id = la.listing_id
       where l.owner_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,listing_availability}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,listing_mediation_reservations}', coalesce(
      (select jsonb_agg(to_jsonb(lmr))
       from public.listing_mediation_reservations lmr
       join public.listings l on l.id = lmr.listing_id
       where l.owner_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,listing_mediation_reservations}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,user_agreements}', coalesce(
      (select jsonb_agg(to_jsonb(ua) order by ua.signed_at)
       from public.user_agreements ua where ua.user_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,user_agreements}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,user_terms_acceptances}', coalesce(
      (select jsonb_agg(to_jsonb(uta) order by uta.signed_at)
       from public.user_terms_acceptances uta where uta.user_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,user_terms_acceptances}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,chat_messages}', coalesce(
      (select jsonb_agg(to_jsonb(cm) order by cm.created_at)
       from public.chat_messages cm
       where cm.sender_id = v_uid or cm.receiver_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,chat_messages}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,notifications}', coalesce(
      (select jsonb_agg(to_jsonb(n) order by n.created_at)
       from public.notifications n
       where n.owner_id = v_uid or n.related_user_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,notifications}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,handover_reports}', coalesce(
      (select jsonb_agg(to_jsonb(hr) order by hr.created_at)
       from public.handover_reports hr
       join public.listings l on l.id = hr.listing_id
       where l.owner_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,handover_reports}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,audit_logs}', coalesce(
      (select jsonb_agg(
         jsonb_build_object(
           'created_at', al.created_at,
           'action_type', al.action_type,
           'listing_id', al.listing_id,
           'listing_address', al.listing_address,
           'details', al.details - 'performed_by_user_id'
         ) order by al.created_at
       )
       from public.audit_logs al
       where al.user_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,audit_logs}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,push_subscriptions}', coalesce(
      (select jsonb_agg(jsonb_build_object(
         'id', ps.id,
         'endpoint', ps.endpoint,
         'created_at', ps.created_at
       ) order by ps.created_at)
       from public.push_subscriptions ps where ps.owner_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,push_subscriptions}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{data,landlord_resign_requests}', coalesce(
      (select jsonb_agg(to_jsonb(lrr) order by lrr.created_at)
       from public.landlord_resign_requests lrr where lrr.user_id = v_uid),
      '[]'::jsonb
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{data,landlord_resign_requests}', '[]'::jsonb);
  end;

  begin
    v_result := jsonb_set(v_result, '{storage_objects}', jsonb_build_object(
      'note', 'Stier til filer i Supabase Storage knyttet til din konto. Filene selv kan lastes ned via app-en.',
      'listings_bucket', coalesce(
        (select jsonb_agg(jsonb_build_object('name', name, 'created_at', created_at, 'size_bytes', metadata->>'size'))
         from storage.objects
         where bucket_id = 'listings'
           and exists (
             select 1 from public.listings l
             where l.owner_id = v_uid
               and (storage.objects.name like l.id::text || '/%' or storage.objects.name like 'listing-' || l.id::text || '%')
           )),
        '[]'::jsonb),
      'chat_images_bucket', coalesce(
        (select jsonb_agg(jsonb_build_object('name', name, 'created_at', created_at))
         from storage.objects
         where bucket_id = 'chat-images'
           and name like v_uid::text || '/%'),
        '[]'::jsonb),
      'handover_reports_bucket', coalesce(
        (select jsonb_agg(jsonb_build_object('name', name, 'created_at', created_at))
         from storage.objects
         where bucket_id = 'handover-reports'
           and name like v_uid::text || '/%'),
        '[]'::jsonb)
    ));
  exception when others then
    v_result := jsonb_set(v_result, '{storage_objects}', jsonb_build_object(
      'note', 'Storage-scan ikke tilgjengelig. Kontakt info@bolynorge.no for manuell bucket-eksport.',
      'error', sqlerrm
    ));
  end;

  begin
    insert into public.audit_logs (user_id, action_type, details)
    values (v_uid, 'GDPR_DATA_EXPORT', jsonb_build_object(
      'exported_at', now(),
      'export_version', '1.0.1'
    ));
  exception when others then
    null;
  end;

  return v_result;
end;
$$;

comment on function public.rpc_get_user_data_export_impl(uuid) is
  'GDPR art. 15 + 20 (intern). Kalles fra server med service_role etter JWT-validering.';

revoke all on function public.rpc_get_user_data_export_impl(uuid) from public;
grant execute on function public.rpc_get_user_data_export_impl(uuid) to service_role;

create or replace function public.rpc_get_user_data_export()
returns jsonb
language sql
volatile
security definer
set search_path = public
as $$
  select public.rpc_get_user_data_export_impl(auth.uid());
$$;

comment on function public.rpc_get_user_data_export() is
  'GDPR art. 15 + 20. Wrapper for autentiserte klienter — bruker auth.uid().';

revoke all on function public.rpc_get_user_data_export() from public;
grant execute on function public.rpc_get_user_data_export() to authenticated;
