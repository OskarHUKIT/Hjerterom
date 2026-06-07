-- Robust delt lest/ulest for kommune-varsler:
-- 1) event_id knytter alle kollega-kopier av samme hendelse
-- 2) RLS tillater kommune-staff å oppdatere kollegaers varselrader
-- 3) set_notification_status matcher primært på event_id

alter table public.notifications
  add column if not exists event_id uuid;

create index if not exists notifications_event_id_idx
  on public.notifications (event_id)
  where event_id is not null;

-- Backfill eksisterende kommune-varsler (grupper per hendelse innen samme minutt)
with staff_rows as (
  select
    n.id,
    first_value(n.id) over (
      partition by
        n.type,
        n.title,
        coalesce(n.message, ''),
        n.listing_id,
        n.related_user_id,
        date_trunc('minute', n.created_at)
      order by n.created_at
    ) as grouped_event_id
  from public.notifications n
  inner join public.profiles p
    on p.id = n.owner_id
   and p.role in ('kommune_ansatt', 'kommune_admin')
  where n.event_id is null
)
update public.notifications n
set event_id = s.grouped_event_id
from staff_rows s
where n.id = s.id
  and n.event_id is null;

drop policy if exists "Kommune staff update staff notifications" on public.notifications;
create policy "Kommune staff update staff notifications"
  on public.notifications
  for update
  to authenticated
  using (
    public.is_kommune_staff()
    and exists (
      select 1
      from public.profiles p
      where p.id = notifications.owner_id
        and p.role in ('kommune_ansatt', 'kommune_admin')
    )
  )
  with check (
    public.is_kommune_staff()
    and exists (
      select 1
      from public.profiles p
      where p.id = notifications.owner_id
        and p.role in ('kommune_ansatt', 'kommune_admin')
    )
  );

create or replace function public.notify_kommune_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  rec record;
  msg_body text;
  v_event_id uuid := gen_random_uuid();
begin
  if new.receiver_id is not null then
    return new;
  end if;
  select coalesce(
    (select full_name from public.profiles where id = new.sender_id limit 1),
    (select raw_user_meta_data->>'full_name' from auth.users where id = new.sender_id limit 1),
    (select split_part(email, '@', 1) from auth.users where id = new.sender_id limit 1),
    (select owner_name from public.listings where owner_id = new.sender_id limit 1)
  ) into sender_name;
  sender_name := coalesce(nullif(trim(sender_name), ''), 'En utleier');

  msg_body := case
    when coalesce(trim(new.content), '') <> '' then
      sender_name || E':\n\n' || left(trim(new.content), 7500)
    when coalesce(array_length(new.image_urls, 1), 0) > 0 then
      sender_name || ' sendte et bilde.'
    else
      sender_name || ' har sendt en melding til Kommune.'
  end;

  for rec in select id from profiles where role in ('kommune_ansatt', 'kommune_admin')
  loop
    insert into notifications (owner_id, type, title, message, status, related_user_id, event_id)
    values (
      rec.id,
      'NEW_MESSAGE',
      'Ny melding fra ' || sender_name,
      msg_body,
      'unread',
      new.sender_id,
      v_event_id
    );
  end loop;
  return new;
end;
$$;

create or replace function public.notify_kommune_new_report(p_listing_id uuid, p_address text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid := gen_random_uuid();
begin
  insert into notifications (owner_id, listing_id, type, title, message, status, event_id)
  select
    id,
    p_listing_id,
    'NEW_REPORT',
    'Ny overtakelsesrapport (Utleier)',
    'En ny overtakelsesrapport er sendt inn for boligen på ' || coalesce(p_address, '') || '.',
    'unread',
    v_event_id
  from profiles
  where role in ('kommune_ansatt', 'kommune_admin');
end;
$$;

create or replace function public.submit_tenant_handover_report(p_token uuid, p_content jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_report_id uuid;
  v_address text;
  v_event_id uuid := gen_random_uuid();
begin
  select l.id, l.address
  into v_listing_id, v_address
  from listings l
  inner join listing_tenant_tokens t on t.listing_id = l.id
  where t.token = p_token;

  if v_listing_id is null then
    raise exception 'Ugyldig eller utløpt lenke.';
  end if;

  insert into handover_reports (listing_id, reporter_type, content, is_finalized, signed_at)
  values (v_listing_id, 'tenant', p_content, true, now())
  returning id into v_report_id;

  insert into notifications (owner_id, listing_id, type, title, message, status, event_id)
  select
    p.id,
    v_listing_id,
    'NEW_REPORT',
    'Ny overtakelsesrapport (Leietaker)',
    'En ny overtakelsesrapport er sendt inn for boligen på ' || coalesce(v_address, '') || '.',
    'unread',
    v_event_id
  from profiles p
  where p.role in ('kommune_ansatt', 'kommune_admin');

  return v_report_id;
end;
$$;

create or replace function public._notify_kommune_resign_request(p_landlord_user_id uuid, p_landlord_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_title text;
  v_msg text;
  v_cities text[];
  v_event_id uuid := gen_random_uuid();
begin
  v_title := 'Forespørsel om ny vilkårssignering';
  v_msg := coalesce(nullif(trim(p_landlord_name), ''), 'En utleier')
    || ' ønsker å signere vilkårsavtalen på nytt etter kommunal oppsigelse. Gå til brukerprofilen for å godkjenne eller avslå.';

  select coalesce(
      array_agg(distinct lower(trim(l.city))) filter (where l.city is not null and trim(l.city) <> ''),
      array[]::text[]
    )
    into v_cities
  from public.listings l
  where l.owner_id = p_landlord_user_id;

  if coalesce(array_length(v_cities, 1), 0) = 0 then
    return;
  end if;

  for rec in
    select distinct ks.id as staff_id
    from public.profiles ks
    where ks.role in ('kommune_ansatt', 'kommune_admin')
      and coalesce(ks.kommune_can_edit, true) is distinct from false
      and public.regions_overlap(
        public.parse_kommune_regions_sql(coalesce(ks.kommune_region::text, '')),
        v_cities
      )
  loop
    insert into public.notifications (owner_id, type, title, message, status, related_user_id, event_id)
    values (
      rec.staff_id,
      'LANDLORD_RESIGN_REQUEST',
      v_title,
      v_msg,
      'unread',
      p_landlord_user_id,
      v_event_id
    );
  end loop;
end;
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
  v_updated int;
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

  if public.is_kommune_staff() then
    if v_notif.event_id is not null then
      update public.notifications n
      set
        status = p_status,
        resolved_by = case when p_status = 'completed' then v_uid else null end,
        resolved_at = case when p_status = 'completed' then now() else null end
      where n.event_id = v_notif.event_id
        and exists (
          select 1
          from public.profiles p
          where p.id = n.owner_id
            and p.role in ('kommune_ansatt', 'kommune_admin')
        );
    else
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
    end if;
  else
    update public.notifications
    set
      status = p_status,
      resolved_by = case when p_status = 'completed' then v_uid else null end,
      resolved_at = case when p_status = 'completed' then now() else null end
    where id = p_notification_id
      and owner_id = v_uid;
  end if;

  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', true, 'updated', v_updated);
end;
$$;

comment on column public.notifications.event_id is
  'Delt nøkkel for kommune-varsler: alle kollega-kopier av samme hendelse har samme event_id.';

grant execute on function public.set_notification_status(uuid, text) to authenticated;
