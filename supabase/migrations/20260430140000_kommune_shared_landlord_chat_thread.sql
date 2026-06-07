-- Delt meldingstråd: alle saksbehandlere/kommune_admin med tilgang til utleier ser samme historikk
-- (utleier ↔ kommune). RPC-ene bruker security definer + kommune_may_view_user_profile slik at RLS
-- på chat_messages ikke blokkerer lesing av kollegers meldinger til samme utleier.

create or replace function public.get_kommune_landlord_thread_messages(p_landlord_id uuid)
returns setof public.chat_messages
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_kommune_staff() or not public.kommune_may_view_user_profile(p_landlord_id) then
    return;
  end if;

  return query
  select cm.*
  from public.chat_messages cm
  where
    (
      cm.sender_id = p_landlord_id
      and (
        cm.receiver_id is null
        or exists (
          select 1
          from public.profiles p
          where p.id = cm.receiver_id and p.role in ('kommune_ansatt', 'kommune_admin')
        )
      )
    )
    or
    (
      cm.receiver_id = p_landlord_id
      and exists (
        select 1
        from public.profiles p
        where p.id = cm.sender_id and p.role in ('kommune_ansatt', 'kommune_admin')
      )
    )
  order by cm.created_at asc;
end;
$$;

comment on function public.get_kommune_landlord_thread_messages(uuid) is
  'Kommune: hent felles tråd med utleier (alle kollegers meldinger + utleier til/fra kommune).';

create or replace function public.get_kommune_landlord_thread_summaries()
returns table (
  landlord_id uuid,
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
  if not public.is_kommune_staff() then
    return;
  end if;

  return query
  with scoped_landlords as (
    select distinct l.owner_id as uid
    from public.listings l
    where public.kommune_listing_region_ok(l.id)
  ),
  thread_msgs as (
    select cm.*
    from public.chat_messages cm
    where
      (
        cm.sender_id in (select sl.uid from scoped_landlords sl)
        and (
          cm.receiver_id is null
          or exists (
            select 1
            from public.profiles p
            where p.id = cm.receiver_id and p.role in ('kommune_ansatt', 'kommune_admin')
          )
        )
      )
      or
      (
        cm.receiver_id in (select sl.uid from scoped_landlords sl)
        and exists (
          select 1
          from public.profiles p
          where p.id = cm.sender_id and p.role in ('kommune_ansatt', 'kommune_admin')
        )
      )
  ),
  keyed as (
    select
      case
        when tm.sender_id in (select sl.uid from scoped_landlords sl) then tm.sender_id
        else tm.receiver_id
      end as lid,
      tm.created_at as ca,
      tm.content as ct,
      tm.image_urls as imgs,
      tm.sender_id as sid
    from thread_msgs tm
  ),
  ranked as (
    select
      k.lid,
      k.ca,
      k.ct,
      k.imgs,
      k.sid,
      row_number() over (partition by k.lid order by k.ca desc) as rn
    from keyed k
  )
  select
    r.lid as landlord_id,
    r.ca as last_at,
    left(
      case
        when coalesce(trim(r.ct), '') <> '' then trim(r.ct)
        when coalesce(array_length(r.imgs, 1), 0) > 0 then '[Bilde]'
        else ''
      end,
      240
    ) as last_preview,
    r.sid as last_sender_id
  from ranked r
  where r.rn = 1
  order by r.ca desc;
end;
$$;

comment on function public.get_kommune_landlord_thread_summaries() is
  'Kommune: siste melding per utleier i delt tråd (for samtaleliste).';

grant execute on function public.get_kommune_landlord_thread_messages(uuid) to authenticated;
grant execute on function public.get_kommune_landlord_thread_summaries() to authenticated;
