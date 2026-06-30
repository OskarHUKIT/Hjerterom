-- Event formidling (RLS), event_caseworker meldingskanal, turist/forbedringer

-- ─── Event-scoped formidling på listing_availability ───
alter table public.listing_availability
  add column if not exists event_id uuid references public.central_events (id) on delete set null;

create index if not exists listing_availability_event_idx
  on public.listing_availability (event_id)
  where event_id is not null;

create or replace function public.event_staff_may_edit_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_event_staff()
    and exists (
      select 1
      from public.listing_event_availability lea
      where lea.listing_id = p_listing_id
        and lea.status = 'active'
        and lea.event_id in (select public.event_staff_event_ids())
    );
$$;

revoke all on function public.event_staff_may_edit_listing(uuid) from public;
grant execute on function public.event_staff_may_edit_listing(uuid) to authenticated;

-- Event staff: les/skriv availability for event-boliger
drop policy if exists "Event staff read availability" on public.listing_availability;
create policy "Event staff read availability"
  on public.listing_availability for select
  using (public.is_event_staff());

drop policy if exists "Event staff insert availability" on public.listing_availability;
create policy "Event staff insert availability"
  on public.listing_availability for insert
  with check (public.event_staff_may_edit_listing(listing_id));

drop policy if exists "Event staff update availability" on public.listing_availability;
create policy "Event staff update availability"
  on public.listing_availability for update
  using (public.event_staff_may_edit_listing(listing_id));

drop policy if exists "Event staff delete availability" on public.listing_availability;
create policy "Event staff delete availability"
  on public.listing_availability for delete
  using (public.event_staff_may_edit_listing(listing_id));

drop policy if exists "Event staff update listings for event opt-in" on public.listings;
create policy "Event staff update listings for event opt-in"
  on public.listings for update
  using (public.event_staff_may_edit_listing(id))
  with check (public.event_staff_may_edit_listing(id));

-- ─── Event ↔ utleier meldinger (channel_type = event_caseworker) ───

create or replace function public.landlord_event_ids(p_owner_id uuid default auth.uid())
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct lea.event_id
  from public.listing_event_availability lea
  inner join public.listings l on l.id = lea.listing_id
  where l.owner_id = coalesce(p_owner_id, auth.uid())
    and lea.status = 'active';
$$;

revoke all on function public.landlord_event_ids(uuid) from public;
grant execute on function public.landlord_event_ids(uuid) to authenticated;

