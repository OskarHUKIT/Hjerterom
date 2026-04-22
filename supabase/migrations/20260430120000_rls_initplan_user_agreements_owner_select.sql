-- InitPlan-wrap for user_agreements SELECT (hot path: getLandlordPostLoginHref, header bundle, listing load).
-- Semantikk uendret vs 20260429120000_legal_hold_fk_relaxation.sql — kun (select auth.uid()) i stedet for auth.uid().
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Merk: public.chat_messages og public.notifications har fortsatt policies som kan være opprettet
-- utenom migrasjonsrepo; bruk supabase/scripts/pg_policies_chat_messages_notifications.sql i
-- SQL Editor for å liste dem og evt. følge opp egen migrasjon.

drop policy if exists "Users can view their own agreements" on public.user_agreements;
create policy "Users can view their own agreements"
  on public.user_agreements for select
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

comment on policy "Users can view their own agreements" on public.user_agreements is
  'Tombstone-rader (user_id null) er usynlige for vanlige brukere. InitPlan-wrapped auth.uid() for RLS perf.';
