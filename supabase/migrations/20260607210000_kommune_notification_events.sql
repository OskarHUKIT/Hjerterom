-- Én delt lest/ulest-status per kommune-hendelse (event_id).
-- Per-bruker notification-rader beholdes for push/e-post, men status leses fra denne tabellen.

create table if not exists public.kommune_notification_events (
  id uuid primary key,
  status text not null default 'unread' check (status in ('unread', 'completed')),
  resolved_by uuid references auth.users on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kommune_notification_events is
  'Delt status for kommune-varsler; én rad per event_id på tvers av alle saksbehandlere.';

-- Backfill fra eksisterende event_id (bruk «vinner»-status: completed hvis noen har lest)
insert into public.kommune_notification_events (id, status, resolved_by, resolved_at, created_at, updated_at)
select
  n.event_id,
  case when bool_or(n.status = 'completed') then 'completed' else 'unread' end,
  (array_agg(n.resolved_by order by n.resolved_at desc nulls last) filter (where n.resolved_by is not null))[1],
  max(n.resolved_at),
  min(n.created_at),
  now()
from public.notifications n
inner join public.profiles p
  on p.id = n.owner_id
 and p.role in ('kommune_ansatt', 'kommune_admin')
where n.event_id is not null
group by n.event_id
on conflict (id) do update set
  status = excluded.status,
  resolved_by = excluded.resolved_by,
  resolved_at = excluded.resolved_at,
  updated_at = now();

alter table public.kommune_notification_events enable row level security;

drop policy if exists "Kommune staff read notification events" on public.kommune_notification_events;
create policy "Kommune staff read notification events"
  on public.kommune_notification_events
  for select
  to authenticated
  using (public.is_kommune_staff());

drop policy if exists "Kommune staff update notification events" on public.kommune_notification_events;
create policy "Kommune staff update notification events"
  on public.kommune_notification_events
  for update
  to authenticated
  using (public.is_kommune_staff())
  with check (public.is_kommune_staff());

create or replace function public.ensure_kommune_notification_event(
  p_event_id uuid,
  p_status text default 'unread'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_id is null then
    return;
  end if;
  insert into public.kommune_notification_events (id, status)
  values (p_event_id, coalesce(nullif(trim(p_status), ''), 'unread'))
  on conflict (id) do nothing;
end;
$$;

create or replace function public.trg_ensure_kommune_event_on_notification_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_id is null then
    return new;
  end if;
  if exists (
    select 1
    from public.profiles p
    where p.id = new.owner_id
      and p.role in ('kommune_ansatt', 'kommune_admin')
  ) then
    perform public.ensure_kommune_notification_event(new.event_id, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists on_notification_ensure_kommune_event on public.notifications;
create trigger on_notification_ensure_kommune_event
  after insert on public.notifications
  for each row
  execute function public.trg_ensure_kommune_event_on_notification_insert();

create or replace function public.kommune_notification_effective_status(
  p_event_id uuid,
  p_row_status text
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_kommune_staff() and p_event_id is not null then
      coalesce(
        (select e.status from public.kommune_notification_events e where e.id = p_event_id),
        p_row_status
      )
    else p_row_status
  end;
$$;

create or replace function public.list_my_notifications()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t) order by t.created_at desc)
      from (
        select
          n.id,
          n.created_at,
          n.listing_id,
          n.owner_id,
          n.type,
          n.title,
          n.message,
          public.kommune_notification_effective_status(n.event_id, n.status) as status,
          case
            when public.is_kommune_staff() and n.event_id is not null then
              coalesce(e.resolved_by, n.resolved_by)
            else n.resolved_by
          end as resolved_by,
          case
            when public.is_kommune_staff() and n.event_id is not null then
              coalesce(e.resolved_at, n.resolved_at)
            else n.resolved_at
          end as resolved_at,
          n.related_user_id,
          n.municipality,
          n.event_id
        from public.notifications n
        left join public.kommune_notification_events e on e.id = n.event_id
        where n.owner_id = v_uid
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.count_my_unread_notifications()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.notifications n
  where n.owner_id = auth.uid()
    and public.kommune_notification_effective_status(n.event_id, n.status) = 'unread';
$$;

create or replace function public.set_notification_status(
  p_notification_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notif public.notifications%rowtype;
  v_uid uuid := auth.uid();
  v_updated int := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_status not in ('unread', 'completed') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  select * into v_notif
  from public.notifications
  where id = p_notification_id
    and owner_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if public.is_kommune_staff() and v_notif.event_id is not null then
    insert into public.kommune_notification_events (id, status)
    values (v_notif.event_id, 'unread')
    on conflict (id) do nothing;

    update public.kommune_notification_events
    set
      status = p_status,
      resolved_by = case when p_status = 'completed' then v_uid else null end,
      resolved_at = case when p_status = 'completed' then now() else null end,
      updated_at = now()
    where id = v_notif.event_id;

    get diagnostics v_updated = row_count;
  elsif public.is_kommune_staff() then
    update public.notifications n
    set
      status = p_status,
      resolved_by = case when p_status = 'completed' then v_uid else null end,
      resolved_at = case when p_status = 'completed' then now() else null end
    where n.type = v_notif.type
      and n.title = v_notif.title
      and n.message is not distinct from v_notif.message
      and n.listing_id is not distinct from v_notif.listing_id
      and n.related_user_id is not distinct from v_notif.related_user_id
      and exists (
        select 1
        from public.profiles p
        where p.id = n.owner_id
          and p.role in ('kommune_ansatt', 'kommune_admin')
      );

    get diagnostics v_updated = row_count;
  else
    update public.notifications
    set
      status = p_status,
      resolved_by = case when p_status = 'completed' then v_uid else null end,
      resolved_at = case when p_status = 'completed' then now() else null end
    where id = p_notification_id
      and owner_id = v_uid;

    get diagnostics v_updated = row_count;
  end if;

  return jsonb_build_object('ok', true, 'updated', v_updated);
end;
$$;

grant execute on function public.list_my_notifications() to authenticated;
grant execute on function public.count_my_unread_notifications() to authenticated;
grant execute on function public.set_notification_status(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kommune_notification_events'
  ) then
    alter publication supabase_realtime add table public.kommune_notification_events;
  end if;
end;
$$;
