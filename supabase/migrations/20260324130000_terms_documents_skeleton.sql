-- Versjonerte vilkår (kommune + signering) — administrasjons-UI og tvungen resignering implementeres i eget steg.
create table if not exists public.terms_documents (
  id uuid primary key default gen_random_uuid(),
  kommune_region text,
  title text not null,
  body text not null,
  version int not null default 1,
  effective_from timestamptz default now(),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default now(),
  supersedes_id uuid references public.terms_documents on delete set null
);

create table if not exists public.user_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  terms_document_id uuid not null references public.terms_documents on delete cascade,
  signed_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'superseded'))
);

create index if not exists idx_user_terms_user on public.user_terms_acceptances (user_id);

comment on column public.user_terms_acceptances.status is 'superseded = erstattet av ny avtale (vis med tag Erstattet av ny avtale).';
