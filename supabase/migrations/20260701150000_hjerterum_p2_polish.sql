-- Hjerterum P2: check-in guide, co-host, quick replies, guest list on bookings

-- ─── Check-in guide (tourism) ───
alter table public.listings
  add column if not exists tourism_check_in_guide text;

comment on column public.listings.tourism_check_in_guide is
  'Check-in instructions shown to guest after booking is accepted/paid.';

-- ─── Co-hosts (secondary managers per listing) ───
create table if not exists public.listing_cohosts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  cohost_user_id uuid not null references auth.users (id) on delete cascade,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (listing_id, cohost_user_id)
);

create index if not exists listing_cohosts_listing_idx on public.listing_cohosts (listing_id);
create index if not exists listing_cohosts_user_idx on public.listing_cohosts (cohost_user_id);

alter table public.listing_cohosts enable row level security;

drop policy if exists "Owner manage listing cohosts" on public.listing_cohosts;
create policy "Owner manage listing cohosts"
  on public.listing_cohosts for all
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
    or public.is_boly_operator()
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
    or public.is_boly_operator()
  );

drop policy if exists "Cohost read own rows" on public.listing_cohosts;
create policy "Cohost read own rows"
  on public.listing_cohosts for select
  using (cohost_user_id = auth.uid());

create or replace function public.is_listing_cohost(p_listing_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listing_cohosts c
    where c.listing_id = p_listing_id and c.cohost_user_id = p_user_id
  );
$$;

revoke all on function public.is_listing_cohost(uuid, uuid) from public;
grant execute on function public.is_listing_cohost(uuid, uuid) to authenticated;

create or replace function public.add_listing_cohost_by_email(
  p_listing_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cohost uuid;
  v_id uuid;
begin
  if v_uid is null or p_email is null or length(trim(p_email)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if not exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.owner_id = v_uid
  ) and not public.is_boly_operator() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select p.id into v_cohost
  from public.profiles p
  where lower(trim(p.email)) = lower(trim(p_email))
  limit 1;

  if v_cohost is null then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if v_cohost = v_uid then
    return jsonb_build_object('ok', false, 'error', 'self');
  end if;

  insert into public.listing_cohosts (listing_id, cohost_user_id, invited_by)
  values (p_listing_id, v_cohost, v_uid)
  on conflict (listing_id, cohost_user_id) do nothing
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.add_listing_cohost_by_email(uuid, text) from public;
grant execute on function public.add_listing_cohost_by_email(uuid, text) to authenticated;

create or replace function public.list_listing_cohosts(p_listing_id uuid)
returns table (
  id uuid,
  cohost_user_id uuid,
  display_name text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.cohost_user_id, p.full_name, p.email
  from public.listing_cohosts c
  join public.profiles p on p.id = c.cohost_user_id
  where c.listing_id = p_listing_id
    and (
      exists (select 1 from public.listings l where l.id = p_listing_id and l.owner_id = auth.uid())
      or public.is_boly_operator()
      or c.cohost_user_id = auth.uid()
    );
$$;

revoke all on function public.list_listing_cohosts(uuid) from public;
grant execute on function public.list_listing_cohosts(uuid) to authenticated;

-- ─── Quick reply templates ───
create table if not exists public.message_quick_replies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  body text not null,
  channel_type text check (channel_type is null or channel_type in ('social_caseworker', 'event_caseworker', 'guest_booking')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists message_quick_replies_owner_idx
  on public.message_quick_replies (owner_id, sort_order);

alter table public.message_quick_replies enable row level security;

drop policy if exists "Users manage own quick replies" on public.message_quick_replies;
create policy "Users manage own quick replies"
  on public.message_quick_replies for all
  using (owner_id = auth.uid() or public.is_boly_operator())
  with check (owner_id = auth.uid() or public.is_boly_operator());

-- ─── Booking guest list (co-travelers) ───
create table if not exists public.booking_guests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  guest_email text not null,
  guest_name text,
  guest_user_id uuid references auth.users (id) on delete set null,
  invited_by uuid references auth.users (id) on delete set null,
  invited_at timestamptz not null default now(),
  unique (booking_id, guest_email)
);

create index if not exists booking_guests_booking_idx on public.booking_guests (booking_id);

alter table public.booking_guests enable row level security;

drop policy if exists "Primary guest manage booking guests" on public.booking_guests;
create policy "Primary guest manage booking guests"
  on public.booking_guests for all
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.guest_user_id = auth.uid()
          or b.guest_email = (auth.jwt() ->> 'email')
        )
    )
    or guest_user_id = auth.uid()
    or public.is_boly_operator()
  )
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.guest_user_id = auth.uid()
          or b.guest_email = (auth.jwt() ->> 'email')
        )
    )
    or public.is_boly_operator()
  );

