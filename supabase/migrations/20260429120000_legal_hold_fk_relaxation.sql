-- =============================================================================
-- Legal-hold FK relaxation for GDPR Privacy Center  (FASE 1 av 3)
-- =============================================================================
-- VIKTIG — LES FØR DEPLOY:
--
--   Dette er del 1 av 3 i implementasjonen av GDPR-kompatibel brukersletting.
--   Alene er migrasjonen TRYGG å deploye: den eneste adferdsendringen er at
--   sletting av en `auth.users`-rad etter dette vil etterlate tombstone-rader
--   (user_id = NULL) i stedet for å kaskadeslette legal-hold-tabellene.
--
--   MEN: for en komplett, GDPR-lovet pseudonymisering (ref. DBA §9.3) må også
--   fase 2 og 3 deployes:
--
--     Fase 2 — Pseudonymiserings-RPC:
--       - fyller ut user_id_pseudonym = uuid_v5(original_user_id, pepper)
--       - masker `audit_logs.listing_address` til kommune + postnummer
--       - fjerner `audit_logs.details.signingSessionId` (Signicat-spor)
--       - fjerner BankID-bundne felter fra `user_agreements` hvor ikke strengt
--         nødvendig for bokføringsloven § 13 (3)
--
--     Fase 3 — Retensjonsutvidelse:
--       - utvider boly_retention_sweep() til å slette pseudonyme tombstone-
--         rader eldre enn 5 år (jf. DBA §C.4)
--       - dokumentert i DBA §F.1
--
--   Inntil fase 2 er på plass vil tombstone-rader fortsatt inneholde
--   INDIREKTE PII (f.eks. boligadresse, BankID session-ID) som kan spores
--   tilbake til person via eksterne systemer (Signicat, offentlige registre).
--   Dette er lovlig som legal hold (GDPR art. 17 nr. 3 b + e) og dekkes
--   eksplisitt av DBA §9.3. Det er IKKE "anonymisering" i GDPR-forstand
--   (jf. recital 26); det er "pseudonymisering" (art. 4 nr. 5).
--
--   Derfor:
--     - Offentlig tekst i UI og personvernerklæring MÅ si "pseudonymisert"
--       (ikke "anonymisert"). Oppdatert i denne PR-en.
--     - Selvbetjent sletteknapp i /settings/privacy er IKKE eksponert i
--       fase 1 — brukere rutes til kommunens DPO for manuell Art. 17-
--       vurdering. Endret i denne PR-en.
--
-- =============================================================================
-- Bakgrunn:
--   supabase/migrations/20250231000000_auth_users_cascade_delete.sql satte
--   ON DELETE CASCADE på user_agreements og audit_logs slik at Supabase Studio
--   skulle kunne slette brukere. Dette er *riktig* for trygge bruker-data,
--   men **destruerer signert bevisverdi** i user_agreements / audit_logs når
--   en bruker slettes. Signerte vilkårsavtaler og BankID-signaturspor må
--   beholdes pseudonymt i 5 år (bokføringsloven § 13 (3)) selv etter at
--   brukerens PII er slettet.
--
-- Hva denne migrasjonen gjør:
--   1) Endrer ON DELETE-policy fra CASCADE til SET NULL for:
--        - public.user_agreements.user_id
--        - public.user_terms_acceptances.user_id
--        - public.audit_logs.user_id
--      Slik at raden overlever sletting av auth.users-raden som
--      «tombstoned record» med user_id = NULL.
--
--   2) Legger til en kolonne `user_id_pseudonym text` på samme tre tabeller,
--      som det fremtidige erasure-RPC'et fyller med en deterministisk
--      uuid-v5-hash (avledet fra original user_id + server-side pepper)
--      slik at vi kan korrelere rader som tilhørte samme slettede bruker
--      for revisjonsspor, men uten å kunne mappe tilbake til identiteten.
--
--   3) Oppdaterer relevante RLS-policies til å ekskludere tombstone-rader
--      fra selvbetjent innsyn (brukeren er jo slettet).
--
-- Ikke-omfang:
--   - Sletting av tombstone-rader etter 5 år: håndteres av en separat
--     utvidelse av boly_retention_sweep() i neste PR.
--   - Pseudonymiseringslogikken selv: innføres med erasure-RPC'et i neste PR.
--
-- Referanser:
--   - docs/legal/PRIVACY_NOTICE.md §5 (retensjon, nå 5 år)
--   - supabase/migrations/20250231000000_auth_users_cascade_delete.sql
--   - Bokføringsloven § 13 (3)
-- =============================================================================

-- 1. user_agreements — signerte vilkårsavtaler (BankID-ankret)
alter table public.user_agreements
  drop constraint if exists user_agreements_user_id_fkey;

alter table public.user_agreements
  alter column user_id drop not null;

alter table public.user_agreements
  add constraint user_agreements_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

alter table public.user_agreements
  add column if not exists user_id_pseudonym text;

create index if not exists idx_user_agreements_user_id_pseudonym
  on public.user_agreements (user_id_pseudonym)
  where user_id_pseudonym is not null;

comment on column public.user_agreements.user_id_pseudonym is
  'Deterministisk pseudonym (uuid-v5-hash) satt av erasure-RPC når user_id nulles ut. Brukes for legal-hold-revisjon uten å kunne mappe tilbake til identitet.';

-- 2. user_terms_acceptances — versjonerte vilkårs-signeringer
alter table public.user_terms_acceptances
  drop constraint if exists user_terms_acceptances_user_id_fkey;

alter table public.user_terms_acceptances
  alter column user_id drop not null;

alter table public.user_terms_acceptances
  add constraint user_terms_acceptances_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

alter table public.user_terms_acceptances
  add column if not exists user_id_pseudonym text;

create index if not exists idx_user_terms_acceptances_user_id_pseudonym
  on public.user_terms_acceptances (user_id_pseudonym)
  where user_id_pseudonym is not null;

comment on column public.user_terms_acceptances.user_id_pseudonym is
  'Deterministisk pseudonym. Se user_agreements.user_id_pseudonym.';

-- 3. audit_logs — SIGN_TERMS_BANKID, KOMMUNE_TERMINATE_*, m.m. = rettslig spor
alter table public.audit_logs
  drop constraint if exists audit_logs_user_id_fkey;

alter table public.audit_logs
  alter column user_id drop not null;

alter table public.audit_logs
  add constraint audit_logs_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

alter table public.audit_logs
  add column if not exists user_id_pseudonym text;

create index if not exists idx_audit_logs_user_id_pseudonym
  on public.audit_logs (user_id_pseudonym)
  where user_id_pseudonym is not null;

comment on column public.audit_logs.user_id_pseudonym is
  'Deterministisk pseudonym. Se user_agreements.user_id_pseudonym.';

-- 4. RLS-oppdatering: tombstone-rader (user_id = null) skal ikke vises til
--    noen vanlig bruker. Kommune-admin kan fortsatt se dem via egne policies
--    (for revisjons- og retensjons-formål).

drop policy if exists "Users can view their own agreements" on public.user_agreements;
create policy "Users can view their own agreements"
  on public.user_agreements for select
  using (auth.uid() is not null and user_id = auth.uid());

comment on policy "Users can view their own agreements" on public.user_agreements is
  'Tombstone-rader (user_id null) er usynlige for vanlige brukere. Kommune ser dem via egen policy.';
