-- =============================================================================
-- Boly → Hjerterom rename, bølge 1 (expand) — se docs/TRYGG-UTVIKLING.md
-- =============================================================================
-- Strategi: expand/contract i samme Supabase-prosjekt (bevarer alle kontoer).
--   Bølge 1 (denne): nye plattform-nøytrale navn + bakoverkompatible wrappere.
--   Bølge 2: RLS-policyer og kode migreres puljevis til nye navn.
--   Bølge 3: wrappere droppes når `grep -r is_boly_operator` er tom.
-- Ingenting i denne migrasjonen endrer atferd. Trygg å deploye mørkt.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. is_platform_operator() — nytt kanonisk navn.
--    Samme implementasjon som is_boly_operator() (20260607120000_platform_ops_console.sql).
-- -----------------------------------------------------------------------------
create or replace function public.is_platform_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_operators po
    where po.user_id = auth.uid()
      and po.is_active = true
  );
$$;

comment on function public.is_platform_operator() is
  'Kanonisk operatør-sjekk (Hjerterom). Erstatter is_boly_operator(); wrapper beholdes til bølge 3 av renamen.';

grant execute on function public.is_platform_operator() to authenticated;
grant execute on function public.is_platform_operator() to service_role;

-- Gammelt navn blir tynn wrapper — alle eksisterende RLS-policyer fortsetter å virke.
create or replace function public.is_boly_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_operator();
$$;

comment on function public.is_boly_operator() is
  'DEPRECATED wrapper — bruk is_platform_operator(). Droppes i bølge 3 av Boly→Hjerterom-renamen.';

-- -----------------------------------------------------------------------------
-- 2. platform_retention_sweep() — nytt kanonisk navn for retention-cron.
--    Delegerer til boly_retention_sweep() (kroppen flyttes i bølge 2, slik at
--    senere redefinisjoner av sweepen plukkes opp automatisk i mellomtiden).
-- -----------------------------------------------------------------------------
create or replace function public.platform_retention_sweep()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.boly_retention_sweep();
$$;

comment on function public.platform_retention_sweep() is
  'Kanonisk daglig retention-sweep (Hjerterom). Delegerer til boly_retention_sweep() til bølge 2 flytter kroppen.';

grant execute on function public.platform_retention_sweep() to service_role;

-- Repek cron-jobben til nytt navn (samme tidspunkt: 03:30 UTC).
do $$
declare jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'boly-retention-daily';
  if jid is not null then
    perform cron.unschedule(jid);
  end if;
  select jobid into jid from cron.job where jobname = 'hjerterom-retention-daily';
  if jid is not null then
    perform cron.unschedule(jid);
  end if;
end $$;

select cron.schedule(
  'hjerterom-retention-daily',
  '30 3 * * *',
  $$ select public.platform_retention_sweep(); $$
);
