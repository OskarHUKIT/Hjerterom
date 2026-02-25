-- Fix: use actual sender name instead of "En utleier" (check profiles, auth.users metadata, email)
create or replace function public.notify_kommune_on_message()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  sender_name text;
  rec record;
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
  for rec in select id from profiles where role = 'kommune_ansatt'
  loop
    insert into notifications (owner_id, type, title, message, status, related_user_id)
    values (rec.id, 'NEW_MESSAGE', 'Ny melding fra ' || sender_name, sender_name || ' har sendt en melding til Kommune.', 'unread', new.sender_id);
  end loop;
  return new;
end;
$$;
