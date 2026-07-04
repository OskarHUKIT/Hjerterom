-- Ops broadcasts: segment resolution, draft, preview, send (in-app + push via notifications trigger).

create table if not exists public.platform_broadcasts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'cancelled')),
  segment jsonb not null default '{}'::jsonb,
  title_no text not null default '',
  title_se text not null default '',
  title_en text not null default '',
  message_no text not null default '',
  message_se text not null default '',
  message_en text not null default '',
  link_href text,
  channels jsonb not null default '{"in_app": true, "push": true, "email": false}'::jsonb,
  recipient_count int not null default 0,
  delivery_stats jsonb not null default '{}'::jsonb
);

comment on table public.platform_broadcasts is
  'Ops one-way broadcasts. Sent rows insert per-user notifications (type=ops_broadcast).';

create index if not exists idx_platform_broadcasts_status_created
  on public.platform_broadcasts (status, created_at desc);

alter table public.platform_broadcasts enable row level security;

-- Operators read via RPC only; no direct client policies.

create or replace function public.ops_broadcast_pick_locale_text(
  p_no text,
  p_se text,
  p_en text,
  p_locale text
)
returns text
language sql
immutable
as $$
  select case
    when p_locale = 'se' then coalesce(nullif(trim(p_se), ''), nullif(trim(p_no), ''))
    when p_locale = 'en' then coalesce(nullif(trim(p_en), ''), nullif(trim(p_no), ''))
    else coalesce(nullif(trim(p_no), ''), '')
  end;
$$;

