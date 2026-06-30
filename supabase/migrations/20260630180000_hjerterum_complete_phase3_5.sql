-- Hjerterum Phase 3–5: event inquiries, bookings, guest profiles, Digital Los
-- Run after 20260630120000_hjerterum_lanes_and_central_events.sql

-- ─── Listings: booking + Stripe Connect prep ───
alter table public.listings
  add column if not exists tourism_instant_book boolean not null default false,
  add column if not exists stripe_connect_account_id text,
  add column if not exists cancellation_policy text not null default 'moderate'
    check (cancellation_policy in ('flexible', 'moderate', 'strict'));

comment on column public.listings.tourism_instant_book is
  'When true, accepted booking requests can proceed to payment without manual accept.';
comment on column public.listings.stripe_connect_account_id is
  'Stripe Connect account id (acct_...) — set after landlord onboarding.';
comment on column public.listings.cancellation_policy is
  'Cancellation template for tourism bookings.';

-- ─── Guest profiles (light auth for finn.*) ───
create table if not exists public.guest_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  phone text,
  phone_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guest_profiles enable row level security;

drop policy if exists "Guests read own profile" on public.guest_profiles;
create policy "Guests read own profile"
  on public.guest_profiles for select
  using (auth.uid() = id);

drop policy if exists "Guests upsert own profile" on public.guest_profiles;
create policy "Guests upsert own profile"
  on public.guest_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Ops read guest profiles" on public.guest_profiles;
create policy "Ops read guest profiles"
  on public.guest_profiles for select
  using (public.is_boly_operator());

-- ─── Event inquiries (saksbehandler-path) ───
create table if not exists public.event_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_id uuid not null references public.central_events (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  message text,
  date_from date,
  date_to date,
  status text not null default 'new'
    check (status in ('new', 'assigned', 'mediated', 'closed')),
  assigned_profile_id uuid references public.profiles (id) on delete set null
);

create index if not exists event_inquiries_event_idx on public.event_inquiries (event_id, status);
create index if not exists event_inquiries_status_idx on public.event_inquiries (status, created_at desc);

alter table public.event_inquiries enable row level security;

drop policy if exists "Public insert event inquiries" on public.event_inquiries;
create policy "Public insert event inquiries"
  on public.event_inquiries for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.central_events ce
      where ce.id = event_id and ce.status = 'published'
    )
  );

drop policy if exists "Staff read event inquiries" on public.event_inquiries;
create policy "Staff read event inquiries"
  on public.event_inquiries for select
  using (public.is_kommune_staff() or public.is_boly_operator());

drop policy if exists "Staff update event inquiries" on public.event_inquiries;
create policy "Staff update event inquiries"
  on public.event_inquiries for update
  using (public.is_kommune_staff() or public.is_boly_operator())
  with check (public.is_kommune_staff() or public.is_boly_operator());

-- ─── Bookings (turisme-path) ───
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  event_id uuid references public.central_events (id) on delete set null,
  guest_user_id uuid references auth.users (id) on delete set null,
  guest_email text not null,
  guest_name text,
  guest_phone text,
  check_in date not null,
  check_out date not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'paid', 'cancelled', 'completed', 'rejected')),
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  currency text not null default 'NOK',
  payment_intent_id text,
  message text,
  constraint bookings_dates_check check (check_in <= check_out)
);

create index if not exists bookings_listing_idx on public.bookings (listing_id, status);
create index if not exists bookings_guest_idx on public.bookings (guest_email, created_at desc);

alter table public.bookings enable row level security;

drop policy if exists "Public insert booking requests" on public.bookings;
create policy "Public insert booking requests"
  on public.bookings for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.tourism_enabled = true
    )
  );

drop policy if exists "Guest read own bookings" on public.bookings;
create policy "Guest read own bookings"
  on public.bookings for select
  using (
    guest_user_id = auth.uid()
    or guest_email = (auth.jwt() ->> 'email')
  );

