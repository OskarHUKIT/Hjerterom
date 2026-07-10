-- =============================================================================
-- Modulhåndheving i databasen — «av i ops-konsollen = stengt, ikke bare skjult»
-- Se docs/TRYGG-UTVIKLING.md og modularitet-og-db-strategi-2026-07-10.md (A).
-- =============================================================================
-- Prinsipper:
--   * Kun SKRIVE-stier (INSERT) gates. Lesing forblir åpen (grace: aktive
--     bookinger, historiske meldinger — jf. isMessageChannelVisible i registryen).
--   * UPDATE/DELETE gates ikke — grace-flyter (avbestilling, fullføring av
--     opphold) skal virke etter at en modul er skrudd av.
--   * Sosialmodulen gates aldri — den skal alltid være på i produksjon.
--   * Restrictive policies er additive og rører ikke eksisterende policyer.
--   * SECURITY DEFINER-RPCer omgår RLS → entry-RPCer får egen guard
--     (mønsteret fra submit_tourism_booking i 20260704120000).
--   * service_role/edge functions omgår RLS — outbox, push m.m. påvirkes ikke.
--   * Plattformoperatører er unntatt, slik at innhold (f.eks. events) kan
--     klargjøres FØR modulen skrus på.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. is_module_enabled(p_module) — DB-motstykket til lib/moduleRegistry.ts.
--    Speiler effectiveModuleFlags() inkl. avhengigheter (finn→tourism, los→social).
--    Mangler platform_settings-raden returneres null → policy nekter (fail safe).
-- -----------------------------------------------------------------------------
create or replace function public.is_module_enabled(p_module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_module
    when 'social'  then coalesce(ps.social_module_enabled, true)
    when 'tourism' then ps.tourism_lane_enabled
    when 'finn'    then ps.finn_portal_enabled and ps.tourism_lane_enabled
    when 'los'     then ps.los_portal_enabled and coalesce(ps.social_module_enabled, true)
    when 'events'  then ps.central_events_enabled
    when 'stripe'  then ps.stripe_bookings_enabled and ps.tourism_lane_enabled
    else false
  end
  from public.platform_settings ps
  limit 1;
$$;

comment on function public.is_module_enabled(text) is
  'DB-håndheving av modulflagg. Holdes i synk med effectiveModuleFlags() i frontend/lib/moduleRegistry.ts.';

grant execute on function public.is_module_enabled(text) to anon;
grant execute on function public.is_module_enabled(text) to authenticated;
grant execute on function public.is_module_enabled(text) to service_role;

-- -----------------------------------------------------------------------------
-- 2. Restrictive INSERT-gates på modul-eide tabeller.
--    (select ...) rundt funksjonskall = initplan-optimalisering, jf. rls_initplan-sveipene.
-- -----------------------------------------------------------------------------

-- Tourism / Finn: ny booking-aktivitet stoppes når tourism er av.
-- (booking_reviews og listing_availability gates bevisst IKKE — grace/utleier-side.)
drop policy if exists bookings_module_gate_ins on public.bookings;
create policy bookings_module_gate_ins on public.bookings
  as restrictive for insert to public
  with check ((select public.is_module_enabled('tourism')) or (select public.is_platform_operator()));

drop policy if exists booking_groups_module_gate_ins on public.booking_groups;
create policy booking_groups_module_gate_ins on public.booking_groups
  as restrictive for insert to public
  with check ((select public.is_module_enabled('tourism')) or (select public.is_platform_operator()));

drop policy if exists booking_guests_module_gate_ins on public.booking_guests;
create policy booking_guests_module_gate_ins on public.booking_guests
  as restrictive for insert to public
  with check ((select public.is_module_enabled('tourism')) or (select public.is_platform_operator()));

drop policy if exists guest_profiles_module_gate_ins on public.guest_profiles;
create policy guest_profiles_module_gate_ins on public.guest_profiles
  as restrictive for insert to public
  with check ((select public.is_module_enabled('tourism')) or (select public.is_platform_operator()));

drop policy if exists guest_terms_acceptances_module_gate_ins on public.guest_terms_acceptances;
create policy guest_terms_acceptances_module_gate_ins on public.guest_terms_acceptances
  as restrictive for insert to public
  with check ((select public.is_module_enabled('tourism')) or (select public.is_platform_operator()));

-- Events: nye events/henvendelser stoppes når events er av (operatør unntatt for klargjøring).
drop policy if exists central_events_module_gate_ins on public.central_events;
create policy central_events_module_gate_ins on public.central_events
  as restrictive for insert to public
  with check ((select public.is_module_enabled('events')) or (select public.is_platform_operator()));

drop policy if exists central_event_staff_module_gate_ins on public.central_event_staff;
create policy central_event_staff_module_gate_ins on public.central_event_staff
  as restrictive for insert to public
  with check ((select public.is_module_enabled('events')) or (select public.is_platform_operator()));

drop policy if exists event_inquiries_module_gate_ins on public.event_inquiries;
create policy event_inquiries_module_gate_ins on public.event_inquiries
  as restrictive for insert to public
  with check ((select public.is_module_enabled('events')) or (select public.is_platform_operator()));

drop policy if exists listing_event_availability_module_gate_ins on public.listing_event_availability;
create policy listing_event_availability_module_gate_ins on public.listing_event_availability
  as restrictive for insert to public
  with check ((select public.is_module_enabled('events')) or (select public.is_platform_operator()));

-- Los: nye sesjoner/handoffs stoppes når los er av.
drop policy if exists los_sessions_module_gate_ins on public.los_sessions;
create policy los_sessions_module_gate_ins on public.los_sessions
  as restrictive for insert to public
  with check ((select public.is_module_enabled('los')) or (select public.is_platform_operator()));

drop policy if exists los_handoffs_module_gate_ins on public.los_handoffs;
create policy los_handoffs_module_gate_ins on public.los_handoffs
  as restrictive for insert to public
  with check ((select public.is_module_enabled('los')) or (select public.is_platform_operator()));

-- -----------------------------------------------------------------------------
-- 3. Guard i SECURITY DEFINER entry-RPCer (RLS gjelder ikke der).
--    los_start_session: eksakt kopi av 20260701160000_hjerterum_p3_pilot_ready.sql
--    + modulguard først. submit_tourism_booking har allerede guard (20260704120000).
-- -----------------------------------------------------------------------------
create or replace function public.los_start_session()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token text;
begin
  if not public.is_module_enabled('los') then
    return jsonb_build_object('ok', false, 'error', 'los_module_disabled');
  end if;

  insert into public.los_sessions (consent_level)
  values ('anonymous')
  returning id, anonymous_token into v_id, v_token;

  return jsonb_build_object('ok', true, 'session_id', v_id, 'anonymous_token', v_token);
end;
$$;
