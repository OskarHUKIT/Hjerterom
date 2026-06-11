-- Invitations: lesetilgang (can_edit), Ops viser/deaktiverer riktig tabell,
-- og profil synkroniseres ved registrering.

-- =============================================================================
-- 1) Synk profil fra aktive grants (kilde etter invitasjon er brukt)
-- =============================================================================
create or replace function public.sync_kommune_staff_profile_from_grants(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_grant_count int;
  v_can_edit boolean;
  v_region text;
  v_has_admin_grant boolean;
  v_meta_role text;
begin
  select count(*)::int, coalesce(bool_or(g.can_edit), true), coalesce(bool_or(g.grant_role = 'admin'), false)
  into v_grant_count, v_can_edit, v_has_admin_grant
  from public.user_kommune_grants g
  where g.user_id = p_user_id and g.revoked_at is null;

  if coalesce(v_grant_count, 0) = 0 then
    return;
  end if;

  select string_agg(distinct array_to_string(k.region_keys, ', '), ', ' order by array_to_string(k.region_keys, ', '))
  into v_region
  from public.user_kommune_grants g
  inner join public.kommuner k on k.id = g.kommune_id
  where g.user_id = p_user_id and g.revoked_at is null;

  select u.raw_user_meta_data->>'role' into v_meta_role
  from auth.users u where u.id = p_user_id;

  update public.profiles p set
    role = case
      when coalesce(v_meta_role, p.role) = 'kommune_admin' then 'kommune_admin'
      when v_has_admin_grant then 'kommune_admin'
      when p.role in ('kommune_ansatt', 'kommune_admin') then p.role
      else 'kommune_ansatt'
    end,
    kommune_can_edit = v_can_edit,
    kommune_region = coalesce(nullif(trim(v_region), ''), p.kommune_region),
    updated_at = now()
  where p.id = p_user_id;
end;
$$;

-- =============================================================================
-- 2) Bruk invitasjoner → grants + profil
-- =============================================================================
create or replace function public.apply_kommune_invitations_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  u record;
  inv record;
begin
  select id, email into u from auth.users where id = p_user_id;
  if u.id is null then return; end if;

  for inv in
    select i.kommune_id, i.grant_role, i.can_edit
    from public.kommune_invitations i
    where i.is_active and lower(trim(i.email)) = lower(trim(u.email))
  loop
    insert into public.user_kommune_grants (user_id, kommune_id, grant_role, can_edit, granted_at)
    values (p_user_id, inv.kommune_id, inv.grant_role, inv.can_edit, now())
    on conflict do nothing;

    update public.user_kommune_grants g set
      can_edit = inv.can_edit,
      grant_role = inv.grant_role
    where g.user_id = p_user_id
      and g.kommune_id = inv.kommune_id
      and g.revoked_at is null;
  end loop;

  perform public.sync_kommune_staff_profile_from_grants(p_user_id);
end;
$$;

-- =============================================================================
-- 3) sync_profile_for_auth_user: can_edit fra invitasjon ved opprettelse
-- =============================================================================
create or replace function public.sync_profile_for_auth_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  u record;
  user_role text := 'homeowner';
  user_region text := null;
  user_can_edit boolean := true;
  resolved_role text;
  has_inv boolean;
begin
  select id, email, raw_user_meta_data into u from auth.users where id = p_user_id;
  if u.id is null then return; end if;

  select exists (
    select 1 from public.kommune_invitations i
    where i.is_active and lower(trim(i.email)) = lower(trim(u.email))
  ) into has_inv;

  if has_inv then
    select
      coalesce(bool_or(i.can_edit), true),
      string_agg(distinct array_to_string(k.region_keys, ', '), ', ' order by array_to_string(k.region_keys, ', '))
    into user_can_edit, user_region
    from public.kommune_invitations i
    inner join public.kommuner k on k.id = i.kommune_id
    where i.is_active and lower(trim(i.email)) = lower(trim(u.email));
  end if;

  if not has_inv then
    select a.region into user_region
    from public.kommune_access_list a
    where lower(trim(a.email)) = lower(trim(u.email)) and a.is_active = true
    limit 1;
  end if;

  if has_inv or user_region is not null then
    user_role := 'kommune_ansatt';
  end if;

  resolved_role := coalesce(u.raw_user_meta_data->>'role', user_role);

  insert into public.profiles (id, full_name, email, role, contact_phone, kommune_region, kommune_can_edit, updated_at)
  values (
    u.id,
    coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, ''), '@', 1)),
    u.email,
    resolved_role,
    u.raw_user_meta_data->>'contact_phone',
    case
      when resolved_role in ('kommune_ansatt', 'kommune_admin') then
        coalesce(
          u.raw_user_meta_data->>'kommune_region',
          user_region,
          (
            select string_agg(distinct rk, ', ' order by rk)
            from public.kommune_invitations i
            inner join public.kommuner k on k.id = i.kommune_id
            cross join unnest(k.region_keys) rk
            where i.is_active and lower(trim(i.email)) = lower(trim(u.email))
          )
        )
      else null
    end,
    case when resolved_role in ('kommune_ansatt', 'kommune_admin') then user_can_edit else true end,
    now()
  )
  on conflict (id) do update set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    contact_phone = coalesce(public.profiles.contact_phone, excluded.contact_phone),
    updated_at = now();

  perform public.apply_kommune_invitations_for_user(p_user_id);
