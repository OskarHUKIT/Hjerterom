-- Utleier oppsagt av kommune: spor med terminated_by_kommune, forespørsel om ny signering, kommune godkjenner.

alter table public.user_agreements
  add column if not exists terminated_by_kommune boolean not null default false;

comment on column public.user_agreements.terminated_by_kommune is
  'True når kommunen har avsluttet vilkårsavtalen (1.10). Utleier kan ikke signere på nytt uten godkjenning.';

-- Eksisterende oppsigelser fra kommune (audit)
update public.user_agreements ua
set terminated_by_kommune = true
where ua.is_terminated = true
  and exists (
    select 1
    from public.audit_logs al
    where al.user_id = ua.user_id
      and al.action_type = 'KOMMUNE_TERMINATE_LANDLORD_AGREEMENT'
  );

create table if not exists public.landlord_resign_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  landlord_message text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  review_note text
);

create unique index if not exists landlord_resign_one_pending
  on public.landlord_resign_requests (user_id)
  where status = 'pending';

comment on table public.landlord_resign_requests is
  'Forespørsel fra utleier om å få signere vilkår igjen etter kommunal oppsigelse.';

alter table public.landlord_resign_requests enable row level security;

-- Utleier: les egne rader
drop policy if exists "Landlord read own resign requests" on public.landlord_resign_requests;
create policy "Landlord read own resign requests"
  on public.landlord_resign_requests for select
  to authenticated
  using (user_id = auth.uid());

-- Kommune: les forespørsler for utleiere med bolig i viewerens region
drop policy if exists "Kommune read resign requests in region" on public.landlord_resign_requests;
create policy "Kommune read resign requests in region"
  on public.landlord_resign_requests for select
  to authenticated
  using (
    public.is_kommune_staff()
    and exists (
      select 1
      from public.listings l
      where l.owner_id = landlord_resign_requests.user_id
        and public.kommune_listing_region_ok(l.id)
    )
  );

-- Oppdater kommunal oppsigelse: sett flagget
create or replace function public.kommune_terminate_landlord_agreement(
  p_target_user_id uuid,
  p_reason_code text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  n int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.kommune_may_apply_administrative_action() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_target_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'cannot_terminate_self');
  end if;
  if p_reason_code is null or trim(p_reason_code) = '' then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  select coalesce(role, 'homeowner') into v_role
  from public.profiles
  where id = p_target_user_id;

  if v_role is null then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;
  if v_role in ('kommune_ansatt', 'kommune_admin') then
    return jsonb_build_object('ok', false, 'error', 'target_is_kommune_staff');
  end if;

  if not public.kommune_landlord_has_listing_in_region(p_target_user_id) then
    return jsonb_build_object('ok', false, 'error', 'landlord_outside_region');
  end if;

  update public.user_agreements
  set is_terminated = true,
      terminated_at = now(),
      terminated_by_kommune = true
  where user_id = p_target_user_id
    and coalesce(is_terminated, false) = false;

  get diagnostics n = row_count;

  if n = 0 then
    if not exists (select 1 from public.user_agreements where user_id = p_target_user_id) then
      return jsonb_build_object('ok', false, 'error', 'no_agreement');
    end if;
    return jsonb_build_object('ok', false, 'error', 'already_terminated');
  end if;

  insert into public.audit_logs (user_id, action_type, details)
  values (
    p_target_user_id,
    'KOMMUNE_TERMINATE_LANDLORD_AGREEMENT',
    jsonb_build_object(
      'reason_code', p_reason_code,
      'note', p_note,
      'performed_by_user_id', auth.uid(),
      'agreements_updated', n
    )
  );

  return jsonb_build_object('ok', true, 'agreements_updated', n);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

-- Varsle kommuneansatte som har minst ett område som overlapper en av utleiers boligbyer
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
    insert into public.notifications (owner_id, type, title, message, status, related_user_id)
    values (
      rec.staff_id,
      'LANDLORD_RESIGN_REQUEST',
      v_title,
      v_msg,
      'unread',
      p_landlord_user_id
    );
  end loop;
