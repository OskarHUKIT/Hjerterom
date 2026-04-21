-- =============================================================================
-- rpc_get_user_data_export() — GDPR art. 15 (innsyn) + art. 20 (portabilitet)
-- =============================================================================
-- Bakgrunn:
--   Brukeren skal kunne laste ned en komplett, maskinlesbar kopi av alle
--   personopplysninger Boly behandler om vedkommende. Dette er en
--   regulatorisk plikt (GDPR art. 15 + 20) og bør være self-service for å
--   (a) oppfylle 1-måneds-fristen i art. 12 (3), (b) redusere manuelt arbeid
--   for kommunen som behandlingsansvarlig, og (c) være et synlig tegn på at
--   Boly tar personvern på alvor.
--
-- Tainted auth-design (NB):
--   Funksjonen tar INGEN parametre og bruker kun auth.uid() internt.
--   Dette er tilsiktet: en tainted analysis sier at ingen kaller kan
--   injisere andres ID, uansett hvordan endpoint-et blir kalt. SECURITY
--   DEFINER for å kunne lese på tvers av RLS, men effekten er likevel
--   "egne data kun".
--
-- Format:
--   Returnerer jsonb med struktur:
--     {
--       "$schema": "...",
--       "exported_at": "<ISO 8601>",
--       "subject": { "user_id": "...", "email": "...", "full_name": "..." },
--       "controller_contact": { "region": "...", "dpo_email": "..." },
--       "retention_notice": { ... },
--       "data": {
--         "profile": {...},
--         "auth": {...},
--         "listings": [...],
--         "listing_invoice_basis": [...],
--         "listing_availability": [...],
--         "user_agreements": [...],
--         "user_terms_acceptances": [...],
--         "chat_messages": [...],
--         "notifications": [...],
--         "handover_reports": [...],
--         "audit_logs": [...],
--         "push_subscriptions": [...],
--         "landlord_resign_requests": [...]
--       },
--       "storage_objects": { ... }  -- paths, ikke blob
--     }
--
--   Se docs/legal/PORTABILITY_SCHEMA.md for detaljer og feltbeskrivelser.
--
-- Referanser:
--   - GDPR art. 15, 20, 12 (3)
--   - W3C Best Practices for Publishing Linked Data
--   - docs/legal/PRIVACY_NOTICE.md §6
-- =============================================================================

