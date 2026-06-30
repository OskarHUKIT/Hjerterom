-- =============================================================================
-- Hjerterum demo: Ofoten-regionen (Nav Narvik-pilot, vår 2026)
-- =============================================================================
-- Kjør i Supabase Dashboard → SQL Editor (postgres/service role).
--
-- Passord for alle nye kontoer:  Ofoten2026!
-- E-postdomene: @demo.ofoten.no
--
-- Idempotent: sletter tidligere demo merket demo_seed = narvik_ofoten_2026
-- =============================================================================

create extension if not exists pgcrypto;

create or replace function public._demo_seed_auth_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text default 'homeowner'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
  v_existing uuid;
begin
  select id into v_existing from auth.users where lower(email) = lower(trim(p_email));
  if v_existing is not null then
    update public.profiles
    set role = p_role, full_name = p_full_name, email = lower(trim(p_email)),
        email_notifications_enabled = true
    where id = v_existing;
    return v_existing;
  end if;

  v_id := gen_random_uuid();
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    v_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', lower(trim(p_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'role', p_role, 'demo_seed', 'narvik_ofoten_2026'),
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', lower(trim(p_email)), 'email_verified', true),
    'email', now(), now(), now()
  );
  update public.profiles
  set role = p_role, full_name = p_full_name, email = lower(trim(p_email)),
      email_notifications_enabled = true
  where id = v_id;
  return v_id;
end;
$$;

-- Rydd demo
do $$
declare u record;
begin
  delete from public.guest_email_outbox where recipient_email like '%@demo.ofoten.no';
  delete from public.los_handoffs where case_reference like 'LOS-DEMO%';
  delete from public.event_inquiries where event_id in (
    select id from public.central_events
    where slug in ('arctic-ski-narvik-2026', 'veidekke-ofotbanen-2026')
  );
  delete from public.central_events
  where slug in ('arctic-ski-narvik-2026', 'veidekke-ofotbanen-2026');
  for u in
    select id from auth.users
    where coalesce(raw_user_meta_data->>'demo_seed', '') = 'narvik_ofoten_2026'
       or email like '%@demo.ofoten.no'
  loop
    delete from auth.users where id = u.id;
  end loop;
end $$;

update public.platform_settings set
  product_mode = 'hjerterum',
  finn_portal_enabled = true,
  los_portal_enabled = true,
  central_events_enabled = true,
  tourism_lane_enabled = true,
  stripe_bookings_enabled = true,
  updated_at = now()
where id = 1;

select public.ensure_kommune_for_region_key('narvik');
select public.ensure_kommune_for_region_key('gratangen');
select public.ensure_kommune_for_region_key('evenes');
select public.ensure_kommune_for_region_key('ballangen');

update public.kommuner set
  status = 'active', digital_los_enabled = true, tourism_enabled = true,
  launched_at = coalesce(launched_at, now() - interval '8 months')
where slug in ('narvik', 'gratangen', 'evenes', 'ballangen');

create temp table _p (key text primary key, user_id uuid) on commit drop;
create temp table _l (key text primary key, listing_id uuid) on commit drop;
create temp table _e (key text primary key, event_id uuid) on commit drop;

do $$
declare
  v_pw text := 'Ofoten2026!';
  v_ops uuid; v_tina uuid; v_lars uuid; v_sigrid uuid; v_kari uuid;
  v_ingrid uuid; v_tor uuid; v_marit uuid; v_berit uuid;
  v_aase uuid; v_petter uuid; v_kjell uuid; v_haakon uuid; v_emma uuid;
  v_lid uuid; v_eid uuid;
  v_k_narvik uuid; v_k_evenes uuid; v_k_gratangen uuid;
  v_los_closed uuid;