end;
$$;

comment on function public._notify_kommune_resign_request(uuid, text) is
  'Varsler saksbehandlere der profiles.kommune_region overlapper minst én av utleiers listing.city (samme idé som regionfilter).';

create or replace function public.request_landlord_resign_after_kommune(p_message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_term boolean;
  v_kommune_term boolean;
  v_name text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select coalesce(is_terminated, false), coalesce(terminated_by_kommune, false)
    into v_term, v_kommune_term
  from public.user_agreements
  where user_id = v_uid
  limit 1;

  if not found or not v_term or not v_kommune_term then
    return jsonb_build_object('ok', false, 'error', 'not_eligible');
  end if;

  if exists (
    select 1 from public.landlord_resign_requests
    where user_id = v_uid and status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_pending');
  end if;

  insert into public.landlord_resign_requests (user_id, status, landlord_message)
  values (v_uid, 'pending', nullif(trim(p_message), ''));

  select coalesce(full_name, email) into v_name from public.profiles where id = v_uid;
  perform public._notify_kommune_resign_request(v_uid, v_name);

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_pending');
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

comment on function public.request_landlord_resign_after_kommune(text) is
  'Utleier med kommunal oppsigelse ber om å få signere igjen; oppretter pending-rad og varsler kommune.';

create or replace function public.kommune_review_landlord_resign(
  p_landlord_user_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_note text := nullif(trim(p_note), '');
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.kommune_may_apply_administrative_action() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if not public.kommune_landlord_has_listing_in_region(p_landlord_user_id) then
    return jsonb_build_object('ok', false, 'error', 'landlord_outside_region');
  end if;

  select * into r
  from public.landlord_resign_requests
  where user_id = p_landlord_user_id and status = 'pending'
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_pending_request');
  end if;

  update public.landlord_resign_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_note = v_note
  where id = r.id;

  if p_approve then
    update public.user_agreements
    set is_terminated = false,
        terminated_at = null,
        terminated_by_kommune = false
    where user_id = p_landlord_user_id;

    insert into public.audit_logs (user_id, action_type, details)
    values (
      p_landlord_user_id,
      'KOMMUNE_APPROVE_LANDLORD_RESIGN',
      jsonb_build_object('reviewed_by', auth.uid(), 'resign_request_id', r.id)
    );

    insert into public.notifications (owner_id, type, title, message, status)
    values (
      p_landlord_user_id,
      'RESIGN_REQUEST_APPROVED',
      'Du kan signere vilkårsavtalen på nytt',
      'Kommunen har godkjent at du kan signere vilkårsavtalen på nytt. Gå til Mine boliger eller signeringsflyten for å fortsette.',
      'unread'
    );
  else
    insert into public.audit_logs (user_id, action_type, details)
    values (
      p_landlord_user_id,
      'KOMMUNE_REJECT_LANDLORD_RESIGN',
      jsonb_build_object('reviewed_by', auth.uid(), 'resign_request_id', r.id, 'note', v_note)
    );

    insert into public.notifications (owner_id, type, title, message, status)
    values (
      p_landlord_user_id,
      'RESIGN_REQUEST_REJECTED',
      'Forespørsel om ny signering er avslått',
      'Kommunen har avslått forespørselen om ny signering.'
        || case when v_note is not null then ' Merknad: ' || v_note else '' end,
      'unread'
    );
  end if;

  return jsonb_build_object('ok', true, 'approved', p_approve);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

comment on function public.kommune_review_landlord_resign(uuid, boolean, text) is
  'Kommune godkjenner eller avslår forespørsel om ny vilkårssignering; ved godkjenning åpnes avtalen for signering.';

grant execute on function public.request_landlord_resign_after_kommune(text) to authenticated;
grant execute on function public.kommune_review_landlord_resign(uuid, boolean, text) to authenticated;