create or replace function public.get_event_landlord_thread_summaries()
returns table (
  landlord_id uuid,
  event_id uuid,
  event_name text,
  last_at timestamptz,
  last_preview text,
  last_sender_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_event_staff() then return; end if;

  return query
  with scoped as (
    select distinct l.owner_id as lid, lea.event_id as eid
    from public.listing_event_availability lea
    inner join public.listings l on l.id = lea.listing_id
    where lea.status = 'active'
      and lea.event_id in (select public.event_staff_event_ids())
  ),
  thread_msgs as (
    select cm.*, s.lid, s.eid
    from public.chat_messages cm
    inner join scoped s on cm.event_id = s.eid
      and cm.channel_type = 'event_caseworker'
      and (
        (cm.sender_id = s.lid and (cm.receiver_id is null or public.is_event_staff()))
        or (cm.receiver_id = s.lid and public.is_event_staff())
        or (cm.sender_id in (select p.id from public.profiles p where p.role = 'event_ansatt') and cm.receiver_id = s.lid)
      )
  ),
  ranked as (
    select
      tm.lid,
      tm.eid,
      tm.created_at,
      tm.content,
      tm.image_urls,
      tm.sender_id,
      row_number() over (partition by tm.lid, tm.eid order by tm.created_at desc) as rn
    from thread_msgs tm
  )
  select
    s.lid,
    s.eid,
    ce.name,
    r.created_at,
    left(
      case
        when coalesce(trim(r.content), '') <> '' then trim(r.content)
        when coalesce(array_length(r.image_urls, 1), 0) > 0 then '[Bilde]'
        else ''
      end,
      120
    ),
    r.sender_id
  from scoped s
  inner join public.central_events ce on ce.id = s.eid
  left join ranked r on r.lid = s.lid and r.eid = s.eid and r.rn = 1
  order by coalesce(r.created_at, '1970-01-01'::timestamptz) desc;
end;
$$;

create or replace function public.get_event_landlord_thread_messages(
  p_landlord_id uuid,
  p_event_id uuid
)
returns setof public.chat_messages
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_event_staff() then return; end if;
  if p_event_id not in (select public.event_staff_event_ids()) then return; end if;
  if not exists (
    select 1
    from public.listing_event_availability lea
    inner join public.listings l on l.id = lea.listing_id
    where l.owner_id = p_landlord_id
      and lea.event_id = p_event_id
      and lea.status = 'active'
  ) then
    return;
  end if;

  return query
  select cm.*
  from public.chat_messages cm
  where cm.channel_type = 'event_caseworker'
    and cm.event_id = p_event_id
    and (
      cm.sender_id = p_landlord_id
      or cm.receiver_id = p_landlord_id
      or (cm.sender_id in (select p.id from public.profiles p where p.role = 'event_ansatt') and cm.receiver_id is null)
    )
  order by cm.created_at asc;
end;
$$;

create or replace function public.get_landlord_event_threads()
returns table (
  event_id uuid,
  event_name text,
  last_at timestamptz,
  last_preview text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;

  return query
  with events as (
    select unnest(array(select public.landlord_event_ids(v_uid))) as eid
  ),
  msgs as (
    select cm.event_id as eid, cm.created_at, cm.content, cm.image_urls
    from public.chat_messages cm
    where cm.channel_type = 'event_caseworker'
      and cm.event_id in (select eid from events)
      and (cm.sender_id = v_uid or cm.receiver_id = v_uid or cm.receiver_id is null)
  ),
  ranked as (
    select eid, created_at, content, image_urls,
      row_number() over (partition by eid order by created_at desc) as rn
    from msgs
  )
  select
    e.eid,
    ce.name,
    r.created_at,
    left(
      case
        when r.created_at is null then ''
        when coalesce(trim(r.content), '') <> '' then trim(r.content)
        when coalesce(array_length(r.image_urls, 1), 0) > 0 then '[Bilde]'
        else ''
      end,
      120
    )
  from events e
  inner join public.central_events ce on ce.id = e.eid
  left join ranked r on r.eid = e.eid and r.rn = 1
  order by coalesce(r.created_at, '1970-01-01'::timestamptz) desc;
end;
$$;

create or replace function public.get_landlord_event_thread_messages(p_event_id uuid)
returns setof public.chat_messages
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  if p_event_id not in (select public.landlord_event_ids(v_uid)) then return; end if;

  return query
  select cm.*
  from public.chat_messages cm
  where cm.channel_type = 'event_caseworker'
    and cm.event_id = p_event_id
    and (cm.sender_id = v_uid or cm.receiver_id = v_uid or cm.receiver_id is null)
  order by cm.created_at asc;
end;
$$;

revoke all on function public.get_event_landlord_thread_summaries() from public;
grant execute on function public.get_event_landlord_thread_summaries() to authenticated;
revoke all on function public.get_event_landlord_thread_messages(uuid, uuid) from public;
grant execute on function public.get_event_landlord_thread_messages(uuid, uuid) to authenticated;
revoke all on function public.get_landlord_event_threads() from public;
grant execute on function public.get_landlord_event_threads() to authenticated;
revoke all on function public.get_landlord_event_thread_messages(uuid) from public;
grant execute on function public.get_landlord_event_thread_messages(uuid) to authenticated;

-- Skill sosial og event i eksisterende tråd-RPC-er
create or replace function public.get_kommune_landlord_thread_messages(
  p_landlord_id uuid,
  p_service_area_id uuid default null
)
returns setof public.chat_messages
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_area uuid := p_service_area_id;
begin
  if not public.is_kommune_staff() then return; end if;
  if v_area is null then
    select unnest(public.landlord_service_area_ids(p_landlord_id)) into v_area limit 1;
  end if;
  if v_area is null or not public.staff_may_access_landlord_in_area(p_landlord_id, v_area) then
    return;
  end if;

  return query
  select cm.*
  from public.chat_messages cm
  where cm.service_area_id = v_area
    and coalesce(cm.channel_type, 'social_caseworker') = 'social_caseworker'
    and (
      (cm.sender_id = p_landlord_id and (
        cm.receiver_id is null
        or exists (select 1 from public.profiles p where p.id = cm.receiver_id and p.role in ('kommune_ansatt', 'kommune_admin'))
      ))
      or (cm.receiver_id = p_landlord_id and exists (
        select 1 from public.profiles p where p.id = cm.sender_id and p.role in ('kommune_ansatt', 'kommune_admin')
      ))
    )
  order by cm.created_at asc;
end;
$$;

create or replace function public.get_landlord_kommune_thread_messages(p_service_area_id uuid)
returns setof public.chat_messages
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;

  return query
  select cm.*
  from public.chat_messages cm
  where cm.service_area_id = p_service_area_id
    and coalesce(cm.channel_type, 'social_caseworker') = 'social_caseworker'
    and (cm.sender_id = v_uid or cm.receiver_id = v_uid)
  order by cm.created_at asc;
end;
$$;

-- ─── Turist: koble bookinger ved innlogging ───
create or replace function public.link_guest_bookings_on_login()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_count integer;
begin
  if v_uid is null then return 0; end if;
  select u.email into v_email from auth.users u where u.id = v_uid;
  if v_email is null or length(trim(v_email)) = 0 then return 0; end if;

  update public.bookings b
  set guest_user_id = v_uid
  where b.guest_user_id is null
    and lower(trim(b.guest_email)) = lower(trim(v_email));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.link_guest_bookings_on_login() from public;
grant execute on function public.link_guest_bookings_on_login() to authenticated;

-- Co-guest kan se bookinger de er invitert til
drop policy if exists "Co-guest read bookings" on public.bookings;
create policy "Co-guest read bookings"
  on public.bookings for select
  using (
    exists (
      select 1 from public.booking_guests bg
      where bg.booking_id = id
        and (
          bg.guest_user_id = auth.uid()
          or (
            bg.guest_email is not null
            and auth.jwt() ->> 'email' is not null
            and lower(trim(bg.guest_email)) = lower(trim(auth.jwt() ->> 'email'))
          )
        )
    )
  );

-- Turisme tilgjengelighet for kalender
create or replace function public.get_tourism_availability(p_listing_id uuid)
returns table (
  start_date date,
  end_date date,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select la.start_date, la.end_date, la.status
  from public.listing_availability la
  where la.listing_id = p_listing_id
    and la.lane = 'turisme'
  order by la.start_date asc;
$$;

revoke all on function public.get_tourism_availability(uuid) from public;
grant execute on function public.get_tourism_availability(uuid) to anon, authenticated;

-- Anmeldelsessammendrag for Finn
create or replace function public.get_listing_review_summary(p_listing_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'count', count(*)::int,
    'avg_rating', round(avg(r.rating)::numeric, 1)
  )
  from public.booking_reviews r
  inner join public.bookings b on b.id = r.booking_id
  where b.listing_id = p_listing_id;
$$;

revoke all on function public.get_listing_review_summary(uuid) from public;
grant execute on function public.get_listing_review_summary(uuid) to anon, authenticated;