end;
$$;

-- Backfill eksisterende kommunebrukere der profil.kommune_can_edit ikke matcher grants
do $$
declare
  r record;
begin
  for r in select distinct user_id from public.user_kommune_grants where revoked_at is null loop
    perform public.sync_kommune_staff_profile_from_grants(r.user_id);
  end loop;
end;
$$;

-- =============================================================================
-- 4) Ops: invitasjoner i kommunedetalj + deaktivering
-- =============================================================================
create or replace function public.ops_get_kommune_detail(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_k public.kommuner%rowtype;
  v_staff jsonb;
  v_whitelist jsonb;
  v_terms jsonb;
  v_dpo jsonb;
  v_events jsonb;
begin
  perform public.ops_assert_operator();

  select * into v_k from public.kommuner where slug = p_slug;
  if v_k.id is null then
    raise exception 'kommune not found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) into v_staff
  from (
    select
      p.id,
      coalesce(p.full_name, split_part(u.email, '@', 1)) as full_name,
      public.ops_mask_email(u.email) as email_masked,
      p.role,
      p.kommune_region,
      coalesce(p.kommune_can_edit, true) as kommune_can_edit
    from public.profiles p
    inner join auth.users u on u.id = p.id
    where p.role in ('kommune_ansatt', 'kommune_admin')
      and exists (
        select 1 from public.user_kommune_grants g
        where g.user_id = p.id and g.revoked_at is null and g.kommune_id = v_k.id
      )
    order by p.role desc, 2
  ) s;

  select coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) into v_whitelist
  from (
    select
      i.id,
      i.email,
      k.display_name as region,
      i.can_edit,
      i.grant_role,
      i.is_active,
      i.notes,
      i.created_at
    from public.kommune_invitations i
    inner join public.kommuner k on k.id = i.kommune_id
    where i.kommune_id = v_k.id
    order by i.created_at desc
  ) w;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_terms
  from (
    select id, title, version, approved_for_utleier_signing, created_at
    from public.terms_documents
    where kommune_id = v_k.id
       or (kommune_id is null and public.city_matches_region_keys(kommune_region, v_k.region_keys))
    order by created_at desc
    limit 20
  ) t;

  select to_jsonb(d) into v_dpo
  from public.kommune_dpo_contacts d
  where d.kommune_id = v_k.id
  limit 1;

  select coalesce(jsonb_agg(row_to_json(e)), '[]'::jsonb) into v_events
  from (
    select id, severity, source, code, message, created_at
    from public.platform_events
    where kommune_id = v_k.id
    order by created_at desc
    limit 30
  ) e;

  return jsonb_build_object(
    'kommune', row_to_json(v_k),
    'health_metrics', public.ops_kommune_health_metrics(v_k.id),
    'staff', v_staff,
    'whitelist', v_whitelist,
    'terms', v_terms,
    'dpo', v_dpo,
    'recent_events', v_events
  );
end;
$$;