drop policy if exists "Owner manage listing bookings" on public.bookings;
create policy "Owner manage listing bookings"
  on public.bookings for all
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "Kommune read bookings" on public.bookings;
create policy "Kommune read bookings"
  on public.bookings for select
  using (public.is_kommune_staff() or public.is_boly_operator());

-- ─── Digital Los ───
create table if not exists public.los_sessions (
  id uuid primary key default gen_random_uuid(),
  anonymous_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  kommune_id uuid references public.kommuner (id) on delete set null,
  consent_level text not null default 'anonymous'
    check (consent_level in ('anonymous', 'contact', 'full')),
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  handed_off_at timestamptz
);

create index if not exists los_sessions_token_idx on public.los_sessions (anonymous_token);

alter table public.los_sessions enable row level security;

drop policy if exists "Anyone create los session" on public.los_sessions;
create policy "Anyone create los session"
  on public.los_sessions for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Read los session by token" on public.los_sessions;
create policy "Read los session by token"
  on public.los_sessions for select
  to anon, authenticated
  using (true);

drop policy if exists "Update los session messages" on public.los_sessions;
create policy "Update los session messages"
  on public.los_sessions for update
  to anon, authenticated
  using (handed_off_at is null)
  with check (handed_off_at is null);

create table if not exists public.los_handoffs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.los_sessions (id) on delete cascade,
  assigned_profile_id uuid references public.profiles (id) on delete set null,
  summary_text text not null,
  status text not null default 'new'
    check (status in ('new', 'assigned', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists los_handoffs_status_idx on public.los_handoffs (status, created_at desc);

alter table public.los_handoffs enable row level security;

drop policy if exists "Kommune read los handoffs" on public.los_handoffs;
create policy "Kommune read los handoffs"
  on public.los_handoffs for select
  using (public.is_kommune_staff() or public.is_boly_operator());

drop policy if exists "Kommune update los handoffs" on public.los_handoffs;
create policy "Kommune update los handoffs"
  on public.los_handoffs for update
  using (public.is_kommune_staff() or public.is_boly_operator())
  with check (public.is_kommune_staff() or public.is_boly_operator());

drop policy if exists "Insert los handoff from session" on public.los_handoffs;
create policy "Insert los handoff from session"
  on public.los_handoffs for insert
  to anon, authenticated
  with check (true);

-- ─── RPC: append Los message (rate-safe append) ───
create or replace function public.los_append_message(
  p_session_id uuid,
  p_role text,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg jsonb;
begin
  if p_session_id is null or p_content is null or length(trim(p_content)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_msg := jsonb_build_object(
    'role', coalesce(nullif(trim(p_role), ''), 'user'),
    'content', trim(p_content),
    'at', now()
  );

  update public.los_sessions
  set messages = messages || v_msg
  where id = p_session_id and handed_off_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'session_closed');
  end if;

  return jsonb_build_object('ok', true, 'message', v_msg);
end;
$$;

revoke all on function public.los_append_message(uuid, text, text) from public;
grant execute on function public.los_append_message(uuid, text, text) to anon, authenticated;

-- ─── RPC: create Los handoff ───
create or replace function public.los_create_handoff(
  p_session_id uuid,
  p_summary text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.los_handoffs (session_id, summary_text)
  values (p_session_id, coalesce(nullif(trim(p_summary), ''), 'Digital Los-henvendelse'))
  returning id into v_id;

  update public.los_sessions
  set handed_off_at = now()
  where id = p_session_id;

  return v_id;
end;
$$;

revoke all on function public.los_create_handoff(uuid, text) from public;
grant execute on function public.los_create_handoff(uuid, text) to anon, authenticated;

-- ─── Public read published events for anon (finn) ───
-- Existing policy may require auth; ensure anon can read published
drop policy if exists "Anon read published central_events" on public.central_events;
create policy "Anon read published central_events"
  on public.central_events for select
  to anon
  using (status = 'published');
