-- Add related_user_id for linking notifications to messages (sender for NEW_MESSAGE)
alter table notifications add column if not exists related_user_id uuid references auth.users on delete set null;

-- Update trigger: put sender name in title, store sender_id in related_user_id for "go to message" link
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
    insert into notifications (owner_id, type, title, message, status, related_user_id)
    values (rec.id, 'NEW_MESSAGE', 'Ny melding fra ' || sender_name, sender_name || ' har sendt en melding til Kommune.', 'unread', new.sender_id);
  end loop;
  return new;
end;
$$;
