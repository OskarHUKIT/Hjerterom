-- Kjør i Supabase SQL Editor (prosjektet som har live RLS).
-- Bruk kolonnene qual / with_check til å skrive migrasjoner som bytter auth.uid() → (select auth.uid())
-- der det er trygt (samme semantikk som Supabase-dokumentasjonen om InitPlan).

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('chat_messages', 'notifications')
order by tablename, policyname;
