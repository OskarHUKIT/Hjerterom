-- Hjerterum fresh install: core app tables (Boly foundation)
-- Required before 20250213+ migrations on a NEW empty Supabase project.
-- Does NOT touch any external/existing Boly project — run only on Hjerterum Supabase.

-- ─── User agreements ───
create table if not exists public.user_agreements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  signed_at timestamptz not null default now(),
  agreement_version text not null,
  is_terminated boolean not null default false,
  terminated_at timestamptz,
  unique (user_id, agreement_version)
);

alter table public.user_agreements enable row level security;

-- ─── Nav / kommune notes ───
create table if not exists public.nav_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid references public.listings (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete cascade,
  note_text text not null,
  created_by uuid not null references auth.users (id) on delete cascade
);

alter table public.nav_notes enable row level security;

-- ─── Audit logs ───
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action_type text not null,
  listing_id uuid,
  listing_address text,
  details jsonb
);

alter table public.audit_logs enable row level security;

-- ─── Handover reports ───
create table if not exists public.handover_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid references public.listings (id) on delete cascade,
  reporter_type text not null check (reporter_type in ('homeowner', 'tenant')),
  content jsonb not null,
  is_finalized boolean not null default false,
  signed_at timestamptz,
  anonymous_token uuid default gen_random_uuid()
);

alter table public.handover_reports enable row level security;

-- ─── Notifications ───
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid references public.listings (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  status text not null default 'unread' check (status in ('unread', 'completed')),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  municipality text
);

alter table public.notifications enable row level security;

-- ─── Internal notes (kommune) ───
create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid references public.listings (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete cascade,
  content text not null,
  created_by uuid not null references auth.users (id) on delete cascade
);

alter table public.internal_notes enable row level security;

-- ─── Chat messages ───
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid references auth.users (id) on delete set null,
  listing_id uuid references public.listings (id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  municipality text
);

alter table public.chat_messages enable row level security;

-- ─── Minimal RLS (refined by later migrations) ───
drop policy if exists "Users can view their own agreements" on public.user_agreements;
create policy "Users can view their own agreements"
  on public.user_agreements for select using (auth.uid() = user_id);

drop policy if exists "Users can sign their own agreements" on public.user_agreements;
create policy "Users can sign their own agreements"
  on public.user_agreements for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view their own history" on public.audit_logs;
create policy "Users can view their own history"
  on public.audit_logs for select using (auth.uid() = user_id);

drop policy if exists "System can create logs" on public.audit_logs;
create policy "System can create logs"
  on public.audit_logs for insert with check (true);

drop policy if exists "Users can see their own messages" on public.chat_messages;
create policy "Users can see their own messages"
  on public.chat_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id or receiver_id is null);

drop policy if exists "Users can send messages" on public.chat_messages;
create policy "Users can send messages"
  on public.chat_messages for insert with check (auth.uid() = sender_id);

-- ─── Storage: listings bucket ───
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do nothing;

drop policy if exists "Public Access listings" on storage.objects;
create policy "Public Access listings"
  on storage.objects for select using (bucket_id = 'listings');

drop policy if exists "Authenticated Upload listings" on storage.objects;
create policy "Authenticated Upload listings"
  on storage.objects for insert
  with check (bucket_id = 'listings' and auth.role() = 'authenticated');

comment on table public.chat_messages is 'Utleier ↔ kommune meldinger. Baseline for fresh Hjerterum install.';
