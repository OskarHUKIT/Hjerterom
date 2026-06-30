-- Hjerterum P0: agreements v2, event_ansatt, messaging channels, reviews, group booking, Vipps prep

-- ─── 1. event_ansatt role ───
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role is null
  or role in ('homeowner', 'kommune_ansatt', 'kommune_admin', 'event_ansatt')
);

create or replace function public.is_event_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'event_ansatt'
  );
$$;

create or replace function public.event_staff_event_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ces.event_id
  from public.central_event_staff ces
  where ces.profile_id = auth.uid();
$$;

revoke all on function public.is_event_staff() from public;
grant execute on function public.is_event_staff() to authenticated;
revoke all on function public.event_staff_event_ids() from public;
grant execute on function public.event_staff_event_ids() to authenticated;

-- ─── 2. Terms scope (kommune / event / turisme) ───
alter table public.terms_documents
  add column if not exists scope text not null default 'kommune'
    check (scope in ('kommune', 'event', 'turisme')),
  add column if not exists event_id uuid references public.central_events (id) on delete cascade,
  add column if not exists signing_method text not null default 'bankid'
    check (signing_method in ('bankid', 'click_wrap'));

create index if not exists terms_documents_scope_idx
  on public.terms_documents (scope, event_id)
  where approved_for_utleier_signing = true;

comment on column public.terms_documents.scope is
  'kommune=regional sosial; event=per central_events; turisme=nasjonal (Gamechanging).';

-- Guest click-wrap acceptances
create table if not exists public.guest_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  terms_document_id uuid not null references public.terms_documents (id) on delete restrict,
  accepted_at timestamptz not null default now(),
  unique (user_id, terms_document_id)
);

alter table public.guest_terms_acceptances enable row level security;

drop policy if exists "Guests manage own terms acceptances" on public.guest_terms_acceptances;
create policy "Guests manage own terms acceptances"
  on public.guest_terms_acceptances for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Ops read guest terms acceptances" on public.guest_terms_acceptances;
create policy "Ops read guest terms acceptances"
  on public.guest_terms_acceptances for select
  using (public.is_boly_operator());

-- Landlord: has signed active terms doc
create or replace function public.landlord_has_signed_terms_doc(p_user_id uuid, p_doc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_terms_acceptances uta
    where uta.user_id = p_user_id
      and uta.terms_document_id = p_doc_id
      and uta.status = 'active'
  );
$$;

-- Landlord: signed event terms for event
create or replace function public.landlord_has_event_terms_signed(p_user_id uuid, p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select public.landlord_has_signed_terms_doc(p_user_id, td.id)
      from public.terms_documents td
      where td.scope = 'event'
        and td.event_id = p_event_id
        and td.approved_for_utleier_signing = true
      order by td.version desc, td.effective_from desc
      limit 1
    ),
    true
  );
$$;

-- Landlord: signed tourism terms (if doc exists)
create or replace function public.landlord_has_tourism_terms_signed(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select public.landlord_has_signed_terms_doc(p_user_id, td.id)
      from public.terms_documents td
      where td.scope = 'turisme'
        and td.approved_for_utleier_signing = true
      order by td.version desc, td.effective_from desc
      limit 1
    ),
    true
  );
$$;

-- Guest: tourism click-wrap
create or replace function public.guest_has_tourism_terms_accepted(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select exists (
        select 1
        from public.guest_terms_acceptances gta
        join public.terms_documents td on td.id = gta.terms_document_id
        where gta.user_id = p_user_id
          and td.scope = 'turisme'
          and td.signing_method = 'click_wrap'
          and td.approved_for_utleier_signing = true
      )
    ),
    true
  );
$$;

revoke all on function public.landlord_has_signed_terms_doc(uuid, uuid) from public;
grant execute on function public.landlord_has_signed_terms_doc(uuid, uuid) to authenticated;
revoke all on function public.landlord_has_event_terms_signed(uuid, uuid) from public;
grant execute on function public.landlord_has_event_terms_signed(uuid, uuid) to authenticated;
revoke all on function public.landlord_has_tourism_terms_signed(uuid) from public;
grant execute on function public.landlord_has_tourism_terms_signed(uuid) to authenticated;
revoke all on function public.guest_has_tourism_terms_accepted(uuid) from public;
grant execute on function public.guest_has_tourism_terms_accepted(uuid) to authenticated;

-- ─── 3. Messaging channel types ───
alter table public.chat_messages
  add column if not exists channel_type text not null default 'social_caseworker'
    check (channel_type in ('social_caseworker', 'event_caseworker', 'guest_booking')),
  add column if not exists booking_id uuid references public.bookings (id) on delete set null,
  add column if not exists event_id uuid references public.central_events (id) on delete set null;

create index if not exists chat_messages_channel_idx
  on public.chat_messages (sender_id, receiver_id, channel_type, created_at desc);

-- ─── 4. Los handoff contact info ───
alter table public.los_handoffs
  add column if not exists contact_name text,
  add column if not exists contact_phone text;

