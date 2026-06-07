-- Kjør i Supabase SQL Editor for å verifisere at e-postvarsler kan trigges for alle brukere
-- (ingen manuell UUID i drift – dette er kun diagnostikk).

-- 1) Finnes trigger på public.notifications?
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.notifications'::regclass
  and not tgisinternal
order by tgname;

-- 2) Siste utgående HTTP-kall (pg_net) – skal få treff når varsel opprettes og trigger/webhook kaller Edge
select id, status_code, error_msg, timed_out, left(content, 200) as response_snip, created
from net._http_response
order by created desc
limit 15;

-- 3) Eksempel: brukere med e-postvarsler på (skalerbart – mange rader er forventet)
select p.id, u.email, p.email_notifications_enabled
from public.profiles p
join auth.users u on u.id = p.id
where p.email_notifications_enabled = true
limit 50;
