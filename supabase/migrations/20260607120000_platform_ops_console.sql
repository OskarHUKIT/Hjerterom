-- Boly Platform Operations Console (Phase 1)
-- GameChanging operator allowlist + security definer RPCs.

-- === Operator allowlist ===
create table if not exists public.platform_operators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  notes text
);

comment on table public.platform_operators is
  'GameChanging platform operators (processor support). Not kommune staff.';

alter table public.platform_operators enable row level security;

drop policy if exists "Users can read own operator row" on public.platform_operators;
create policy "Users can read own operator row"
  on public.platform_operators for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_boly_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_operators po
    where po.user_id = auth.uid()
      and po.is_active = true
  );
$$;

grant execute on function public.is_boly_operator() to authenticated;

create or replace function public.ops_check_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_boly_operator();
$$;

grant execute on function public.ops_check_access() to authenticated;

create or replace function public.ops_assert_operator()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_boly_operator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.ops_mask_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null or trim(p_email) = '' then '***'
    when position('@' in p_email) = 0 then left(p_email, 1) || '***'
    else left(split_part(p_email, '@', 1), 1) || '***@' || split_part(p_email, '@', 2)
  end;
$$;

create or replace function public.ops_write_audit(
  p_action_type text,
  p_target_user_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action_type, details)
  values (
    coalesce(p_target_user_id, auth.uid()),
    p_action_type,
    coalesce(p_details, '{}'::jsonb) || jsonb_build_object('performed_by_user_id', auth.uid())
  );
end;
$$;

-- Allow operators to approve terms via RPC (still blocks direct JWT updates).
create or replace function public.terms_documents_guard_approval_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text;
begin
  jwt_role := coalesce(auth.jwt() ->> 'role', '');

  if tg_op = 'INSERT' then
    if jwt_role = 'authenticated' then
      new.approved_for_utleier_signing := false;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.approved_for_utleier_signing is distinct from old.approved_for_utleier_signing then
      if jwt_role in ('authenticated', 'anon') and not public.is_boly_operator() then
        raise exception 'Godkjenning for utleiersignering kan kun settes sentralt (platform operator eller service role).'
          using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

-- === Read RPCs ===

