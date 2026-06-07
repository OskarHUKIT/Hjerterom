-- =============================================================================
-- Fix: bruker finnes i Authentication → Users men ikke i public.profiles
-- Kjør i Supabase Dashboard → SQL Editor (engangs / etter sletting av profil-rad)
-- =============================================================================

-- Krever migrasjon 20260607170000_ensure_user_profile_backfill.sql (eller kjør hele filen under).

select public.sync_profile_for_auth_user(u.id) as synced_user_id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Verifiser:
-- select u.email, p.id, p.role from auth.users u left join public.profiles p on p.id = u.id;