create or replace function public.rpc_get_user_data_export()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
  v_auth_user record;
  v_dpo record;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Hent auth.users-metadata (e-post, telefon, sist innlogget)
  select
    u.id,
    u.email,
    u.phone,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    u.phone_confirmed_at,
    u.raw_user_meta_data
  into v_auth_user
  from auth.users u
  where u.id = v_uid;

  -- Hent DPO-kontakt for brukerens kommune
  select region, dpo_name, dpo_email, dpo_phone
  into v_dpo
  from public.get_dpo_contact_for_user(v_uid);

  v_result := jsonb_build_object(
    '$schema', 'https://bolynorge.no/schemas/user-data-export/v1',
    'exported_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'export_version', '1.0.0',
    'subject', jsonb_build_object(
      'user_id', v_uid,
      'email', v_auth_user.email,
      'phone', v_auth_user.phone
    ),
    'controller_contact', jsonb_build_object(
      'note', 'Kommunen er behandlingsansvarlig for dine personopplysninger i Boly. Kontakt personvernombudet nedenfor for å utøve rettigheter etter GDPR kap. III.',
      'region', v_dpo.region,
      'dpo_name', v_dpo.dpo_name,
      'dpo_email', v_dpo.dpo_email,
      'dpo_phone', v_dpo.dpo_phone,
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
    )
  );

  -- data.profile
  v_result := jsonb_set(v_result, '{data,profile}', coalesce(
    (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'null'::jsonb
  ));

  -- data.auth
  v_result := jsonb_set(v_result, '{data,auth}', jsonb_build_object(
    'id', v_auth_user.id,
    'email', v_auth_user.email,
    'phone', v_auth_user.phone,
    'created_at', v_auth_user.created_at,
    'last_sign_in_at', v_auth_user.last_sign_in_at,
    'email_confirmed_at', v_auth_user.email_confirmed_at,
    'phone_confirmed_at', v_auth_user.phone_confirmed_at,
    'user_metadata', v_auth_user.raw_user_meta_data
  ));

  -- data.listings (owner_id = uid)
  v_result := jsonb_set(v_result, '{data,listings}', coalesce(
    (select jsonb_agg(to_jsonb(l) order by l.created_at)
     from public.listings l where l.owner_id = v_uid),
    '[]'::jsonb
  ));

  -- data.listing_invoice_basis (for egne listings)
  v_result := jsonb_set(v_result, '{data,listing_invoice_basis}', coalesce(
    (select jsonb_agg(to_jsonb(ib) order by ib.created_at)
     from public.listing_invoice_basis ib
     join public.listings l on l.id = ib.listing_id
     where l.owner_id = v_uid),
    '[]'::jsonb
  ));

  -- data.listing_availability (for egne listings)
  begin
    v_result := jsonb_set(v_result, '{data,listing_availability}', coalesce(
      (select jsonb_agg(to_jsonb(la) order by la.start_date)
       from public.listing_availability la
       join public.listings l on l.id = la.listing_id
       where l.owner_id = v_uid),
      '[]'::jsonb
    ));
  exception when undefined_table then
    v_result := jsonb_set(v_result, '{data,listing_availability}', '[]'::jsonb);
  end;

  -- data.listing_mediation_reservations (for egne listings)
  begin
    v_result := jsonb_set(v_result, '{data,listing_mediation_reservations}', coalesce(
      (select jsonb_agg(to_jsonb(lmr))
       from public.listing_mediation_reservations lmr
       join public.listings l on l.id = lmr.listing_id
       where l.owner_id = v_uid),
      '[]'::jsonb
    ));
  exception when undefined_table then
    v_result := jsonb_set(v_result, '{data,listing_mediation_reservations}', '[]'::jsonb);
  end;

  -- data.user_agreements (signert vilkårsavtale)
  v_result := jsonb_set(v_result, '{data,user_agreements}', coalesce(
    (select jsonb_agg(to_jsonb(ua) order by ua.signed_at)
     from public.user_agreements ua where ua.user_id = v_uid),
    '[]'::jsonb
  ));

  -- data.user_terms_acceptances (versjonerte vilkår)
  v_result := jsonb_set(v_result, '{data,user_terms_acceptances}', coalesce(
    (select jsonb_agg(to_jsonb(uta) order by uta.signed_at)
     from public.user_terms_acceptances uta where uta.user_id = v_uid),
    '[]'::jsonb
  ));

  -- data.chat_messages (sender ELLER mottaker — begge retninger er brukerens data)
  begin
    v_result := jsonb_set(v_result, '{data,chat_messages}', coalesce(
      (select jsonb_agg(to_jsonb(cm) order by cm.created_at)
       from public.chat_messages cm
       where cm.sender_id = v_uid or cm.receiver_id = v_uid),
      '[]'::jsonb
    ));
  exception when undefined_table then
    v_result := jsonb_set(v_result, '{data,chat_messages}', '[]'::jsonb);
  end;

  -- data.notifications (varsler rettet mot brukeren + varsler om brukeren)
  v_result := jsonb_set(v_result, '{data,notifications}', coalesce(
    (select jsonb_agg(to_jsonb(n) order by n.created_at)
     from public.notifications n
     where n.owner_id = v_uid or n.related_user_id = v_uid),
    '[]'::jsonb
  ));

  -- data.handover_reports (for egne listings)
  begin
    v_result := jsonb_set(v_result, '{data,handover_reports}', coalesce(
      (select jsonb_agg(to_jsonb(hr) order by hr.created_at)
       from public.handover_reports hr
       join public.listings l on l.id = hr.listing_id
       where l.owner_id = v_uid),
      '[]'::jsonb
    ));
  exception when undefined_table then
    v_result := jsonb_set(v_result, '{data,handover_reports}', '[]'::jsonb);
  end;

  -- data.audit_logs (kun egne handlinger — ikke det kommunen har gjort mot brukeren,
  -- da det gir innsyn i kommunens interne saksbehandlerspor)
  v_result := jsonb_set(v_result, '{data,audit_logs}', coalesce(
    (select jsonb_agg(
       jsonb_build_object(
         'created_at', al.created_at,
         'action_type', al.action_type,
         'listing_id', al.listing_id,
         'listing_address', al.listing_address,
         -- Fjern performed_by_user_id fra details (kommune-ansatt-ID som ikke er brukers data)
         'details', al.details - 'performed_by_user_id'
       ) order by al.created_at
     )
     from public.audit_logs al
     where al.user_id = v_uid),
    '[]'::jsonb
  ));

  -- data.push_subscriptions
  v_result := jsonb_set(v_result, '{data,push_subscriptions}', coalesce(
    (select jsonb_agg(jsonb_build_object(
       'id', ps.id,
       'endpoint', ps.endpoint,
       'created_at', ps.created_at
     ) order by ps.created_at)
     from public.push_subscriptions ps where ps.owner_id = v_uid),
    '[]'::jsonb
  ));

  -- data.landlord_resign_requests
  begin
    v_result := jsonb_set(v_result, '{data,landlord_resign_requests}', coalesce(
      (select jsonb_agg(to_jsonb(lrr) order by lrr.created_at)
       from public.landlord_resign_requests lrr where lrr.user_id = v_uid),
      '[]'::jsonb
    ));
  exception when undefined_table then
    v_result := jsonb_set(v_result, '{data,landlord_resign_requests}', '[]'::jsonb);
  end;

  -- storage_objects: liste opp stier (ikke innhold) til bruker-relaterte filer
  -- slik at brukeren vet hvilke bucket-objekter som er knyttet til dem
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
    -- Storage-scan kan feile pga. rettigheter; fortsett uten
    v_result := jsonb_set(v_result, '{storage_objects}', jsonb_build_object(
      'note', 'Storage-scan ikke tilgjengelig. Kontakt info@bolynorge.no for manuell bucket-eksport.',
      'error', sqlerrm
    ));
  end;

  -- Logg eksporten (uten selve dataen — kun at den ble kjørt)
  begin
    insert into public.audit_logs (user_id, action_type, details)
    values (v_uid, 'GDPR_DATA_EXPORT', jsonb_build_object(
      'exported_at', now(),
      'export_version', '1.0.0'
    ));
  exception when others then
    null; -- logg-feil skal ikke blokkere eksport
  end;

  return v_result;
end;
$$;

comment on function public.rpc_get_user_data_export() is
  'GDPR art. 15 + 20. Returnerer komplett JSON-dump av brukerens egne personopplysninger. Tainted auth: ingen parametre, bruker auth.uid() internt. SECURITY DEFINER for å lese på tvers av RLS. Logger kjøring i audit_logs som GDPR_DATA_EXPORT.';

revoke all on function public.rpc_get_user_data_export() from public;
grant execute on function public.rpc_get_user_data_export() to authenticated;
