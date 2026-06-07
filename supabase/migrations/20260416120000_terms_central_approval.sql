-- Sentral godkjenning før vilkår brukes av utleiere (BankID / påkrevde dokumenter).
-- Eksisterende rader settes til godkjent slik at produksjon ikke endrer oppførsel.
-- Kommuner kan ikke selv sette godkjenning; bruk Supabase SQL Editor (eller service role).

alter table public.terms_documents
  add column if not exists approved_for_utleier_signing boolean not null default false;

comment on column public.terms_documents.approved_for_utleier_signing is
  'Når true: dokumentet inngår i get_latest / påkrevde vilkår for utleiere. Settes sentralt (SQL Editor) etter gjennomgang.';

update public.terms_documents
set approved_for_utleier_signing = true
where approved_for_utleier_signing = false;

drop policy if exists "Authenticated can read terms documents" on public.terms_documents;
create policy "Authenticated can read terms documents"
  on public.terms_documents for select
  to authenticated
  using (
    approved_for_utleier_signing = true
    or public.kommune_can_publish_terms(kommune_region)
  );

create or replace function public.terms_documents_guard_approval_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text;
begin
  jwt_role := coalesce(auth.jwt() ->> 'role', '');

  if tg_op = 'INSERT' then
    if jwt_role = 'authenticated' then
      new.approved_for_utleier_signing := false;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.approved_for_utleier_signing is distinct from old.approved_for_utleier_signing then
      if jwt_role in ('authenticated', 'anon') then
        raise exception 'Godkjenning for utleiersignering kan kun settes sentralt (service role eller SQL Editor).'
          using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists terms_documents_guard_approval on public.terms_documents;
create trigger terms_documents_guard_approval
  before insert or update on public.terms_documents
  for each row
  execute function public.terms_documents_guard_approval_column();

create or replace function public.get_latest_terms_document_id_for_user(p_user_id uuid, p_city text default null)
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
  city_parts text[];
begin
  use_city := nullif(trim(coalesce(p_city, '')), '');

  if use_city is not null then
    city_parts := public.parse_kommune_regions_sql(use_city);
    if coalesce(array_length(city_parts, 1), 0) = 0 then
      city_parts := array[lower(trim(use_city))];
    end if;
    select td.id into rid
    from public.terms_documents td
    where td.approved_for_utleier_signing = true
      and td.kommune_region is not null
      and trim(td.kommune_region) <> ''
      and public.regions_overlap(
        public.parse_kommune_regions_sql(td.kommune_region),
        city_parts
      )
    order by td.version desc, td.effective_from desc nulls last
    limit 1;
    if rid is not null then
      return rid;
    end if;
  end if;

  select coalesce(
    (select array_agg(t.x order by t.x)
     from (
       select distinct u.x
       from public.listings l,
       lateral unnest(public.parse_kommune_regions_sql(l.city)) as u(x)
       where l.owner_id = p_user_id
         and l.city is not null
         and trim(l.city) <> ''
     ) t),
    array[]::text[]
  )
  into cities;

  if cities is not null and array_length(cities, 1) > 0 then
    select td.id into rid
    from public.terms_documents td
    where td.approved_for_utleier_signing = true
      and td.kommune_region is not null
      and trim(td.kommune_region) <> ''
      and public.regions_overlap(
        public.parse_kommune_regions_sql(td.kommune_region),
        cities
      )
    order by td.version desc, td.effective_from desc nulls last
    limit 1;
    if rid is not null then
      return rid;
    end if;
  end if;

  select td.id into rid
  from public.terms_documents td
  where td.approved_for_utleier_signing = true
    and (td.kommune_region is null or trim(td.kommune_region) = '')
  order by td.version desc, td.effective_from desc nulls last
  limit 1;

  return rid;
end;
$$;

create or replace function public.get_required_terms_document_ids_for_city(p_city text)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  g uuid;
  r uuid;
  out uuid[] := array[]::uuid[];
  city_parts text[];
begin
  select td.id into g
  from public.terms_documents td
  where td.approved_for_utleier_signing = true
    and (td.kommune_region is null or trim(td.kommune_region) = '')
  order by td.version desc, td.effective_from desc nulls last
  limit 1;

  if g is not null then
    out := array_append(out, g);
  end if;

  if p_city is not null and trim(p_city) <> '' then
    city_parts := public.parse_kommune_regions_sql(p_city);
    if coalesce(array_length(city_parts, 1), 0) = 0 then
      city_parts := array[lower(trim(p_city))];
    end if;
    select td.id into r
    from public.terms_documents td
    where td.approved_for_utleier_signing = true
      and td.kommune_region is not null
      and trim(td.kommune_region) <> ''
      and public.regions_overlap(
        public.parse_kommune_regions_sql(td.kommune_region),
        city_parts
      )
    order by td.version desc, td.effective_from desc nulls last
    limit 1;
    if r is not null and r is distinct from g then
      out := array_append(out, r);
    end if;
  end if;

  return out;
end;
$$;

create or replace function public.sync_terms_acceptance_after_sign(p_user_id uuid, p_terms_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid := p_terms_document_id;
  reg_new text;
  approved_ok boolean;
begin
  if tid is null then
    return;
  end if;
  select td.approved_for_utleier_signing
    into approved_ok
  from public.terms_documents td
  where td.id = tid;

  if approved_ok is distinct from true then
    return;
  end if;

  select nullif(trim(coalesce(kommune_region, '')), '') into reg_new
  from public.terms_documents
  where id = tid;

  update public.user_terms_acceptances uta
  set status = 'superseded'
  from public.terms_documents td_old
  where uta.user_id = p_user_id
    and uta.status = 'active'
    and uta.terms_document_id = td_old.id
    and uta.terms_document_id is distinct from tid
    and (
      (reg_new is null and (td_old.kommune_region is null or trim(td_old.kommune_region) = ''))
      or
      (
        reg_new is not null
        and td_old.kommune_region is not null
        and public.same_kommune_region_bucket(reg_new, td_old.kommune_region)
      )
    );

  insert into public.user_terms_acceptances (user_id, terms_document_id, signed_at, status)
  values (p_user_id, tid, now(), 'active')
  on conflict (user_id, terms_document_id) do update
  set signed_at = excluded.signed_at, status = 'active';
end;
$$;
