-- =============================================================================
-- FULL RESET: public schema + migration history (hosted Supabase)
-- =============================================================================
-- Use ONLY when reusing a Supabase project for a clean Boly/Hjerterum install.
-- IRREVERSIBLE without a backup.
--
-- Before running:
--   1. Download backup: Dashboard → Database → Backups
--   2. Pause production / maintenance mode on Vercel
--
-- After running:
--   supabase db push   (applies all migrations from repo)
--   Redeploy edge functions
--   Re-seed platform operator + test accounts
-- =============================================================================

-- Drop application schema (tables, functions, policies, types in public)
drop schema if exists public cascade;

create schema public;

grant all on schema public to postgres;
grant all on schema public to anon;
grant all on schema public to authenticated;
grant all on schema public to service_role;

comment on schema public is 'standard public schema';

-- Clear Supabase CLI migration history so db push replays everything
delete from supabase_migrations.schema_migrations;

-- Optional: list remaining migration rows (should be 0)
-- select * from supabase_migrations.schema_migrations;
