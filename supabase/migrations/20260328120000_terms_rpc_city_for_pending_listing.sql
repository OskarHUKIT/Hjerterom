-- Tillat valg av vilkårsdokument ut fra kommune/by (p_city) før det finnes listing-rad
-- (første bolig lagres først etter signert avtale).

drop function if exists public.sync_terms_acceptance_after_sign(uuid);
drop function if exists public.get_terms_document_for_signing(uuid);
drop function if exists public.get_latest_terms_document_id_for_user(uuid);

create function public.get_latest_terms_document_id_for_user(p_user_id uuid, p_city text default null)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cities text[];
  rid uuid;
  use_city text;
begin
  use_city := nullif(trim(coalesce(p_city, '')), '');

  if use_city is not null then
    select td.id into rid
    from public.terms_documents td
    where td.kommune_region is not null
      and trim(td.kommune_region) <> ''
      and lower(trim(td.kommune_region)) = lower(use_city)
    order by td.version desc, td.effective_from desc nulls last
    limit 1;
    if rid is not null then
      return rid;
    end if;
  end if;

  select coalesce(array_agg(distinct lower(trim(city))), array[]::text[])
  into cities
  from public.listings
  where owner_id = p_user_id
    and city is not null
    and trim(city) <> '';

  if cities is not null and array_length(cities, 1) > 0 then
    select td.id into rid
    from public.terms_documents td
    where td.kommune_region is not null
      and trim(td.kommune_region) <> ''
      and lower(trim(td.kommune_region)) = any (cities)
    order by td.version desc, td.effective_from desc nulls last
    limit 1;
    if rid is not null then
      return rid;
    end if;
  end if;

  select td.id into rid
  from public.terms_documents td
  where td.kommune_region is null or trim(td.kommune_region) = ''
  order by td.version desc, td.effective_from desc nulls last
  limit 1;

  return rid;
end;
$$;

grant execute on function public.get_latest_terms_document_id_for_user(uuid, text) to service_role;
grant execute on function public.get_latest_terms_document_id_for_user(uuid, text) to authenticated;

create function public.get_terms_document_for_signing(p_user_id uuid, p_city text default null)
returns table (
  id uuid,
  title text,
  body text,
  version int,
  pdf_bucket text,
  pdf_storage_path text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  doc_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;
  doc_id := public.get_latest_terms_document_id_for_user(p_user_id, p_city);
  if doc_id is null then
    return;
  end if;
  return query
  select td.id, td.title, td.body, td.version, td.pdf_bucket, td.pdf_storage_path
  from public.terms_documents td
  where td.id = doc_id;
end;
$$;

grant execute on function public.get_terms_document_for_signing(uuid, text) to authenticated;

create function public.sync_terms_acceptance_after_sign(p_user_id uuid, p_city text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  tid := public.get_latest_terms_document_id_for_user(p_user_id, p_city);
  if tid is null then
    return;
  end if;
  update public.user_terms_acceptances
  set status = 'superseded'
  where user_id = p_user_id and status = 'active';

  insert into public.user_terms_acceptances (user_id, terms_document_id, signed_at, status)
  values (p_user_id, tid, now(), 'active')
  on conflict (user_id, terms_document_id) do update
  set signed_at = excluded.signed_at, status = 'active';
end;
$$;

grant execute on function public.sync_terms_acceptance_after_sign(uuid, text) to service_role;
