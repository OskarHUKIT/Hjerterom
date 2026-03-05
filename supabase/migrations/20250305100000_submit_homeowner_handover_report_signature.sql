-- Ensure notify_kommune_new_report exists (submit_homeowner_handover_report calls it)
create or replace function public.notify_kommune_new_report(p_listing_id uuid, p_address text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (owner_id, listing_id, type, title, message, status)
  select id, p_listing_id, 'NEW_REPORT', 'Ny overtakelsesrapport (Utleier)', 'En ny overtakelsesrapport er sendt inn for boligen på ' || coalesce(p_address, '') || '.', 'unread'
  from profiles where role = 'kommune_ansatt';
end;
$$;

-- Fix parameter order so Supabase schema cache finds the function (expects p_content, p_listing_id)
drop function if exists public.submit_homeowner_handover_report(uuid, jsonb);

create or replace function public.submit_homeowner_handover_report(p_content jsonb, p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_report_id uuid;
  v_address text;
begin
  if auth.uid() is null then
    raise exception 'Du må være innlogget for å sende inn overtakelsesrapport.';
  end if;

  select owner_id, address into v_owner_id, v_address
  from listings where id = p_listing_id;

  if v_owner_id is null then
    raise exception 'Boligen ble ikke funnet.';
  end if;

  if v_owner_id != auth.uid() then
    raise exception 'Du kan bare sende inn overtakelsesrapport for egne boliger.';
  end if;

  insert into handover_reports (listing_id, reporter_type, content, is_finalized, signed_at)
  values (p_listing_id, 'homeowner', p_content, true, now())
  returning id into v_report_id;

  perform notify_kommune_new_report(p_listing_id, coalesce(p_content->>'address', v_address));

  return v_report_id;
end;
$$;
