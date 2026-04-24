-- Varsler til kommune (overtakelsesrapport, meldinger til Kommune) skal treffe både
-- saksbehandler (kommune_ansatt) og kommune_admin — tidligere ble kun kommune_ansatt brukt.

create or replace function public.notify_kommune_new_report(p_listing_id uuid, p_address text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (owner_id, listing_id, type, title, message, status)
  select id, p_listing_id, 'NEW_REPORT', 'Ny overtakelsesrapport (Utleier)',
    'En ny overtakelsesrapport er sendt inn for boligen på ' || coalesce(p_address, '') || '.', 'unread'
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
  from profiles p
  where p.role in ('kommune_ansatt', 'kommune_admin');

  return v_report_id;
end;
$$;

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
    insert into notifications (owner_id, type, title, message, status, related_user_id)
    values (rec.id, 'NEW_MESSAGE', 'Ny melding fra ' || sender_name, msg_body, 'unread', new.sender_id);
  end loop;
  return new;
end;
$$;
