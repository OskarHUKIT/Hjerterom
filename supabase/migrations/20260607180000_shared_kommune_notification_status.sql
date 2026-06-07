-- Delt lest/ulest for kommune-varsler: én saksbehandler sin handling gjelder alle
-- kollegaer som har fått samme varsel (samme type, innhold og kontekst).

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

comment on function public.set_notification_status(uuid, text) is
  'Marker varsel som lest/ulest. For kommune-staff oppdateres alle kollegaers kopi av samme hendelse.';

grant execute on function public.set_notification_status(uuid, text) to authenticated;