create or replace function public.ops_deactivate_whitelist(p_whitelist_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ops_assert_operator();

  update public.kommune_invitations
  set is_active = false, updated_at = now()
  where id = p_whitelist_id;

  if found then
    perform public.ops_write_audit(
      'OPS_INVITATION_DEACTIVATED',
      null,
      jsonb_build_object('invitation_id', p_whitelist_id)
    );
    return jsonb_build_object('ok', true);
  end if;

  update public.kommune_access_list
  set is_active = false, updated_at = now()
  where id = p_whitelist_id;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  perform public.ops_write_audit(
    'OPS_WHITELIST_DEACTIVATED',
    null,
    jsonb_build_object('whitelist_id', p_whitelist_id)
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- =============================================================================
-- 5) Ops bulk invite: oppdater can_edit ved re-invitasjon
-- =============================================================================
create or replace function public.ops_bulk_invite(
  p_kommune_ids uuid[],
  p_emails text[],
  p_grant_role text default 'staff',
  p_can_edit boolean default true,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_kid uuid;
  v_count int := 0;
  v_updated boolean;
begin
  perform public.ops_assert_operator();

  foreach v_email in array coalesce(p_emails, array[]::text[]) loop
    v_email := lower(trim(v_email));
    if v_email = '' or position('@' in v_email) = 0 then continue; end if;
    foreach v_kid in array coalesce(p_kommune_ids, array[]::uuid[]) loop
      update public.kommune_invitations i set
        can_edit = coalesce(p_can_edit, true),
        grant_role = coalesce(p_grant_role, 'staff'),
        is_active = true,
        notes = coalesce(p_notes, i.notes),
        invited_by = auth.uid(),
        updated_at = now()
      where lower(trim(i.email)) = v_email and i.kommune_id = v_kid and i.is_active;

      v_updated := found;

      if not v_updated then
        update public.kommune_invitations i set
          can_edit = coalesce(p_can_edit, true),
          grant_role = coalesce(p_grant_role, 'staff'),
          is_active = true,
          notes = coalesce(p_notes, i.notes),
          invited_by = auth.uid(),
          updated_at = now()
        where lower(trim(i.email)) = v_email and i.kommune_id = v_kid and not i.is_active;
        v_updated := found;
      end if;

      if not v_updated then
        insert into public.kommune_invitations (email, kommune_id, grant_role, can_edit, is_active, invited_by, notes)
        values (v_email, v_kid, coalesce(p_grant_role, 'staff'), coalesce(p_can_edit, true), true, auth.uid(), p_notes);
      end if;

      v_count := v_count + 1;
    end loop;
  end loop;

  return jsonb_build_object('ok', true, 'count', v_count);
end;
$$;

-- Ops brukerdetailj: vis invitasjoner (ikke legacy whitelist)
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
  v_grants jsonb;
  v_landlord_scope jsonb;
begin
  perform public.ops_assert_operator();

  select
    u.id, u.email, u.created_at as auth_created_at, u.email_confirmed_at,
    p.full_name, p.role, p.kommune_region, coalesce(p.kommune_can_edit, true) as kommune_can_edit,
    p.contact_phone, ua.signed_at, coalesce(ua.is_terminated, false) as is_terminated,
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
    select
      i.id,
      i.email,
      k.display_name as region,
      i.can_edit,
      i.is_active,
      i.notes,
      i.kommune_id,
      i.created_at
    from public.kommune_invitations i
    inner join public.kommuner k on k.id = i.kommune_id
    where lower(trim(i.email)) = lower(trim(v_row.email))
    order by k.display_name, i.created_at desc
  ) w;

  v_grants := public.ops_get_user_grants(p_user_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'kommune_id', k.id,
    'display_name', k.display_name,
    'service_areas', (
      select coalesce(jsonb_agg(sa.display_name), '[]'::jsonb)
      from public.kommune_service_area_members sam
      inner join public.kommune_service_areas sa on sa.id = sam.service_area_id
      where sam.kommune_id = k.id
    )
  )), '[]'::jsonb) into v_landlord_scope
  from (
    select distinct l.kommune_id as kid
    from public.listings l where l.owner_id = p_user_id and l.kommune_id is not null
  ) x
  inner join public.kommuner k on k.id = x.kid;

  return jsonb_build_object(
    'id', v_row.id,
    'email_full', v_row.email,
    'email_masked', public.ops_mask_email(v_row.email),
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
    'listing_count', (select count(*)::int from public.listings where owner_id = p_user_id),
    'whitelist_entries', v_whitelist,
    'kommune_grants', v_grants,
    'landlord_kommune_scope', v_landlord_scope,
    'is_platform_operator', exists (
      select 1 from public.platform_operators po
      where po.user_id = p_user_id and po.is_active
    )
  );
end;
$$;

-- ops_set_user_grants: synk også kommune_can_edit på profil
create or replace function public.ops_set_user_grants(
  p_user_id uuid,
  p_grants jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g jsonb;
  v_kid uuid;
begin
  perform public.ops_assert_operator();

  update public.user_kommune_grants
  set revoked_at = now()
  where user_id = p_user_id and revoked_at is null;

  if p_grants is not null and jsonb_typeof(p_grants) = 'array' then
    for g in select * from jsonb_array_elements(p_grants) loop
      v_kid := (g->>'kommune_id')::uuid;
      if v_kid is null then continue; end if;
      insert into public.user_kommune_grants (user_id, kommune_id, grant_role, can_edit, granted_by, granted_at)
      values (
        p_user_id,
        v_kid,
        coalesce(nullif(g->>'grant_role', ''), 'staff'),
        coalesce((g->>'can_edit')::boolean, true),
        auth.uid(),
        now()
      );
    end loop;
  end if;

  perform public.sync_kommune_staff_profile_from_grants(p_user_id);

  perform public.ops_write_audit('OPS_USER_GRANTS_CHANGED', p_user_id, p_grants);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.sync_kommune_staff_profile_from_grants(uuid) to authenticated;
