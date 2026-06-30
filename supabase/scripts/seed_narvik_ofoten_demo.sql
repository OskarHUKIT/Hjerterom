-- =============================================================================
-- Hjerterum demo: Ofoten-regionen — rik datasett (Nav Narvik-pilot, vår 2026)
-- =============================================================================
-- Kjør i Supabase Dashboard → SQL Editor (postgres/service role).
-- Passord alle @demo.ofoten.no-kontoer: Ofoten2026!
-- Idempotent — trygt å kjøre på nytt.
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
    select id from public.central_events where slug in (
      'arctic-ski-narvik-2026', 'veidekke-ofotbanen-2026', 'haalogaland-ultra-2026',
      'nav-sommerleir-gratangen-2026', 'polarsirkelen-motor-2025'
    )
  );
  delete from public.central_events where slug in (
    'arctic-ski-narvik-2026', 'veidekke-ofotbanen-2026', 'haalogaland-ultra-2026',
    'nav-sommerleir-gratangen-2026', 'polarsirkelen-motor-2025'
  );
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
create temp table _l (key text primary key, listing_id uuid, owner_key text) on commit drop;
create temp table _e (key text primary key, event_id uuid) on commit drop;

do $$
declare
  v_pw text := 'Ofoten2026!';
  v_ops uuid; v_tina uuid; v_lars uuid; v_sigrid uuid; v_kari uuid;
  v_emma uuid; v_pierre uuid; v_ole uuid;
  v_lid uuid; v_eid uuid; v_los_closed uuid;
  v_k_narvik uuid; v_k_evenes uuid; v_k_gratangen uuid; v_k_ballangen uuid;
  v_owner uuid;
  r record;
  u record;
