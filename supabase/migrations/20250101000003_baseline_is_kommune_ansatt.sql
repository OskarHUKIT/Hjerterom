-- Baseline: `is_kommune_ansatt()` brukes i RLS/policy i flere migrasjoner (f.eks. listing_mediation_reservations).
-- Originaldefinisjon i 20250219000000_profiles_kommune_notifications.sql — her sikrer vi at funksjonen finnes
-- når bare nyere migrasjoner kjøres manuelt. Krever at public.profiles finnes (20250101000000).

create or replace function public.is_kommune_ansatt()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'kommune_ansatt',
    false
  );
$$;
