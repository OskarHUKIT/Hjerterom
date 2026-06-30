-- Hjerterum Phase 1: listing lanes (sosial/turisme) + conflict check
-- Phase 2: central events + utleier opt-in

-- ─── Listings: tourism flags ───
alter table public.listings
  add column if not exists tourism_enabled boolean not null default false,
  add column if not exists tourism_nightly_price_cents integer
    check (tourism_nightly_price_cents is null or tourism_nightly_price_cents >= 0);

comment on column public.listings.tourism_enabled is
  'When true, landlord may mark availability periods as turisme lane (finn.hjerterum.no).';
comment on column public.listings.tourism_nightly_price_cents is
  'Display/booking price per night in øre for tourism lane.';

-- ─── Availability: lane per period ───
alter table public.listing_availability
  add column if not exists lane text not null default 'sosial';

alter table public.listing_availability
  drop constraint if exists listing_availability_lane_check;

alter table public.listing_availability
  add constraint listing_availability_lane_check
  check (lane in ('sosial', 'turisme'));

comment on column public.listing_availability.lane is
  'sosial = municipal mediation pool; turisme = short-stay / finn portal. Arrangement uses listing_event_availability.';

-- ─── Conflict detection (any overlap blocks double booking) ───
create or replace function public.check_listing_availability_conflict(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_availability_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict record;
begin
  if p_listing_id is null or p_start_date is null or p_end_date is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_range');
  end if;

  if p_start_date > p_end_date then
    return jsonb_build_object('ok', false, 'reason', 'invalid_range');
  end if;

  select la.id, la.start_date, la.end_date, la.status, la.lane
  into v_conflict
  from public.listing_availability la
  where la.listing_id = p_listing_id
    and (p_exclude_availability_id is null or la.id <> p_exclude_availability_id)
    and la.start_date <= p_end_date
    and la.end_date >= p_start_date
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'overlap',
      'conflict', jsonb_build_object(
        'id', v_conflict.id,
        'start_date', v_conflict.start_date,
        'end_date', v_conflict.end_date,
        'status', v_conflict.status,
        'lane', v_conflict.lane
      )
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.check_listing_availability_conflict(uuid, date, date, uuid) from public;
grant execute on function public.check_listing_availability_conflict(uuid, date, date, uuid) to authenticated;

-- ─── Central events (ops only) ───
create table if not exists public.central_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,
  name text not null,
  description_public text,
  start_date date not null,
  end_date date not null,
  routing_mode text not null default 'saksbehandler'
    check (routing_mode in ('saksbehandler', 'turisme')),
  arrangement_tag text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed')),
  geography_scope jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  closed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  constraint central_events_dates_check check (start_date <= end_date)
);

create index if not exists central_events_status_idx on public.central_events (status, start_date);
create index if not exists central_events_slug_idx on public.central_events (slug);

create table if not exists public.central_event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.central_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'coordinator' check (role in ('coordinator', 'staff')),
  unique (event_id, profile_id)
);

create table if not exists public.listing_event_availability (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  event_id uuid not null references public.central_events(id) on delete cascade,
  available_from date not null,
  available_to date not null,
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  unique (listing_id, event_id),
  constraint listing_event_availability_dates_check check (available_from <= available_to)
);

create index if not exists listing_event_availability_event_idx
  on public.listing_event_availability (event_id, status);

alter table public.central_events enable row level security;
alter table public.central_event_staff enable row level security;
alter table public.listing_event_availability enable row level security;

-- Ops: full access to events
drop policy if exists "Ops manage central_events" on public.central_events;
create policy "Ops manage central_events"
  on public.central_events for all
  using (public.is_boly_operator())
  with check (public.is_boly_operator());

drop policy if exists "Ops manage central_event_staff" on public.central_event_staff;
create policy "Ops manage central_event_staff"
  on public.central_event_staff for all
  using (public.is_boly_operator())
  with check (public.is_boly_operator());

-- Authenticated read published events; ops reads all via policy above
drop policy if exists "Read published central_events" on public.central_events;
create policy "Read published central_events"
  on public.central_events for select
  using (status = 'published' or public.is_boly_operator());

-- Landlord: manage own event opt-in
drop policy if exists "Owners manage listing_event_availability" on public.listing_event_availability;
create policy "Owners manage listing_event_availability"
  on public.listing_event_availability for all
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

drop policy if exists "Kommune read listing_event_availability" on public.listing_event_availability;
create policy "Kommune read listing_event_availability"
  on public.listing_event_availability for select
  using (public.is_kommune_staff() or public.is_boly_operator());

drop policy if exists "Staff read central_event_staff" on public.central_event_staff;
create policy "Staff read central_event_staff"
  on public.central_event_staff for select
  using (
    public.is_boly_operator()
    or profile_id = auth.uid()
    or public.is_kommune_staff()
  );

-- Kommune flags for Los (Phase 5 prep)
alter table public.kommuner
  add column if not exists digital_los_enabled boolean not null default false,
  add column if not exists tourism_enabled boolean not null default false;

comment on column public.kommuner.digital_los_enabled is 'Enable Digital Los handoff for this municipality.';
comment on column public.kommuner.tourism_enabled is 'Municipality participates in tourism lane oversight.';

-- ─── Public read for finn.* portal (anon + authenticated) ───
drop policy if exists "Public read tourism listings" on public.listings;
create policy "Public read tourism listings"
  on public.listings for select
  to anon, authenticated
  using (tourism_enabled = true);

drop policy if exists "Public read tourism availability" on public.listing_availability;
create policy "Public read tourism availability"
  on public.listing_availability for select
  to anon, authenticated
  using (
    lane = 'turisme'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.tourism_enabled = true
    )
  );

drop policy if exists "Public read active event opt-ins" on public.listing_event_availability;
create policy "Public read active event opt-ins"
  on public.listing_event_availability for select
  to anon, authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.central_events ce
      where ce.id = event_id and ce.status = 'published'
    )
  );
