-- Paginert boligbank-listing for kommune (flere mindre svar i stedet for ett uendelig stort).
-- Beholder get_listings_for_kommune() uendret for bakoverkompatibilitet.

create or replace function public.get_listings_for_kommune_paged(
  p_limit integer default 800,
  p_offset integer default 0
)
returns setof listings
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := greatest(1, least(coalesce(nullif(p_limit, 0), 800), 2000));
  off integer := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_kommune_staff() then
    return;
  end if;
  return query
  select l.*
  from public.listings l
  order by l.created_at desc nulls last
  limit lim
  offset off;
end;
$$;

comment on function public.get_listings_for_kommune_paged(integer, integer) is
  'Kommune-personell: hent listings i sider (maks 2000 per kall).';

grant execute on function public.get_listings_for_kommune_paged(integer, integer) to authenticated;
