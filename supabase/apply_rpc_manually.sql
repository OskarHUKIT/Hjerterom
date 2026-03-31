-- Kjør denne i Supabase Dashboard → SQL Editor hvis db push feiler

-- push_subscriptions (for PWA-varsler)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(owner_id, endpoint)
);
alter table push_subscriptions enable row level security;
drop policy if exists "Users can manage own push subscriptions" on push_subscriptions;
create policy "Users can manage own push subscriptions"
  on push_subscriptions for all using (auth.uid() = owner_id);

--
-- Brukes av: brukerprofil, meldinger (chat-navn)

create or replace function public.get_user_display_name(p_user_id uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare
  result text;
begin
  if auth.uid() != p_user_id and not public.is_kommune_ansatt() then
    return null;
  end if;
  select coalesce(
    (select full_name from public.profiles where id = p_user_id limit 1),
    (select raw_user_meta_data->>'full_name' from auth.users where id = p_user_id limit 1),
    (select split_part(email, '@', 1) from auth.users where id = p_user_id limit 1),
    (select owner_name from public.listings where owner_id = p_user_id limit 1)
  ) into result;
  return coalesce(result, 'Ukjent bruker');
end;
$$;

create or replace function public.get_single_user_for_kommune(p_user_id uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  updated_at timestamptz
) language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_kommune_ansatt() then
    return;
  end if;
  return query
  select
    u.id,
    coalesce(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))::text as full_name,
    u.email::text,
    coalesce(p.role, 'homeowner')::text as role,
    coalesce(p.updated_at, u.created_at)::timestamptz as updated_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;
end;
$$;

--
-- Varsler: bruk faktisk avsendernavn (profiles, auth.users, email) i stedet for "En utleier"
--
create or replace function public.notify_kommune_on_message()
returns trigger language plpgsql security definer set search_path = public
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

  for rec in select id from profiles where role = 'kommune_ansatt'
  loop
    insert into notifications (owner_id, type, title, message, status, related_user_id)
    values (rec.id, 'NEW_MESSAGE', 'Ny melding fra ' || sender_name, msg_body, 'unread', new.sender_id);
  end loop;
  return new;
end;
$$;
