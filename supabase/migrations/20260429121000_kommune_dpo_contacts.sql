-- =============================================================================
-- kommune_dpo_contacts — DPO-kontaktinfo per kommune (GDPR art. 37-39)
-- =============================================================================
-- Bakgrunn:
--   GDPR art. 17 (Retten til sletting) og øvrige rettigheter etter
--   kap. III skal utøves overfor **behandlingsansvarlig**. For Boly er
--   dette kommunen. Når bruker sender en formell Art. 17-forespørsel via
--   /settings/privacy, må den ruttes til riktig kommunes personvernombud.
--
-- Design:
--   - region er PK (en rad per kommune/region, matcher profiles.kommune_region)
--   - dpo_email er obligatorisk (dit forespørsler sendes)
--   - dpo_name er valgfritt men anbefalt
--   - fallback_email brukes hvis region ikke matcher noen kjent kommune
--     (f.eks. testbrukere under utvikling)
--
-- RLS-strategi:
--   - SELECT: alle autentiserte (trenger å se sin kommunes DPO-kontakt)
--   - INSERT/UPDATE/DELETE: kun kommune_admin (håndteres manuelt i dag,
--     admin-UI kan komme senere)
--
-- Referanser:
--   - docs/legal/DBA_Gamechanging_Boly_v3.md §8 (personvernombud)
--   - docs/legal/PRIVACY_NOTICE.md §6 (rettigheter)
-- =============================================================================

create table if not exists public.kommune_dpo_contacts (
  region text primary key,
  dpo_name text,
  dpo_email text not null,
  dpo_phone text,
  fallback boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint kommune_dpo_contacts_email_shape check (dpo_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

comment on table public.kommune_dpo_contacts is
  'Personvernombud-kontakt per kommune/region. Brukes av Privacy Center for å rutte GDPR-forespørsler til riktig behandlingsansvarlig.';

comment on column public.kommune_dpo_contacts.fallback is
  'Én rad med fallback=true brukes når profiles.kommune_region ikke matcher noen kjent kommune.';

alter table public.kommune_dpo_contacts enable row level security;

-- Alle autentiserte brukere kan lese for å finne sin egen kommunes DPO
drop policy if exists "Authenticated can read dpo contacts" on public.kommune_dpo_contacts;
create policy "Authenticated can read dpo contacts"
  on public.kommune_dpo_contacts for select
  to authenticated
  using (true);

-- Kun kommune_admin kan redigere (rollekontroll via profiles.role)
drop policy if exists "Kommune admin can manage dpo contacts" on public.kommune_dpo_contacts;
create policy "Kommune admin can manage dpo contacts"
  on public.kommune_dpo_contacts for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'kommune_admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'kommune_admin'
    )
  );

-- Unik fallback-rad (max én)
create unique index if not exists kommune_dpo_contacts_one_fallback
  on public.kommune_dpo_contacts ((1))
  where fallback = true;

-- Seed: fallback til info@bolynorge.no til kommunene registrerer ekte DPO
insert into public.kommune_dpo_contacts (region, dpo_name, dpo_email, fallback)
values ('__fallback__', 'Boly support', 'info@bolynorge.no', true)
on conflict (region) do nothing;

-- Seed: Narvik kommune (piloterer Boly) — plasseholder, må oppdateres
-- med ekte DPO-e-post fra Narvik før produksjonsbruk
insert into public.kommune_dpo_contacts (region, dpo_name, dpo_email, fallback)
values ('Narvik', 'Personvernombud Narvik kommune', 'personvernombud@narvik.kommune.no', false)
on conflict (region) do update set
  dpo_email = excluded.dpo_email,
  dpo_name = excluded.dpo_name,
  updated_at = now();

-- Hjelpefunksjon: slå opp DPO for en gitt bruker (via profiles.kommune_region)
-- Faller tilbake til fallback-raden hvis ingen region-match
create or replace function public.get_dpo_contact_for_user(p_user_id uuid)
returns table(region text, dpo_name text, dpo_email text, dpo_phone text)
language sql
stable
security definer
set search_path = public
as $$
  with user_region as (
    select coalesce(
      nullif(split_part(coalesce(p.kommune_region::text, ''), ',', 1), ''),
      '__fallback__'
    ) as r
    from public.profiles p where p.id = p_user_id
  ),
  match as (
    select k.region, k.dpo_name, k.dpo_email, k.dpo_phone
    from public.kommune_dpo_contacts k
    join user_region u on lower(k.region) = lower(u.r)
    limit 1
  ),
  fb as (
    select k.region, k.dpo_name, k.dpo_email, k.dpo_phone
    from public.kommune_dpo_contacts k
    where k.fallback = true
    limit 1
  )
  select * from match
  union all
  select * from fb where not exists (select 1 from match)
  limit 1;
$$;

comment on function public.get_dpo_contact_for_user(uuid) is
  'Returnerer DPO-kontakt for brukerens kommune. Faller tilbake til fallback-raden ved manglende match. SECURITY DEFINER for å lese på tvers av RLS.';

revoke all on function public.get_dpo_contact_for_user(uuid) from public;
grant execute on function public.get_dpo_contact_for_user(uuid) to authenticated;