create or replace function public.ops_get_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.ops_assert_operator();

  select jsonb_build_object(
    'users_total', (select count(*)::int from public.profiles),
    'users_homeowner', (select count(*)::int from public.profiles where role = 'homeowner'),
    'users_kommune_staff', (select count(*)::int from public.profiles where role in ('kommune_ansatt', 'kommune_admin')),
    'users_kommune_admin', (select count(*)::int from public.profiles where role = 'kommune_admin'),
    'listings_total', (select count(*)::int from public.listings),
    'agreements_active', (select count(*)::int from public.user_agreements where coalesce(is_terminated, false) = false),
    'agreements_terminated', (select count(*)::int from public.user_agreements where is_terminated = true),
    'terms_pending', (select count(*)::int from public.terms_documents where approved_for_utleier_signing = false),
    'terms_approved', (select count(*)::int from public.terms_documents where approved_for_utleier_signing = true),
    'resign_pending', (select count(*)::int from public.landlord_resign_requests where status = 'pending'),
    'sign_events_7d', (
      select count(*)::int from public.audit_logs
      where action_type in ('SIGN_INITIATED', 'SIGN_TERMS_BANKID')
        and created_at >= now() - interval '7 days'
    ),
    'sign_events_30d', (
      select count(*)::int from public.audit_logs
      where action_type in ('SIGN_INITIATED', 'SIGN_TERMS_BANKID')
        and created_at >= now() - interval '30 days'
    ),
    'operators_active', (select count(*)::int from public.platform_operators where is_active = true)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.ops_get_dashboard_stats() to authenticated;

create or replace function public.ops_get_time_series_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();

  return jsonb_build_object(
    'signups_by_week', coalesce(
      (
        select jsonb_agg(row_to_json(t) order by t.week_start)
        from (
          select
            date_trunc('week', u.created_at)::date as week_start,
            count(*)::int as count
          from auth.users u
          where u.created_at >= now() - interval '12 weeks'
          group by 1
          order by 1
        ) t
      ),
      '[]'::jsonb
    ),
    'listings_by_week', coalesce(
      (
        select jsonb_agg(row_to_json(t) order by t.week_start)
        from (
          select
            date_trunc('week', l.created_at)::date as week_start,
            count(*)::int as count
          from public.listings l
          where l.created_at >= now() - interval '12 weeks'
          group by 1
          order by 1
        ) t
      ),
      '[]'::jsonb
    ),
    'terms_approved_by_week', coalesce(
      (
        select jsonb_agg(row_to_json(t) order by t.week_start)
        from (
          select
            date_trunc('week', al.created_at)::date as week_start,
            count(*)::int as count
          from public.audit_logs al
          where al.action_type = 'OPS_TERMS_APPROVED'
            and al.created_at >= now() - interval '12 weeks'
          group by 1
          order by 1
        ) t
      ),
      '[]'::jsonb
    ),
    'listings_by_region', coalesce(
      (
        select jsonb_agg(row_to_json(t) order by t.region)
        from (
          select coalesce(nullif(trim(l.city), ''), 'Ukjent') as region, count(*)::int as count
          from public.listings l
          group by 1
          order by 2 desc
          limit 50
        ) t
      ),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.ops_get_time_series_stats() to authenticated;

create or replace function public.ops_search_users(
  p_query text default null,
  p_role text default null,
  p_limit int default 25,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(trim(coalesce(p_query, '')), '');
  v_items jsonb;
  v_total int;
begin
  perform public.ops_assert_operator();

  if v_q is not null and length(v_q) < 3 then
    raise exception 'query must be at least 3 characters' using errcode = '22023';
  end if;

  select count(*)::int into v_total
  from auth.users u
  inner join public.profiles p on p.id = u.id
  where (v_q is null or u.email ilike '%' || v_q || '%' or coalesce(p.full_name, '') ilike '%' || v_q || '%')
    and (p_role is null or p_role = '' or p.role = p_role);

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into v_items
  from (
    select
      u.id,
      public.ops_mask_email(u.email) as email_masked,
      coalesce(p.full_name, u.raw_user_meta_data->>'full_name') as full_name,
      p.role,
      p.kommune_region,
      coalesce(p.kommune_can_edit, true) as kommune_can_edit,
      exists (select 1 from public.user_agreements ua where ua.user_id = u.id and coalesce(ua.is_terminated, false) = false) as has_active_agreement,
      u.created_at
    from auth.users u
    inner join public.profiles p on p.id = u.id
    where (v_q is null or u.email ilike '%' || v_q || '%' or coalesce(p.full_name, '') ilike '%' || v_q || '%')
      and (p_role is null or p_role = '' or p.role = p_role)
    order by u.created_at desc
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('items', v_items, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
end;
$$;

grant execute on function public.ops_search_users(text, text, int, int) to authenticated;

create or replace function public.ops_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
  v_whitelist jsonb;
begin
  perform public.ops_assert_operator();

  select
    u.id,
    u.email,
    u.created_at as auth_created_at,
    u.email_confirmed_at,
    p.full_name,
    p.role,
    p.kommune_region,
    coalesce(p.kommune_can_edit, true) as kommune_can_edit,
    p.contact_phone,
    ua.signed_at,
    coalesce(ua.is_terminated, false) as is_terminated,
    coalesce(ua.terminated_by_kommune, false) as terminated_by_kommune
  into v_row
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_agreements ua on ua.user_id = u.id
  where u.id = p_user_id;

  if v_row.id is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) into v_whitelist
  from (
    select id, email, region, is_active, notes, created_at
    from public.kommune_access_list
    where lower(trim(email)) = lower(trim(v_row.email))
  ) w;

  return jsonb_build_object(
    'id', v_row.id,
    'email', public.ops_mask_email(v_row.email),
    'email_full', v_row.email,
    'full_name', v_row.full_name,
    'role', v_row.role,
    'kommune_region', v_row.kommune_region,
    'kommune_can_edit', v_row.kommune_can_edit,
    'contact_phone', v_row.contact_phone,
    'auth_created_at', v_row.auth_created_at,
    'email_confirmed_at', v_row.email_confirmed_at,
    'signed_at', v_row.signed_at,
    'is_terminated', v_row.is_terminated,
    'terminated_by_kommune', v_row.terminated_by_kommune,
    'is_operator', exists (
      select 1 from public.platform_operators po
      where po.user_id = p_user_id and po.is_active = true
    ),
    'whitelist_entries', v_whitelist,
    'listings_count', (select count(*)::int from public.listings where owner_id = p_user_id)
  );
end;
$$;

grant execute on function public.ops_get_user_detail(uuid) to authenticated;

create or replace function public.ops_list_pending_terms(
  p_region text default null,
  p_limit int default 25,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_region text := nullif(trim(coalesce(p_region, '')), '');
  v_items jsonb;
  v_total int;
begin
  perform public.ops_assert_operator();

  select count(*)::int into v_total
  from public.terms_documents td
  where td.approved_for_utleier_signing = false
    and (v_region is null or td.kommune_region ilike '%' || v_region || '%');

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into v_items
  from (
    select
      td.id,
      td.title,
      td.version,
      td.kommune_region,
      td.effective_from,
      td.created_at,
      td.pdf_bucket,
      td.pdf_storage_path,
      td.approved_for_utleier_signing,
      p.full_name as created_by_name
    from public.terms_documents td
    left join public.profiles p on p.id = td.created_by
    where td.approved_for_utleier_signing = false
      and (v_region is null or td.kommune_region ilike '%' || v_region || '%')
    order by td.created_at desc nulls last
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('items', v_items, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
end;
$$;

grant execute on function public.ops_list_pending_terms(text, int, int) to authenticated;

create or replace function public.ops_list_audit_events(
  p_action text default null,
  p_since timestamptz default null,
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
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_action text := nullif(trim(coalesce(p_action, '')), '');
  v_since timestamptz := coalesce(p_since, now() - interval '30 days');
  v_items jsonb;
  v_total int;
begin
  perform public.ops_assert_operator();

  select count(*)::int into v_total
  from public.audit_logs al
  where al.created_at >= v_since
    and (v_action is null or al.action_type ilike v_action || '%');

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into v_items
  from (
    select
      al.id,
      al.user_id,
      al.action_type,
      al.listing_id,
      al.listing_address,
      al.details,
      al.created_at
    from public.audit_logs al
    where al.created_at >= v_since
      and (v_action is null or al.action_type ilike v_action || '%')
    order by al.created_at desc
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('items', v_items, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
end;
$$;

grant execute on function public.ops_list_audit_events(text, timestamptz, int, int) to authenticated;

create or replace function public.ops_get_security_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sign_spike int;
  v_ops_events_24h int;
begin
  perform public.ops_assert_operator();

  select count(*)::int into v_sign_spike
  from public.audit_logs
  where action_type = 'SIGN_INITIATED'
    and created_at >= now() - interval '1 hour';

  select count(*)::int into v_ops_events_24h
  from public.audit_logs
  where action_type like 'OPS_%'
    and created_at >= now() - interval '24 hours';

  return jsonb_build_object(
    'status', case
      when v_sign_spike > 50 then 'critical'
      when v_sign_spike > 20 then 'warning'
      else 'ok'
    end,
    'sign_initiated_last_hour', v_sign_spike,
    'ops_events_last_24h', v_ops_events_24h,
    'warnings', (
      select coalesce(jsonb_agg(w), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'code', 'sign_initiated_spike',
          'severity', case when v_sign_spike > 50 then 'critical' when v_sign_spike > 20 then 'warning' else 'info' end,
          'message', format('%s SIGN_INITIATED events in the last hour', v_sign_spike)
        ) as w
        where v_sign_spike > 20
        union all
        select jsonb_build_object(
          'code', 'public_diagnostics',
          'severity', 'warning',
          'message', 'Ensure /diagnostics is not publicly accessible in production'
        )
      ) q
    )
  );
end;
$$;

grant execute on function public.ops_get_security_snapshot() to authenticated;

-- === Write RPCs ===

create or replace function public.ops_set_user_role(
  p_user_id uuid,
  p_role text,
  p_kommune_region text default null,
  p_kommune_can_edit boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  perform public.ops_assert_operator();

  if p_role is not null and p_role not in ('homeowner', 'kommune_ansatt', 'kommune_admin') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'role', p.role,
    'kommune_region', p.kommune_region,
    'kommune_can_edit', p.kommune_can_edit
  ) into v_before
  from public.profiles p
  where p.id = p_user_id;

  if v_before is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  update public.profiles
  set
    role = coalesce(p_role, role),
    kommune_region = case when p_role in ('kommune_ansatt', 'kommune_admin') then p_kommune_region else null end,
    kommune_can_edit = case when p_role = 'kommune_ansatt' then coalesce(p_kommune_can_edit, true) else kommune_can_edit end,
    updated_at = now()
  where id = p_user_id;

  select jsonb_build_object(
    'role', p.role,
    'kommune_region', p.kommune_region,
    'kommune_can_edit', p.kommune_can_edit
  ) into v_after
  from public.profiles p
  where p.id = p_user_id;

  perform public.ops_write_audit(
    'OPS_USER_ROLE_CHANGED',
    p_user_id,
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  return jsonb_build_object('ok', true, 'after', v_after);
end;
$$;

grant execute on function public.ops_set_user_role(uuid, text, text, boolean) to authenticated;

create or replace function public.ops_manage_whitelist(
  p_email text,
  p_region text,
  p_is_active boolean default true,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_region text := trim(coalesce(p_region, ''));
  v_id uuid;
begin
  perform public.ops_assert_operator();

  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if v_region = '' then
    raise exception 'region required' using errcode = '22023';
  end if;

  insert into public.kommune_access_list (email, region, is_active, notes, updated_at)
  values (v_email, v_region, coalesce(p_is_active, true), p_notes, now())
  on conflict (email) do update
  set
    region = excluded.region,
    is_active = excluded.is_active,
    notes = coalesce(excluded.notes, kommune_access_list.notes),
    updated_at = now()
  returning id into v_id;

  perform public.ops_write_audit(
    'OPS_WHITELIST_CHANGED',
    null,
    jsonb_build_object('email', public.ops_mask_email(v_email), 'region', v_region, 'is_active', coalesce(p_is_active, true), 'id', v_id)
  );

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function public.ops_manage_whitelist(text, text, boolean, text) to authenticated;

create or replace function public.ops_approve_terms_document(
  p_doc_id uuid,
  p_approved boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old boolean;
begin
  perform public.ops_assert_operator();

  select approved_for_utleier_signing into v_old
  from public.terms_documents
  where id = p_doc_id;

  if v_old is null then
    raise exception 'document not found' using errcode = 'P0002';
  end if;

  update public.terms_documents
  set approved_for_utleier_signing = coalesce(p_approved, false)
  where id = p_doc_id;

  perform public.ops_write_audit(
    case when coalesce(p_approved, false) then 'OPS_TERMS_APPROVED' else 'OPS_TERMS_REJECTED' end,
    null,
    jsonb_build_object('terms_document_id', p_doc_id, 'was', v_old, 'now', coalesce(p_approved, false), 'note', p_note)
  );

  return jsonb_build_object('ok', true, 'approved', coalesce(p_approved, false));
end;
$$;

grant execute on function public.ops_approve_terms_document(uuid, boolean, text) to authenticated;

create or replace function public.ops_grant_operator(
  p_user_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  insert into public.platform_operators (user_id, granted_by, is_active, notes)
  values (p_user_id, auth.uid(), true, p_notes)
  on conflict (user_id) do update
  set is_active = true, granted_by = auth.uid(), notes = coalesce(excluded.notes, platform_operators.notes);

  perform public.ops_write_audit(
    'OPS_OPERATOR_GRANTED',
    p_user_id,
    jsonb_build_object('notes', p_notes)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.ops_grant_operator(uuid, text) to authenticated;

create or replace function public.ops_revoke_operator(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();

  if p_user_id = auth.uid() then
    raise exception 'cannot revoke own operator access' using errcode = '22023';
  end if;

  update public.platform_operators
  set is_active = false
  where user_id = p_user_id;

  perform public.ops_write_audit(
    'OPS_OPERATOR_REVOKED',
    p_user_id,
    '{}'::jsonb
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.ops_revoke_operator(uuid) to authenticated;

-- Operators may read all pending terms (not only kommune-scoped RLS).
drop policy if exists "Platform operators can read all terms documents" on public.terms_documents;
create policy "Platform operators can read all terms documents"
  on public.terms_documents for select
  to authenticated
  using (public.is_boly_operator());
