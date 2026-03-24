-- Versjonerte vilkår: RLS, publisering for kommune, henting for utleier, kobling til signering.

create unique index if not exists idx_user_terms_user_document
  on public.user_terms_acceptances (user_id, terms_document_id);

alter table public.terms_documents enable row level security;
alter table public.user_terms_acceptances enable row level security;

grant select on public.terms_documents to authenticated;
grant select on public.user_terms_acceptances to authenticated;

-- Kan kommune-bruker med redigering publisere vilkår for denne kommunen (eller globale tom region)?
create or replace function public.kommune_can_publish_terms(p_kommune_region text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_edit boolean;
  v_regions text[];
  p_email text;
  wl text;
  target text;
begin
  if not public.is_kommune_ansatt() then
    return false;
  end if;
  select coalesce(kommune_can_edit, true) into v_edit from public.profiles where id = auth.uid();
  if coalesce(v_edit, true) = false then
    return false;
  end if;
  if p_kommune_region is null or trim(p_kommune_region) = '' then
    return true;
  end if;
  target := lower(trim(p_kommune_region));
  select kommune_region into wl from public.profiles where id = auth.uid();
  v_regions := public.parse_kommune_regions_sql(wl);
  if coalesce(array_length(v_regions, 1), 0) = 0 then
    select email into p_email from auth.users where id = auth.uid();
    if p_email is not null then
      select region into wl
      from public.kommune_access_list
      where is_active = true and lower(trim(email)) = lower(trim(p_email))
      limit 1;
      v_regions := public.parse_kommune_regions_sql(wl);
    end if;
  end if;
  if coalesce(array_length(v_regions, 1), 0) = 0 then
    return false;
  end if;
  return target = any (v_regions);
end;
$$;

drop policy if exists "Authenticated can read terms documents" on public.terms_documents;
create policy "Authenticated can read terms documents"
  on public.terms_documents for select
  to authenticated
  using (true);

drop policy if exists "Kommune with edit can insert terms documents" on public.terms_documents;
create policy "Kommune with edit can insert terms documents"
  on public.terms_documents for insert
  to authenticated
  with check (public.kommune_can_publish_terms(kommune_region));

drop policy if exists "Kommune with edit can update terms documents" on public.terms_documents;
create policy "Kommune with edit can update terms documents"
  on public.terms_documents for update
  to authenticated
  using (public.kommune_can_publish_terms(kommune_region))
  with check (public.kommune_can_publish_terms(kommune_region));

drop policy if exists "Kommune with edit can delete terms documents" on public.terms_documents;
create policy "Kommune with edit can delete terms documents"
  on public.terms_documents for delete
  to authenticated
  using (public.kommune_can_publish_terms(kommune_region));

drop policy if exists "Users read own terms acceptances" on public.user_terms_acceptances;
create policy "Users read own terms acceptances"
  on public.user_terms_acceptances for select
  to authenticated
  using (auth.uid() = user_id);

-- Siste dokument-ID for utleier: foretrekk region fra bolig, ellers global (tom region)
create or replace function public.get_latest_terms_document_id_for_user(p_user_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cities text[];
  rid uuid;
begin
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

create or replace function public.get_terms_document_for_signing(p_user_id uuid)
returns table (id uuid, title text, body text, version int)
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
  doc_id := public.get_latest_terms_document_id_for_user(p_user_id);
  if doc_id is null then
    return;
  end if;
  return query
  select td.id, td.title, td.body, td.version
  from public.terms_documents td
  where td.id = doc_id;
end;
$$;

grant execute on function public.get_latest_terms_document_id_for_user(uuid) to service_role;
grant execute on function public.get_latest_terms_document_id_for_user(uuid) to authenticated;
grant execute on function public.get_terms_document_for_signing(uuid) to authenticated;

-- Kallet fra sign-callback (service role) etter BankID-signering
create or replace function public.sync_terms_acceptance_after_sign(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  tid := public.get_latest_terms_document_id_for_user(p_user_id);
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

grant execute on function public.sync_terms_acceptance_after_sign(uuid) to service_role;