create or replace function public.ops_broadcast_resolve_audience(p_segment jsonb)
returns table (
  user_id uuid,
  role text,
  preferred_locale text,
  has_push boolean,
  email_enabled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_roles text[];
  v_kommune_ids uuid[];
  v_user_ids uuid[];
  v_exclude_ids uuid[];
  v_event_id uuid;
  v_service_area_id uuid;
  v_kommune_slugs text[];
  v_require_active boolean;
  v_event_kommune_ids uuid[];
begin
  if p_segment is null or p_segment = '{}'::jsonb then
    return;
  end if;

  v_roles := coalesce(
    array(select jsonb_array_elements_text(p_segment->'roles')),
    array[]::text[]
  );
  v_kommune_ids := coalesce(
    array(select (jsonb_array_elements_text(p_segment->'kommune_ids'))::uuid),
    array[]::uuid[]
  );
  v_user_ids := coalesce(
    array(select (jsonb_array_elements_text(p_segment->'user_ids'))::uuid),
    array[]::uuid[]
  );
  v_exclude_ids := coalesce(
    array(select (jsonb_array_elements_text(p_segment->'exclude_user_ids'))::uuid),
    array[]::uuid[]
  );
  v_kommune_slugs := coalesce(
    array(select jsonb_array_elements_text(p_segment->'listing_kommune_slugs')),
    array[]::text[]
  );
  v_require_active := coalesce((p_segment->>'require_active_kommune')::boolean, false);

  if nullif(trim(p_segment->>'event_id'), '') is not null then
    v_event_id := (p_segment->>'event_id')::uuid;
    select coalesce(
      array(select (jsonb_array_elements_text(ce.geography_scope->'kommune_ids'))::uuid),
      array[]::uuid[]
    )
    into v_event_kommune_ids
    from public.central_events ce
    where ce.id = v_event_id;
  end if;

  if nullif(trim(p_segment->>'service_area_id'), '') is not null then
    v_service_area_id := (p_segment->>'service_area_id')::uuid;
  end if;

  return query
  with base as (
    select
      p.id as uid,
      p.role as user_role,
      case
        when p.preferred_locale in ('no', 'se', 'en') then p.preferred_locale
        else 'no'
      end as loc,
      coalesce(p.email_notifications_enabled, false) as em_on,
      exists (
        select 1 from public.push_subscriptions ps where ps.owner_id = p.id
      ) as push_on
    from public.profiles p
    where p.id is not null
  ),
  role_ok as (
    select b.*
    from base b
    where cardinality(v_roles) = 0
      or b.user_role = any (v_roles)
      or (b.user_role is null and 'homeowner' = any (v_roles))
  ),
  kommune_ok as (
    select r.*
    from role_ok r
    where cardinality(v_kommune_ids) = 0
      or exists (
        select 1
        from public.user_kommune_grants g
        inner join public.kommuner k on k.id = g.kommune_id
        where g.user_id = r.uid
          and g.kommune_id = any (v_kommune_ids)
          and (not v_require_active or k.status in ('active', 'pilot'))
      )
      or (
        r.user_role = 'homeowner'
        and exists (
          select 1
          from public.listings l
          inner join public.kommuner k on k.id = l.kommune_id
          where l.owner_id = r.uid
            and l.kommune_id = any (v_kommune_ids)
            and (not v_require_active or k.status in ('active', 'pilot'))
        )
      )
  ),
  slug_ok as (
    select k.*
    from kommune_ok k
    where cardinality(v_kommune_slugs) = 0
      or (
        k.user_role = 'homeowner'
        and exists (
          select 1
          from public.listings l
          inner join public.kommuner km on km.id = l.kommune_id
          where l.owner_id = k.uid
            and km.slug = any (v_kommune_slugs)
        )
      )
      or exists (
        select 1
        from public.user_kommune_grants g
        inner join public.kommuner km on km.id = g.kommune_id
        where g.user_id = k.uid
          and km.slug = any (v_kommune_slugs)
      )
  ),
  event_ok as (
    select s.*
    from slug_ok s
    where v_event_id is null
      or (
        s.user_role = 'homeowner'
        and cardinality(v_event_kommune_ids) > 0
        and exists (
          select 1
          from public.listings l
          where l.owner_id = s.uid
            and l.kommune_id = any (v_event_kommune_ids)
        )
      )
  ),
  area_ok as (
    select e.*
    from event_ok e
    where v_service_area_id is null
      or exists (
        select 1
        from public.kommune_service_area_members sam
        inner join public.user_kommune_grants g
          on g.kommune_id = sam.kommune_id
          and g.user_id = e.uid
        where sam.service_area_id = v_service_area_id
      )
  ),
  explicit_ok as (
    select a.*
    from area_ok a
    where cardinality(v_user_ids) = 0
      or a.uid = any (v_user_ids)
  ),
  final as (
    select *
    from explicit_ok
    where cardinality(v_exclude_ids) = 0
      or uid <> all (v_exclude_ids)
  )
  select f.uid, f.user_role, f.loc, f.push_on, f.em_on
  from final f;
end;
$$;

revoke all on function public.ops_broadcast_resolve_audience(jsonb) from public;
grant execute on function public.ops_broadcast_resolve_audience(jsonb) to authenticated;

create or replace function public.ops_preview_broadcast(p_segment jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total int := 0;
  v_push int := 0;
  v_email int := 0;
  v_by_role jsonb := '{}'::jsonb;
  v_by_locale jsonb := '{}'::jsonb;
  r record;
begin
  perform public.ops_assert_operator();

  for r in
    select *
    from public.ops_broadcast_resolve_audience(p_segment)
  loop
    v_total := v_total + 1;
    if r.has_push then v_push := v_push + 1; end if;
    if r.email_enabled then v_email := v_email + 1; end if;
    v_by_role := v_by_role || jsonb_build_object(
      coalesce(r.role, 'unknown'),
      coalesce((v_by_role->>coalesce(r.role, 'unknown'))::int, 0) + 1
    );
    v_by_locale := v_by_locale || jsonb_build_object(
      r.preferred_locale,
      coalesce((v_by_locale->>r.preferred_locale)::int, 0) + 1
    );
  end loop;

  return jsonb_build_object(
    'total', v_total,
    'push_eligible', v_push,
    'email_eligible', v_email,
    'by_role', v_by_role,
    'by_locale', v_by_locale
  );
end;
$$;

revoke all on function public.ops_preview_broadcast(jsonb) from public;
grant execute on function public.ops_preview_broadcast(jsonb) to authenticated;

create or replace function public.ops_upsert_broadcast_draft(
  p_id uuid default null,
  p_segment jsonb default '{}'::jsonb,
  p_title_no text default '',
  p_title_se text default '',
  p_title_en text default '',
  p_message_no text default '',
  p_message_se text default '',
  p_message_en text default '',
  p_link_href text default null,
  p_channels jsonb default '{"in_app": true, "push": true, "email": false}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_row public.platform_broadcasts%rowtype;
begin
  perform public.ops_assert_operator();

  if nullif(trim(p_title_no), '') is null then
    raise exception 'title_no required' using errcode = '22023';
  end if;
  if nullif(trim(p_message_no), '') is null then
    raise exception 'message_no required' using errcode = '22023';
  end if;

  if p_id is not null then
    select * into v_row from public.platform_broadcasts b where b.id = p_id;
    if not found then
      raise exception 'broadcast not found' using errcode = 'P0002';
    end if;
    if v_row.status <> 'draft' then
      raise exception 'only draft broadcasts can be edited' using errcode = '22023';
    end if;
    update public.platform_broadcasts b
    set
      segment = coalesce(p_segment, b.segment),
      title_no = coalesce(nullif(trim(p_title_no), ''), b.title_no),
      title_se = coalesce(p_title_se, b.title_se),
      title_en = coalesce(p_title_en, b.title_en),
      message_no = coalesce(nullif(trim(p_message_no), ''), b.message_no),
      message_se = coalesce(p_message_se, b.message_se),
      message_en = coalesce(p_message_en, b.message_en),
      link_href = p_link_href,
      channels = coalesce(p_channels, b.channels),
      updated_at = now()
    where b.id = p_id
    returning * into v_row;
    v_id := v_row.id;
  else
    insert into public.platform_broadcasts (
      created_by, segment,
      title_no, title_se, title_en,
      message_no, message_se, message_en,
      link_href, channels
    )
    values (
      auth.uid(),
      coalesce(p_segment, '{}'::jsonb),
      trim(p_title_no),
      coalesce(p_title_se, ''),
      coalesce(p_title_en, ''),
      trim(p_message_no),
      coalesce(p_message_se, ''),
      coalesce(p_message_en, ''),
      nullif(trim(p_link_href), ''),
      coalesce(p_channels, '{"in_app": true, "push": true, "email": false}'::jsonb)
    )
    returning id into v_id;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.ops_upsert_broadcast_draft(uuid, jsonb, text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.ops_upsert_broadcast_draft(uuid, jsonb, text, text, text, text, text, text, text, jsonb) to authenticated;

-- Per-notification delivery flags for ops broadcasts
alter table public.notifications
  add column if not exists suppress_email boolean not null default false,
  add column if not exists suppress_push boolean not null default false;

comment on column public.notifications.suppress_email is
  'When true, send-notification-email skips this row (ops broadcast channel gate).';
comment on column public.notifications.suppress_push is
  'When true, push trigger skips this row (ops broadcast channel gate).';

create or replace function public.ops_send_broadcast(p_broadcast_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.platform_broadcasts%rowtype;
  v_preview jsonb;
  v_total int;
  v_push int := 0;
  v_email int := 0;
  v_inserted int := 0;
  r record;
  v_title text;
  v_message text;
  v_link_suffix_no text := '';
  v_link_suffix_se text := '';
  v_link_suffix_en text := '';
  v_email_on boolean;
  v_push_on boolean;
begin
  perform public.ops_assert_operator();

  select * into v_b from public.platform_broadcasts b where b.id = p_broadcast_id;
  if not found then raise exception 'broadcast not found' using errcode = 'P0002'; end if;
  if v_b.status <> 'draft' then raise exception 'broadcast already sent or cancelled' using errcode = '22023'; end if;

  if exists (
    select 1 from public.platform_broadcasts b2
    where b2.created_by = auth.uid() and b2.status = 'sent' and b2.sent_at > now() - interval '30 seconds'
  ) then
    raise exception 'rate limited: wait 30 seconds between sends' using errcode = '22023';
  end if;

  v_preview := public.ops_preview_broadcast(v_b.segment);
  v_total := coalesce((v_preview->>'total')::int, 0);
  if v_total = 0 then raise exception 'no recipients match segment' using errcode = '22023'; end if;
  if v_total > 5000 then raise exception 'too many recipients (max 5000)' using errcode = '22023'; end if;

  v_email_on := coalesce((v_b.channels->>'email')::boolean, false);
  v_push_on := coalesce((v_b.channels->>'push')::boolean, true);

  if v_b.link_href is not null and trim(v_b.link_href) <> '' then
    v_link_suffix_no := E'\n\n' || 'Les mer: ' || trim(v_b.link_href);
    v_link_suffix_se := E'\n\n' || 'Loga oktá: ' || trim(v_b.link_href);
    v_link_suffix_en := E'\n\n' || 'Read more: ' || trim(v_b.link_href);
  end if;

  for r in select * from public.ops_broadcast_resolve_audience(v_b.segment) loop
    v_title := public.ops_broadcast_pick_locale_text(v_b.title_no, v_b.title_se, v_b.title_en, r.preferred_locale);
    v_message := public.ops_broadcast_pick_locale_text(v_b.message_no, v_b.message_se, v_b.message_en, r.preferred_locale)
      || case r.preferred_locale when 'se' then v_link_suffix_se when 'en' then v_link_suffix_en else v_link_suffix_no end;

    insert into public.notifications (
      owner_id, type, title, message, status, suppress_email, suppress_push
    )
    values (
      r.user_id, 'ops_broadcast', v_title, v_message, 'unread', not v_email_on, not v_push_on
    );

    v_inserted := v_inserted + 1;
    if r.has_push and v_push_on then v_push := v_push + 1; end if;
    if r.email_enabled and v_email_on then v_email := v_email + 1; end if;
  end loop;

  update public.platform_broadcasts b
  set status = 'sent', sent_at = now(), updated_at = now(), recipient_count = v_inserted,
    delivery_stats = jsonb_build_object('in_app', v_inserted, 'push_eligible', v_push, 'email_eligible', v_email, 'channels', v_b.channels)
  where b.id = p_broadcast_id;

  perform public.ops_write_audit('OPS_BROADCAST_SENT', null,
    jsonb_build_object('broadcast_id', p_broadcast_id, 'recipient_count', v_inserted));

  return jsonb_build_object('ok', true, 'broadcast_id', p_broadcast_id, 'recipient_count', v_inserted,
    'delivery_stats', (select b.delivery_stats from public.platform_broadcasts b where b.id = p_broadcast_id));
end;
$$;

revoke all on function public.ops_send_broadcast(uuid) from public;
grant execute on function public.ops_send_broadcast(uuid) to authenticated;

create or replace function public.ops_list_broadcasts(
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_items jsonb;
  v_total int;
begin
  perform public.ops_assert_operator();

  select count(*) into v_total from public.platform_broadcasts;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_items
  from (
    select
      b.id,
      b.status,
      b.created_at,
      b.sent_at,
      b.created_by,
      b.recipient_count,
      b.delivery_stats,
      b.title_no,
      b.segment,
      left(b.message_no, 120) as message_preview
    from public.platform_broadcasts b
    order by b.created_at desc
    limit greatest(1, least(p_limit, 100))
    offset greatest(0, p_offset)
  ) t;

  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$$;

revoke all on function public.ops_list_broadcasts(int, int) from public;
grant execute on function public.ops_list_broadcasts(int, int) to authenticated;

create or replace function public.ops_get_broadcast(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_b public.platform_broadcasts%rowtype;
begin
  perform public.ops_assert_operator();

  select * into v_b from public.platform_broadcasts b where b.id = p_id;
  if not found then
    raise exception 'broadcast not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_b.id,
    'status', v_b.status,
    'created_at', v_b.created_at,
    'sent_at', v_b.sent_at,
    'created_by', v_b.created_by,
    'segment', v_b.segment,
    'title_no', v_b.title_no,
    'title_se', v_b.title_se,
    'title_en', v_b.title_en,
    'message_no', v_b.message_no,
    'message_se', v_b.message_se,
    'message_en', v_b.message_en,
    'link_href', v_b.link_href,
    'channels', v_b.channels,
    'recipient_count', v_b.recipient_count,
    'delivery_stats', v_b.delivery_stats
  );
end;
$$;

revoke all on function public.ops_get_broadcast(uuid) from public;
grant execute on function public.ops_get_broadcast(uuid) to authenticated;

create or replace function public.notify_send_push_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_url text;
  v_auth_key text;
  v_payload jsonb;
begin
  if coalesce(NEW.suppress_push, false) then
    return NEW;
  end if;

  select decrypted_secret into v_project_url from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_auth_key from vault.decrypted_secrets where name = 'anon_key' limit 1;
  if v_project_url is null or v_auth_key is null then return NEW; end if;

  v_payload := jsonb_build_object(
    'type', 'INSERT', 'table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA,
    'record', jsonb_build_object(
      'id', NEW.id, 'owner_id', NEW.owner_id, 'type', NEW.type,
      'title', NEW.title, 'message', coalesce(NEW.message, ''), 'status', NEW.status,
      'listing_id', NEW.listing_id, 'related_user_id', NEW.related_user_id
    )
  );

  perform net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_auth_key),
    body := v_payload
  );
  return NEW;
end;
$$;