begin
  select id into v_k_narvik from public.kommuner where slug = 'narvik';
  select id into v_k_evenes from public.kommuner where slug = 'evenes';
  select id into v_k_gratangen from public.kommuner where slug = 'gratangen';
  select id into v_k_ballangen from public.kommuner where slug = 'ballangen';

  -- Ops
  select id into v_ops from auth.users where lower(email) = 'ops@test.hjerterum.no';
  if v_ops is null then
    v_ops := public._demo_seed_auth_user('ops@demo.ofoten.no', v_pw, 'Ola Drift', 'homeowner');
  end if;
  insert into public.platform_operators (user_id, is_active, notes)
  values (v_ops, true, 'Ofoten demo') on conflict (user_id) do update set is_active = true;

  -- Kommune / event
  v_tina := public._demo_seed_auth_user('tina.olsen@demo.ofoten.no', v_pw, 'Tina Olsen', 'kommune_admin');
  v_lars := public._demo_seed_auth_user('lars.moen@demo.ofoten.no', v_pw, 'Lars-Henrik Moen', 'kommune_ansatt');
  v_sigrid := public._demo_seed_auth_user('sigrid.bakken@demo.ofoten.no', v_pw, 'Sigrid Bakken', 'kommune_ansatt');
  v_kari := public._demo_seed_auth_user('kari.event@demo.ofoten.no', v_pw, 'Kari Nordgård', 'event_ansatt');

  -- Gjester
  v_emma := public._demo_seed_auth_user('emma.becker@demo.ofoten.no', v_pw, 'Emma Becker', 'homeowner');
  v_pierre := public._demo_seed_auth_user('pierre.martin@demo.ofoten.no', v_pw, 'Pierre Martin', 'homeowner');
  v_ole := public._demo_seed_auth_user('ole.nordmann@demo.ofoten.no', v_pw, 'Ole Nordmann', 'homeowner');

  -- Utleiere (bulk)
  for u in
    select * from jsonb_to_recordset('[
      {"key":"ingrid","email":"ingrid.fotland@demo.ofoten.no","name":"Ingrid Fotland"},
      {"key":"tor","email":"tor.johansen@demo.ofoten.no","name":"Tor-Arne Johansen"},
      {"key":"marit","email":"marit.hansen@demo.ofoten.no","name":"Marit Hansen"},
      {"key":"berit","email":"berit.sund@demo.ofoten.no","name":"Berit Sund"},
      {"key":"aase","email":"aase.lindgren@demo.ofoten.no","name":"Åse Lindgren"},
      {"key":"petter","email":"petter.vassvik@demo.ofoten.no","name":"Petter Vassvik"},
      {"key":"kjell","email":"kjell.moen@demo.ofoten.no","name":"Kjell-Arne Moen"},
      {"key":"haakon","email":"haakon.ruud@demo.ofoten.no","name":"Håkon Ruud"},
      {"key":"elin","email":"elin.bakken@demo.ofoten.no","name":"Elin Bakken"},
      {"key":"rune","email":"rune.solberg@demo.ofoten.no","name":"Rune Solberg"},
      {"key":"mona","email":"mona.torgersen@demo.ofoten.no","name":"Mona Torgersen"},
      {"key":"geir","email":"geir.lund@demo.ofoten.no","name":"Geir Lund"},
      {"key":"silje","email":"silje.nordahl@demo.ofoten.no","name":"Silje Nordahl"},
      {"key":"frank","email":"frank.pedersen@demo.ofoten.no","name":"Frank-Ole Pedersen"},
      {"key":"hanne","email":"hanne.wiik@demo.ofoten.no","name":"Hanne Wiik"},
      {"key":"ola_m","email":"ola.strom@demo.ofoten.no","name":"Ola-Magnus Strøm"},
      {"key":"kari_a","email":"kari.dragland@demo.ofoten.no","name":"Kari-Anne Dragland"},
      {"key":"vigdis","email":"vigdis.eide@demo.ofoten.no","name":"Vigdis Eide"},
      {"key":"tommy","email":"tommy.hakonsen@demo.ofoten.no","name":"Tommy Håkonsen"},
      {"key":"lisa","email":"lisa.chen@demo.ofoten.no","name":"Li Chen"},
      {"key":"arne","email":"arne.jacobsen@demo.ofoten.no","name":"Arne Jacobsen"},
      {"key":"sissel","email":"sissel.myklebust@demo.ofoten.no","name":"Sissel Myklebust"},
      {"key":"magnus","email":"magnus.berg@demo.ofoten.no","name":"Magnus Berg"}
    ]'::jsonb) as x(key text, email text, name text)
  loop
    v_owner := public._demo_seed_auth_user(u.email, v_pw, u.name, 'homeowner');
    insert into _p values (u.key, v_owner) on conflict (key) do update set user_id = excluded.user_id;
  end loop;

  insert into _p values
    ('ops', v_ops), ('tina', v_tina), ('lars', v_lars), ('sigrid', v_sigrid),
    ('kari', v_kari), ('emma', v_emma), ('pierre', v_pierre), ('ole', v_ole)
  on conflict (key) do update set user_id = excluded.user_id;

  insert into public.guest_profiles (id, email, display_name, phone) values
    (v_emma, 'emma.becker@demo.ofoten.no', 'Emma Becker', '+49 170 4412200'),
    (v_pierre, 'pierre.martin@demo.ofoten.no', 'Pierre Martin', '+33 6 12 34 56 78'),
    (v_ole, 'ole.nordmann@demo.ofoten.no', 'Ole Nordmann', '+47 900 11 223')
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.user_kommune_grants (user_id, kommune_id, grant_role, can_edit)
  select p.user_id, k.id, g.role, true
  from (values ('tina','admin'), ('lars','staff'), ('sigrid','staff')) g(pkey, role)
  join _p p on p.key = g.pkey
  cross join public.kommuner k
  where k.slug in ('narvik', 'gratangen', 'evenes', 'ballangen')
  on conflict do nothing;

  insert into public.user_agreements (user_id, agreement_version)
  select user_id, '2026-ofoten-demo' from _p
  where key not in ('ops','tina','lars','sigrid','kari','emma','pierre','ole')
  on conflict do nothing;

  -- ─── Boliger (38 stk) ───
  for r in
    select * from jsonb_to_recordset('[
      {"key":"ingrid_hytte","owner":"ingrid","address":"Skjomveien 47","city":"Narvik","beds":4,"type":"Hytte","price":1290,"tourism":true,"t_cents":129000,"instant":false,"cancel":"moderate","lat":68.395,"lng":17.518,"guide":"Nøkkelboks ved dør."},
      {"key":"ingrid_studio","owner":"ingrid","address":"Skjomveien 47 (studio)","city":"Narvik","beds":1,"type":"Hybel","price":590,"tourism":true,"t_cents":59000,"instant":true,"cancel":"flexible","lat":68.3952,"lng":17.5175,"guide":null},
      {"key":"tor_sentrum","owner":"tor","address":"Kongens gate 42","city":"Narvik","beds":2,"type":"Leilighet","price":890,"tourism":true,"t_cents":89000,"instant":true,"cancel":"flexible","lat":68.4389,"lng":17.4273,"guide":"Ring på Johansen."},
      {"key":"tor_kjeller","owner":"tor","address":"Kongens gate 42 (kjeller)","city":"Narvik","beds":1,"type":"Hybel","price":520,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.439,"lng":17.427,"guide":null},
      {"key":"marit_bjerkvik","owner":"marit","address":"Tysfjordveien 88","city":"Bjerkvik","beds":3,"type":"Enebolig","price":650,"tourism":true,"t_cents":75000,"instant":false,"cancel":"moderate","lat":68.548,"lng":17.561,"guide":null},
      {"key":"berit_evenes","owner":"berit","address":"Flyplassvegen 12","city":"Evenes","beds":2,"type":"Leilighet","price":990,"tourism":true,"t_cents":99000,"instant":false,"cancel":"strict","lat":68.4913,"lng":16.6781,"guide":"Kodelås selvinnsjekk."},
      {"key":"berit_anneks","owner":"berit","address":"Flyplassvegen 12 (anneks)","city":"Evenes","beds":3,"type":"Annek","price":850,"tourism":true,"t_cents":85000,"instant":false,"cancel":"moderate","lat":68.4915,"lng":16.6785,"guide":null},
      {"key":"aase_gratangen","owner":"aase","address":"Gratangenveien 203","city":"Gratangen","beds":4,"type":"Enebolig","price":550,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.694,"lng":17.525,"guide":null},
      {"key":"aase_naust","owner":"aase","address":"Gratangenveien 203 (naustleil)","city":"Gratangen","beds":2,"type":"Naust/hytte","price":400,"tourism":true,"t_cents":65000,"instant":false,"cancel":"flexible","lat":68.6945,"lng":17.524,"guide":null},
      {"key":"petter_ball1","owner":"petter","address":"Industriveien 9","city":"Ballangen","beds":3,"type":"Rekkehus","price":480,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.344,"lng":16.832,"guide":null},
      {"key":"petter_ball2","owner":"petter","address":"Industriveien 11","city":"Ballangen","beds":2,"type":"Rekkehus","price":450,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.3442,"lng":16.8325,"guide":null},
      {"key":"kjell_ankenes","owner":"kjell","address":"Ankenesveien 15","city":"Ankenes","beds":2,"type":"Leilighet","price":750,"tourism":true,"t_cents":75000,"instant":false,"cancel":"moderate","lat":68.412,"lng":17.384,"guide":null},
      {"key":"haakon_fjord","owner":"haakon","address":"Strandgata 7","city":"Narvik","beds":3,"type":"Leilighet","price":1100,"tourism":true,"t_cents":110000,"instant":false,"cancel":"strict","lat":68.441,"lng":17.431,"guide":"Concierge etter avtale."},
      {"key":"elin_narvik1","owner":"elin","address":"Havnegata 18","city":"Narvik","beds":2,"type":"Leilighet","price":820,"tourism":true,"t_cents":82000,"instant":true,"cancel":"flexible","lat":68.4405,"lng":17.429,"guide":null},
      {"key":"elin_narvik2","owner":"elin","address":"Havnegata 18 (sosial)","city":"Narvik","beds":3,"type":"Leilighet","price":0,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.4406,"lng":17.4292,"guide":null},
      {"key":"rune_hytte","owner":"rune","address":"Sletta 3","city":"Bjerkvik","beds":5,"type":"Hytte","price":700,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.552,"lng":17.568,"guide":null},
      {"key":"mona_evenes1","owner":"mona","address":"Bakkebyveien 4","city":"Evenes","beds":2,"type":"Leilighet","price":780,"tourism":true,"t_cents":78000,"instant":false,"cancel":"moderate","lat":68.488,"lng":16.672,"guide":null},
      {"key":"mona_evenes2","owner":"mona","address":"Bakkebyveien 6","city":"Evenes","beds":4,"type":"Enebolig","price":920,"tourism":true,"t_cents":92000,"instant":false,"cancel":"moderate","lat":68.4885,"lng":16.6725,"guide":null},
      {"key":"geir_hybel1","owner":"geir","address":"Dronningens gate 8","city":"Narvik","beds":1,"type":"Hybel","price":380,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.4375,"lng":17.426,"guide":null},
      {"key":"geir_hybel2","owner":"geir","address":"Dronningens gate 8 (2.etg)","city":"Narvik","beds":1,"type":"Hybel","price":380,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.4376,"lng":17.4261,"guide":null},
      {"key":"geir_hybel3","owner":"geir","address":"Dronningens gate 10","city":"Narvik","beds":1,"type":"Hybel","price":400,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.4378,"lng":17.4263,"guide":null},
      {"key":"silje_gard","owner":"silje","address":"Fjelldalsveien 55","city":"Gratangen","beds":6,"type":"Gård","price":600,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.698,"lng":17.530,"guide":null},
      {"key":"frank_ball3","owner":"frank","address":"Koboltveien 2","city":"Ballangen","beds":3,"type":"Rekkehus","price":460,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.345,"lng":16.835,"guide":null},
      {"key":"frank_ball4","owner":"frank","address":"Koboltveien 4","city":"Ballangen","beds":2,"type":"Rekkehus","price":440,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.3452,"lng":16.8352,"guide":null},
      {"key":"hanne_ank","owner":"hanne","address":"Ankenesstranda 22","city":"Ankenes","beds":2,"type":"Leilighet","price":850,"tourism":true,"t_cents":85000,"instant":true,"cancel":"flexible","lat":68.410,"lng":17.380,"guide":"SMS kode samme dag."},
      {"key":"ola_pendler","owner":"ola_m","address":"Jernbanegata 3","city":"Narvik","beds":1,"type":"Leilighet","price":690,"tourism":true,"t_cents":69000,"instant":true,"cancel":"flexible","lat":68.4395,"lng":17.4285,"guide":null},
      {"key":"kari_hytte","owner":"kari_a","address":"Skjomdalen 12","city":"Narvik","beds":4,"type":"Hytte","price":1150,"tourism":true,"t_cents":115000,"instant":false,"cancel":"moderate","lat":68.390,"lng":17.510,"guide":null},
      {"key":"vigdis_utleid","owner":"vigdis","address":"Brugata 14","city":"Narvik","beds":2,"type":"Leilighet","price":720,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.4380,"lng":17.4255,"guide":null},
      {"key":"tommy_1","owner":"tommy","address":"Fagernesveien 1","city":"Narvik","beds":2,"type":"Leilighet","price":680,"tourism":true,"t_cents":68000,"instant":false,"cancel":"moderate","lat":68.435,"lng":17.420,"guide":null},
      {"key":"tommy_2","owner":"tommy","address":"Fagernesveien 3","city":"Narvik","beds":3,"type":"Leilighet","price":740,"tourism":true,"t_cents":74000,"instant":false,"cancel":"moderate","lat":68.4352,"lng":17.4202,"guide":null},
      {"key":"tommy_3","owner":"tommy","address":"Fagernesveien 5","city":"Narvik","beds":2,"type":"Leilighet","price":680,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.4354,"lng":17.4204,"guide":null},
      {"key":"tommy_4","owner":"tommy","address":"Fagernesveien 7 (hybel)","city":"Narvik","beds":1,"type":"Hybel","price":420,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.4356,"lng":17.4206,"guide":null},
      {"key":"tommy_5","owner":"tommy","address":"Fagernesveien 9","city":"Narvik","beds":2,"type":"Leilighet","price":700,"tourism":true,"t_cents":70000,"instant":true,"cancel":"flexible","lat":68.4358,"lng":17.4208,"guide":null},
      {"key":"lisa_fjord","owner":"lisa","address":"Taraldsvikveien 90","city":"Narvik","beds":3,"type":"Leilighet","price":1050,"tourism":true,"t_cents":105000,"instant":false,"cancel":"strict","lat":68.445,"lng":17.440,"guide":"Engelsk OK."},
      {"key":"arne_rorbu","owner":"arne","address":"Kjøpsvikveien 44","city":"Narvik","beds":4,"type":"Rorbu","price":950,"tourism":true,"t_cents":95000,"instant":false,"cancel":"moderate","lat":68.450,"lng":17.455,"guide":null},
      {"key":"sissel_sosial","owner":"sissel","address":"Elvegata 2","city":"Narvik","beds":3,"type":"Rekkehus","price":500,"tourism":false,"t_cents":null,"instant":false,"cancel":"moderate","lat":68.436,"lng":17.424,"guide":null},
      {"key":"magnus_fjell","owner":"magnus","address":"Beisfjordveien 17","city":"Narvik","beds":5,"type":"Enebolig","price":880,"tourism":true,"t_cents":88000,"instant":false,"cancel":"moderate","lat":68.428,"lng":17.395,"guide":null}
    ]'::jsonb) as x(
      key text, owner text, address text, city text, beds int, type text, price numeric,
      tourism bool, t_cents int, instant bool, cancel text, lat float8, lng float8, guide text
    )
  loop
    select user_id into v_owner from _p where _p.key = r.owner;
    insert into public.listings (
      owner_id, address, city, price_per_night, description, beds, type,
      tourism_enabled, tourism_nightly_price_cents, tourism_instant_book,
      cancellation_policy, map_lat, map_lng, tourism_check_in_guide, kommune_id
    ) values (
      v_owner, r.address, r.city, r.price,
      r.type || ' i ' || r.city || ' — demo Ofoten (' || r.key || ').',
      r.beds, r.type, r.tourism, r.t_cents, r.instant, r.cancel,
      r.lat, r.lng, r.guide,
      case
        when r.city in ('Evenes') then v_k_evenes
        when r.city in ('Gratangen') then v_k_gratangen
        when r.city in ('Ballangen') then v_k_ballangen
        else v_k_narvik
      end
    ) returning id into v_lid;
    insert into _l values (r.key, v_lid, r.owner);
  end loop;

  -- Co-host: Kjell hjelper Marit med Bjerkvik
  insert into public.listing_cohosts (listing_id, cohost_user_id, invited_by)
  select l.listing_id, p.user_id, o.user_id
  from _l l
  join _p p on p.key = 'kjell'
  join _p o on o.key = 'marit'
  where l.key = 'marit_bjerkvik'
  on conflict do nothing;

  -- ─── Tilgjengelighet (sosial + turisme) ───
  for r in
    select * from jsonb_to_recordset('[
      {"lk":"aase_gratangen","s":"2026-01-01","e":"2026-12-31","st":"Formidla","ln":"sosial"},
      {"lk":"aase_naust","s":"2026-06-01","e":"2026-09-30","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"petter_ball1","s":"2026-01-01","e":"2026-12-31","st":"Formidla","ln":"sosial"},
      {"lk":"petter_ball2","s":"2026-02-01","e":"2026-08-31","st":"Formidla","ln":"sosial"},
      {"lk":"frank_ball3","s":"2026-04-01","e":"2026-10-31","st":"Tilgjengelig","ln":"sosial"},
      {"lk":"frank_ball4","s":"2026-01-01","e":"2026-03-31","st":"Utilgjengelig","ln":"sosial"},
      {"lk":"rune_hytte","s":"2026-01-01","e":"2026-12-31","st":"Formidla","ln":"sosial"},
      {"lk":"silje_gard","s":"2026-01-01","e":"2026-12-31","st":"Formidla","ln":"sosial"},
      {"lk":"geir_hybel1","s":"2026-01-01","e":"2026-12-31","st":"Formidla","ln":"sosial"},
      {"lk":"geir_hybel2","s":"2026-01-01","e":"2026-06-30","st":"Formidla","ln":"sosial"},
      {"lk":"geir_hybel3","s":"2026-03-01","e":"2026-12-31","st":"Tilgjengelig","ln":"sosial"},
      {"lk":"vigdis_utleid","s":"2026-01-01","e":"2026-12-31","st":"Formidla","ln":"sosial"},
      {"lk":"sissel_sosial","s":"2026-02-01","e":"2026-12-31","st":"Formidla","ln":"sosial"},
      {"lk":"elin_narvik2","s":"2026-01-01","e":"2026-12-31","st":"Formidla","ln":"sosial"},
      {"lk":"tor_kjeller","s":"2026-01-01","e":"2026-12-31","st":"Tilgjengelig","ln":"sosial"},
      {"lk":"tommy_3","s":"2026-01-01","e":"2026-12-31","st":"Formidla","ln":"sosial"},
      {"lk":"tommy_4","s":"2026-03-01","e":"2026-12-31","st":"Tilgjengelig","ln":"sosial"},
      {"lk":"marit_bjerkvik","s":"2026-01-01","e":"2026-02-28","st":"Formidla","ln":"sosial"},
      {"lk":"ingrid_hytte","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"ingrid_studio","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"tor_sentrum","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"berit_evenes","s":"2026-01-01","e":"2026-12-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"berit_anneks","s":"2026-01-01","e":"2026-12-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"kjell_ankenes","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"haakon_fjord","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"elin_narvik1","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"mona_evenes1","s":"2026-01-01","e":"2026-12-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"mona_evenes2","s":"2026-01-01","e":"2026-12-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"hanne_ank","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"ola_pendler","s":"2026-01-01","e":"2026-12-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"kari_hytte","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"tommy_1","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"tommy_2","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"tommy_5","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"lisa_fjord","s":"2026-04-01","e":"2026-09-30","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"arne_rorbu","s":"2026-05-01","e":"2026-09-15","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"magnus_fjell","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"},
      {"lk":"marit_bjerkvik","s":"2026-03-01","e":"2026-10-31","st":"Tilgjengelig","ln":"turisme"}
    ]'::jsonb) as x(lk text, s date, e date, st text, ln text)
  loop
    insert into public.listing_availability (listing_id, start_date, end_date, status, lane)
    select listing_id, r.s, r.e, r.st, r.ln from _l where key = r.lk;
  end loop;

  -- ─── Arrangement ───
  insert into public.central_events (
    slug, name, description_public, start_date, end_date,
    routing_mode, arrangement_tag, status, published_at, created_by, geography_scope
  ) values (
    'arctic-ski-narvik-2026', 'Arctic Ski Festival Ofoten 2026',
    'Internasjonalt langrenns- og fjellski i Narvik og omegn.',
    '2026-03-14', '2026-03-22', 'turisme', 'Skifestival', 'published', now(), v_ops,
    jsonb_build_object('region_keys', array['narvik','evenes'], 'kommune_ids', array[v_k_narvik, v_k_evenes])
  ) returning id into v_eid;
  insert into _e values ('ski_festival', v_eid);

  insert into public.central_events (
    slug, name, description_public, start_date, end_date,
    routing_mode, arrangement_tag, status, published_at, created_by, geography_scope
  ) values (
    'veidekke-ofotbanen-2026', 'Veidekke — bolig til Ofotbanen-entreprise',
    'Inntil 25 montører trenger innkvartering langs Ofotbanen vår–høst 2026.',
    '2026-04-01', '2026-10-31', 'saksbehandler', 'Entreprise', 'published', now(), v_ops,
    jsonb_build_object('region_keys', array['narvik','ballangen'], 'kommune_ids', array[v_k_narvik, v_k_ballangen])
  ) returning id into v_eid;
  insert into _e values ('veidekke', v_eid);

  insert into public.central_events (
    slug, name, description_public, start_date, end_date,
    routing_mode, status, published_at, created_by, geography_scope
  ) values (
    'nav-sommerleir-gratangen-2026', 'Nav sommerleir — Gratangen 2026',
    'Aktivitetsleir for ungdom 14–18 år. Behov for sovesaler og hytter.',
    '2026-07-05', '2026-07-19', 'saksbehandler', 'published', now(), v_ops,
    jsonb_build_object('region_keys', array['gratangen'], 'kommune_ids', array[v_k_gratangen])
  ) returning id into v_eid;
  insert into _e values ('sommerleir', v_eid);

  insert into public.central_events (
    slug, name, description_public, start_date, end_date,
    routing_mode, status, created_by
  ) values (
    'haalogaland-ultra-2026', 'Hålogaland Ultra 2026',
    '100-mils løp Narvik–Tromsø. Planlegging pågår.',
    '2026-08-20', '2026-08-22', 'turisme', 'draft', v_ops
  ) returning id into v_eid;
  insert into _e values ('ultra_draft', v_eid);

  insert into public.central_events (
    slug, name, description_public, start_date, end_date,
    routing_mode, status, published_at, closed_at, created_by
  ) values (
    'polarsirkelen-motor-2025', 'Polarsirkelen Motorfestival 2025',
    'Avsluttet arrangement — arkivdata for demo.',
    '2025-06-10', '2025-06-14', 'turisme', 'closed', '2025-05-01', '2025-06-15', v_ops
  ) returning id into v_eid;
  insert into _e values ('motor_closed', v_eid);

  insert into public.central_event_staff (event_id, profile_id, role)
  select e.event_id, v_kari, 'coordinator' from _e e where e.key in ('veidekke', 'sommerleir')
  on conflict do nothing;

  -- Event opt-in (mange boliger)
  insert into public.listing_event_availability (listing_id, event_id, status)
  select l.listing_id, e.event_id, 'active'
  from _l l cross join _e e
  where e.key = 'ski_festival' and l.key in (
    'ingrid_hytte','ingrid_studio','tor_sentrum','kjell_ankenes','haakon_fjord',
    'elin_narvik1','kari_hytte','hanne_ank','ola_pendler','lisa_fjord','magnus_fjell',
    'tommy_1','tommy_2','tommy_5','berit_evenes','mona_evenes1'
  )
  on conflict do nothing;

  insert into public.listing_event_availability (listing_id, event_id, status)
  select l.listing_id, e.event_id, 'active'
  from _l l cross join _e e
  where e.key = 'veidekke' and l.key in (
    'marit_bjerkvik','petter_ball1','petter_ball2','aase_gratangen',
    'frank_ball3','rune_hytte','tommy_3','geir_hybel1'
  )
  on conflict do nothing;

  insert into public.listing_event_availability (listing_id, event_id, status)
  select l.listing_id, e.event_id, 'active'
  from _l l cross join _e e
  where e.key = 'sommerleir' and l.key in ('silje_gard','aase_gratangen','aase_naust')
  on conflict do nothing;

  -- Event-henvendelser
  insert into public.event_inquiries (event_id, contact_name, contact_email, contact_phone, message, date_from, date_to, status, assigned_profile_id)
  select e.event_id, 'Thomas Berg', 'thomas.berg@veidekke.no', '+47 915 44 882',
    'Trenger 12 plasser Bjerkvik/Ballangen fra uke 15.', '2026-04-07', '2026-10-24', 'assigned', v_lars
  from _e e where e.key = 'veidekke';

  insert into public.event_inquiries (event_id, contact_name, contact_email, message, date_from, date_to, status)
  select e.event_id, 'Røde Kors Ungdom Evenes', 'ungdom.leir@rodekors.no',
    '18 ungdommer — trenger soveplass i regionen.', '2026-07-01', '2026-07-14', 'new'
  from _e e where e.key = 'veidekke';

  insert into public.event_inquiries (event_id, contact_name, contact_email, message, date_from, date_to, status, assigned_profile_id)
  select e.event_id, 'Nav Gratangen', 'nav.gratangen@demo.ofoten.no',
    'Sommerleir — 12 ungdommer + 2 ledere.', '2026-07-05', '2026-07-19', 'mediated', v_lars
  from _e e where e.key = 'sommerleir';

  insert into public.event_inquiries (event_id, contact_name, contact_email, message, date_from, date_to, status)
  select e.event_id, 'Lofoten Guiding AS', 'post@lofotenguiding.no',
    'Guidegruppe på gjennomreise — 6 personer.', '2026-03-18', '2026-03-20', 'closed'
  from _e e where e.key = 'ski_festival';

  -- Bookinger (alle statuser)
  insert into public.bookings (listing_id, event_id, guest_user_id, guest_email, guest_name, check_in, check_out, status, amount_cents, message)
  select l.listing_id, e.event_id, v_emma, 'emma.becker@demo.ofoten.no', 'Emma Becker',
    '2026-03-15', '2026-03-20', 'pending', 645000, 'Vi er to fra München — ski-festival.'
  from _l l join _e e on e.key = 'ski_festival' where l.key = 'ingrid_hytte';

  insert into public.bookings (listing_id, event_id, guest_email, guest_name, check_in, check_out, status, amount_cents)
  select l.listing_id, e.event_id, 'lars.pettersson@demo.ofoten.no', 'Lars Pettersson',
    '2026-03-16', '2026-03-19', 'accepted', 267000
  from _l l join _e e on e.key = 'ski_festival' where l.key = 'tor_sentrum';

  insert into public.bookings (listing_id, event_id, guest_user_id, guest_email, guest_name, check_in, check_out, status, amount_cents)
  select l.listing_id, e.event_id, v_pierre, 'pierre.martin@demo.ofoten.no', 'Pierre Martin',
    '2026-03-17', '2026-03-21', 'pending', 460000
  from _l l join _e e on e.key = 'ski_festival' where l.key = 'lisa_fjord';

  insert into public.bookings (listing_id, guest_email, guest_name, check_in, check_out, status, amount_cents, payment_intent_id)
  select l.listing_id, 'norsk.fjell@demo.ofoten.no', 'Hilde og Jon Nordahl',
    '2026-02-20', '2026-02-23', 'paid', 297000, 'pi_demo_001'
  from _l l where l.key = 'berit_evenes';

  insert into public.bookings (listing_id, guest_email, guest_name, check_in, check_out, status, amount_cents)
  select l.listing_id, 'crew.evenes@demo.ofoten.no', 'SAS Crew', '2026-03-28', '2026-03-29', 'completed', 99000
  from _l l where l.key = 'berit_evenes';

  insert into public.bookings (listing_id, guest_user_id, guest_email, guest_name, check_in, check_out, status, amount_cents)
  select l.listing_id, v_ole, 'ole.nordmann@demo.ofoten.no', 'Ole Nordmann',
    '2026-04-10', '2026-04-12', 'accepted', 170000
  from _l l where l.key = 'hanne_ank';

  insert into public.bookings (listing_id, guest_email, guest_name, check_in, check_out, status, amount_cents)
  select l.listing_id, 'avslatt@guest.demo', 'Test Avslått', '2026-03-20', '2026-03-22', 'rejected', 178000
  from _l l where l.key = 'haakon_fjord';

  insert into public.bookings (listing_id, guest_email, guest_name, check_in, check_out, status, amount_cents)
  select l.listing_id, 'kansell@guest.demo', 'Kansellert Gjest', '2026-04-01', '2026-04-03', 'cancelled', 138000
  from _l l where l.key = 'ola_pendler';

  insert into public.bookings (listing_id, event_id, guest_email, guest_name, check_in, check_out, status, amount_cents, payment_intent_id)
  select l.listing_id, e.event_id, 'betalt@guest.demo', 'Instant Book Gjest',
    '2026-03-14', '2026-03-15', 'paid', 89000, 'pi_demo_002'
  from _l l join _e e on e.key = 'ski_festival' where l.key = 'elin_narvik1';

  -- Gjesteliste på betalt booking
  insert into public.booking_guests (booking_id, guest_email, guest_name, invited_by)
  select b.id, 'medgjest@demo.ofoten.no', 'Kari Medgjest', l.owner_id
  from public.bookings b
  join _l on _l.listing_id = b.listing_id
  join _p l on l.key = _l.owner_key
  where b.guest_email = 'norsk.fjell@demo.ofoten.no'
  on conflict do nothing;

  -- Digital Los (5 saker)
  insert into public.los_sessions (consent_level, kommune_id, messages, anonymous_token)
  values ('contact', v_k_narvik, '[
    {"role":"user","content":"Hybel-utkastelse, 19 år, jobber Extra."},
    {"role":"assistant","content":"Vil du snakke med saksbehandler?"}
  ]'::jsonb, encode(gen_random_bytes(24), 'hex'));

  insert into public.los_handoffs (session_id, summary_text, kommune_id, case_reference, status, contact_name, contact_phone, contact_email)
  select s.id, 'Marcus (19) trues med utkastelse fra hybel.', v_k_narvik, 'LOS-DEMO-001', 'new',
    'Marcus H.', '+47 412 33 901', 'marcus.h.demo@ofoten.no'
  from public.los_sessions s order by s.created_at desc limit 1;

  insert into public.los_sessions (consent_level, kommune_id, messages, anonymous_token, handed_off_at)
  values ('contact', v_k_narvik, '[{"role":"user","content":"Familie på hotell etter utkastelse."}]'::jsonb,
    encode(gen_random_bytes(24), 'hex'), now() - interval '1 day');

  insert into public.los_handoffs (session_id, summary_text, kommune_id, case_reference, status, contact_name, contact_phone, assigned_profile_id)
  select s.id, 'Samira (24) + barn 3 og 6 — hotell midlertidig.', v_k_narvik, 'LOS-DEMO-002', 'assigned',
    'Samira K.', '+47 977 22 441', v_lars
  from public.los_sessions s where s.handed_off_at is not null order by s.created_at desc limit 1;

  insert into public.los_sessions (handed_off_at, consent_level, kommune_id, messages, anonymous_token)
  values (now() - interval '12 days', 'contact', v_k_narvik,
    '[{"role":"user","content":"Økonomi og bolig."}]'::jsonb, encode(gen_random_bytes(24), 'hex'))
  returning id into v_los_closed;

  insert into public.los_handoffs (session_id, summary_text, kommune_id, case_reference, status, contact_name, assigned_profile_id)
  values (v_los_closed, 'Anders (17) — løst med midlertidig botilbud.', v_k_narvik, 'LOS-DEMO-003', 'closed', 'Anders L.', v_sigrid);

  insert into public.los_sessions (consent_level, kommune_id, messages, anonymous_token, handed_off_at)
  values ('contact', v_k_gratangen, '[{"role":"user","content":"Trenger hjelp i Gratangen, bor hos bestemor midlertidig."}]'::jsonb,
    encode(gen_random_bytes(24), 'hex'), now() - interval '3 hours');

  insert into public.los_handoffs (session_id, summary_text, kommune_id, case_reference, status, contact_name, contact_phone, assigned_profile_id)
  select s.id, 'Jonas (16) Gratangen — konflikt hjemme.', v_k_gratangen, 'LOS-DEMO-004', 'in_progress',
    'Jonas N.', '+47 401 88 772', v_sigrid
  from public.los_sessions s where s.kommune_id = v_k_gratangen order by s.created_at desc limit 1;

  insert into public.los_sessions (consent_level, kommune_id, messages, anonymous_token)
  values ('anonymous', v_k_narvik, '[{"role":"user","content":"Vet ikke om jeg tør snakke med noen ennå..."}]'::jsonb,
    encode(gen_random_bytes(24), 'hex'));

  -- Varsler
  insert into public.notifications (owner_id, type, title, message, status)
  values
    (v_lars, 'LOS_HANDOFF', 'Ny Digital Los-henvendelse', 'LOS-DEMO-001 — Marcus H.', 'unread'),
    (v_sigrid, 'LOS_HANDOFF', 'Ny Digital Los-henvendelse', 'LOS-DEMO-004 — Jonas N.', 'unread'),
    (v_tina, 'NEW_MESSAGE', 'Melding fra utleier', 'Tommy Håkonsen har sendt en melding.', 'unread');

  insert into public.notifications (owner_id, type, title, message, status, listing_id)
  select v_ingrid, 'BOOKING_REQUEST', 'Ny booking-forespørsel', 'Emma Becker — 15.–20. mars', 'unread', l.listing_id
  from _l l where l.key = 'ingrid_hytte';

  insert into public.notifications (owner_id, type, title, message, status, listing_id)
  select v_tor, 'BOOKING_REQUEST', 'Booking godkjent', 'Lars Pettersson — betaling venter', 'unread', l.listing_id
  from _l l where l.key = 'tor_sentrum';

  -- Hurtigsvar
  insert into public.message_quick_replies (owner_id, title, body, sort_order) values
    (v_lars, 'Los — første kontakt', 'Hei! Jeg har fått saken din fra Digital Los og ringer deg i løpet av dagen.', 1),
    (v_lars, 'Formidling pågår', 'Vi har funnet aktuelle alternativer og kommer tilbake med forslag.', 2),
    (v_sigrid, 'Trenger mer info', 'Kan du sende telefonnummer og når du kan ta en prat?', 1),
    (v_tina, 'Inviter saksbehandler', 'Du kan registrere deg med invitasjonslenken vi sender på e-post.', 1);

  -- Nav-notater
  insert into public.nav_notes (listing_id, owner_id, note_text, created_by)
  select l.listing_id, p.user_id, n.note, v_lars
  from (values
    ('aase_gratangen', 'Familien Nguyen flyttet inn 12. jan. Oppfølging 15. april.'),
    ('geir_hybel1', 'Leietaker under introduksjonsprogram. Månedlig oppfølging.'),
    ('vigdis_utleid', 'Formidlet til enslig far med barn — stabilt så langt.'),
    ('silje_gard', 'Vurderes til sommerleir — kapasitet 6+2 ledere.')
  ) n(lkey, note)
  join _l l on l.key = n.lkey
  join _p p on p.key = l.owner_key;

end $$;

drop function if exists public._demo_seed_auth_user(text, text, text, text);

select 'Ofoten demo seed ferdig' as status,
  (select count(*) from auth.users where email like '%@demo.ofoten.no') as demo_brukere,
  (select count(*) from auth.users u join public.profiles p on p.id = u.id where p.role = 'homeowner' and u.email like '%@demo.ofoten.no') as utleiere,
  (select count(*) from public.listings l join auth.users u on u.id = l.owner_id where u.email like '%@demo.ofoten.no') as boliger,
  (select count(*) from public.listing_availability la join public.listings l on l.id = la.listing_id join auth.users u on u.id = l.owner_id where u.email like '%@demo.ofoten.no') as tilgjengelighet_rader,
  (select count(*) from public.central_events where slug like '%2026%' or slug like '%2025%') as arrangement,
  (select count(*) from public.bookings) as bookinger,
  (select count(*) from public.los_handoffs where case_reference like 'LOS-DEMO%') as los_saker,
  (select count(*) from public.event_inquiries) as event_henvendelser;
