-- Tenant handover: notification uses listing address from DB (p_content may omit address in minimal anonymous payload)
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

  insert into notifications (owner_id, listing_id, type, title, message, status)
  select p.id, v_listing_id, 'NEW_REPORT', 'Ny overtakelsesrapport (Leietaker)',
    'En ny overtakelsesrapport er sendt inn for boligen på ' || coalesce(v_address, '') || '.', 'unread'
  from profiles p where p.role = 'kommune_ansatt';

  return v_report_id;
end;
$$;
