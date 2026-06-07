-- Tillat innloggede brukere å lese og oppdatere egen profilrad (bl.a. email_notifications_enabled).
-- Uten dette feiler oppdateringer fra klienten pga. RLS.

drop policy if exists "Users can select own profile" on public.profiles;
create policy "Users can select own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
