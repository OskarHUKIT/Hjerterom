-- Kommune får tilgang til listings via RPC (omgår RLS). Filtrering på region skjer i appen.

create or replace function public.get_listings_for_kommune()
returns setof listings
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_kommune_ansatt() then
    return;
  end if;
  return query select * from public.listings;
end;
$$;

-- Enkeltlisting for detaljvisning (kommune kan åpne /listings/[id])
create or replace function public.get_listing_by_id_for_kommune(p_listing_id uuid)
returns setof listings
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_kommune_ansatt() then
    return;
  end if;
  return query select * from public.listings where id = p_listing_id;
end;
$$;
