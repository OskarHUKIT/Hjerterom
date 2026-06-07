-- Grant platform operator access to an existing user (run in Supabase SQL Editor).
-- Replace EMAIL with the operator's login email.

insert into public.platform_operators (user_id, granted_by, is_active, notes)
select u.id, u.id, true, 'Initial operator seed'
from auth.users u
where lower(trim(u.email)) = lower(trim('REPLACE_WITH_EMAIL@example.com'))
on conflict (user_id) do update
set is_active = true, notes = excluded.notes;