drop policy if exists "Landlord read booking guests" on public.booking_guests;
create policy "Landlord read booking guests"
  on public.booking_guests for select
  using (
    exists (
      select 1 from public.bookings b
      join public.listings l on l.id = b.listing_id
      where b.id = booking_id
        and (
          l.owner_id = auth.uid()
          or public.is_listing_cohost(l.id, auth.uid())
        )
    )
  );

-- Extend booking message participant check for co-travelers
create or replace function public._booking_message_participant(p_booking_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.listings l on l.id = b.listing_id
    where b.id = p_booking_id
      and (
        b.guest_user_id = p_uid
        or l.owner_id = p_uid
        or public.is_listing_cohost(l.id, p_uid)
        or exists (
          select 1 from public.booking_guests bg
          where bg.booking_id = b.id and bg.guest_user_id = p_uid
        )
        or public.is_boly_operator()
      )
  );
$$;

create or replace function public.invite_booking_guest(
  p_booking_id uuid,
  p_guest_email text,
  p_guest_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_id uuid;
begin
  if v_uid is null or p_guest_email is null or length(trim(p_guest_email)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_booking.guest_user_id <> v_uid
     and v_booking.guest_email <> (auth.jwt() ->> 'email') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_booking.status not in ('pending', 'accepted', 'paid', 'completed') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  insert into public.booking_guests (booking_id, guest_email, guest_name, invited_by)
  values (
    p_booking_id,
    lower(trim(p_guest_email)),
    nullif(trim(coalesce(p_guest_name, '')), ''),
    v_uid
  )
  on conflict (booking_id, guest_email) do update
    set guest_name = coalesce(excluded.guest_name, booking_guests.guest_name)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.list_booking_guests(p_booking_id uuid)
returns setof public.booking_guests
language sql
stable
security definer
set search_path = public
as $$
  select bg.*
  from public.booking_guests bg
  where bg.booking_id = p_booking_id
    and public._booking_message_participant(p_booking_id, auth.uid())
  order by bg.invited_at asc;
$$;

create or replace function public.get_booking_check_in_guide(p_booking_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select l.tourism_check_in_guide
  from public.bookings b
  join public.listings l on l.id = b.listing_id
  where b.id = p_booking_id
    and public._booking_message_participant(p_booking_id, auth.uid())
    and b.status in ('accepted', 'paid', 'completed')
  limit 1;
$$;

revoke all on function public.invite_booking_guest(uuid, text, text) from public;
grant execute on function public.invite_booking_guest(uuid, text, text) to authenticated;
revoke all on function public.list_booking_guests(uuid) from public;
grant execute on function public.list_booking_guests(uuid) to authenticated;
revoke all on function public.get_booking_check_in_guide(uuid) from public;
grant execute on function public.get_booking_check_in_guide(uuid) to authenticated;

-- Co-host can send booking messages on behalf of landlord
create or replace function public.send_booking_message(
  p_booking_id uuid,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_owner_id uuid;
  v_receiver uuid;
  v_msg_id uuid;
begin
  if v_uid is null or p_content is null or length(trim(p_content)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select b.* into v_booking from public.bookings b where b.id = p_booking_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select l.owner_id into v_owner_id from public.listings l where l.id = v_booking.listing_id;

  if v_uid = v_owner_id or public.is_listing_cohost(v_booking.listing_id, v_uid) then
    v_receiver := v_booking.guest_user_id;
  elsif v_uid = v_booking.guest_user_id then
    v_receiver := v_owner_id;
  elsif exists (
    select 1 from public.booking_guests bg
    where bg.booking_id = p_booking_id and bg.guest_user_id = v_uid
  ) then
    v_receiver := v_owner_id;
  elsif public.is_boly_operator() then
    v_receiver := v_owner_id;
  else
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_receiver is null then
    return jsonb_build_object('ok', false, 'error', 'no_receiver');
  end if;

  insert into public.chat_messages (
    sender_id, receiver_id, listing_id, content, channel_type, booking_id
  )
  values (
    v_uid,
    v_receiver,
    v_booking.listing_id,
    trim(p_content),
    'guest_booking',
    p_booking_id
  )
  returning id into v_msg_id;

  return jsonb_build_object('ok', true, 'message_id', v_msg_id);
end;
$$;