create or replace function public.los_create_handoff(
  p_session_id uuid,
  p_summary text,
  p_kommune_slug text default null,
  p_contact_name text default null,
  p_contact_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_kommune_id uuid;
  v_ref text;
begin
  if p_contact_name is null or length(trim(p_contact_name)) = 0 then
    raise exception 'contact_name required';
  end if;

  if p_kommune_slug is not null and trim(p_kommune_slug) <> '' then
    select k.id into v_kommune_id
    from public.kommuner k
    where k.slug = lower(trim(p_kommune_slug))
      and k.digital_los_enabled = true
    limit 1;
  end if;

  v_ref := 'LOS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.los_handoffs (
    session_id, summary_text, kommune_id, case_reference, status,
    contact_name, contact_phone
  )
  values (
    p_session_id,
    coalesce(nullif(trim(p_summary), ''), 'Digital Los-henvendelse'),
    v_kommune_id,
    v_ref,
    'new',
    trim(p_contact_name),
    nullif(trim(coalesce(p_contact_phone, '')), '')
  )
  returning id into v_id;

  update public.los_sessions
  set
    handed_off_at = now(),
    kommune_id = coalesce(v_kommune_id, kommune_id),
    consent_level = 'contact'
  where id = p_session_id;

  return v_id;
end;
$$;

revoke all on function public.los_create_handoff(uuid, text, text, text, text) from public;
grant execute on function public.los_create_handoff(uuid, text, text, text, text) to anon, authenticated;

drop function if exists public.los_create_handoff(uuid, text, text);

-- Filter Los handoffs by kommune grants (all SB in kommune see all cases there)
drop policy if exists "Kommune read los handoffs" on public.los_handoffs;
create policy "Kommune read los handoffs"
  on public.los_handoffs for select
  using (
    public.is_boly_operator()
    or (
      public.is_kommune_staff()
      and (
        kommune_id is null
        or exists (
          select 1 from public.user_kommune_grants ukg
          where ukg.profile_id = auth.uid()
            and ukg.kommune_id = los_handoffs.kommune_id
        )
      )
    )
  );

-- ─── 5. Group booking ───
create table if not exists public.booking_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  guest_user_id uuid references auth.users (id) on delete set null,
  guest_email text not null,
  event_id uuid references public.central_events (id) on delete set null,
  label text
);

alter table public.bookings
  add column if not exists booking_group_id uuid references public.booking_groups (id) on delete set null;

alter table public.bookings
  add column if not exists payment_provider text check (payment_provider is null or payment_provider in ('stripe', 'vipps')),
  add column if not exists vipps_order_id text;

create index if not exists bookings_group_idx on public.bookings (booking_group_id);

alter table public.booking_groups enable row level security;

drop policy if exists "Guest read own booking groups" on public.booking_groups;
create policy "Guest read own booking groups"
  on public.booking_groups for select
  using (
    guest_user_id = auth.uid()
    or guest_email = (auth.jwt() ->> 'email')
  );

drop policy if exists "Guest insert booking groups" on public.booking_groups;
create policy "Guest insert booking groups"
  on public.booking_groups for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Owner read booking groups for listings" on public.booking_groups;
create policy "Owner read booking groups for listings"
  on public.booking_groups for select
  using (
    exists (
      select 1 from public.bookings b
      join public.listings l on l.id = b.listing_id
      where b.booking_group_id = booking_groups.id
        and l.owner_id = auth.uid()
    )
  );

-- ─── 6. Reviews v1 ───
create table if not exists public.booking_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  reviewer_user_id uuid references auth.users (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);

alter table public.booking_reviews enable row level security;

drop policy if exists "Public read booking reviews" on public.booking_reviews;
create policy "Public read booking reviews"
  on public.booking_reviews for select
  using (true);

drop policy if exists "Guest insert own review" on public.booking_reviews;
create policy "Guest insert own review"
  on public.booking_reviews for insert
  to authenticated
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.status in ('paid', 'completed')
        and (b.guest_user_id = auth.uid() or b.guest_email = (auth.jwt() ->> 'email'))
    )
  );

-- ─── 7. Event staff RLS (isolated from social) ───
drop policy if exists "Staff read event inquiries" on public.event_inquiries;
create policy "Staff read event inquiries"
  on public.event_inquiries for select
  using (
    public.is_boly_operator()
    or (
      public.is_event_staff()
      and event_id in (select public.event_staff_event_ids())
    )
    or (
      public.is_kommune_staff()
      and not public.is_event_staff()
    )
  );

drop policy if exists "Staff update event inquiries" on public.event_inquiries;
create policy "Staff update event inquiries"
  on public.event_inquiries for update
  using (
    public.is_boly_operator()
    or (
      public.is_event_staff()
      and event_id in (select public.event_staff_event_ids())
    )
    or (
      public.is_kommune_staff()
      and not public.is_event_staff()
    )
  )
  with check (
    public.is_boly_operator()
    or (
      public.is_event_staff()
      and event_id in (select public.event_staff_event_ids())
    )
    or (
      public.is_kommune_staff()
      and not public.is_event_staff()
    )
  );

drop policy if exists "Staff read central_event_staff" on public.central_event_staff;
create policy "Staff read central_event_staff"
  on public.central_event_staff for select
  using (
    public.is_boly_operator()
    or profile_id = auth.uid()
    or public.is_kommune_staff()
  );

drop policy if exists "Kommune read listing_event_availability" on public.listing_event_availability;
create policy "Kommune read listing_event_availability"
  on public.listing_event_availability for select
  using (
    public.is_boly_operator()
    or (public.is_kommune_staff() and not public.is_event_staff())
    or (
      public.is_event_staff()
      and event_id in (select public.event_staff_event_ids())
    )
  );

drop policy if exists "Read published central_events" on public.central_events;
create policy "Read published central_events"
  on public.central_events for select
  using (
    status = 'published'
    or public.is_boly_operator()
    or (public.is_kommune_staff() and not public.is_event_staff())
    or (
      public.is_event_staff()
      and id in (select public.event_staff_event_ids())
    )
  );
