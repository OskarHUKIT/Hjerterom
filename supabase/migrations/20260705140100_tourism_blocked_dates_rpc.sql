-- Public RPC: booking date ranges for tourism calendar (no PII).
-- Fixes anon RLS on bookings table — calendar can show blocked nights without guest fields.

create or replace function public.get_tourism_blocked_dates(p_listing_id uuid)
returns table (
  check_in date,
  check_out date
)
language sql
stable
security definer
set search_path = public
as $$
  select b.check_in, b.check_out
  from public.bookings b
  where b.listing_id = p_listing_id
    and b.status in ('pending', 'accepted', 'paid')
  order by b.check_in asc;
$$;

revoke all on function public.get_tourism_blocked_dates(uuid) from public;
grant execute on function public.get_tourism_blocked_dates(uuid) to anon, authenticated;