begin
  select id into v_k_narvik from public.kommuner where slug = 'narvik';
  select id into v_k_evenes from public.kommuner where slug = 'evenes';
  select id into v_k_gratangen from public.kommuner where slug = 'gratangen';

  select id into v_ops from auth.users where lower(email) = 'ops@test.hjerterum.no';
  if v_ops is null then
    v_ops := public._demo_seed_auth_user('ops@demo.ofoten.no', v_pw, 'Ola Drift', 'homeowner');
  end if;
  insert into public.platform_operators (user_id, is_active, notes)
  values (v_ops, true, 'Ofoten demo')
  on conflict (user_id) do update set is_active = true;

  v_tina := public._demo_seed_auth_user('tina.olsen@demo.ofoten.no', v_pw, 'Tina Olsen', 'kommune_admin');
  v_lars := public._demo_seed_auth_user('lars.moen@demo.ofoten.no', v_pw, 'Lars-Henrik Moen', 'kommune_ansatt');
  v_sigrid := public._demo_seed_auth_user('sigrid.bakken@demo.ofoten.no', v_pw, 'Sigrid Bakken', 'kommune_ansatt');
  v_kari := public._demo_seed_auth_user('kari.event@demo.ofoten.no', v_pw, 'Kari Nordgård', 'event_ansatt');
  v_ingrid := public._demo_seed_auth_user('ingrid.fotland@demo.ofoten.no', v_pw, 'Ingrid Fotland', 'homeowner');
  v_tor := public._demo_seed_auth_user('tor.johansen@demo.ofoten.no', v_pw, 'Tor-Arne Johansen', 'homeowner');
  v_marit := public._demo_seed_auth_user('marit.hansen@demo.ofoten.no', v_pw, 'Marit Hansen', 'homeowner');
  v_berit := public._demo_seed_auth_user('berit.sund@demo.ofoten.no', v_pw, 'Berit Sund', 'homeowner');
  v_aase := public._demo_seed_auth_user('aase.lindgren@demo.ofoten.no', v_pw, 'Åse Lindgren', 'homeowner');
  v_petter := public._demo_seed_auth_user('petter.vassvik@demo.ofoten.no', v_pw, 'Petter Vassvik', 'homeowner');
  v_kjell := public._demo_seed_auth_user('kjell.moen@demo.ofoten.no', v_pw, 'Kjell-Arne Moen', 'homeowner');
  v_haakon := public._demo_seed_auth_user('haakon.ruud@demo.ofoten.no', v_pw, 'Håkon Ruud', 'homeowner');
  v_emma := public._demo_seed_auth_user('emma.becker@demo.ofoten.no', v_pw, 'Emma Becker', 'homeowner');

  insert into _p values
    ('ops', v_ops), ('tina', v_tina), ('lars', v_lars), ('sigrid', v_sigrid), ('kari', v_kari),
    ('ingrid', v_ingrid), ('tor', v_tor), ('marit', v_marit), ('berit', v_berit),
    ('aase', v_aase), ('petter', v_petter), ('kjell', v_kjell), ('haakon', v_haakon), ('emma', v_emma);

  insert into public.guest_profiles (id, email, display_name, phone)
  values (v_emma, 'emma.becker@demo.ofoten.no', 'Emma Becker', '+49 170 4412200')
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.user_kommune_grants (user_id, kommune_id, grant_role, can_edit)
  select p.user_id, k.id, g.role, true
  from (values
    ('tina', 'admin'), ('lars', 'staff'), ('sigrid', 'staff')
  ) g(pkey, role)
  join _p p on p.key = g.pkey
  cross join public.kommuner k
  where k.slug in ('narvik', 'gratangen', 'evenes')
  on conflict do nothing;

  insert into public.user_agreements (user_id, agreement_version)
  select user_id, '2026-ofoten-demo' from _p
  where key in ('ingrid','tor','marit','berit','aase','petter','kjell','haakon')
  on conflict do nothing;

  -- Boliger
  insert into public.listings (
    owner_id, address, city, price_per_night, description, beds, type,
    tourism_enabled, tourism_nightly_price_cents, tourism_instant_book,
    cancellation_policy, map_lat, map_lng, tourism_check_in_guide, kommune_id
  ) values (
    v_ingrid, 'Skjomveien 47', 'Narvik', 1290,
    'Hytte med utsikt mot Skjomen. Perfekt for ski- og friluftsgjester — 15 min til Narvik sentrum.',
    4, 'Hytte', true, 129000, false, 'moderate', 68.3950, 17.5180,
    'Nøkkelboks ved inngangsdør. Kode sendes dagen før ankomst.', v_k_narvik
  ) returning id into v_lid;
  insert into _l values ('ingrid_hytte', v_lid);

  insert into public.listings (
    owner_id, address, city, price_per_night, description, beds, type,
    tourism_enabled, tourism_nightly_price_cents, tourism_instant_book,
    cancellation_policy, map_lat, map_lng, tourism_check_in_guide, kommune_id
  ) values (
    v_tor, 'Kongens gate 42', 'Narvik', 890,
    'Lys 2-roms midt i Narvik. Gangavstand til kolonialen og Ofotbanen.',
    2, 'Leilighet', true, 89000, true, 'flexible', 68.4389, 17.4273,
    'Ring på Johansen ved inngang B.', v_k_narvik
  ) returning id into v_lid;
  insert into _l values ('tor_sentrum', v_lid);

  insert into public.listings (
    owner_id, address, city, price_per_night, description, beds, type,
    tourism_enabled, tourism_nightly_price_cents, tourism_instant_book,
    cancellation_policy, map_lat, map_lng, kommune_id
  ) values (
    v_marit, 'Tysfjordveien 88', 'Bjerkvik', 650,
    'Enebolig med egen inngang — brukes både til sosial formidling og korttidsleie for entreprenører.',
    3, 'Enebolig', true, 75000, false, 'moderate', 68.5480, 17.5610, v_k_narvik
  ) returning id into v_lid;
  insert into _l values ('marit_bjerkvik', v_lid);

  insert into public.listings (
    owner_id, address, city, price_per_night, description, beds, type,
    tourism_enabled, tourism_nightly_price_cents, tourism_instant_book,
    cancellation_policy, map_lat, map_lng, tourism_check_in_guide, kommune_id
  ) values (
    v_berit, 'Flyplassvegen 12', 'Evenes', 990,
    '5 min fra Harstad/Narvik lufthavn Evenes. Populær blant crew og turister med tidlig fly.',
    2, 'Leilighet', true, 99000, false, 'strict', 68.4913, 16.6781,
    'Selvinnsjekk via kodelås. Parkering bak bygget.', v_k_evenes
  ) returning id into v_lid;
  insert into _l values ('berit_evenes', v_lid);

  insert into public.listings (
    owner_id, address, city, price_per_night, description, beds, type,
    tourism_enabled, map_lat, map_lng, kommune_id
  ) values (
    v_aase, 'Gratangenveien 203', 'Gratangen', 550,
    'Gammel gårdsbolig ved Gratangen fjord. Formidles via Nav til familier som trenger rolig tilhold.',
    4, 'Enebolig', false, 68.6940, 17.5250, v_k_gratangen
  ) returning id into v_lid;
  insert into _l values ('aase_gratangen', v_lid);

  insert into public.listings (
    owner_id, address, city, price_per_night, description, beds, type,
    tourism_enabled, map_lat, map_lng, kommune_id
  ) values (
    v_petter, 'Industriveien 9', 'Ballangen', 480,
    'Rekkehus i rolig nabolag. Buss til Narvik tar ca. 45 min.',
    3, 'Rekkehus', false, 68.3440, 16.8320, v_k_narvik
  ) returning id into v_lid;
  insert into _l values ('petter_ballangen', v_lid);

  insert into public.listings (
    owner_id, address, city, price_per_night, description, beds, type,
    tourism_enabled, tourism_nightly_price_cents, map_lat, map_lng, kommune_id
  ) values (
    v_kjell, 'Ankenesveien 15', 'Ankenes', 750,
    'Balkong mot Ofotfjorden. 10 min med bil til Narvik sentrum.',
    2, 'Leilighet', true, 75000, 68.4120, 17.3840, v_k_narvik
  ) returning id into v_lid;
  insert into _l values ('kjell_ankenes', v_lid);

  insert into public.listings (
    owner_id, address, city, price_per_night, description, beds, type,
    tourism_enabled, tourism_nightly_price_cents, map_lat, map_lng, kommune_id
  ) values (
    v_haakon, 'Strandgata 7', 'Narvik', 1100,
    'Toppleilighet med panoramautsikt over Ofotfjorden og Ofotbanen.',
    3, 'Leilighet', true, 110000, 68.4410, 17.4310, v_k_narvik
  ) returning id into v_lid;
  insert into _l values ('haakon_fjord', v_lid);

  -- Tilgjengelighet
  insert into public.listing_availability (listing_id, start_date, end_date, status, lane)
  select listing_id, '2026-01-01', '2026-06-30', 'Formidla', 'sosial'
  from _l where key in ('aase_gratangen', 'petter_ballangen');

  insert into public.listing_availability (listing_id, start_date, end_date, status, lane)
  select listing_id, '2026-01-01', '2026-02-28', 'Formidla', 'sosial'
  from _l where key = 'marit_bjerkvik';

  insert into public.listing_availability (listing_id, start_date, end_date, status, lane)
  select listing_id, '2026-03-01', '2026-10-31', 'Tilgjengelig', 'turisme'
  from _l
  where key in ('ingrid_hytte','tor_sentrum','berit_evenes','kjell_ankenes','haakon_fjord','marit_bjerkvik');

  -- Arrangement
  insert into public.central_events (
    slug, name, description_public, start_date, end_date,
    routing_mode, arrangement_tag, status, published_at, created_by, geography_scope
  ) values (
    'arctic-ski-narvik-2026',
    'Arctic Ski Festival Ofoten 2026',
    'Internasjonalt langrenns- og fjellskiarrangement i Narvik og omegn. Hundrevis av deltakere og følgere trenger overnatting i hele Ofoten.',
    '2026-03-14', '2026-03-22', 'turisme', 'Skifestival', 'published', now(), v_ops,
    jsonb_build_object(
      'region_keys', array['narvik','evenes','gratangen'],
      'kommune_ids', array[v_k_narvik, v_k_evenes, v_k_gratangen]
    )
  ) returning id into v_eid;
  insert into _e values ('ski_festival', v_eid);

  insert into public.central_events (
    slug, name, description_public, start_date, end_date,
    routing_mode, arrangement_tag, status, published_at, created_by, geography_scope
  ) values (
    'veidekke-ofotbanen-2026',
    'Veidekke — bolig til Ofotbanen-entreprise',
    'Veidekke Entreprenør AS søker midlertidig innkvartering for inntil 25 montører i forbindelse med sporarbeid langs Ofotbanen vår–høst 2026.',
    '2026-04-01', '2026-10-31', 'saksbehandler', 'Entreprise', 'published', now(), v_ops,
    jsonb_build_object(
      'region_keys', array['narvik','ballangen','evenes'],
      'kommune_ids', array[v_k_narvik, v_k_evenes]
    )
  ) returning id into v_eid;
  insert into _e values ('veidekke', v_eid);

  insert into public.central_event_staff (event_id, profile_id, role)
  select e.event_id, v_kari, 'coordinator' from _e e where e.key = 'veidekke'
  on conflict do nothing;

  insert into public.listing_event_availability (listing_id, event_id, status)
  select l.listing_id, e.event_id, 'active'
  from _l l cross join _e e
  where (e.key = 'ski_festival' and l.key in ('ingrid_hytte','tor_sentrum','kjell_ankenes','haakon_fjord','berit_evenes'))
     or (e.key = 'veidekke' and l.key in ('marit_bjerkvik','petter_ballangen','aase_gratangen'));

  -- Event-henvendelser (saksbehandler)
  insert into public.event_inquiries (
    event_id, listing_id, contact_name, contact_email, contact_phone,
    message, date_from, date_to, status, assigned_profile_id
  )
  select e.event_id, null,
    'Thomas Berg', 'thomas.berg@veidekke.no', '+47 915 44 882',
    'Trenger 12 enkeltrom eller små leiligheter i Bjerkvik/Ballangen-området fra uke 15. Rotasjon hver 3. uke.',
    '2026-04-07', '2026-10-24', 'assigned', v_lars
  from _e e where e.key = 'veidekke';

  insert into public.event_inquiries (
    event_id, contact_name, contact_email, message, date_from, date_to, status
  )
  select e.event_id,
    'Røde Kors Ungdom Evenes', 'ungdom.leir@rodekors.no',
    'Vi arrangerer sommerleir for 18 ungdommer og trenger hjelp til å finne ledig boligkapasitet i regionen.',
    '2026-07-01', '2026-07-14', 'new'
  from _e e where e.key = 'veidekke';

  -- Bookinger
  insert into public.bookings (
    listing_id, event_id, guest_user_id, guest_email, guest_name, guest_phone,
    check_in, check_out, status, amount_cents, message
  )
  select l.listing_id, e.event_id, v_emma,
    'emma.becker@demo.ofoten.no', 'Emma Becker', '+49 170 4412200',
    '2026-03-15', '2026-03-20', 'pending', 645000,
    'Hei! Vi er to fra München som skal på ski-festivalen. Håper hytta er ledig.'
  from _l l join _e e on e.key = 'ski_festival'
  where l.key = 'ingrid_hytte';

  insert into public.bookings (
    listing_id, event_id, guest_email, guest_name, check_in, check_out, status, amount_cents
  )
  select l.listing_id, e.event_id,
    'lars.pettersson@demo.ofoten.no', 'Lars Pettersson',
    '2026-03-16', '2026-03-19', 'accepted', 267000
  from _l l join _e e on e.key = 'ski_festival'
  where l.key = 'tor_sentrum';

  insert into public.bookings (
    listing_id, guest_email, guest_name, check_in, check_out, status, amount_cents, payment_intent_id
  )
  select l.listing_id,
    'norsk.fjell@demo.ofoten.no', 'Hilde og Jon Nordahl',
    '2026-02-20', '2026-02-23', 'paid', 297000, 'pi_demo_ofoten_001'
  from _l l where l.key = 'berit_evenes';

  insert into public.bookings (
    listing_id, guest_email, guest_name, check_in, check_out, status, amount_cents
  )
  select l.listing_id,
    'crew.evenes@demo.ofoten.no', 'SAS Crew Evenes',
    '2026-03-28', '2026-03-29', 'completed', 99000
  from _l l where l.key = 'berit_evenes';

  -- Digital Los
  insert into public.los_sessions (consent_level, kommune_id, messages, anonymous_token)
  values (
    'contact', v_k_narvik,
    '[
      {"role":"assistant","content":"Hei! Jeg er Los. Hva kan jeg hjelpe deg med?","at":"2026-03-28T09:12:00Z"},
      {"role":"user","content":"Hei, jeg bor på hybel men huseier vil ha meg ut. Jeg er 19 og jobber deltid på Extra.","at":"2026-03-28T09:13:00Z"},
      {"role":"assistant","content":"Det høres vanskelig ut. Vil du snakke med en saksbehandler i Narvik?","at":"2026-03-28T09:13:30Z"},
      {"role":"user","content":"Ja takk, helst fort. Jeg kan bo hos kompis noen dager.","at":"2026-03-28T09:14:00Z"}
    ]'::jsonb,
    encode(gen_random_bytes(24), 'hex')
  );

  insert into public.los_handoffs (
    session_id, summary_text, kommune_id, case_reference, status,
    contact_name, contact_phone, contact_email, assigned_profile_id
  )
  select s.id,
    'Marcus (19) truer med utkastelse fra hybel i Narvik sentrum. Trenger midlertidig botilbud.',
    v_k_narvik, 'LOS-DEMO-001', 'new',
    'Marcus H.', '+47 412 33 901', 'marcus.h.demo@ofoten.no', null
  from public.los_sessions s
  order by s.created_at desc limit 1;

  insert into public.los_sessions (consent_level, kommune_id, messages, anonymous_token, handed_off_at)
  values (
    'contact', v_k_narvik,
    '[
      {"role":"user","content":"Familien min ble kastet ut i går. Vi bor på hotell nå men pengene tar slutt.","at":"2026-03-27T14:00:00Z"},
      {"role":"assistant","content":"Jeg forstår at dette er alvorlig. Skal jeg koble deg til saksbehandler?","at":"2026-03-27T14:00:30Z"}
    ]'::jsonb,
    encode(gen_random_bytes(24), 'hex'), now() - interval '1 day'
  );

  insert into public.los_handoffs (
    session_id, summary_text, kommune_id, case_reference, status,
    contact_name, contact_phone, assigned_profile_id
  )
  select s.id,
    'Samira (24) med barn 3 og 6 — midlertidig på hotell etter utkastelse. Trenger formidling.',
    v_k_narvik, 'LOS-DEMO-002', 'assigned',
    'Samira K.', '+47 977 22 441', v_lars
  from public.los_sessions s
  where s.handed_off_at is not null
  order by s.created_at desc limit 1;

  insert into public.los_sessions (handed_off_at, consent_level, kommune_id, messages, anonymous_token)
  values (
    now() - interval '12 days', 'contact', v_k_narvik,
    '[{"role":"user","content":"Trengte hjelp med økonomi og bolig."}]'::jsonb,
    encode(gen_random_bytes(24), 'hex')
  )
  returning id into v_los_closed;

  insert into public.los_handoffs (
    session_id, summary_text, kommune_id, case_reference, status,
    contact_name, assigned_profile_id
  ) values (
    v_los_closed,
    'Anders (17) fikk hjelp med økonomistyring og midlertidig botilbud. Sak avsluttet.',
    v_k_narvik, 'LOS-DEMO-003', 'closed', 'Anders L.', v_sigrid
  );

  -- Varsler
  insert into public.notifications (owner_id, type, title, message, status)
  values
    (v_lars, 'LOS_HANDOFF', 'Ny Digital Los-henvendelse',
     'LOS-DEMO-001 — Marcus H. · Narvik' || E'\n\nÅpne innboks: /nav/los-inbox', 'unread'),
    (v_tina, 'NEW_MESSAGE', 'Melding fra Ingrid Fotland',
     'Ingrid Fotland har sendt deg en melding.', 'unread'),
    (v_ingrid, 'BOOKING_REQUEST', 'Ny booking-forespørsel',
     'Emma Becker ønsker å booke Skjomveien 47 15.–20. mars.', 'unread');

  -- Hurtigsvar (kommune)
  insert into public.message_quick_replies (owner_id, title, body, sort_order)
  values
    (v_lars, 'Los — første kontakt', 'Hei! Jeg har fått saken din fra Digital Los og ringer deg i løpet av dagen.', 1),
    (v_lars, 'Formidling pågår', 'Vi har funnet et par aktuelle alternativer og kommer tilbake med forslag.', 2),
    (v_sigrid, 'Trenger mer info', 'Kan du sende meg telefonnummer og når du kan ta en prat?', 1);

  -- Nav-notat på formidlet bolig
  insert into public.nav_notes (listing_id, owner_id, note_text, created_by)
  select l.listing_id, v_aase,
    'Familien Nguyen flyttet inn 12. jan. Oppfølgingssamtale med Nav planlagt 15. april.',
    v_lars
  from _l l where l.key = 'aase_gratangen';

end $$;

drop function if exists public._demo_seed_auth_user(text, text, text, text);

-- Oppsummering
select 'Ofoten demo seed ferdig' as status,
  (select count(*) from auth.users where email like '%@demo.ofoten.no') as demo_brukere,
  (select count(*) from public.listings l join auth.users u on u.id = l.owner_id where u.email like '%@demo.ofoten.no') as demo_boliger,
  (select count(*) from public.central_events where slug like '%2026%') as arrangement,
  (select count(*) from public.bookings) as bookinger,
  (select count(*) from public.los_handoffs where case_reference like 'LOS-DEMO%') as los_saker;
