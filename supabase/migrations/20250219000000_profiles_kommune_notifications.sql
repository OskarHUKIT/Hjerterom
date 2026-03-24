-- 1. Allow Kommune to view all profiles (fixes new users not showing in Brukere list)
-- Uses SECURITY DEFINER to avoid RLS recursion when checking own role
create or replace function public.is_kommune_ansatt()
returns boolean language sql security definer set search_path = public
as $$ select coalesce((select role from public.profiles where id = auth.uid()) = 'kommune_ansatt', false); $$;

drop policy if exists "Kommune can view all profiles" on profiles;
create policy "Kommune can view all profiles" on profiles for select using (public.is_kommune_ansatt());

-- 2. When utleier sends message to Kommune (receiver_id is null), notify all kommune-ansatte
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
  sender_name := coalesce((select full_name from profiles where id = new.sender_id), 'En utleier');
  for rec in select id from profiles where role = 'kommune_ansatt'
  loop
    insert into notifications (owner_id, type, title, message, status)
    values (rec.id, 'NEW_MESSAGE', 'Ny melding fra utleier', sender_name || ' har sendt en melding til Kommune.', 'unread');
  end loop;
  return new;
end;
$$;

drop trigger if exists on_chat_message_to_kommune on chat_messages;
create trigger on_chat_message_to_kommune
  after insert on chat_messages
  for each row execute function public.notify_kommune_on_message();
