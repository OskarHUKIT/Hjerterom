-- Kommune: slett registrert bolig (vilkår 1.10.1) og avslutt avtale med utleier (1.10.2–1.10.4).
-- Krever is_kommune_staff, bolig i saksbehandlers region, og (kommune_admin eller kommune_can_edit <> false).

create or replace function public.kommune_may_apply_administrative_action()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_kommune_staff() then false
    when public.is_kommune_admin() then true
    else coalesce((select kommune_can_edit from public.profiles where id = auth.uid()), true) is distinct from false
  end;
$$;

comment on function public.kommune_may_apply_administrative_action() is
  'True når innlogget bruker er kommune-staff og har rett til å utføre administrative tiltak (ikke kun lese).';

create or replace function public.kommune_landlord_has_listing_in_region(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listings l
    where l.owner_id = p_user_id
      and public.kommune_listing_region_ok(l.id)
  );
$$;

create or replace function public.kommune_delete_listing(
  p_listing_id uuid,
  p_reason_code text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_address text;
  v_city text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.kommune_may_apply_administrative_action() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_reason_code is null or trim(p_reason_code) = '' then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;
  if not public.kommune_listing_region_ok(p_listing_id) then
    return jsonb_build_object('ok', false, 'error', 'listing_outside_region');
  end if;

  select owner_id, address, city
    into v_owner, v_address, v_city
  from public.listings
  where id = p_listing_id;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  delete from public.listings where id = p_listing_id;

  insert into public.audit_logs (user_id, action_type, listing_id, listing_address, details)
  values (
    v_owner,
    'KOMMUNE_DELETE_LISTING',
    p_listing_id,
    coalesce(v_address, ''),
    jsonb_build_object(
      'reason_code', p_reason_code,
      'note', p_note,
      'performed_by_user_id', auth.uid(),
      'city', v_city
    )
  );

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

comment on function public.kommune_delete_listing(uuid, text, text) is
  'Kommune sletter bolig (f.eks. feilregistrering eller ikke forsvarlig) med årsakskode for sporbarhet.';

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
      terminated_at = now()
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

comment on function public.kommune_terminate_landlord_agreement(uuid, text, text) is
  'Kommune avslutter utleiers vilkårsavtale iht. vilkårsavtalens punkt om oppsigelse (brudd, samarbeid, tjenestestopp m.m.).';

grant execute on function public.kommune_may_apply_administrative_action() to authenticated;
grant execute on function public.kommune_landlord_has_listing_in_region(uuid) to authenticated;
grant execute on function public.kommune_delete_listing(uuid, text, text) to authenticated;
grant execute on function public.kommune_terminate_landlord_agreement(uuid, text, text) to authenticated;
