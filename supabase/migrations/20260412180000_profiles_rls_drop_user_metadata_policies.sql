-- Fjern RLS som stoler på auth.jwt() -> user_metadata ->> role (kan endres av sluttbruker).
-- "Kommune can view all profiles" (is_kommune_staff() / profiles.role) beholdes — ikke dropp den her.
--
-- Konsolider duplikate SELECT-policies for egen profil til samme navn som 20260331120000_profiles_own_select_update_rls.sql.

drop policy if exists "Kommune_Access_Policy" on public.profiles;
drop policy if exists "Kommuneansatte can view all profiles" on public.profiles;
drop policy if exists "Kommuneansatte kan se alle profiler" on public.profiles;

drop policy if exists "Brukere kan se sin egen profil" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can select own profile" on public.profiles;

create policy "Users can select own profile"
  on public.profiles for select
  using (auth.uid() = id);
